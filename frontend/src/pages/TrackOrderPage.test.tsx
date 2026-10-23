import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import TrackOrderPage from './TrackOrderPage'
import { apiFetch } from '../lib/api'
import { useAuthStore } from '../lib/store'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, apiFetch: vi.fn() }
})

const apiMock = apiFetch as unknown as ReturnType<typeof vi.fn>

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const tracked = {
  orderNumber: 'LUM-ABC-1234',
  status: 'SHIPPED',
  paymentStatus: 'PAID',
  paymentMethod: 'aba_payway',
  trackingNumber: 'KH-987654321',
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-22T10:00:00.000Z',
  subtotal: 64,
  shipping: 8.95,
  tax: 6.4,
  discount: 0,
  total: 79.35,
  itemCount: 1,
  items: [
    {
      name: 'Silk Barrier Moisturizer',
      quantity: 1,
      price: 64,
      product: { slug: 'silk-barrier-moisturizer', images: [] },
    },
  ],
  shippingTo: { firstName: 'Sophie', lastName: 'M', city: 'Phnom Penh', country: 'Cambodia' },
}

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname + location.search}</span>
}

function renderPage(entry = '/track') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <TrackOrderPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  apiMock.mockReset()
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
})

describe('TrackOrderPage', () => {
  it('prefills the order number from a shared link', () => {
    renderPage('/track?order=LUM-XYZ-9999')

    expect(screen.getByLabelText('Order number')).toHaveValue('LUM-XYZ-9999')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('requires both fields and never calls the API empty-handed', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /track order/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your order number and email.')
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('shows the timeline, items, totals, and shipping destination', async () => {
    apiMock.mockImplementation(async () => jsonResponse({ success: true, data: tracked }))
    const user = userEvent.setup()
    renderPage(`/track?order=${tracked.orderNumber}`)

    await user.type(screen.getByLabelText('Email'), 'sophie@example.com')
    await user.click(screen.getByRole('button', { name: /track order/i }))

    expect(await screen.findByText(`ORDER ${tracked.orderNumber}`)).toBeInTheDocument()
    expect(screen.getAllByText('Shipped').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('KH-987654321')).toBeInTheDocument()
    expect(screen.getByText('Phnom Penh, Cambodia')).toBeInTheDocument()
    expect(screen.getByText('Paid · ABA PayWay')).toBeInTheDocument()
    expect(screen.getByText('$79.35')).toBeInTheDocument()
    expect(screen.getByText('$6.40')).toBeInTheDocument()

    const itemLink = screen.getByText('Silk Barrier Moisturizer').closest('a')
    expect(itemLink).toHaveAttribute('href', '/products/silk-barrier-moisturizer')

    // The email stays out of the URL; only the shareable order number is kept.
    expect(screen.getByTestId('location')).toHaveTextContent('/track?order=LUM-ABC-1234')

    const [path, options] = apiMock.mock.calls[0]
    expect(path).toBe('/api/orders/track')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({
      orderNumber: tracked.orderNumber,
      email: 'sophie@example.com',
    })
    expect(options.token).toBeUndefined()
  })

  it('shows a friendly error on an unknown order and lets the shopper try another', async () => {
    apiMock.mockImplementation(async () =>
      jsonResponse({ success: false, message: 'No order matches that number and email' }, 404),
    )
    const user = userEvent.setup()
    renderPage(`/track?order=${tracked.orderNumber}`)

    await user.type(screen.getByLabelText('Email'), 'wrong@example.com')
    await user.click(screen.getByRole('button', { name: /track order/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t find an order with that number and email.',
    )

    // Correcting the email lets the shopper retry without reloading.
    apiMock.mockImplementation(async () => jsonResponse({ success: true, data: tracked }))
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'sophie@example.com')
    await user.click(screen.getByRole('button', { name: /track order/i }))
    expect(await screen.findByText(`ORDER ${tracked.orderNumber}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Track another order' }))
    expect(screen.getByLabelText('Order number')).toHaveValue('')
    expect(screen.getByTestId('location')).toHaveTextContent('/track')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

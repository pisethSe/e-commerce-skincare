import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CheckoutPage from './CheckoutPage'
import { useAuthStore, useCartStore, useUIStore } from '../lib/store'
import { apiFetch } from '../lib/api'
import type { Product } from '../types'

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

const product: Product = {
  id: 'p1',
  name: 'Silk Hydration Essence',
  slug: 'silk-hydration-essence',
  tagline: 'Quiet hydration',
  description: 'A lightweight essence.',
  price: 42,
  images: [],
  category: { id: 'c1', name: 'Serums', slug: 'serums' },
  categoryId: 'c1',
  tags: [],
  rating: 0,
  reviewCount: 0,
  inStock: true,
  stockCount: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function renderCheckout() {
  return render(
    <MemoryRouter>
      <CheckoutPage />
    </MemoryRouter>,
  )
}

async function fillCheckoutToPayment() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('First Name'), 'Sophie')
  await user.type(screen.getByLabelText('Last Name'), 'Martin')
  await user.type(screen.getByLabelText('Email'), 'sophie@example.com')
  await user.type(screen.getByLabelText('Phone'), '012 345 678')
  await user.click(screen.getByRole('button', { name: /continue to shipping/i }))

  await user.click(screen.getByRole('radio', { name: /^Phnom Penh/i }))
  await user.selectOptions(screen.getByLabelText('Khan / District'), 'Chamkarmon')
  await user.type(screen.getByLabelText('House number & street'), 'House 12, Street 215')
  await user.click(screen.getByRole('button', { name: /continue to payment/i }))
  return user
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ product, quantity: 1 }],
      isOpen: false,
      coupon: null,
      couponError: null,
    })
    useAuthStore.setState({
      user: { id: 'u1', email: 'sophie@example.com', firstName: 'Sophie', lastName: 'Martin', role: 'USER' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    useUIStore.setState({ isAuthModalOpen: false })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ success: true, data: { stripe: false, bakong: false, abaPayway: false, currency: 'USD' } }),
    )
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/api/users/addresses') {
        return jsonResponse({ success: true, data: { id: 'addr-1' } })
      }
      if (path === '/api/orders') {
        return jsonResponse({ success: true, data: { id: 'order-1', orderNumber: 'LUM-TEST-1' } })
      }
      return jsonResponse({ success: true, data: {} })
    })
  })

  it('shows the sign-in prompt to signed-out shoppers', async () => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    const user = userEvent.setup()
    renderCheckout()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(useUIStore.getState().isAuthModalOpen).toBe(true)
    expect(useUIStore.getState().authMode).toBe('login')
  })

  it('requires a phone number before advancing', async () => {
    const user = userEvent.setup()
    renderCheckout()

    await user.click(screen.getByRole('button', { name: /continue to shipping/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/phone number/i)
  })

  it('defaults to COD, asks for confirmation, and sends notes with the order', async () => {
    const user = userEvent.setup()
    renderCheckout()
    const flowUser = await fillCheckoutToPayment()

    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeChecked()
    await flowUser.type(screen.getByLabelText(/order notes/i), 'Please call before delivery')
    expect(screen.getByText('27/500')).toBeInTheDocument()

    await flowUser.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByRole('alertdialog', { name: 'CONFIRM ORDER' })).toBeInTheDocument()

    await flowUser.click(screen.getByRole('button', { name: 'Yes, place order' }))

    expect(await screen.findByText('ORDER CONFIRMED')).toBeInTheDocument()
    expect(useCartStore.getState().items).toEqual([])

    const orderCall = apiMock.mock.calls.find((call) => call[0] === '/api/orders')
    expect(orderCall).toBeTruthy()
    const payload = JSON.parse(orderCall?.[1]?.body as string)
    expect(payload).toMatchObject({
      items: [{ productId: 'p1', productSlug: 'silk-hydration-essence', quantity: 1 }],
      addressId: 'addr-1',
      paymentMethod: 'cod',
      shippingMethod: 'standard',
      notes: 'Please call before delivery',
    })
  })

  it('does not add shipping or VAT to a $0.02 sandbox product', async () => {
    useCartStore.setState({
      items: [{ product: { ...product, id: 'test', slug: 'test', name: 'test', price: 0.02 }, quantity: 1 }],
      isOpen: false,
      coupon: null,
      couponError: null,
    })
    renderCheckout()
    const flowUser = await fillCheckoutToPayment()

    await flowUser.click(screen.getByRole('radio', { name: /aba payway/i }))
    expect(screen.getByRole('button', { name: /pay now.*0\.02/i })).toBeInTheDocument()
  })

  it('shows only COD and ABA PayWay and does not show card or Bakong options', async () => {
    renderCheckout()
    const flowUser = await fillCheckoutToPayment()

    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /aba payway/i })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /credit \/ debit card/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /bakong/i })).not.toBeInTheDocument()
  })

  it('does not place an order when confirmation is cancelled', async () => {
    renderCheckout()
    const flowUser = await fillCheckoutToPayment()

    await flowUser.click(screen.getByRole('button', { name: /place order/i }))
    await flowUser.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(apiMock.mock.calls.some((call) => call[0] === '/api/orders')).toBe(false)
  })
})

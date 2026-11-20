import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AccountPage from './AccountPage'
import { useAuthStore, useUIStore } from '../lib/store'
import { apiFetch } from '../lib/api'

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

const order = {
  id: 'o1',
  orderNumber: 'LUM-ABC-1234',
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  paymentMethod: 'cod',
  trackingNumber: null,
  subtotal: 42,
  shipping: 8.95,
  tax: 4.2,
  discount: 0,
  total: 55.15,
  notes: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  items: [
    { id: 'i1', productId: 'p1', name: 'Silk Hydration Essence', price: 42, quantity: 1, product: { name: 'Silk Hydration Essence', images: [] } },
  ],
}

const address = {
  id: 'a1',
  firstName: 'Sophie',
  lastName: 'Martin',
  street: 'House 12, Street 215',
  city: 'Phnom Penh',
  state: 'Chamkarmon',
  zip: '12000',
  country: 'Cambodia',
  phone: '012345678',
  isDefault: true,
}

function renderAccount() {
  return render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>,
  )
}

describe('AccountPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'sophie@example.com',
        firstName: 'Sophie',
        lastName: 'Martin',
        role: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    useUIStore.setState({ isAuthModalOpen: false })
    apiMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/orders/my')) {
        const active = path.includes('status=active')
        return jsonResponse({
          success: true,
          data: active ? [] : [order],
          pagination: { page: 1, limit: 10, total: active ? 0 : 1, totalPages: 1 },
          summary: { totalOrders: 1, totalSpent: 55.15 },
        })
      }
      if (path === '/api/users/addresses') {
        return jsonResponse({ success: true, data: [address] })
      }
      if (path === '/api/orders/o1/cancel') {
        return jsonResponse({ success: true, data: { ...order, status: 'CANCELLED' } })
      }
      return jsonResponse({ success: true, data: {} })
    })
  })

  it('asks signed-out shoppers to sign in', async () => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    const user = userEvent.setup()
    renderAccount()

    expect(screen.getByText(/sign in to see your orders/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(useUIStore.getState().isAuthModalOpen).toBe(true)
  })

  it('loads orders, stats, and payment status', async () => {
    renderAccount()

    expect(await screen.findByText('LUM-ABC-1234')).toBeInTheDocument()
    expect(screen.getAllByText('$55.15').length).toBeGreaterThan(0)
    expect(screen.getByText('Unpaid')).toBeInTheDocument()
    expect(screen.getByText('1 order')).toBeInTheDocument()
  })

  it('filters to active orders through the API', async () => {
    const user = userEvent.setup()
    renderAccount()
    await screen.findByText('LUM-ABC-1234')

    await user.click(screen.getByRole('button', { name: 'Active' }))

    await waitFor(() =>
      expect(apiMock.mock.calls.some((call) => String(call[0]).includes('status=active'))).toBe(true),
    )
    expect(await screen.findByText(/no orders in this view/i)).toBeInTheDocument()
  })

  it('cancels an unpaid pending order after confirmation', async () => {
    const user = userEvent.setup()
    renderAccount()
    await screen.findByText('LUM-ABC-1234')

    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    expect(await screen.findByRole('alertdialog', { name: 'CANCEL ORDER' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Yes, cancel order' }))

    await waitFor(() =>
      expect(apiMock.mock.calls.some((call) => call[0] === '/api/orders/o1/cancel')).toBe(true),
    )
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
  })

  it('shows saved addresses in the account area', async () => {
    const user = userEvent.setup()
    renderAccount()
    await screen.findByText('LUM-ABC-1234')

    await user.click(screen.getByRole('button', { name: /My Addresses/i }))

    expect(await screen.findByText(/House 12, Street 215/)).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
  })
})

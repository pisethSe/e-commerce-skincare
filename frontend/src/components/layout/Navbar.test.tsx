import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'
import { useAuthStore, useCartStore, useUIStore, useWishlistStore } from '../../lib/store'
import type { Product } from '../../types'

const product: Product = {
  id: 'p1',
  name: 'Silk Hydration Essence',
  slug: 'silk-hydration-essence',
  tagline: 'Quiet hydration',
  description: 'A lightweight essence.',
  price: 20,
  images: [],
  category: { id: 'c1', name: 'Serums', slug: 'serums' },
  categoryId: 'c1',
  tags: [],
  rating: 0,
  reviewCount: 0,
  inStock: true,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false, coupon: null, couponError: null })
    useWishlistStore.setState({ ids: [] })
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    useUIStore.setState({ isMobileMenuOpen: false, isSearchOpen: false, isAuthModalOpen: false })
  })

  it('keeps the cart badge live when items are added and cleared', () => {
    renderNavbar()
    const cartButton = screen.getByRole('button', { name: 'Open cart' })

    expect(within(cartButton).queryByText('1')).not.toBeInTheDocument()

    act(() => useCartStore.getState().addItem(product, 1))
    expect(within(cartButton).getByText('1')).toBeInTheDocument()

    act(() => useCartStore.getState().addItem(product, 2))
    expect(within(cartButton).getByText('3')).toBeInTheDocument()

    act(() => useCartStore.getState().clearCart())
    expect(within(cartButton).queryByText('3')).not.toBeInTheDocument()
  })

  it('shows the wishlist count and signed-in account actions', () => {
    useWishlistStore.setState({ ids: ['p1', 'p2'] })
    useAuthStore.setState({
      user: { id: 'u1', email: 'sophie@example.com', firstName: 'Sophie', lastName: 'Lim', role: 'USER' },
      accessToken: 'token',
      refreshToken: 'refresh',
    })
    renderNavbar()

    expect(screen.getByText('HI, SOPHIE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('opens and closes the search overlay with the search button and Escape', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNavbar()

    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(useUIStore.getState().isSearchOpen).toBe(true)

    await user.keyboard('{Escape}')
    expect(useUIStore.getState().isSearchOpen).toBe(false)
  })
})

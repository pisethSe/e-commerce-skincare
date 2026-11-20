import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CartSidebar from './CartSidebar'
import { useCartStore } from '../../lib/store'
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
  rating: 4.5,
  reviewCount: 2,
  inStock: true,
  stockCount: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function renderCart() {
  return render(
    <MemoryRouter>
      <CartSidebar />
    </MemoryRouter>,
  )
}

describe('CartSidebar', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false, coupon: null, couponError: null })
  })

  it('shows an empty state with a shop action', () => {
    useCartStore.setState({ isOpen: true })
    renderCart()

    expect(screen.getByText('Your bag is empty')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SHOP NOW' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /checkout/i })).not.toBeInTheDocument()
  })

  it('renders line items, quantity controls, subtotal, and free-shipping progress', async () => {
    useCartStore.setState({ items: [{ product, quantity: 2 }], isOpen: true })
    const user = userEvent.setup()
    renderCart()

    expect(screen.getByRole('heading', { name: 'Silk Hydration Essence' })).toBeInTheDocument()
    expect(screen.getByText('(1)')).toBeInTheDocument()
    expect(screen.getByText('$40')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /increase quantity of silk hydration essence/i }))
    expect(useCartStore.getState().items[0].quantity).toBe(3)
    expect(screen.getByText('$60')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /decrease quantity of silk hydration essence/i }))
    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('removes an item and returns to the empty state', async () => {
    useCartStore.setState({ items: [{ product, quantity: 1 }], isOpen: true })
    const user = userEvent.setup()
    renderCart()

    await user.click(screen.getByRole('button', { name: /remove silk hydration essence/i }))

    expect(useCartStore.getState().items).toEqual([])
    expect(screen.getByText('Your bag is empty')).toBeInTheDocument()
  })

  it('closes with the cancel action and the close button', async () => {
    useCartStore.setState({ items: [{ product, quantity: 1 }], isOpen: true })
    const user = userEvent.setup()
    renderCart()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useCartStore.getState().isOpen).toBe(false)

    act(() => useCartStore.setState({ isOpen: true }))
    await user.click(await screen.findByRole('button', { name: 'Close cart' }))
    expect(useCartStore.getState().isOpen).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProductPage from './ProductPage'
import { useCartStore, useWishlistStore } from '../lib/store'
import { useCatalogStore } from '../lib/catalog'
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
  price: 20,
  images: ['/essence.jpg'],
  category: { id: 'c1', name: 'Serums', slug: 'serums' },
  categoryId: 'c1',
  tags: [],
  rating: 4.5,
  reviewCount: 2,
  inStock: true,
  stockCount: 3,
  lowStockThreshold: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function renderProduct() {
  return render(
    <MemoryRouter initialEntries={['/products/silk-hydration-essence']}>
      <Routes>
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route path="/checkout" element={<div>Checkout destination</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProductPage', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false, coupon: null, couponError: null })
    useWishlistStore.setState({ ids: [] })
    useCatalogStore.setState({
      products: [product],
      categories: [product.category],
      posts: [],
      source: 'api',
      loading: false,
    })
    apiMock.mockResolvedValue(
      jsonResponse({ success: true, data: [], summary: { average: 0, total: 0, distribution: {} } }),
    )
  })

  it('shows stock urgency and enforces the stock cap on quantity', async () => {
    const user = userEvent.setup()
    renderProduct()

    expect(screen.getByText('Only 3 left')).toBeInTheDocument()

    const increase = screen.getByRole('button', { name: 'Increase quantity' })
    await user.click(increase)
    await user.click(increase)
    expect(increase).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /add to bag/i }))
    expect(useCartStore.getState().items[0].quantity).toBe(3)
  })

  it('adds to the bag and supports Buy Now navigation', async () => {
    const user = userEvent.setup()
    renderProduct()

    await user.click(screen.getByRole('button', { name: /buy now/i }))

    expect(useCartStore.getState().items[0].quantity).toBe(1)
    expect(await screen.findByText('Checkout destination')).toBeInTheDocument()
  })

  it('toggles the wishlist and copies the product link', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    renderProduct()

    await user.click(screen.getByRole('button', { name: 'SAVE' }))
    expect(useWishlistStore.getState().ids).toEqual(['p1'])
    expect(screen.getByRole('button', { name: 'SAVED' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'SHARE' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href))
    expect(await screen.findByRole('button', { name: 'LINK COPIED' })).toBeInTheDocument()
  })

  it('disables purchase actions for sold-out products and shows the stock-notify form', () => {
    useCatalogStore.setState({
      products: [{ ...product, inStock: false, stockCount: 0 }],
      categories: [product.category],
      posts: [],
      source: 'api',
      loading: false,
    })
    renderProduct()

    expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'BUY NOW' })).toBeDisabled()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
  })
})

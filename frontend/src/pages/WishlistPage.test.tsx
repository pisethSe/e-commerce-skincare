import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import WishlistPage from './WishlistPage'
import { useCatalogStore } from '../lib/catalog'
import { useWishlistStore } from '../lib/store'
import type { Product } from '../types'

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

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

function renderWishlist() {
  return render(
    <MemoryRouter>
      <WishlistPage />
    </MemoryRouter>,
  )
}

describe('WishlistPage', () => {
  beforeEach(() => {
    useCatalogStore.setState({
      products: [product],
      categories: [product.category],
      posts: [],
      source: 'api',
      loading: false,
    })
    useWishlistStore.setState({ ids: [] })
  })

  it('shows the empty state when nothing is saved', () => {
    renderWishlist()

    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore products' })).toHaveAttribute('href', '/shop')
  })

  it('renders saved products and removes them', async () => {
    useWishlistStore.setState({ ids: ['p1'] })
    const user = userEvent.setup()
    renderWishlist()

    expect(screen.getByText('Silk Hydration Essence')).toBeInTheDocument()
    expect(screen.getByText('1 saved')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove from wishlist' }))

    expect(useWishlistStore.getState().ids).toEqual([])
    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument()
  })

  it('keeps sold-out saved products visible with a badge', () => {
    useCatalogStore.setState({
      products: [{ ...product, inStock: false, stockCount: 0 }],
      categories: [product.category],
      posts: [],
      source: 'api',
      loading: false,
    })
    useWishlistStore.setState({ ids: ['p1'] })
    renderWishlist()

    expect(screen.getAllByText('Sold out').length).toBeGreaterThan(0)
  })

  it('resolves saved products that are not in the in-stock catalogue', async () => {
    useWishlistStore.setState({ ids: ['p2'] })
    const remote = { ...product, id: 'p2', name: 'Remote Saved Serum', slug: 'remote-saved-serum' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ success: true, data: [remote] }),
    )

    renderWishlist()

    expect(await screen.findByText('Remote Saved Serum')).toBeInTheDocument()
  })
})

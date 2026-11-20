import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ShopPage from './ShopPage'
import { useCatalogStore } from '../lib/catalog'
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
  rating: 4.5,
  reviewCount: 2,
  inStock: true,
  stockCount: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

function renderShop() {
  return render(
    <MemoryRouter initialEntries={['/shop']}>
      <ShopPage />
    </MemoryRouter>,
  )
}

describe('ShopPage', () => {
  let fetchMock: { mock: { calls: unknown[][] } }

  beforeEach(() => {
    useCatalogStore.setState({
      products: [product],
      categories: [product.category],
      posts: [],
      source: 'api',
      loading: false,
    })
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        success: true,
        data: [product],
        pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
        facets: {
          categories: [{ slug: 'serums', name: 'Serums', count: 1 }],
          price: { min: 0, max: 100 },
          ratings: { '3': 0, '4': 1 },
        },
      }),
    )
  })

  const lastProductUrl = () => {
    const calls = fetchMock.mock.calls.map((call) => String(call[0]))
    return calls.filter((url) => url.includes('/api/products?')).at(-1) ?? ''
  }

  it('renders the catalogue result count and product card', async () => {
    renderShop()

    expect(await screen.findByText('Silk Hydration Essence')).toBeInTheDocument()
    expect(screen.getByText('1 product')).toBeInTheDocument()
    expect(lastProductUrl()).toContain('limit=12')
  })

  it('applies a category and reflects it in the API query', async () => {
    const user = userEvent.setup()
    renderShop()
    await screen.findByText('Silk Hydration Essence')

    await user.click(screen.getByRole('button', { name: 'Serums' }))

    await waitFor(() => expect(lastProductUrl()).toContain('category=serums'))
  })

  it('applies a custom price range and swaps reversed bounds', async () => {
    const user = userEvent.setup()
    renderShop()
    await screen.findByText('Silk Hydration Essence')

    await user.type(screen.getByLabelText('Minimum price'), '60')
    await user.type(screen.getByLabelText('Maximum price'), '25')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(lastProductUrl()).toContain('minPrice=25'))
    expect(lastProductUrl()).toContain('maxPrice=60')
  })

  it('sorts results and clears all filters', async () => {
    const user = userEvent.setup()
    renderShop()
    await screen.findByText('Silk Hydration Essence')

    await user.selectOptions(screen.getByRole('combobox'), 'price_asc')
    await waitFor(() => expect(lastProductUrl()).toContain('sortBy=price_asc'))

    await user.click(screen.getByRole('button', { name: 'Serums' }))
    await waitFor(() => expect(lastProductUrl()).toContain('category=serums'))

    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(lastProductUrl()).not.toContain('category=serums'))
  })
})

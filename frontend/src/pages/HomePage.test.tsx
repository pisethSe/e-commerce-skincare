import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'
import { useCatalogStore } from '../lib/catalog'
import { apiFetch } from '../lib/api'
import type { Product } from '../types'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, apiFetch: vi.fn() }
})

const apiMock = apiFetch as unknown as ReturnType<typeof vi.fn>

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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    useCatalogStore.setState({
      products: [product],
      categories: [product.category],
      posts: [],
      source: 'api',
      loading: false,
    })
    apiMock.mockResolvedValue(jsonResponse({ success: true, data: {} }))
  })

  it('shows the announcement bar and shop-by-category links', () => {
    renderHome()

    expect(screen.getAllByText(/free standard delivery.*over \$75/i)[0]).toBeInTheDocument()
    expect(screen.getByText('Shop by Category')).toBeInTheDocument()
    const categoryLink = screen.getAllByText('Serums')[0].closest('a')
    expect(categoryLink).toHaveAttribute('href', '/shop?category=serums')
  })

  it('renders featured products', () => {
    renderHome()

    expect(screen.getByText(/Quiet hydration/)).toBeInTheDocument()
  })

  it('subscribes to the newsletter and confirms success', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.type(screen.getByPlaceholderText('Enter email...'), 'sophie@example.com')
    await user.click(screen.getByRole('button', { name: 'SUBSCRIBE' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/welcome! check your inbox/i)
    expect(apiMock).toHaveBeenCalledWith(
      '/api/newsletter/subscribe',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('shows an error when the newsletter API rejects the email', async () => {
    apiMock.mockResolvedValue(jsonResponse({ success: false, message: 'Already subscribed' }, 400))
    const user = userEvent.setup()
    renderHome()

    await user.type(screen.getByPlaceholderText('Enter email...'), 'sophie@example.com')
    await user.click(screen.getByRole('button', { name: 'SUBSCRIBE' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

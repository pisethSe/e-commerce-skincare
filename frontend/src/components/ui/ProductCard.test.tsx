import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProductCard from './ProductCard'
import { useCartStore } from '../../lib/store'
import type { Product } from '../../types'

const baseProduct: Product = {
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

function renderCard(product: Product) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>,
  )
}

describe('ProductCard', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
  })

  it('adds an in-stock product to the bag', async () => {
    const user = userEvent.setup()
    renderCard(baseProduct)

    await user.click(screen.getByRole('button', { name: /add to bag/i }))

    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].product.id).toBe('p1')
  })

  it('disables add-to-bag for sold-out products', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseProduct, inStock: false, stockCount: 0 })

    const button = screen.getByRole('button', { name: /sold out/i })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

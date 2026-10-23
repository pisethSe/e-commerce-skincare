import { describe, expect, it } from 'vitest'
import { normalizeProduct } from './catalog'
import type { Product } from '../types'

const apiProduct = {
  id: 'p1',
  name: 'Silk Barrier Moisturizer',
  slug: 'silk-barrier-moisturizer',
  description: 'A cushiony cream.',
  price: '64.00',
  comparePrice: '72.00',
  rating: '4.00',
  reviewCount: 2,
  inStock: true,
  category: { id: 'c1', name: 'Moisturizers', slug: 'moisturizers' },
}

describe('normalizeProduct', () => {
  it('coerces Prisma decimal strings into numbers', () => {
    const product = normalizeProduct(apiProduct, [])
    expect(product.price).toBe(64)
    expect(product.comparePrice).toBe(72)
    expect(product.rating).toBe(4)
    expect(product.reviewCount).toBe(2)
  })

  it('defaults optional collections and copy to safe empties', () => {
    const product = normalizeProduct({ ...apiProduct, tagline: null }, [])
    expect(product.tagline).toBe('')
    expect(product.images).toEqual([])
    expect(product.tags).toEqual([])
    expect(product.ingredients).toEqual([])
    expect(product.benefits).toEqual([])
  })

  it('keeps the nested category when the API provides one', () => {
    const product = normalizeProduct(apiProduct, [])
    expect(product.category.slug).toBe('moisturizers')
    expect(product.category.name).toBe('Moisturizers')
  })

  it('falls back to bundled category data when the API omits it', () => {
    const { category, ...withoutCategory } = apiProduct
    const product = normalizeProduct(withoutCategory, [])
    expect(product.category).toBeTruthy()
    expect(product.category.slug).toBeTruthy()
  })

  it('produces a product that satisfies the shared Product type', () => {
    const product: Product = normalizeProduct(apiProduct, [])
    expect(product.id).toBe('p1')
    expect(product.inStock).toBe(true)
  })
})

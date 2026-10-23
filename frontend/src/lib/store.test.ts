import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore, useWishlistStore } from './store'
import type { Product } from '../types'

function product(id: string, price: number): Product {
  return {
    id,
    name: `Product ${id}`,
    slug: `product-${id}`,
    tagline: '',
    description: 'Test product',
    price,
    images: [],
    category: { id: 'c1', name: 'Serums', slug: 'serums' },
    categoryId: 'c1',
    tags: [],
    rating: 0,
    reviewCount: 0,
    inStock: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

beforeEach(() => {
  useCartStore.setState({ items: [], coupon: null, couponError: null, isOpen: false })
  useWishlistStore.setState({ ids: [] })
})

describe('cart store', () => {
  it('merges a repeated product instead of adding a duplicate row', () => {
    useCartStore.getState().addItem(product('a', 20), 1)
    useCartStore.getState().addItem(product('a', 20), 2)

    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(3)
    expect(useCartStore.getState().itemCount()).toBe(3)
    expect(useCartStore.getState().total()).toBe(60)
  })

  it('keeps different products on separate rows', () => {
    useCartStore.getState().addItem(product('a', 20), 1)
    useCartStore.getState().addItem(product('b', 35), 1)

    expect(useCartStore.getState().items).toHaveLength(2)
    expect(useCartStore.getState().total()).toBe(55)
  })

  it('removes a row when the quantity drops to zero', () => {
    useCartStore.getState().addItem(product('a', 20), 1)
    useCartStore.getState().updateQuantity('a', 0)

    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().total()).toBe(0)
  })

  it('updates quantities and can clear the bag', () => {
    useCartStore.getState().addItem(product('a', 20), 1)
    useCartStore.getState().updateQuantity('a', 4)
    expect(useCartStore.getState().itemCount()).toBe(4)

    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toEqual([])
    expect(useCartStore.getState().coupon).toBeNull()
  })
})

describe('wishlist store', () => {
  it('toggles products on and off', () => {
    useWishlistStore.getState().toggle('p1')
    expect(useWishlistStore.getState().ids).toEqual(['p1'])
    expect(useWishlistStore.getState().has('p1')).toBe(true)

    useWishlistStore.getState().toggle('p1')
    expect(useWishlistStore.getState().ids).toEqual([])
    expect(useWishlistStore.getState().has('p1')).toBe(false)
  })

  it('persists saved products to localStorage', () => {
    useWishlistStore.getState().toggle('p1')
    const stored = JSON.parse(window.localStorage.getItem('calesta-wishlist') ?? '{}')
    expect(stored.state.ids).toEqual(['p1'])
  })
})

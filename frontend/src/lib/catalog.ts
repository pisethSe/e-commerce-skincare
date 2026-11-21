import { create } from 'zustand'
import { getApiUrl } from './api'
import { CATEGORIES as STATIC_CATEGORIES, PRODUCTS as STATIC_PRODUCTS, BLOG_POSTS as STATIC_POSTS } from './data'
import type { BlogPost, Category, Product } from '../types'

/**
 * Catalog store — the storefront's single source of product/category/journal data.
 * Tries the live API first (so admin edits appear in the store) and falls back
 * to the bundled mock data when the API is unreachable.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function normalizeCategory(c: any): Category {
  const slug = c.slug
  // The API categories carry no image — borrow the static one so the grid stays visual
  const staticMatch = STATIC_CATEGORIES.find((s) => s.slug === slug)
  return {
    id: c.id,
    name: c.name,
    slug,
    description: c.description ?? staticMatch?.description,
    image: c.image ?? staticMatch?.image,
    productCount: c._count?.products ?? staticMatch?.productCount,
  }
}

export function normalizeProduct(p: any, categories: Category[]): Product {
  const lowQualityProductImage = /^\/images\/figma-products\/product-\d{2}\.png$/
  const highQualityImages: Record<string, string[]> = {
    'radiance-brightening-serum': ['/images/Card (2).png', '/images/Content.png'],
    'gentle-foam-cleanser': ['/images/fg1.png', '/images/Card (1).png'],
    'silk-barrier-moisturizer': ['/images/Card 3.png', '/images/Content (2).png'],
    'solar-shield-spf-50': ['/images/Card 2.png', '/images/Content (3).png'],
    'retinol-renewal-night-cream': ['/images/Card 4.png', '/images/Content (4).png'],
    'luminous-eye-concentrate': ['/images/Card 5.png', '/images/Content (5).png'],
    'kaolin-clay-detox-mask': ['/images/fg2.png', '/images/Content 2.png'],
    'hyaluronic-acid-booster': ['/images/Card (1).png', '/images/Content 3.png'],
  }
  const normalizeImages = (images: unknown): string[] =>
    Array.isArray(images)
      ? images
          .map((image) => typeof image === 'string' ? image : '')
          .filter((image) => image && !lowQualityProductImage.test(image))
      : []

  return {
    ...p,
    tagline: p.tagline ?? '',
    price: Number(p.price),
    comparePrice: p.comparePrice != null ? Number(p.comparePrice) : undefined,
    rating: Number(p.rating ?? 0),
    reviewCount: p.reviewCount ?? 0,
    howToUse: p.howToUse ?? undefined,
    volume: p.volume ?? undefined,
    ingredients: p.ingredients ?? [],
    benefits: p.benefits ?? [],
    images: [
      ...normalizeImages(p.images),
      ...(normalizeImages(p.images).length === 0 ? highQualityImages[p.slug] ?? [] : []),
    ].length > 0
      ? [
          ...normalizeImages(p.images),
          ...(normalizeImages(p.images).length === 0 ? highQualityImages[p.slug] ?? [] : []),
        ]
      : highQualityImages[p.slug] ?? [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    category: p.category
      ? normalizeCategory(p.category)
      : categories.find((c) => c.id === p.categoryId) ?? STATIC_CATEGORIES[0],
    createdAt: p.createdAt ?? new Date().toISOString(),
  }
}

function normalizePost(p: any): BlogPost {
  return {
    ...p,
    excerpt: p.excerpt ?? '',
    coverImage: p.coverImage ?? undefined,
    category: p.category ?? 'Journal',
    author: p.author ?? 'Calesta',
    readTime: p.readTime ?? 5,
    publishedAt: p.publishedAt ?? p.createdAt ?? new Date().toISOString(),
  }
}

interface CatalogState {
  products: Product[]
  categories: Category[]
  posts: BlogPost[]
  source: 'api' | 'static'
  loading: boolean
  load: () => Promise<void>
}

export const useCatalogStore = create<CatalogState>((set) => ({
  products: STATIC_PRODUCTS,
  categories: STATIC_CATEGORIES,
  posts: STATIC_POSTS,
  source: 'static',
  loading: false,
  load: async () => {
    set({ loading: true })
    try {
      const [productsRes, categoriesRes, postsRes] = await Promise.all([
        // In-stock only — the storefront must never list out-of-stock products
        // (all=1 is the admin-only flag that includes them)
        fetch(getApiUrl('/api/products?limit=100'), { cache: 'no-store' }),
        fetch(getApiUrl('/api/categories'), { cache: 'no-store' }),
        fetch(getApiUrl('/api/blog?limit=24'), { cache: 'no-store' }),
      ])
      if (!productsRes.ok || !categoriesRes.ok || !postsRes.ok) throw new Error('API unavailable')
      const [productsJson, categoriesJson, postsJson] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
        postsRes.json(),
      ])
      const categories: Category[] = (categoriesJson.data ?? []).map(normalizeCategory)
      const products: Product[] = (productsJson.data ?? []).map((p: any) => normalizeProduct(p, categories))
      const posts: BlogPost[] = (postsJson.data ?? []).map(normalizePost)
      if (categories.length === 0 || products.length === 0) throw new Error('Empty catalog')
      set({ products, categories, posts, source: 'api', loading: false })
    } catch {
      // API down or empty — keep the bundled mock data
      set({ products: STATIC_PRODUCTS, categories: STATIC_CATEGORIES, posts: STATIC_POSTS, source: 'static', loading: false })
    }
  },
}))

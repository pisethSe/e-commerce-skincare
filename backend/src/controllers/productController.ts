import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import { notifyBackInStock } from '../lib/stock'
import {
  SEARCH_CANDIDATE_CAP,
  buildSuggestion,
  scoreProduct,
  tokenizeQuery,
} from '../lib/search'

// GET /api/products
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  const {
    page = '1',
    limit = '12',
    category,
    minPrice,
    maxPrice,
    rating,
    sortBy = 'newest',
    search,
    featured,
    bestseller,
    isNew,
  } = req.query

  const currentPage = Math.max(1, Number(page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 12))

  // Free-text search has its own pipeline (relevance, typo tolerance, facets).
  if (typeof search === 'string' && search.trim()) {
    await searchCatalog(req, res, currentPage, pageSize)
    return
  }

  const skip = (currentPage - 1) * pageSize

  // Build where clause — admins can pass ?all=1 to include out-of-stock products
  const where: Record<string, unknown> = req.query.all === '1' ? {} : { inStock: true }

  if (category) {
    where.category = { slug: category }
  }
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    }
  }
  if (rating) {
    where.rating = { gte: Number(rating) }
  }
  if (featured === 'true') where.isFeatured = true
  if (bestseller === 'true') where.isBestseller = true
  if (isNew === 'true') where.isNew = true

  // Build orderBy
  const orderBy: Record<string, unknown>[] = []
  switch (sortBy) {
    case 'price_asc': orderBy.push({ price: 'asc' }); break
    case 'price_desc': orderBy.push({ price: 'desc' }); break
    case 'rating': orderBy.push({ rating: 'desc' }); break
    case 'bestseller': orderBy.push({ isBestseller: 'desc' }); break
    default: orderBy.push({ createdAt: 'desc' })
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  res.json({
    success: true,
    data: products,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

type SearchProduct = {
  id: string
  name: string
  slug: string
  tagline: string | null
  description: string
  price: unknown
  rating: unknown
  reviewCount: number
  createdAt: Date
  isBestseller: boolean
  tags: string[]
  ingredients: string[]
  category: { id: string; name: string; slug: string } | null
}

function buildSearchFacets(products: SearchProduct[]) {
  const categoryMap = new Map<string, { slug: string; name: string; count: number }>()
  let min = Infinity
  let max = 0
  let fourStars = 0
  let threeStars = 0

  for (const product of products) {
    const price = Number(product.price)
    if (Number.isFinite(price)) {
      min = Math.min(min, price)
      max = Math.max(max, price)
    }
    const stars = Number(product.rating)
    if (stars >= 4) fourStars++
    if (stars >= 3) threeStars++

    if (product.category) {
      const entry = categoryMap.get(product.category.slug) ?? {
        slug: product.category.slug,
        name: product.category.name,
        count: 0,
      }
      entry.count++
      categoryMap.set(product.category.slug, entry)
    }
  }

  return {
    categories: [...categoryMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    price: { min: Number.isFinite(min) ? Math.floor(min) : 0, max: Math.ceil(max) },
    ratings: { '4': fourStars, '3': threeStars },
  }
}

/**
 * Ranked catalog search.
 * - every token must match somewhere (name, tags, tagline, category, description, ingredients)
 * - typos up to 1–2 edits are tolerated via Levenshtein
 * - if nothing matches, fall back to partial matches and offer a "did you mean"
 * - facets are computed from the search result *before* category/price/rating filters,
 *   so filtering never empties the choices
 */
async function searchCatalog(req: Request, res: Response, page: number, limit: number): Promise<void> {
  const rawQuery = String(req.query.search ?? '').trim().slice(0, 80)
  const tokens = tokenizeQuery(rawQuery)

  if (tokens.length === 0) {
    res.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      search: { query: rawQuery, total: 0, suggestion: null },
      facets: { categories: [], price: { min: 0, max: 0 }, ratings: { '4': 0, '3': 0 } },
    })
    return
  }

  const includeOutOfStock = req.query.all === '1'
  const catalogue = (await prisma.product.findMany({
    where: includeOutOfStock ? {} : { inStock: true },
    include: { category: { select: { id: true, name: true, slug: true } } },
    take: SEARCH_CANDIDATE_CAP,
  })) as unknown as SearchProduct[]

  const scored = catalogue.map((product) => ({ product, ...scoreProduct(product, tokens) }))
  const fullMatches = scored.filter((entry) => entry.matched === tokens.length)
  // Partial matches keep the page useful when one word is off ("vitamin c serum").
  const matches = fullMatches.length > 0 ? fullMatches : scored.filter((entry) => entry.matched > 0)

  const facets = buildSearchFacets(matches.map((entry) => entry.product))

  const category = typeof req.query.category === 'string' ? req.query.category : ''
  const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== '' ? Number(req.query.minPrice) : null
  const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : null
  const minRating = req.query.rating !== undefined && req.query.rating !== '' ? Number(req.query.rating) : null

  let results = matches
  if (category) results = results.filter((entry) => entry.product.category?.slug === category)
  if (minPrice !== null && Number.isFinite(minPrice)) {
    results = results.filter((entry) => Number(entry.product.price) >= minPrice)
  }
  if (maxPrice !== null && Number.isFinite(maxPrice)) {
    results = results.filter((entry) => Number(entry.product.price) <= maxPrice)
  }
  if (minRating !== null && Number.isFinite(minRating)) {
    results = results.filter((entry) => Number(entry.product.rating) >= minRating)
  }

  const sortBy = String(req.query.sortBy ?? 'relevance')
  results = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return Number(a.product.price) - Number(b.product.price)
      case 'price_desc':
        return Number(b.product.price) - Number(a.product.price)
      case 'rating':
        return Number(b.product.rating) - Number(a.product.rating) || b.product.reviewCount - a.product.reviewCount
      case 'bestseller':
        return Number(b.product.isBestseller) - Number(a.product.isBestseller) || b.score - a.score
      case 'newest':
        return new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime()
      default:
        return (
          b.score - a.score ||
          Number(b.product.rating) - Number(a.product.rating) ||
          a.product.name.localeCompare(b.product.name)
        )
    }
  })

  const total = results.length
  const start = (page - 1) * limit
  const data = results.slice(start, start + limit).map((entry) => entry.product)
  const suggestion = matches.length === 0 ? buildSuggestion(catalogue, tokens) : null

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    search: { query: rawQuery, total, suggestion },
    facets,
  })
}

// GET /api/products/suggest?q= — typeahead for the navbar search overlay
export const suggestProducts = async (req: Request, res: Response): Promise<void> => {
  const rawQuery = String(req.query.q ?? req.query.search ?? '').trim().slice(0, 80)
  const tokens = tokenizeQuery(rawQuery)

  if (tokens.length === 0) {
    res.json({ success: true, data: [], suggestion: null })
    return
  }

  const catalogue = (await prisma.product.findMany({
    where: { inStock: true },
    include: { category: { select: { id: true, name: true, slug: true } } },
    take: SEARCH_CANDIDATE_CAP,
  })) as unknown as SearchProduct[]

  const matches = catalogue
    .map((product) => ({ product, ...scoreProduct(product, tokens) }))
    .filter((entry) => entry.matched === tokens.length)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.product.rating) - Number(a.product.rating) ||
        a.product.name.localeCompare(b.product.name)
    )
    .slice(0, 6)

  const suggestion = matches.length === 0 ? buildSuggestion(catalogue, tokens) : null

  res.json({
    success: true,
    data: matches.map(({ product }) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      images: (product as unknown as { images: string[] }).images?.slice(0, 1) ?? [],
      category: product.category,
    })),
    suggestion,
  })
}

// GET /api/products/:slug
export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug as string },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: true,
      reviews: {
        where: { approved: true },
        include: {
          user: { select: { firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!product) throw new ApiError('Product not found', 404)

  res.json({ success: true, data: product })
}

// GET /api/products/:id/related
export const getRelatedProducts = async (req: Request, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id as string },
    select: { categoryId: true },
  })
  if (!product) throw new ApiError('Product not found', 404)

  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: req.params.id as string },
      inStock: true,
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
    take: 4,
    orderBy: { rating: 'desc' },
  })

  res.json({ success: true, data: related })
}

// POST /api/products — Admin only
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    name, slug, tagline, description, longDescription,
    price, comparePrice, volume, categoryId, images, tags,
    ingredients, benefits, howToUse, isNew, isBestseller,
    isFeatured, inStock, stockCount,
  } = req.body

  if (!name || !description || !price || !categoryId) {
    throw new ApiError('Name, description, price, and category are required', 400)
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new ApiError('Category not found', 404)

  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        tagline,
        description,
        longDescription,
        price,
        comparePrice,
        volume,
        categoryId,
        images: images || [],
        tags: tags || [],
        ingredients: ingredients || [],
        benefits: benefits || [],
        howToUse,
        isNew: isNew || false,
        isBestseller: isBestseller || false,
        isFeatured: isFeatured || false,
        inStock: inStock !== undefined ? inStock : true,
        stockCount: stockCount || 0,
      },
      include: { category: true },
    })
    res.status(201).json({ success: true, data: product })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      throw new ApiError('A product with that slug already exists — pick a different name or slug', 409)
    }
    throw err
  }
}

// PUT /api/products/:id — Admin only
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id as string } })
  if (!product) throw new ApiError('Product not found', 404)

  if (req.body.stockCount !== undefined) {
    const stockCount = Number(req.body.stockCount)
    if (!Number.isInteger(stockCount) || stockCount < 0) {
      throw new ApiError('Stock count must be a whole number of 0 or more.', 400)
    }
    req.body.stockCount = stockCount
    // Keep the storefront flag honest: zero units means sold out.
    if (stockCount === 0) req.body.inStock = false
    else if (req.body.inStock === undefined) req.body.inStock = true
  }

  const wasOut = !product.inStock || product.stockCount <= 0

  try {
    const updated = await prisma.product.update({
      where: { id: req.params.id as string },
      data: req.body,
      include: { category: true },
    })

    if (wasOut && updated.inStock && updated.stockCount > 0) {
      await notifyBackInStock(updated.id)
    }

    res.json({ success: true, data: updated })
  } catch (err: unknown) {
    const prismaCode = (err as { code?: string })?.code
    // A nonexistent categoryId arrives as a foreign-key error — make it a 400
    if (prismaCode === 'P2003') {
      throw new ApiError('Category not found', 400)
    }
    if (prismaCode === 'P2002') {
      throw new ApiError('A product with that slug already exists — pick a different name or slug', 409)
    }
    throw err
  }
}

// DELETE /api/products/:id — Admin only
export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id as string } })
  if (!product) throw new ApiError('Product not found', 404)

  try {
    await prisma.product.delete({ where: { id: req.params.id as string } })
  } catch (err: unknown) {
    // Order items preserve the product record (no cascade) — block with a clean
    // business error instead of a foreign-key 500.
    if ((err as { code?: string })?.code === 'P2003') {
      throw new ApiError('This product has order history and cannot be deleted — mark it out of stock instead', 409)
    }
    throw err
  }

  res.json({ success: true, message: 'Product deleted successfully' })
}

import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'

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

  const skip = (Number(page) - 1) * Number(limit)

  // Build where clause
  const where: Record<string, unknown> = { inStock: true }

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
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { tags: { has: search as string } },
    ]
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
      take: Number(limit),
    }),
    prisma.product.count({ where }),
  ])

  res.json({
    success: true,
    data: products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  })
}

// GET /api/products/:slug
export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
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
    where: { id: req.params.id },
    select: { categoryId: true },
  })
  if (!product) throw new ApiError('Product not found', 404)

  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: req.params.id },
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
}

// PUT /api/products/:id — Admin only
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) throw new ApiError('Product not found', 404)

  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data: req.body,
    include: { category: true },
  })

  res.json({ success: true, data: updated })
}

// DELETE /api/products/:id — Admin only
export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) throw new ApiError('Product not found', 404)

  await prisma.product.delete({ where: { id: req.params.id } })

  res.json({ success: true, message: 'Product deleted successfully' })
}

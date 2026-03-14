import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'

// =============================================
// REVIEWS
// =============================================

// POST /api/reviews
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const { productId, rating, title, body } = req.body

  if (!productId || !rating || !body) {
    throw new ApiError('Product, rating, and review body are required', 400)
  }
  if (rating < 1 || rating > 5) throw new ApiError('Rating must be between 1 and 5', 400)

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) throw new ApiError('Product not found', 404)

  // Check if user already reviewed this product
  const existing = await prisma.review.findFirst({
    where: { userId: req.user!.id, productId },
  })
  if (existing) throw new ApiError('You have already reviewed this product', 409)

  // Check if user has purchased the product (for "verified purchase")
  const purchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId: req.user!.id, status: { in: ['DELIVERED', 'SHIPPED'] } },
    },
  })

  const review = await prisma.review.create({
    data: {
      userId: req.user!.id,
      productId,
      rating,
      title,
      body,
      verified: !!purchased,
    },
    include: {
      user: { select: { firstName: true, lastName: true, avatar: true } },
    },
  })

  // Recalculate product rating
  const allReviews = await prisma.review.findMany({
    where: { productId, approved: true },
    select: { rating: true },
  })
  if (allReviews.length > 0) {
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    await prisma.product.update({
      where: { id: productId },
      data: { rating: avgRating, reviewCount: allReviews.length },
    })
  }

  res.status(201).json({ success: true, data: review })
}

// GET /api/reviews/product/:productId
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '10', sort = 'newest' } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const orderBy =
    sort === 'highest' ? { rating: 'desc' as const } :
    sort === 'lowest'  ? { rating: 'asc' as const } :
                         { createdAt: 'desc' as const }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId: req.params.productId, approved: true },
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
      orderBy,
      skip,
      take: Number(limit),
    }),
    prisma.review.count({ where: { productId: req.params.productId, approved: true } }),
  ])

  res.json({
    success: true,
    data: reviews,
    pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  })
}

// =============================================
// CART (server-side for logged-in users)
// =============================================

// GET /api/cart
export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.user!.id },
    include: {
      product: {
        include: { category: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ success: true, data: items })
}

// POST /api/cart
export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
  const { productId, quantity = 1 } = req.body
  if (!productId) throw new ApiError('Product ID required', 400)

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || !product.inStock) throw new ApiError('Product unavailable', 404)

  const cartItem = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: req.user!.id, productId } },
    update: { quantity: { increment: quantity } },
    create: { userId: req.user!.id, productId, quantity },
    include: { product: true },
  })

  res.json({ success: true, data: cartItem })
}

// PATCH /api/cart/:productId
export const updateCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const { quantity } = req.body
  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user!.id, productId: req.params.productId },
    })
    res.json({ success: true, message: 'Item removed from cart' })
    return
  }
  const item = await prisma.cartItem.updateMany({
    where: { userId: req.user!.id, productId: req.params.productId },
    data: { quantity },
  })
  res.json({ success: true, data: item })
}

// DELETE /api/cart/:productId
export const removeFromCart = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.cartItem.deleteMany({
    where: { userId: req.user!.id, productId: req.params.productId },
  })
  res.json({ success: true, message: 'Removed from cart' })
}

// DELETE /api/cart
export const clearCart = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user!.id } })
  res.json({ success: true, message: 'Cart cleared' })
}

// =============================================
// NEWSLETTER
// =============================================

// POST /api/newsletter/subscribe
export const subscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  const { email, firstName } = req.body
  if (!email) throw new ApiError('Email is required', 400)

  await prisma.newsletter.upsert({
    where: { email },
    update: { active: true, firstName },
    create: { email, firstName, active: true },
  })

  res.json({ success: true, message: 'Successfully subscribed!' })
}

// POST /api/newsletter/unsubscribe
export const unsubscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body
  if (!email) throw new ApiError('Email is required', 400)

  await prisma.newsletter.updateMany({
    where: { email },
    data: { active: false },
  })

  res.json({ success: true, message: 'Successfully unsubscribed.' })
}

import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import { sendMail, newsletterWelcomeEmail } from '../lib/email'

// =============================================
// REVIEWS
// =============================================

// POST /api/reviews
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const { productId, rating, title, body } = req.body

  const stars = Number(rating)
  const text = typeof body === 'string' ? body.trim() : ''

  if (!productId || !rating || !text) {
    throw new ApiError('Product, rating, and review body are required', 400)
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new ApiError('Rating must be a whole number between 1 and 5', 400)
  }
  if (text.length < 10) throw new ApiError('Review must be at least 10 characters', 400)
  if (text.length > 2000) throw new ApiError('Review must be 2,000 characters or fewer', 400)
  const cleanTitle = typeof title === 'string' && title.trim() ? title.trim().slice(0, 120) : null

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
      rating: stars,
      title: cleanTitle,
      body: text,
      verified: !!purchased,
    },
    include: {
      user: { select: { firstName: true, lastName: true, avatar: true } },
    },
  })

  // New reviews await moderation, so this normally leaves the aggregate unchanged —
  // but recalculating keeps it correct if the store ever auto-approves.
  const agg = await prisma.review.aggregate({
    where: { productId, approved: true },
    _avg: { rating: true },
    _count: { id: true },
  })
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      reviewCount: agg._count.id,
    },
  })

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

  const productId = req.params.productId as string
  const where = { productId, approved: true }

  const [reviews, total, distributionRows] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
      orderBy,
      skip,
      take: Number(limit),
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({
      by: ['rating'],
      where,
      _count: { id: true },
      orderBy: { rating: 'desc' },
    }),
  ])

  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  let ratingSum = 0
  for (const row of distributionRows) {
    distribution[String(row.rating)] = row._count.id
    ratingSum += row.rating * row._count.id
  }

  res.json({
    success: true,
    data: reviews,
    summary: {
      average: total > 0 ? Number((ratingSum / total).toFixed(2)) : 0,
      total,
      distribution,
    },
    pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  })
}

// GET /api/reviews/product/:productId/mine — the signed-in customer's own review
export const getMyReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const productId = req.params.productId as string

  if (!req.user) {
    res.json({ success: true, data: { signedIn: false, review: null, canReview: false, purchased: false } })
    return
  }

  const [review, purchase] = await Promise.all([
    prisma.review.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    }),
    prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId: req.user.id, status: { in: ['SHIPPED', 'DELIVERED'] } },
      },
      select: { id: true },
    }),
  ])

  res.json({
    success: true,
    data: {
      signedIn: true,
      review,
      canReview: !review,
      canReviewPurchased: Boolean(purchase),
      purchased: Boolean(purchase),
    },
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
      where: { userId: req.user!.id, productId: req.params.productId as string },
    })
    res.json({ success: true, message: 'Item removed from cart' })
    return
  }
  const item = await prisma.cartItem.updateMany({
    where: { userId: req.user!.id, productId: req.params.productId as string },
    data: { quantity },
  })
  res.json({ success: true, data: item })
}

// DELETE /api/cart/:productId
export const removeFromCart = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.cartItem.deleteMany({
    where: { userId: req.user!.id, productId: req.params.productId as string },
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

  // Fire-and-forget welcome email
  void sendMail({
    to: email,
    subject: 'Welcome to the Calesta journal',
    html: newsletterWelcomeEmail(),
  })
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

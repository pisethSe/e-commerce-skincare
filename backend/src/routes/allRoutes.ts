import { Router } from 'express'
import { createReview, getProductReviews, subscribeNewsletter, unsubscribeNewsletter } from '../controllers/miscControllers'
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { getDashboardStats } from '../controllers/adminController'

// ── Reviews ─────────────────────────────────
export const reviewRoutes = Router()

reviewRoutes.get('/product/:productId', getProductReviews)
reviewRoutes.post('/', authenticate, createReview)

// Admin: list all reviews
reviewRoutes.get('/', authenticate, requireAdmin, async (req, res) => {
  const { page = '1', limit = '20', approved } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = approved === undefined ? {} : { approved: approved === 'true' }
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        product: { select: { id: true, name: true, slug: true, images: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.review.count({ where }),
  ])
  res.json({ success: true, data: reviews, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
})

// Admin: approve / unapprove a review
reviewRoutes.patch('/:id/approved', authenticate, requireAdmin, async (req, res) => {
  const { approved } = req.body
  if (typeof approved !== 'boolean') { res.status(400).json({ success: false, message: 'approved must be a boolean' }); return }
  const review = await prisma.review.update({
    where: { id: req.params.id as string },
    data: { approved },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      product: { select: { id: true, name: true, slug: true, images: true } },
    },
  })
  // Recalculate the product's aggregate rating from approved reviews
  const agg = await prisma.review.aggregate({
    where: { productId: review.productId, approved: true },
    _avg: { rating: true },
    _count: { id: true },
  })
  await prisma.product.update({
    where: { id: review.productId },
    data: {
      rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      reviewCount: agg._count.id,
    },
  })
  res.json({ success: true, data: review })
})

// Admin: delete a review
reviewRoutes.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  let review
  try {
    review = await prisma.review.delete({ where: { id: req.params.id as string } })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Review not found' }); return
    }
    throw err
  }
  const agg = await prisma.review.aggregate({
    where: { productId: review.productId, approved: true },
    _avg: { rating: true },
    _count: { id: true },
  })
  await prisma.product.update({
    where: { id: review.productId },
    data: {
      rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      reviewCount: agg._count.id,
    },
  })
  res.json({ success: true, message: 'Review deleted' })
})

// ── Blog ─────────────────────────────────────
export const blogRoutes = Router()

blogRoutes.get('/', optionalAuth, async (req, res) => {
  const { page = '1', limit = '9', category, all } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  // Admins can pass ?all=1 to include drafts
  const includeDrafts = all === '1' && (req as any).user?.role === 'ADMIN'
  const where = {
    ...(includeDrafts ? {} : { published: true }),
    ...(category ? { category: category as string } : {}),
  }
  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where, orderBy: { publishedAt: 'desc' }, skip, take: Number(limit),
      select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, category: true, author: true, readTime: true, publishedAt: true },
    }),
    prisma.blogPost.count({ where }),
  ])
  res.json({ success: true, data: posts, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
})

blogRoutes.get('/:slug', optionalAuth, async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug as string } })
  const isAdmin = (req as any).user?.role === 'ADMIN'
  if (!post || (!post.published && !isAdmin)) {
    res.status(404).json({ success: false, message: 'Post not found' }); return
  }
  res.json({ success: true, data: post })
})

blogRoutes.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const post = await prisma.blogPost.create({ data: req.body })
    res.status(201).json({ success: true, data: post })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A post with that slug already exists — pick a different title or slug' }); return
    }
    throw err
  }
})

blogRoutes.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const post = await prisma.blogPost.update({ where: { id: req.params.id as string }, data: req.body })
    res.json({ success: true, data: post })
  } catch (err: unknown) {
    const prismaCode = (err as { code?: string })?.code
    if (prismaCode === 'P2025') {
      res.status(404).json({ success: false, message: 'Post not found' }); return
    }
    if (prismaCode === 'P2002') {
      res.status(409).json({ success: false, message: 'A post with that slug already exists — pick a different title or slug' }); return
    }
    throw err
  }
})

blogRoutes.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id as string } })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Post not found' }); return
    }
    throw err
  }
  res.json({ success: true, message: 'Post deleted' })
})

// ── Newsletter ───────────────────────────────
export const newsletterRoutes = Router()

newsletterRoutes.post('/subscribe', subscribeNewsletter)
newsletterRoutes.post('/unsubscribe', unsubscribeNewsletter)

// ── Coupons ──────────────────────────────────
export const couponRoutes = Router()

couponRoutes.post('/validate', async (req, res) => {
  const { code, orderTotal } = req.body
  const coupon = await prisma.coupon.findUnique({ where: { code } })
  if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date())) {
    res.status(404).json({ success: false, message: 'Invalid or expired coupon' }); return
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    res.status(400).json({ success: false, message: 'Coupon usage limit reached' }); return
  }
  if (coupon.minOrderAmt && orderTotal < Number(coupon.minOrderAmt)) {
    res.status(400).json({ success: false, message: `Minimum order amount is $${coupon.minOrderAmt}` }); return
  }
  const discount = coupon.type === 'PERCENTAGE'
    ? orderTotal * (Number(coupon.value) / 100)
    : Number(coupon.value)
  res.json({ success: true, data: { coupon, discount } })
})

couponRoutes.get('/', authenticate, requireAdmin, async (_req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({ success: true, data: coupons })
})

couponRoutes.post('/', authenticate, requireAdmin, async (req, res) => {
  const { code, type, value } = req.body ?? {}
  const cleanCode = typeof code === 'string' ? code.trim().toUpperCase() : ''
  if (!cleanCode) {
    res.status(400).json({ success: false, message: 'Coupon code is required' }); return
  }
  if (type !== 'PERCENTAGE' && type !== 'FIXED') {
    res.status(400).json({ success: false, message: 'Type must be PERCENTAGE or FIXED' }); return
  }
  const numValue = Number(value)
  if (!Number.isFinite(numValue) || numValue <= 0) {
    res.status(400).json({ success: false, message: 'Value must be a number greater than 0' }); return
  }
  if (type === 'PERCENTAGE' && numValue > 100) {
    res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100' }); return
  }
  try {
    const coupon = await prisma.coupon.create({ data: { ...req.body, code: cleanCode, value: numValue } })
    res.status(201).json({ success: true, data: coupon })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      res.status(409).json({ success: false, message: `Coupon ${cleanCode} already exists` }); return
    }
    throw err
  }
})

couponRoutes.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const coupon = await prisma.coupon.update({ where: { id: req.params.id as string }, data: req.body })
    res.json({ success: true, data: coupon })
  } catch (err: unknown) {
    const prismaCode = (err as { code?: string })?.code
    if (prismaCode === 'P2025') {
      res.status(404).json({ success: false, message: 'Coupon not found' }); return
    }
    if (prismaCode === 'P2002') {
      res.status(409).json({ success: false, message: 'A coupon with that code already exists' }); return
    }
    throw err
  }
})

couponRoutes.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id as string } })
    res.json({ success: true, message: 'Coupon deleted' })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Coupon not found' }); return
    }
    throw err
  }
})

// ── Admin ────────────────────────────────────
export const adminRoutes = Router()

adminRoutes.use(authenticate, requireAdmin)
adminRoutes.get('/stats', getDashboardStats)
adminRoutes.get('/newsletter', async (_req, res) => {
  const subs = await prisma.newsletter.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } })
  res.json({ success: true, data: subs, total: subs.length })
})

// ── Users ────────────────────────────────────
export const userRoutes = Router()

userRoutes.get('/me', authenticate, async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, firstName: true, lastName: true, avatar: true, role: true, createdAt: true },
  })
  res.json({ success: true, data: user })
})

userRoutes.patch('/me', authenticate, async (req: any, res) => {
  const { firstName, lastName, avatar } = req.body
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { firstName, lastName, avatar },
    select: { id: true, email: true, firstName: true, lastName: true, avatar: true },
  })
  res.json({ success: true, data: user })
})

userRoutes.get('/wishlist', authenticate, async (req: any, res) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.user.id },
    include: { product: { include: { category: { select: { name: true, slug: true } } } } },
  })
  res.json({ success: true, data: items })
})

userRoutes.post('/wishlist/:productId', authenticate, async (req: any, res) => {
  // Unknown/deleted product ids must be a clean 404, not a foreign-key 500
  const product = await prisma.product.findUnique({
    where: { id: req.params.productId as string },
    select: { id: true },
  })
  if (!product) {
    res.status(404).json({ success: false, message: 'Product not found' }); return
  }
  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: req.user.id, productId: req.params.productId as string } },
    update: {},
    create: { userId: req.user.id, productId: req.params.productId as string },
    include: { product: true },
  })
  res.json({ success: true, data: item })
})

userRoutes.delete('/wishlist/:productId', authenticate, async (req: any, res) => {
  await prisma.wishlistItem.deleteMany({
    where: { userId: req.user.id, productId: req.params.productId as string },
  })
  res.json({ success: true, message: 'Removed from wishlist' })
})

userRoutes.get('/addresses', authenticate, async (req: any, res) => {
  const addrs = await prisma.address.findMany({ where: { userId: req.user.id }, orderBy: { isDefault: 'desc' } })
  res.json({ success: true, data: addrs })
})

userRoutes.post('/addresses', authenticate, async (req: any, res) => {
  const addr = await prisma.address.create({ data: { ...req.body, userId: req.user.id } })
  res.status(201).json({ success: true, data: addr })
})

// Admin: all users
userRoutes.get('/', authenticate, requireAdmin, async (req, res) => {
  const { page = '1', limit = '20' } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, emailVerified: true },
      orderBy: { createdAt: 'desc' },
      skip, take: Number(limit),
    }),
    prisma.user.count({ where: { role: 'USER' } }),
  ])
  res.json({ success: true, data: users, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
})

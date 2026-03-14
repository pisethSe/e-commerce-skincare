import { Router } from 'express'

// ── Reviews ─────────────────────────────────
export const reviewRoutes = Router()
import { createReview, getProductReviews } from '../controllers/miscControllers'
import { authenticate } from '../middleware/auth'

reviewRoutes.get('/product/:productId', getProductReviews)
reviewRoutes.post('/', authenticate, createReview)

// ── Blog ─────────────────────────────────────
export const blogRoutes = Router()
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'

blogRoutes.get('/', async (req, res) => {
  const { page = '1', limit = '9', category } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = {
    published: true,
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

blogRoutes.get('/:slug', async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } })
  if (!post) { res.status(404).json({ success: false, message: 'Post not found' }); return }
  res.json({ success: true, data: post })
})

blogRoutes.post('/', authenticate, requireAdmin, async (req, res) => {
  const post = await prisma.blogPost.create({ data: req.body })
  res.status(201).json({ success: true, data: post })
})

blogRoutes.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const post = await prisma.blogPost.update({ where: { id: req.params.id }, data: req.body })
  res.json({ success: true, data: post })
})

blogRoutes.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  await prisma.blogPost.delete({ where: { id: req.params.id } })
  res.json({ success: true, message: 'Post deleted' })
})

// ── Newsletter ───────────────────────────────
export const newsletterRoutes = Router()
import { subscribeNewsletter, unsubscribeNewsletter } from '../controllers/miscControllers'

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
  const coupon = await prisma.coupon.create({ data: req.body })
  res.status(201).json({ success: true, data: coupon })
})

couponRoutes.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  await prisma.coupon.delete({ where: { id: req.params.id } })
  res.json({ success: true, message: 'Coupon deleted' })
})

// ── Admin ────────────────────────────────────
export const adminRoutes = Router()
import { getDashboardStats } from '../controllers/adminController'

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
  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: req.user.id, productId: req.params.productId } },
    update: {},
    create: { userId: req.user.id, productId: req.params.productId },
    include: { product: true },
  })
  res.json({ success: true, data: item })
})

userRoutes.delete('/wishlist/:productId', authenticate, async (req: any, res) => {
  await prisma.wishlistItem.deleteMany({
    where: { userId: req.user.id, productId: req.params.productId },
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

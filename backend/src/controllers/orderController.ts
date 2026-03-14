import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'

// Generate readable order number
const generateOrderNumber = (): string => {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `LUM-${ts}-${rand}`
}

// POST /api/orders
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { items, addressId, couponCode, paymentMethod, paymentId } = req.body

  if (!items || items.length === 0) throw new ApiError('Order must have at least one item', 400)
  if (!addressId) throw new ApiError('Shipping address is required', 400)

  // Verify address belongs to user
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId: req.user!.id },
  })
  if (!address) throw new ApiError('Invalid shipping address', 400)

  // Fetch products and verify stock
  const productIds = items.map((i: { productId: string }) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  })

  const orderItems = items.map((item: { productId: string; quantity: number }) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) throw new ApiError(`Product ${item.productId} not found`, 404)
    if (!product.inStock || product.stockCount < item.quantity) {
      throw new ApiError(`${product.name} is out of stock`, 400)
    }
    return {
      productId: item.productId,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    }
  })

  // Calculate totals
  const subtotal = orderItems.reduce(
    (sum: number, item: { price: number; quantity: number }) =>
      sum + Number(item.price) * item.quantity,
    0
  )

  let discount = 0
  let couponId: string | undefined

  // Apply coupon if provided
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } })
    if (coupon && coupon.active && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
      if (!coupon.minOrderAmt || subtotal >= Number(coupon.minOrderAmt)) {
        discount = coupon.type === 'PERCENTAGE'
          ? subtotal * (Number(coupon.value) / 100)
          : Number(coupon.value)
        couponId = coupon.id
      }
    }
  }

  const shipping = subtotal - discount >= 75 ? 0 : 8.95
  const tax = (subtotal - discount) * 0.08
  const total = subtotal - discount + shipping + tax

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user!.id,
        addressId,
        subtotal,
        shipping,
        tax,
        discount,
        total,
        paymentMethod,
        paymentId,
        couponId,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, images: true } } } },
        address: true,
      },
    })

    // Decrement stock
    for (const item of orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockCount: { decrement: item.quantity },
        },
      })
    }

    // Update coupon usage
    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { userId: req.user!.id } })

    return newOrder
  })

  res.status(201).json({ success: true, data: order })
}

// GET /api/orders — my orders
export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10' } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: req.user!.id },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.order.count({ where: { userId: req.user!.id } }),
  ])

  res.json({
    success: true,
    data: orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  })
}

// GET /api/orders/:id
export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  const order = await prisma.order.findFirst({
    where: {
      id: req.params.id,
      userId: req.user!.role === 'ADMIN' ? undefined : req.user!.id,
    },
    include: {
      items: { include: { product: { select: { id: true, name: true, images: true, slug: true } } } },
      address: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  if (!order) throw new ApiError('Order not found', 404)

  res.json({ success: true, data: order })
}

// PATCH /api/orders/:id/status — Admin only
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body
  const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']
  if (!validStatuses.includes(status)) throw new ApiError('Invalid status', 400)

  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order) throw new ApiError('Order not found', 404)

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
  })

  res.json({ success: true, data: updated })
}

// GET /api/orders — Admin: all orders
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20', status, search } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { orderNumber: { contains: search as string, mode: 'insensitive' } },
      { user: { email: { contains: search as string, mode: 'insensitive' } } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.order.count({ where }),
  ])

  res.json({
    success: true,
    data: orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  })
}

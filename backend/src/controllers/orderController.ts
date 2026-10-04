import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import { sendMail, orderConfirmationEmail, orderStatusEmail } from '../lib/email'

// Generate readable order number
const generateOrderNumber = (): string => {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `LUM-${ts}-${rand}`
}

// POST /api/orders
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { items, addressId, couponCode, paymentMethod, paymentId, shippingMethod } = req.body

  if (!items || items.length === 0) throw new ApiError('Order must have at least one item', 400)
  if (!addressId) throw new ApiError('Shipping address is required', 400)

  // Shipping method prices (standard is free over $75 after discount)
  const SHIPPING_METHODS: Record<string, number> = {
    standard: 8.95,
    express: 12.95,
    overnight: 24.95,
  }
  const chosenMethod = (typeof shippingMethod === 'string' ? shippingMethod : 'standard').toLowerCase()
  const effectiveMethod = SHIPPING_METHODS[chosenMethod] !== undefined ? chosenMethod : 'standard'

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

  // Apply coupon if provided — strict, mirroring /validate: an invalid, expired,
  // usage-capped, or below-minimum coupon must never silently produce an order
  // (that would charge the customer more than they were quoted).
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } })
    if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date())) {
      throw new ApiError('Invalid or expired coupon', 400)
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new ApiError('Coupon usage limit reached', 400)
    }
    if (coupon.minOrderAmt && subtotal < Number(coupon.minOrderAmt)) {
      throw new ApiError(`Minimum order amount is $${coupon.minOrderAmt}`, 400)
    }
    discount = coupon.type === 'PERCENTAGE'
      ? subtotal * (Number(coupon.value) / 100)
      : Number(coupon.value)
    couponId = coupon.id
  }

  // Standard ships free over $75 (after discount); express/overnight always charge
  const shipping = effectiveMethod === 'standard'
    ? (subtotal - discount >= 75 ? 0 : SHIPPING_METHODS.standard)
    : SHIPPING_METHODS[effectiveMethod]
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
        notes: `Shipping method: ${effectiveMethod}`,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, images: true } } } },
        address: true,
      },
    })

    // Decrement stock; flip inStock off when depleted
    for (const item of orderItems) {
      const updated = await tx.product.update({
        where: { id: item.productId },
        data: {
          stockCount: { decrement: item.quantity },
        },
        select: { stockCount: true },
      })
      if (updated.stockCount <= 0) {
        await tx.product.update({
          where: { id: item.productId },
          data: { inStock: false },
        })
      }
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

  // Fire-and-forget confirmation email (never blocks or breaks the response)
  const userEmail = (await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { email: true, firstName: true, lastName: true },
  }))
  if (userEmail) {
    void sendMail({
      to: userEmail.email,
      subject: `Order ${order.orderNumber} confirmed · Calesta`,
      html: orderConfirmationEmail({
        customerName: `${userEmail.firstName ?? ''} ${userEmail.lastName ?? ''}`.trim() || 'there',
        orderNumber: order.orderNumber,
        total: `$${Number(order.total).toFixed(2)}`,
        itemCount: order.items.length,
        storeUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      }),
    })
  }
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
      id: req.params.id as string,
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

  const order = await prisma.order.findUnique({
    where: { id: req.params.id as string },
    include: { items: { select: { productId: true, quantity: true } } },
  })
  if (!order) throw new ApiError('Order not found', 404)

  // Leaving the sales pipeline (cancel/refund) restocks items and releases the
  // coupon; re-activating a cancelled order re-reserves them. Symmetric so
  // stock and coupon usage never drift, and idempotent (no double-restock).
  const wasActive = order.status !== 'CANCELLED' && order.status !== 'REFUNDED'
  const nowInactive = status === 'CANCELLED' || status === 'REFUNDED'

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.order.update({ where: { id: order.id }, data: { status } })

    if (wasActive && nowInactive) {
      for (const item of order.items) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stockCount: { increment: item.quantity } },
          select: { stockCount: true, inStock: true },
        })
        // Return the product to the public listing if depletion had pulled it
        if (!product.inStock) {
          await tx.product.update({ where: { id: item.productId }, data: { inStock: true } })
        }
      }
      if (order.couponId) {
        const coupon = await tx.coupon.findUnique({ where: { id: order.couponId }, select: { usedCount: true } })
        if (coupon && coupon.usedCount > 0) {
          await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } })
        }
      }
    } else if (!wasActive && !nowInactive && order.status !== status) {
      for (const item of order.items) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stockCount: { decrement: item.quantity } },
          select: { stockCount: true },
        })
        if (product.stockCount <= 0) {
          await tx.product.update({ where: { id: item.productId }, data: { inStock: false } })
        }
      }
      if (order.couponId) {
        await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } })
      }
    }

    return u
  })

  res.json({ success: true, data: updated })

  // Fire-and-forget status email (never blocks or breaks the response)
  const customer = await prisma.user.findUnique({
    where: { id: order.userId },
    select: { email: true, firstName: true },
  })
  if (customer && order.status !== status) {
    void sendMail({
      to: customer.email,
      subject: `Order ${order.orderNumber} ${status.charAt(0)}${status.slice(1).toLowerCase()} · Calesta`,
      html: orderStatusEmail({
        customerName: customer.firstName || 'there',
        orderNumber: order.orderNumber,
        status,
        storeUrl: process.env.FRONTEND_URL || 'http://localhost:3003',
      }),
    })
  }
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

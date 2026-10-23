import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'
import { notifyBackInStock } from '../lib/stock'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Whole number within a sane range — guards the admin stock editor. */
function readInt(value: unknown, min: number, max: number, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ApiError(`${label} must be a whole number between ${min} and ${max}.`, 400)
  }
  return parsed
}

// POST /api/products/:id/stock-notification — public, "email me when it's back"
export const subscribeToStockNotification = async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()

  if (!email || !EMAIL_RE.test(email)) {
    throw new ApiError('Please enter a valid email address.', 400)
  }

  const product = await prisma.product.findUnique({
    where: { id: req.params.id as string },
    select: { id: true, name: true, inStock: true, stockCount: true },
  })
  if (!product) throw new ApiError('Product not found', 404)
  if (product.inStock && product.stockCount > 0) {
    throw new ApiError('This product is in stock right now.', 400)
  }

  // Re-subscribing after a previous restock re-arms the alert.
  await prisma.stockNotification.upsert({
    where: { email_productId: { email, productId: product.id } },
    update: { notifiedAt: null, createdAt: new Date() },
    create: { email, productId: product.id },
  })

  res.status(201).json({
    success: true,
    message: `We'll email you when ${product.name} is back in stock.`,
  })
}

// GET /api/admin/inventory?lowStock=1
export const listInventory = async (req: Request, res: Response): Promise<void> => {
  const lowStockOnly = req.query.lowStock === '1'

  const products = await prisma.product.findMany({
    include: {
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { stockNotifications: { where: { notifiedAt: null } } } },
    },
    orderBy: [{ stockCount: 'asc' }, { name: 'asc' }],
  })

  const data = products.map(({ _count, ...product }) => {
    const outOfStock = !product.inStock || product.stockCount <= 0
    return {
      ...product,
      pendingNotifications: _count.stockNotifications,
      outOfStock,
      lowStock: !outOfStock && product.stockCount <= product.lowStockThreshold,
    }
  })

  const summary = {
    total: data.length,
    lowStock: data.filter((p) => p.lowStock).length,
    outOfStock: data.filter((p) => p.outOfStock).length,
    pendingNotifications: data.reduce((sum, p) => sum + p.pendingNotifications, 0),
  }

  res.json({
    success: true,
    data: {
      items: lowStockOnly ? data.filter((p) => p.lowStock || p.outOfStock) : data,
      summary,
    },
  })
}

// PATCH /api/admin/inventory/:id — { stockCount?, inStock?, lowStockThreshold? }
export const updateInventory = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string
  const stockCount = readInt(req.body?.stockCount, 0, 1_000_000, 'Stock count')
  const lowStockThreshold = readInt(req.body?.lowStockThreshold, 0, 10_000, 'Low-stock threshold')

  const before = await prisma.product.findUnique({ where: { id } })
  if (!before) throw new ApiError('Product not found', 404)

  const data: { stockCount?: number; inStock?: boolean; lowStockThreshold?: number } = {}
  if (stockCount !== undefined) data.stockCount = stockCount
  if (lowStockThreshold !== undefined) data.lowStockThreshold = lowStockThreshold
  if (typeof req.body?.inStock === 'boolean') data.inStock = req.body.inStock
  else if (stockCount !== undefined) data.inStock = stockCount > 0
  // Zero units always means sold out, even when the client sends inStock: true.
  if (data.stockCount === 0) data.inStock = false

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true, slug: true } } },
  })

  const wasOut = !before.inStock || before.stockCount <= 0
  const backInStock = wasOut && updated.inStock && updated.stockCount > 0
  const notification = backInStock ? await notifyBackInStock(updated.id) : null

  const pendingNotifications = await prisma.stockNotification.count({
    where: { productId: updated.id, notifiedAt: null },
  })

  res.json({
    success: true,
    data: {
      ...updated,
      pendingNotifications,
      outOfStock: !updated.inStock || updated.stockCount <= 0,
      lowStock: updated.inStock && updated.stockCount > 0 && updated.stockCount <= updated.lowStockThreshold,
      notification,
    },
  })
}

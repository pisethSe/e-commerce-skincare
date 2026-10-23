import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'

const DAY = 86_400_000
const MAX_RANGE_DAYS = 366

/** Local calendar day (not UTC) — the admin picks dates in their own timezone. */
function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse YYYY-MM-DD as local midnight; fall back to native parsing otherwise. */
function parseDay(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return new Date(value)
}

/** Resolve ?from=&to= (inclusive) plus the equally long previous period. */
function parseRange(
  req: Request,
  options: { fallbackDays?: number; maxDays?: number; defaultFrom?: Date } = {}
): { from: Date; to: Date; days: number; prevFrom: Date; prevTo: Date } {
  const { fallbackDays = 29, maxDays = MAX_RANGE_DAYS, defaultFrom } = options
  const rawTo = req.query.to ? parseDay(String(req.query.to)) : new Date()
  if (Number.isNaN(rawTo.getTime())) throw new ApiError('Invalid "to" date.', 400)
  const to = new Date(rawTo)
  to.setHours(23, 59, 59, 999)

  const rawFrom = req.query.from
    ? parseDay(String(req.query.from))
    : defaultFrom ?? new Date(to.getTime() - fallbackDays * DAY)
  if (Number.isNaN(rawFrom.getTime())) throw new ApiError('Invalid "from" date.', 400)
  const from = new Date(rawFrom)
  from.setHours(0, 0, 0, 0)

  if (from > to) throw new ApiError('"from" must be on or before "to".', 400)
  const span = to.getTime() - from.getTime()
  const days = Math.floor(span / DAY) + 1
  if (Number.isFinite(maxDays) && days > maxDays) {
    throw new ApiError(`Date range is limited to ${maxDays} days.`, 400)
  }

  // Previous window is the same number of whole calendar days, ending the day before `from`.
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(from.getTime() - days * DAY)

  return { from, to, days, prevFrom, prevTo }
}

// GET /api/admin/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getRangeAnalytics = async (req: Request, res: Response): Promise<void> => {
  const { from, to, days, prevFrom, prevTo } = parseRange(req)

  const [orders, prevOrders, newCustomers, prevNewCustomers, items] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { total: true, discount: true, status: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: prevFrom, lte: prevTo } },
      select: { total: true, status: true },
    }),
    prisma.user.count({ where: { role: 'USER', createdAt: { gte: from, lte: to } } }),
    prisma.user.count({ where: { role: 'USER', createdAt: { gte: prevFrom, lte: prevTo } } }),
    prisma.orderItem.findMany({
      where: {
        order: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
      },
      select: {
        productId: true,
        name: true,
        quantity: true,
        price: true,
        product: { select: { category: { select: { name: true } } } },
      },
    }),
  ])

  const sumRevenue = (rows: Array<{ total: unknown; status: string }>) =>
    rows.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + Number(o.total), 0)

  const revenue = sumRevenue(orders)
  const prevRevenue = sumRevenue(prevOrders)
  const paidOrders = orders.filter((o) => o.status !== 'CANCELLED').length
  const prevPaidOrders = prevOrders.filter((o) => o.status !== 'CANCELLED').length
  const units = items.reduce((sum, item) => sum + item.quantity, 0)
  const discount = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + Number(o.discount), 0)

  // Day buckets (zero-filled so the chart shows quiet days honestly)
  const buckets = new Map<string, { date: string; revenue: number; orders: number }>()
  for (let i = 0; i < days; i++) {
    const key = dayKey(new Date(from.getTime() + i * DAY))
    buckets.set(key, { date: key, revenue: 0, orders: 0 })
  }
  for (const order of orders) {
    const bucket = buckets.get(dayKey(order.createdAt))
    if (!bucket) continue
    bucket.orders += 1
    if (order.status !== 'CANCELLED') bucket.revenue += Number(order.total)
  }

  // Status mix within the range
  const statusMap = new Map<string, number>()
  for (const order of orders) statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1)

  // Top products + category revenue within the range
  const productMap = new Map<string, { productId: string; name: string; units: number; revenue: number }>()
  const categoryMap = new Map<string, { category: string; revenue: number; units: number }>()
  for (const item of items) {
    const line = Number(item.price) * item.quantity
    const entry = productMap.get(item.productId) ?? {
      productId: item.productId,
      name: item.name,
      units: 0,
      revenue: 0,
    }
    entry.units += item.quantity
    entry.revenue += line
    productMap.set(item.productId, entry)

    const categoryName = item.product?.category?.name ?? 'Uncategorised'
    const cat = categoryMap.get(categoryName) ?? { category: categoryName, revenue: 0, units: 0 }
    cat.revenue += line
    cat.units += item.quantity
    categoryMap.set(categoryName, cat)
  }

  res.json({
    success: true,
    data: {
      range: { from: dayKey(from), to: dayKey(to), days },
      previous: { from: dayKey(prevFrom), to: dayKey(prevTo) },
      totals: {
        revenue,
        previousRevenue: prevRevenue,
        orders: orders.length,
        previousOrders: prevOrders.length,
        cancelled: statusMap.get('CANCELLED') ?? 0,
        units,
        newCustomers,
        previousNewCustomers: prevNewCustomers,
        discount,
        averageOrderValue: paidOrders > 0 ? revenue / paidOrders : 0,
        previousAverageOrderValue: prevPaidOrders > 0 ? prevRevenue / prevPaidOrders : 0,
      },
      series: [...buckets.values()],
      statusCounts: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
      topProducts: [...productMap.values()].sort((a, b) => b.units - a.units).slice(0, 6),
      categoryRevenue: [...categoryMap.values()].sort((a, b) => b.revenue - a.revenue),
    },
  })
}

/* ── CSV exports ─────────────────────────────────── */

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function csvLine(cells: unknown[]): string {
  return cells.map(csvCell).join(',')
}

function sendCsv(res: Response, filename: string, lines: string[]): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  // BOM so Excel opens Khmer/UTF-8 names correctly
  res.send('\uFEFF' + lines.join('\r\n'))
}

const EXPORT_TYPES = ['orders', 'products', 'customers', 'reviews'] as const
type ExportType = (typeof EXPORT_TYPES)[number]

// GET /api/admin/export/:type?from=&to=
export const exportCsv = async (req: Request, res: Response): Promise<void> => {
  const type = req.params.type as ExportType
  if (!EXPORT_TYPES.includes(type)) {
    throw new ApiError(`Unknown export type. Use one of: ${EXPORT_TYPES.join(', ')}.`, 400)
  }

  const { from, to } = parseRange(req, { defaultFrom: new Date(2015, 0, 1), maxDays: Infinity })
  const stamp = dayKey(new Date())

  if (type === 'orders') {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: { select: { name: true, quantity: true, price: true } },
        address: true,
      },
    })

    const lines = [
      csvLine([
        'Order', 'Date', 'Status', 'Payment status', 'Payment method', 'Customer', 'Email', 'Phone',
        'Street', 'City / District', 'Province', 'Postal code', 'Country', 'Items', 'Units',
        'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total', 'Tracking number',
      ]),
      ...orders.map((o) =>
        csvLine([
          o.orderNumber,
          o.createdAt.toISOString(),
          o.status,
          o.paymentStatus,
          o.paymentMethod ?? '',
          `${o.user.firstName} ${o.user.lastName}`.trim(),
          o.user.email,
          o.address.phone ?? '',
          o.address.street,
          o.address.city,
          o.address.state,
          o.address.zip,
          o.address.country,
          o.items.map((i) => `${i.name} ×${i.quantity}`).join(' | '),
          o.items.reduce((sum, i) => sum + i.quantity, 0),
          Number(o.subtotal).toFixed(2),
          Number(o.discount).toFixed(2),
          Number(o.shipping).toFixed(2),
          Number(o.tax).toFixed(2),
          Number(o.total).toFixed(2),
          o.trackingNumber ?? '',
        ])
      ),
    ]
    sendCsv(res, `calesta-orders-${stamp}.csv`, lines)
    return
  }

  if (type === 'products') {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        category: { select: { name: true } },
        _count: { select: { stockNotifications: { where: { notifiedAt: null } } } },
      },
    })

    const lines = [
      csvLine([
        'Name', 'Slug', 'Category', 'Price', 'Compare price', 'Stock count', 'Low-stock threshold',
        'In stock', 'Waiting for restock', 'Rating', 'Reviews', 'Created',
      ]),
      ...products.map((p) =>
        csvLine([
          p.name,
          p.slug,
          p.category?.name ?? '',
          Number(p.price).toFixed(2),
          p.comparePrice != null ? Number(p.comparePrice).toFixed(2) : '',
          p.stockCount,
          p.lowStockThreshold,
          p.inStock ? 'yes' : 'no',
          p._count.stockNotifications,
          Number(p.rating).toFixed(2),
          p.reviewCount,
          p.createdAt.toISOString(),
        ])
      ),
    ]
    sendCsv(res, `calesta-products-${stamp}.csv`, lines)
    return
  }

  if (type === 'customers') {
    const users = await prisma.user.findMany({
      where: { role: 'USER', createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    })

    const spend = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: { not: 'CANCELLED' } },
      _sum: { total: true },
    })
    const spendByUser = new Map(spend.map((row) => [row.userId, Number(row._sum.total ?? 0)]))

    const lines = [
      csvLine(['First name', 'Last name', 'Email', 'Role', 'Email verified', 'Newsletter', 'Orders', 'Total spent', 'Joined']),
      ...users.map((u) =>
        csvLine([
          u.firstName,
          u.lastName,
          u.email,
          u.role,
          u.emailVerified ? 'yes' : 'no',
          u.newsletter ? 'yes' : 'no',
          u._count.orders,
          (spendByUser.get(u.id) ?? 0).toFixed(2),
          u.createdAt.toISOString(),
        ])
      ),
    ]
    sendCsv(res, `calesta-customers-${stamp}.csv`, lines)
    return
  }

  // reviews
  const reviews = await prisma.review.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      product: { select: { name: true } },
    },
  })

  const lines = [
    csvLine(['Date', 'Product', 'Customer', 'Email', 'Rating', 'Approved', 'Verified', 'Title', 'Review']),
    ...reviews.map((r) =>
      csvLine([
        r.createdAt.toISOString(),
        r.product.name,
        `${r.user.firstName} ${r.user.lastName}`.trim(),
        r.user.email,
        r.rating,
        r.approved ? 'yes' : 'no',
        r.verified ? 'yes' : 'no',
        r.title ?? '',
        r.body.replace(/\s+/g, ' ').trim(),
      ])
    ),
  ]
  sendCsv(res, `calesta-reviews-${stamp}.csv`, lines)
}

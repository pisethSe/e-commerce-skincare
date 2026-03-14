import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

// GET /api/admin/stats
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalRevenue,
    lastMonthRevenue,
    totalOrders,
    lastMonthOrders,
    totalCustomers,
    lastMonthCustomers,
    pendingOrders,
    lowStockProducts,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    // Revenue this month
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Revenue last month
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { not: 'CANCELLED' },
      },
      _sum: { total: true },
    }),
    // Orders this month
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    // Orders last month
    prisma.order.count({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    }),
    // New customers this month
    prisma.user.count({ where: { createdAt: { gte: startOfMonth }, role: 'USER' } }),
    // New customers last month
    prisma.user.count({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, role: 'USER' },
    }),
    // Pending orders
    prisma.order.count({ where: { status: 'PENDING' } }),
    // Low stock products
    prisma.product.count({ where: { stockCount: { lte: 10 }, inStock: true } }),
    // Recent orders
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: true,
      },
    }),
    // Top selling products
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ])

  // Enrich top products
  const topProductIds = topProducts.map((p) => p.productId)
  const topProductDetails = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, price: true, images: true },
  })

  const enrichedTopProducts = topProducts.map((tp) => ({
    ...tp,
    product: topProductDetails.find((p) => p.id === tp.productId),
  }))

  // Revenue chart: last 7 months
  const revenueChart = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return prisma.order.aggregate({
        where: {
          createdAt: { gte: d, lte: end },
          status: { not: 'CANCELLED' },
        },
        _sum: { total: true },
        _count: { id: true },
      }).then((result) => ({
        month: d.toLocaleString('default', { month: 'short' }),
        revenue: Number(result._sum.total || 0),
        orders: result._count.id,
      }))
    })
  )

  res.json({
    success: true,
    data: {
      revenue: {
        current: Number(totalRevenue._sum.total || 0),
        last: Number(lastMonthRevenue._sum.total || 0),
      },
      orders: {
        current: totalOrders,
        last: lastMonthOrders,
        pending: pendingOrders,
      },
      customers: {
        current: totalCustomers,
        last: lastMonthCustomers,
      },
      lowStockProducts,
      recentOrders,
      topProducts: enrichedTopProducts,
      revenueChart,
    },
  })
}

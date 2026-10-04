import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Users,
  Package,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import { api, apiData, apiList } from '../lib/api'
import { formatMoney, formatMoneyShort, formatDate, percentDelta, isPositiveDelta, ORDER_STATUS_STYLES } from '../lib/format'

interface Stats {
  revenue: { current: number; last: number }
  orders: { current: number; last: number; pending: number }
  customers: { current: number; last: number }
  lowStockProducts: number
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    total: number
    createdAt: string
    user: { firstName: string | null; lastName: string | null; email: string }
    items: Array<{ id: string }>
  }>
  topProducts: Array<{
    productId: string
    _sum: { quantity: number | null }
    _count: { id: number }
    product: { id: string; name: string; price: string; images: string[] } | undefined
  }>
  revenueChart: Array<{ month: string; revenue: number; orders: number }>
}

const CATEGORY_COLORS = ['#102d26', '#6f8a4a', '#9edccd', '#c9a96e', '#ddde92', '#b4bcba']

export default function DashboardPage() {
  const { pathname } = useLocation()
  const [stats, setStats] = useState<Stats | null>(null)
  const [catalogMix, setCatalogMix] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [reviewsWaiting, setReviewsWaiting] = useState<number | null>(null)
  const [subscribers, setSubscribers] = useState<number | null>(null)
  const [productCount, setProductCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    // Re-fetch when navigating back to the dashboard so numbers stay live
    apiData<Stats>({ url: '/admin/stats' })
      .then((data) => alive && (setStats(data), setError(null)))
      .catch((e) => alive && setError(e.message))

    apiList({ url: '/products?all=1&limit=1' })
      .then((r) => alive && setProductCount(r.pagination?.total ?? null))
      .catch(() => {})

    apiList({ url: '/reviews?approved=false&limit=1' })
      .then((r) => alive && setReviewsWaiting(r.pagination?.total ?? 0))
      .catch(() => {})

    api.get<{ success: boolean; total: number }>('/admin/newsletter')
      .then((res) => alive && setSubscribers(res.data.total))
      .catch(() => {})

    apiList<{ name: string; _count: { products: number } }>({ url: '/categories' })
      .then(({ items }) => {
        if (!alive) return
        const sorted = [...items].sort((a, b) => b._count.products - a._count.products)
        setCatalogMix(
          sorted.map((c, i) => ({
            name: c.name,
            value: c._count.products,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          }))
        )
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [pathname])

  if (error) {
    return (
      <div className="admin-card p-6 text__14 text-[#a83636]">
        Could not load store data — {error}. Is the backend running on :5001?
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="admin-card h-[320px] animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="admin-card h-[150px] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const revDelta = percentDelta(stats.revenue.current, stats.revenue.last)
  const ordDelta = percentDelta(stats.orders.current, stats.orders.last)
  const cusDelta = percentDelta(stats.customers.current, stats.customers.last)
  const topProduct = stats.topProducts[0]?.product
  const topProductUnits = stats.topProducts[0]?._sum.quantity ?? 0
  const topProductRevenue = topProductUnits * Number(stats.topProducts[0]?.product?.price ?? 0)

  const glance: Array<[string, string]> = [
    ['Pending fulfillments', `${stats.orders.pending} order${stats.orders.pending === 1 ? '' : 's'}`],
    ['Low stock alerts', `${stats.lowStockProducts} product${stats.lowStockProducts === 1 ? '' : 's'}`],
    ['Reviews awaiting approval', reviewsWaiting === null ? '—' : `${reviewsWaiting}`],
    ['Newsletter subscribers', subscribers === null ? '—' : `${subscribers}`],
  ]

  const kpis = [
    {
      label: 'Revenue',
      value: formatMoneyShort(stats.revenue.current),
      change: revDelta,
      up: isPositiveDelta(stats.revenue.current, stats.revenue.last),
      detail: `${formatDate(new Date())}`,
      icon: Sparkles,
    },
    {
      label: 'Orders',
      value: String(stats.orders.current),
      change: ordDelta,
      up: isPositiveDelta(stats.orders.current, stats.orders.last),
      detail: 'this month',
      icon: ShoppingCart,
    },
    {
      label: 'Customers',
      value: String(stats.customers.current),
      change: cusDelta,
      up: isPositiveDelta(stats.customers.current, stats.customers.last),
      detail: 'new this month',
      icon: Users,
    },
    {
      label: 'Products',
      value: productCount === null ? '—' : String(productCount),
      change: stats.lowStockProducts > 0 ? `${stats.lowStockProducts} low` : 'Healthy',
      up: stats.lowStockProducts === 0,
      detail: 'in catalog',
      icon: Package,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Row 1 — revenue hero + today at a glance */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <motion.div
          className="admin-card overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="grid h-full gap-6 p-6 lg:grid-cols-[1fr_0.9fr] lg:p-7">
            <div className="flex flex-col justify-between">
              <div>
                <p className="admin-kicker">Revenue · This month</p>
                <p className="mt-3 font-display text__48 font-medium tabular-nums tracking-tight text-[#102d26]">
                  {formatMoney(stats.revenue.current)}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text__14 font-medium">
                  {isPositiveDelta(stats.revenue.current, stats.revenue.last) ? (
                    <span className="inline-flex items-center gap-1 text-[#4a6132]">
                      <ArrowUpRight size={14} /> {revDelta}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#a83636]">
                      <ArrowDownRight size={14} /> {revDelta}
                    </span>
                  )}
                  <span className="font-normal text-[#9ca8a5]">vs last month</span>
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/products" className="btn-admin">
                  <Sparkles size={16} />
                  Manage catalog
                </Link>
                <Link to="/orders" className="btn-admin-outline">
                  Review orders
                </Link>
              </div>
            </div>

            <div className="admin-soft-card relative overflow-hidden p-5">
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="admin-kicker">Top seller</p>
                    <h3 className="mt-2 truncate font-display text__20 font-medium text-[#102d26]">
                      {topProduct?.name ?? 'No sales yet'}
                    </h3>
                  </div>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] border border-[#e7eae9] bg-white text-[#3f5650]">
                    <Star size={18} />
                  </div>
                </div>

                <div className="mt-5 flex-1">
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={stats.revenueChart}>
                      <defs>
                        <linearGradient id="dashSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#102d26" stopOpacity={0.16} />
                          <stop offset="95%" stopColor="#102d26" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="revenue" stroke="#102d26" strokeWidth={2} fill="url(#dashSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-[10px] bg-white px-4 py-3">
                    <p className="text__12 text-[#9ca8a5]">Units sold</p>
                    <p className="mt-1 text__18 font-medium tabular-nums text-[#102d26]">{topProductUnits}</p>
                  </div>
                  <div className="rounded-[10px] bg-white px-4 py-3">
                    <p className="text__12 text-[#9ca8a5]">Revenue</p>
                    <p className="mt-1 text__18 font-medium tabular-nums text-[#102d26]">
                      {formatMoneyShort(topProductRevenue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="admin-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-kicker">Today</p>
              <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">At a glance</h3>
            </div>
            <div className="admin-chip">Live</div>
          </div>

          <div className="mt-6 space-y-3">
            {glance.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-[10px] border border-[#e7eae9] bg-white px-4 py-4"
              >
                <span className="text__14 text-[#6e7f7b]">{label}</span>
                <span className="text__16 font-medium tabular-nums text-[#102d26]">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Row 2 — KPI cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item, index) => (
          <motion.div
            key={item.label}
            className="admin-metric-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="admin-kicker">{item.label}</p>
                <p className="mt-4 font-display text__32 font-medium tabular-nums text-[#102d26]">
                  {item.value}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#e7eae9] bg-[#f8f9f8] text-[#3f5650]">
                <item.icon size={16} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1 text__14 font-medium ${
                  item.up ? 'text-[#4a6132]' : 'text-[#a83636]'
                }`}
              >
                {item.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {item.change}
              </span>
              <span className="text__12 text-[#9ca8a5]">{item.detail}</span>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Row 3 — revenue chart + catalog mix */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <motion.div
          className="admin-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="admin-kicker">Revenue overview</p>
              <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">
                The last 7 months
              </h3>
            </div>
            <div className="admin-chip">Monthly</div>
          </div>

          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={stats.revenueChart}>
              <defs>
                <linearGradient id="dashRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c9a96e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e7eae9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#6e7f7b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6e7f7b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 20,
                  border: '1px solid #e7eae9',
                  background: 'rgba(255,255,255,0.96)',
                  boxShadow: '0 16px 48px rgba(16,45,38,0.08)',
                }}
                formatter={(value: number) => [formatMoney(value), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#102d26"
                strokeWidth={2.4}
                fill="url(#dashRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="admin-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
        >
          <div className="mb-5">
            <p className="admin-kicker">Catalog mix</p>
            <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">
              Products by collection
            </h3>
          </div>

          {catalogMix.length === 0 ? (
            <p className="py-10 text-center text__14 text-[#9ca8a5]">No categories yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={catalogMix}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {catalogMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} products`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-2 space-y-3">
                {catalogMix.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text__14">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[#3f5650]">{cat.name}</span>
                    </div>
                    <span className="font-medium tabular-nums text-[#102d26]">{cat.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </section>

      {/* Row 4 — top products + recent orders */}
      <section className="grid gap-6 xl:grid-cols-2">
        <motion.div
          className="admin-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-kicker">Merchandising</p>
              <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">
                Top selling products
              </h3>
            </div>
            <Link to="/products" className="text__14 font-medium text-[#102d26] underline underline-offset-4">
              View catalog
            </Link>
          </div>

          {stats.topProducts.length === 0 ? (
            <p className="py-10 text-center text__14 text-[#9ca8a5]">No sales recorded yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {stats.topProducts.map((product, index) => {
                const units = product._sum.quantity ?? 0
                const revenue = units * Number(product.product?.price ?? 0)
                return (
                  <div
                    key={product.productId}
                    className="grid grid-cols-[52px_1fr_auto] items-center gap-4 rounded-[10px] border border-[#e7eae9] bg-[#f8f9f8] px-4 py-4"
                  >
                    <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[10px] border border-[#e7eae9] bg-white">
                      {product.product?.images?.[0] ? (
                        <img
                          src={product.product.images[0]}
                          alt=""
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <span className="text__14 font-medium text-[#102d26]">0{index + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text__16 font-medium text-[#102d26]">
                        {product.product?.name ?? 'Deleted product'}
                      </p>
                      <p className="mt-1 text__12 text-[#9ca8a5]">{units} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text__16 font-medium tabular-nums text-[#102d26]">
                        {formatMoneyShort(revenue)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          className="admin-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-kicker">Order feed</p>
              <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">
                Recent activity
              </h3>
            </div>
            <Link to="/orders" className="text__14 font-medium text-[#102d26] underline underline-offset-4">
              View orders
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <p className="py-10 text-center text__14 text-[#9ca8a5]">No orders yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {stats.recentOrders.map((order) => {
                const name = `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim() || order.user.email
                const style = ORDER_STATUS_STYLES[order.status] ?? ORDER_STATUS_STYLES.PENDING
                return (
                  <div
                    key={order.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[10px] border border-[#e7eae9] bg-white px-4 py-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#f1f3f3] text__12 font-medium text-[#102d26]">
                      {name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text__16 font-medium text-[#102d26]">{name}</p>
                        <span className={`badge ${style.chip}`}>{style.label}</span>
                      </div>
                      <p className="mt-1 truncate text__12 text-[#9ca8a5]">
                        {order.orderNumber} · {formatDate(order.createdAt)} · {order.items.length} item
                        {order.items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text__16 font-medium tabular-nums text-[#102d26]">
                      {formatMoney(order.total)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </section>
    </div>
  )
}

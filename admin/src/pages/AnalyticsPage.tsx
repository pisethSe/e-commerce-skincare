import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { apiData, apiList } from '../lib/api'
import { formatMoney, formatMoneyShort, percentDelta, isPositiveDelta, ORDER_STATUSES, ORDER_STATUS_STYLES } from '../lib/format'

interface Stats {
  revenue: { current: number; last: number }
  orders: { current: number; last: number; pending: number }
  customers: { current: number; last: number }
  topProducts: Array<{
    productId: string
    _sum: { quantity: number | null }
    product: { id: string; name: string; price: string } | undefined
  }>
  revenueChart: Array<{ month: string; revenue: number; orders: number }>
}

const CATEGORY_COLORS = ['#102d26', '#6f8a4a', '#9edccd', '#c9a96e', '#ddde92', '#b4bcba']

/** Analytics — honest snapshots from live store data. */
export default function AnalyticsPage() {
  const { pathname } = useLocation()
  const [stats, setStats] = useState<Stats | null>(null)
  const [statusCounts, setStatusCounts] = useState<Array<{ name: string; label: string; count: number; color: string }>>([])
  const [catalogMix, setCatalogMix] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    apiData<Stats>({ url: '/admin/stats' })
      .then((data) => alive && (setStats(data), setError(null)))
      .catch((e) => alive && setError(e.message))

    // Exact counts per status — each call returns pagination.total
    Promise.all(
      ORDER_STATUSES.map((s) =>
        apiList({ url: `/orders?status=${s}&limit=1` })
          .then((r) => ({ name: s, label: ORDER_STATUS_STYLES[s].label, count: r.pagination?.total ?? 0 }))
          .catch(() => ({ name: s, label: ORDER_STATUS_STYLES[s].label, count: 0 }))
      )
    ).then((counts) => {
      if (!alive) return
      const palette = ['#859390', '#c9a96e', '#9edccd', '#6f8a4a', '#e85050', '#f38080']
      setStatusCounts(counts.map((c, i) => ({ ...c, color: palette[i % palette.length] })))
    })

    apiList<{ name: string; _count: { products: number } }>({ url: '/categories' })
      .then(({ items }) => {
        if (!alive) return
        const sorted = [...items].sort((a, b) => b._count.products - a._count.products)
        setCatalogMix(sorted.map((c, i) => ({ name: c.name, value: c._count.products, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })))
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [pathname])

  if (error) {
    return (
      <div className="admin-card p-6 text__14 text-[#a83636]">
        Could not load analytics — {error}.
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="admin-card h-[200px] animate-pulse" />
        <div className="admin-card h-[320px] animate-pulse" />
      </div>
    )
  }

  const aov = stats.orders.current > 0 ? stats.revenue.current / stats.orders.current : 0
  const metrics = [
    { label: 'Revenue this month', value: formatMoneyShort(stats.revenue.current), current: stats.revenue.current, last: stats.revenue.last },
    { label: 'Orders this month', value: String(stats.orders.current), current: stats.orders.current, last: stats.orders.last },
    { label: 'Average order value', value: formatMoney(aov), current: aov, last: 0 },
    { label: 'New customers', value: String(stats.customers.current), current: stats.customers.current, last: stats.customers.last },
  ]

  const tooltipStyle = {
    borderRadius: 20,
    border: '1px solid #e7eae9',
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 16px 48px rgba(16,45,38,0.08)',
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, index) => (
          <motion.div
            key={m.label}
            className="admin-metric-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <p className="admin-kicker">{m.label}</p>
            <p className="mt-4 font-display text__32 font-medium tabular-nums text-[#102d26]">{m.value}</p>
            <div className="mt-4">
              {isPositiveDelta(m.current, m.last) ? (
                <span className="inline-flex items-center gap-1 text__14 font-medium text-[#4a6132]">
                  <ArrowUpRight size={14} /> {percentDelta(m.current, m.last)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text__14 font-medium text-[#a83636]">
                  <ArrowDownRight size={14} /> {percentDelta(m.current, m.last)}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Revenue + orders-by-status */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <motion.div className="admin-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="admin-kicker">Trend</p>
              <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">Revenue over 7 months</h3>
            </div>
            <div className="admin-chip">Monthly</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.revenueChart}>
              <defs>
                <linearGradient id="anRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c9a96e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e7eae9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6e7f7b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6e7f7b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatMoney(value), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#102d26" strokeWidth={2.4} fill="url(#anRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="admin-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <div className="mb-6">
            <p className="admin-kicker">Fulfillment</p>
            <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">Orders by status</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusCounts} barSize={26}>
              <CartesianGrid vertical={false} stroke="#e7eae9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#6e7f7b' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6e7f7b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} orders`, 'Count']} cursor={{ fill: 'rgba(16,45,38,0.04)' }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {statusCounts.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Top products + catalog mix */}
      <section className="grid gap-6 xl:grid-cols-2">
        <motion.div className="admin-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <div className="mb-6">
            <p className="admin-kicker">Merchandising</p>
            <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">Top selling products</h3>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="py-10 text-center text__14 text-[#9ca8a5]">No sales recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {stats.topProducts.map((p, i) => {
                const units = p._sum.quantity ?? 0
                const revenue = units * Number(p.product?.price ?? 0)
                return (
                  <div key={p.productId} className="space-y-2">
                    <div className="flex items-center justify-between text__14">
                      <span className="truncate font-medium text-[#102d26]">
                        {String(i + 1).padStart(2, '0')} · {p.product?.name ?? 'Deleted product'}
                      </span>
                      <span className="tabular-nums text-[#6e7f7b]">
                        {units} sold · {formatMoneyShort(revenue)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f1f3f3]">
                      <motion.div
                        className="h-full rounded-full bg-[#102d26]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(8, (units / (stats.topProducts[0]._sum.quantity || 1)) * 100)}%` }}
                        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        <motion.div className="admin-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <div className="mb-5">
            <p className="admin-kicker">Catalog mix</p>
            <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">Products by collection</h3>
          </div>
          {catalogMix.length === 0 ? (
            <p className="py-10 text-center text__14 text-[#9ca8a5]">No categories yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catalogMix} cx="50%" cy="50%" innerRadius={58} outerRadius={84} paddingAngle={3} dataKey="value">
                    {catalogMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} products`, 'Count']} />
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
    </div>
  )
}

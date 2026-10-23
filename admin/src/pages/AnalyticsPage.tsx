import React, { useEffect, useMemo, useState } from 'react'
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
import { ArrowDownRight, ArrowUpRight, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, apiData } from '../lib/api'
import {
  formatDate,
  formatMoney,
  formatMoneyShort,
  percentDelta,
  isPositiveDelta,
  ORDER_STATUSES,
  ORDER_STATUS_STYLES,
} from '../lib/format'

interface Analytics {
  range: { from: string; to: string; days: number }
  previous: { from: string; to: string }
  totals: {
    revenue: number
    previousRevenue: number
    orders: number
    previousOrders: number
    cancelled: number
    units: number
    newCustomers: number
    previousNewCustomers: number
    discount: number
    averageOrderValue: number
    previousAverageOrderValue: number
  }
  series: Array<{ date: string; revenue: number; orders: number }>
  statusCounts: Array<{ status: string; count: number }>
  topProducts: Array<{ productId: string; name: string; units: number; revenue: number }>
  categoryRevenue: Array<{ category: string; revenue: number; units: number }>
}

const CATEGORY_COLORS = ['#102d26', '#6f8a4a', '#9edccd', '#c9a96e', '#ddde92', '#b4bcba']

/** Local calendar date — `<input type=date>` values must not shift by UTC offset. */
const iso = (d: Date) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

type Preset = '7d' | '30d' | '90d' | 'month' | 'lastMonth' | 'custom'

function presetRange(preset: Preset): { from: string; to: string } {
  const today = new Date()
  if (preset === '7d') return { from: iso(daysAgo(6)), to: iso(today) }
  if (preset === '30d') return { from: iso(daysAgo(29)), to: iso(today) }
  if (preset === '90d') return { from: iso(daysAgo(89)), to: iso(today) }
  if (preset === 'month') {
    return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) }
  }
  if (preset === 'lastMonth') {
    return {
      from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  return { from: iso(daysAgo(29)), to: iso(today) }
}

/** Analytics — range-aware revenue, mix, and CSV exports. */
export default function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>('30d')
  const [range, setRange] = useState(() => presetRange('30d'))
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    apiData<Analytics>({ url: '/admin/analytics', params: range })
      .then((payload) => {
        if (!alive) return
        setData(payload)
        setError(null)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [range])

  const choosePreset = (next: Preset) => {
    setPreset(next)
    if (next !== 'custom') setRange(presetRange(next))
  }

  const updateRange = (key: 'from' | 'to', value: string) => {
    if (!value) return
    setPreset('custom')
    setRange((r) => ({ ...r, [key]: value }))
  }

  const exportCsv = async (type: 'orders' | 'products' | 'customers' | 'reviews') => {
    setExporting(type)
    try {
      const res = await api.get(`/admin/export/${type}`, { responseType: 'blob', params: range })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calesta-${type}-${iso(new Date())}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${type[0].toUpperCase()}${type.slice(1)} CSV exported`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  const statusData = useMemo(() => {
    const counts = new Map((data?.statusCounts ?? []).map((row) => [row.status, row.count]))
    const palette = ['#859390', '#c9a96e', '#9edccd', '#6f8a4a', '#e85050', '#f38080']
    return ORDER_STATUSES.map((status, i) => ({
      name: status,
      label: ORDER_STATUS_STYLES[status].label,
      count: counts.get(status) ?? 0,
      color: palette[i % palette.length],
    }))
  }, [data])

  const categoryMix = useMemo(() => {
    const rows = data?.categoryRevenue ?? []
    return rows.map((row, i) => ({
      name: row.category,
      value: row.revenue,
      units: row.units,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }))
  }, [data])

  const tooltipStyle = {
    borderRadius: 20,
    border: '1px solid #e7eae9',
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 16px 48px rgba(16,45,38,0.08)',
  }

  const presets: Array<{ key: Preset; label: string }> = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
    { key: 'month', label: 'This month' },
    { key: 'lastMonth', label: 'Last month' },
  ]

  if (error) {
    return <div className="admin-card p-6 text__14 text-[#a83636]">Could not load analytics — {error}.</div>
  }

  if (!data || loading) {
    return (
      <div className="space-y-6">
        <div className="admin-card h-[64px] animate-pulse" />
        <div className="admin-card h-[200px] animate-pulse" />
        <div className="admin-card h-[320px] animate-pulse" />
      </div>
    )
  }

  const { totals, series } = data
  const metrics = [
    {
      label: 'Revenue',
      value: formatMoneyShort(totals.revenue),
      current: totals.revenue,
      last: totals.previousRevenue,
      hint: `${totals.orders} orders in range`,
    },
    {
      label: 'Orders',
      value: String(totals.orders),
      current: totals.orders,
      last: totals.previousOrders,
      hint: `${totals.cancelled} cancelled`,
    },
    {
      label: 'Average order value',
      value: formatMoney(totals.averageOrderValue),
      current: totals.averageOrderValue,
      last: totals.previousAverageOrderValue,
      hint: `${totals.units} units sold`,
    },
    {
      label: 'New customers',
      value: String(totals.newCustomers),
      current: totals.newCustomers,
      last: totals.previousNewCustomers,
      hint: `${formatMoney(totals.discount)} discounted`,
    },
  ]

  const tickInterval = Math.max(0, Math.ceil(series.length / 8) - 1)

  return (
    <div className="space-y-6">
      {/* Range controls + exports */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">Analytics</p>
          <h2 className="mt-2 font-display text__32 font-medium text-[#102d26]">Performance</h2>
          <p className="mt-1 text__14 text-[#6e7f7b]">
            {formatDate(range.from)} – {formatDate(range.to)} · compared with the previous {data.range.days} days
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['orders', 'products', 'customers', 'reviews'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => void exportCsv(type)}
              disabled={exporting !== null}
              className="btn-admin-outline disabled:opacity-50"
            >
              <Download size={14} />
              {exporting === type ? 'Exporting…' : `${type[0].toUpperCase()}${type.slice(1)} CSV`}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card flex flex-wrap items-center gap-2 p-2">
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => choosePreset(p.key)}
              className={`rounded-[8px] px-3 py-1.5 text__14 transition-colors ${
                preset === p.key ? 'bg-[#102d26] text-white' : 'text-[#6e7f7b] hover:text-[#102d26]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text__12 text-[#6e7f7b]">
            From
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => updateRange('from', e.target.value)}
              className="rounded-[8px] border border-[#e7eae9] px-2 py-1.5 text__14 text-[#102d26] outline-none focus:border-[#102d26]"
            />
          </label>
          <label className="flex items-center gap-2 text__12 text-[#6e7f7b]">
            To
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => updateRange('to', e.target.value)}
              className="rounded-[8px] border border-[#e7eae9] px-2 py-1.5 text__14 text-[#102d26] outline-none focus:border-[#102d26]"
            />
          </label>
        </div>
      </div>

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
            <div className="mt-4 flex items-center justify-between gap-2">
              {isPositiveDelta(m.current, m.last) ? (
                <span className="inline-flex items-center gap-1 text__14 font-medium text-[#4a6132]">
                  <ArrowUpRight size={14} /> {percentDelta(m.current, m.last)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text__14 font-medium text-[#a83636]">
                  <ArrowDownRight size={14} /> {percentDelta(m.current, m.last)}
                </span>
              )}
              <span className="text__12 text-[#9ca8a5]">{m.hint}</span>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Revenue + orders by status */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <motion.div className="admin-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="admin-kicker">Trend</p>
              <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">Revenue · {data.range.days} days</h3>
            </div>
            <div className="admin-chip">Daily</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="anRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c9a96e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e7eae9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6e7f7b' }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
                tickFormatter={(value: string) =>
                  new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6e7f7b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value: string) =>
                  new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                }
                formatter={(value: number) => [formatMoney(value), 'Revenue']}
              />
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
            <BarChart data={statusData} barSize={26}>
              <CartesianGrid vertical={false} stroke="#e7eae9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#6e7f7b' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6e7f7b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value} orders`, 'Count']}
                cursor={{ fill: 'rgba(16,45,38,0.04)' }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Top products + revenue mix */}
      <section className="grid gap-6 xl:grid-cols-2">
        <motion.div className="admin-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <div className="mb-6">
            <p className="admin-kicker">Merchandising</p>
            <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">Top products in range</h3>
          </div>
          {data.topProducts.length === 0 ? (
            <p className="py-10 text-center text__14 text-[#9ca8a5]">No sales in this range.</p>
          ) : (
            <div className="space-y-4">
              {data.topProducts.map((p, i) => (
                <div key={p.productId} className="space-y-2">
                  <div className="flex items-center justify-between text__14">
                    <span className="truncate font-medium text-[#102d26]">
                      {String(i + 1).padStart(2, '0')} · {p.name}
                    </span>
                    <span className="tabular-nums text-[#6e7f7b]">
                      {p.units} sold · {formatMoneyShort(p.revenue)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f1f3f3]">
                    <motion.div
                      className="h-full rounded-full bg-[#102d26]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(8, (p.units / (data.topProducts[0]?.units || 1)) * 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div className="admin-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <div className="mb-5">
            <p className="admin-kicker">Revenue mix</p>
            <h3 className="mt-2 font-display text__24 font-medium text-[#102d26]">Sales by collection</h3>
          </div>
          {categoryMix.length === 0 ? (
            <p className="py-10 text-center text__14 text-[#9ca8a5]">No revenue in this range.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryMix} cx="50%" cy="50%" innerRadius={58} outerRadius={84} paddingAngle={3} dataKey="value">
                    {categoryMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatMoney(value), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-3">
                {categoryMix.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text__14">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[#3f5650]">{cat.name}</span>
                    </div>
                    <span className="font-medium tabular-nums text-[#102d26]">
                      {formatMoney(cat.value)} <span className="text__12 font-normal text-[#9ca8a5]">· {cat.units} units</span>
                    </span>
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

import React from 'react'
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
  CircleDollarSign,
  Package,
  ShoppingCart,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'

const revenueData = [
  { month: 'Sep', revenue: 18400, orders: 142 },
  { month: 'Oct', revenue: 22100, orders: 178 },
  { month: 'Nov', revenue: 31500, orders: 246 },
  { month: 'Dec', revenue: 48200, orders: 389 },
  { month: 'Jan', revenue: 35600, orders: 287 },
  { month: 'Feb', revenue: 41200, orders: 324 },
  { month: 'Mar', revenue: 52800, orders: 412 },
]

const categoryData = [
  { name: 'Serums', value: 38, color: '#c9a96e' },
  { name: 'Moisturizers', value: 27, color: '#6f8a4a' },
  { name: 'Cleansers', value: 18, color: '#9edccd' },
  { name: 'Sunscreen', value: 10, color: '#e5b07d' },
  { name: 'Other', value: 7, color: '#cccccc' },
]

const topProducts = [
  { name: 'Radiance Brightening Serum', sales: 342, revenue: 23256, note: 'Best in glow routine bundles' },
  { name: 'Hyaluronic Acid Booster', sales: 521, revenue: 28655, note: 'Strong repurchase velocity' },
  { name: 'Silk Barrier Moisturizer', sales: 486, revenue: 34992, note: 'Top cross-sell with cleanser' },
]

const recentOrders = [
  { id: '#1042', customer: 'Sarah Mitchell', amount: 136, status: 'Delivered', date: 'Mar 12' },
  { id: '#1041', customer: 'Emma Richardson', amount: 72, status: 'Shipped', date: 'Mar 12' },
  { id: '#1040', customer: 'Priya Desai', amount: 213, status: 'Processing', date: 'Mar 11' },
  { id: '#1039', customer: 'Olivia Kim', amount: 68, status: 'Delivered', date: 'Mar 11' },
]

const statusColors: Record<string, string> = {
  Delivered: 'bg-sage-100 text-sage-700',
  Shipped: 'bg-Mbrand-teal/20 text-Mneutral-900',
  Processing: 'bg-cream-100 text-cream-800',
}

const stats = [
  {
    label: 'Revenue',
    value: '$249.8k',
    change: '+18.2%',
    detail: 'Month over month',
    icon: CircleDollarSign,
    accent: 'from-cream-100 via-white to-white',
  },
  {
    label: 'Orders',
    value: '1,978',
    change: '+12.5%',
    detail: '412 this week',
    icon: ShoppingCart,
    accent: 'from-Mbrand-teal/20 via-white to-white',
  },
  {
    label: 'Customers',
    value: '3,241',
    change: '+8.1%',
    detail: '79 VIP members joined',
    icon: Users,
    accent: 'from-sage-100 via-white to-white',
  },
  {
    label: 'Products',
    value: '126',
    change: '+6 new',
    detail: '12 low stock alerts',
    icon: Package,
    accent: 'from-cream-50 via-white to-white',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <motion.div
          className="admin-card overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="grid h-full gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-7">
            <div className="flex flex-col justify-between">
              <div>
                <p className="admin-kicker">Performance Snapshot</p>
                <h2 className="mt-3 max-w-[12ch] font-display text__40 font-medium leading-tight text-Mneutral-900">
                  Shape the next launch with confidence.
                </h2>
                <p className="mt-4 max-w-[58ch] text__16 text-Mneutral-600">
                  Your signature serum line is leading growth. Inventory is healthy in the core range,
                  while replenishment demand is strongest on hydration rituals.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" className="btn-admin">
                  <Sparkles size={16} />
                  Launch Campaign
                </button>
                <button type="button" className="btn-admin-outline">
                  Review Inventory
                </button>
              </div>
            </div>

            <div className="admin-soft-card relative overflow-hidden p-5">
              <div className="pointer-events-none absolute right-[-42px] top-[-42px] h-32 w-32 rounded-full bg-cream-200/70 blur-2xl" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="admin-kicker">Best Seller</p>
                    <h3 className="mt-2 font-display text__24 font-medium text-Mneutral-900">
                      Radiance Brightening Serum
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-Mneutral-900 shadow-sm">
                    <Star size={18} />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between rounded-[22px] bg-white px-4 py-3">
                    <span className="text__14 text-Mneutral-600">Units sold</span>
                    <span className="text__18 font-medium text-Mneutral-900">521</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] bg-white px-4 py-3">
                    <span className="text__14 text-Mneutral-600">Revenue</span>
                    <span className="text__18 font-medium text-Mneutral-900">$28,655</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] bg-white px-4 py-3">
                    <span className="text__14 text-Mneutral-600">Conversion lift</span>
                    <span className="inline-flex items-center gap-1 text__14 font-medium text-sage-700">
                      <ArrowUpRight size={14} />
                      12.4%
                    </span>
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
              <p className="admin-kicker">Daily Pulse</p>
              <h3 className="mt-2 font-display text__24 font-medium text-Mneutral-900">
                Today at a glance
              </h3>
            </div>
            <div className="admin-chip">14 live updates</div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              ['Pending fulfillments', '18 orders'],
              ['Low stock alerts', '3 products'],
              ['New reviews', '12 waiting'],
              ['VIP support replies', '4 open'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-[22px] border border-Mneutral-100 bg-white px-4 py-4"
              >
                <span className="text__14 text-Mneutral-600">{label}</span>
                <span className="text__16 font-medium text-Mneutral-900">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => (
          <motion.div
            key={item.label}
            className={`admin-metric-card bg-gradient-to-br ${item.accent}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="admin-kicker">{item.label}</p>
                <p className="mt-4 font-display text__32 font-medium text-Mneutral-900">
                  {item.value}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/90 text-Mneutral-900">
                <item.icon size={18} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text__14 font-medium text-sage-700">
                <ArrowUpRight size={14} />
                {item.change}
              </span>
              <span className="text__12 text-Mneutral-500">{item.detail}</span>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <motion.div
          className="admin-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="admin-kicker">Revenue Overview</p>
              <h3 className="mt-2 font-display text__24 font-medium text-Mneutral-900">
                Growth over the last 7 months
              </h3>
            </div>
            <div className="admin-chip">Monthly</div>
          </div>

          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 20,
                  border: '1px solid #e7eae9',
                  background: 'rgba(255,255,255,0.96)',
                  boxShadow: '0 16px 48px rgba(16,45,38,0.08)',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#102d26"
                strokeWidth={2.4}
                fill="url(#adminRevenue)"
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
            <p className="admin-kicker">Category Mix</p>
            <h3 className="mt-2 font-display text__24 font-medium text-Mneutral-900">
              Sales by collection
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-2 space-y-3">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text__14">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-Mneutral-700">{cat.name}</span>
                </div>
                <span className="font-medium text-Mneutral-900">{cat.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

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
              <h3 className="mt-2 font-display text__24 font-medium text-Mneutral-900">
                Top performing products
              </h3>
            </div>
            <a href="/admin/products" className="text__14 font-medium text-Mneutral-900 underline underline-offset-4">
              View library
            </a>
          </div>

          <div className="mt-6 space-y-4">
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="grid grid-cols-[52px_1fr_auto] items-center gap-4 rounded-[26px] border border-Mneutral-100 bg-Mneutral-50/70 px-4 py-4"
              >
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text__14 font-medium text-Mneutral-900">
                  0{index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate text__16 font-medium text-Mneutral-900">{product.name}</p>
                  <p className="mt-1 text__12 text-Mneutral-500">{product.note}</p>
                </div>
                <div className="text-right">
                  <p className="text__16 font-medium text-Mneutral-900">
                    ${product.revenue.toLocaleString()}
                  </p>
                  <p className="text__12 text-Mneutral-500">{product.sales} sold</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="admin-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-kicker">Order Feed</p>
              <h3 className="mt-2 font-display text__24 font-medium text-Mneutral-900">
                Recent activity
              </h3>
            </div>
            <a href="/admin/orders" className="text__14 font-medium text-Mneutral-900 underline underline-offset-4">
              View orders
            </a>
          </div>

          <div className="mt-6 space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[26px] border border-Mneutral-100 bg-white px-4 py-4"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-Mneutral-50 text__12 font-medium text-Mneutral-900">
                  {order.customer
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text__16 font-medium text-Mneutral-900">{order.customer}</p>
                    <span className={`badge ${statusColors[order.status]}`}>{order.status}</span>
                  </div>
                  <p className="mt-1 text__12 text-Mneutral-500">
                    {order.id} • {order.date}
                  </p>
                </div>
                <p className="text__16 font-medium text-Mneutral-900">${order.amount}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  )
}

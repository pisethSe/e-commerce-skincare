import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Eye, Download, Filter } from 'lucide-react'

const ORDERS = [
  { id: '#1042', customer: 'Sarah Mitchell', email: 'sarah@example.com', amount: 136, items: 2, status: 'Delivered', date: 'Mar 12, 2026', payment: 'Visa •••• 4242' },
  { id: '#1041', customer: 'Emma Richardson', email: 'emma@example.com', amount: 72, items: 1, status: 'Shipped', date: 'Mar 12, 2026', payment: 'Mastercard •••• 8765' },
  { id: '#1040', customer: 'Priya Desai', email: 'priya@example.com', amount: 213, items: 3, status: 'Processing', date: 'Mar 11, 2026', payment: 'Visa •••• 1234' },
  { id: '#1039', customer: 'Olivia Kim', email: 'olivia@example.com', amount: 68, items: 1, status: 'Delivered', date: 'Mar 11, 2026', payment: 'PayPal' },
  { id: '#1038', customer: 'Charlotte Webb', email: 'charlotte@example.com', amount: 95, items: 1, status: 'Pending', date: 'Mar 10, 2026', payment: 'Visa •••• 9876' },
  { id: '#1037', customer: 'Amelia Johnson', email: 'amelia@example.com', amount: 158, items: 2, status: 'Delivered', date: 'Mar 10, 2026', payment: 'Apple Pay' },
  { id: '#1036', customer: 'Isabelle Laurent', email: 'isabelle@example.com', amount: 47, items: 1, status: 'Cancelled', date: 'Mar 09, 2026', payment: 'Visa •••• 5555' },
  { id: '#1035', customer: 'Zoe Anderson', email: 'zoe@example.com', amount: 184, items: 3, status: 'Delivered', date: 'Mar 09, 2026', payment: 'Mastercard •••• 3322' },
]

const STATUS_COLORS: Record<string, string> = {
  Delivered: 'bg-green-100 text-green-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Processing: 'bg-amber-100 text-amber-700',
  Pending: 'bg-slate-100 text-slate-600',
  Cancelled: 'bg-red-100 text-red-600',
}

const TABS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')

  const filtered = ORDERS.filter((o) => {
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search)
    const matchTab = activeTab === 'All' || o.status === activeTab
    return matchSearch && matchTab
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">Orders</h2>
          <p className="text-sm text-slate-400">{ORDERS.length} total orders</p>
        </div>
        <button className="btn-admin-outline">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1.5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or customer…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400"
          />
        </div>
        <button className="btn-admin-outline">
          <Filter size={14} /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="table-th">Order</th>
              <th className="table-th">Customer</th>
              <th className="table-th">Date</th>
              <th className="table-th">Items</th>
              <th className="table-th">Payment</th>
              <th className="table-th">Total</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((order, i) => (
              <motion.tr
                key={order.id}
                className="hover:bg-slate-50/50 transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <td className="table-td font-mono text-slate-500 font-medium">{order.id}</td>
                <td className="table-td">
                  <div>
                    <p className="font-medium text-slate-800">{order.customer}</p>
                    <p className="text-xs text-slate-400">{order.email}</p>
                  </div>
                </td>
                <td className="table-td text-slate-500">{order.date}</td>
                <td className="table-td text-center">{order.items}</td>
                <td className="table-td text-slate-500 text-xs">{order.payment}</td>
                <td className="table-td font-semibold">${order.amount}</td>
                <td className="table-td">
                  <select
                    defaultValue={order.status}
                    className={`badge border-0 cursor-pointer outline-none ${STATUS_COLORS[order.status]}`}
                  >
                    {Object.keys(STATUS_COLORS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="table-td">
                  <button className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
                    <Eye size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="font-medium">No orders found</p>
          </div>
        )}

        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between text-sm text-slate-500">
          <span>Showing {filtered.length} orders</span>
          <div className="flex gap-1">
            {[1, 2, 3, '...', 12].map((p, i) => (
              <button
                key={i}
                className={`w-8 h-8 rounded text-xs font-medium ${p === 1 ? 'bg-amber-500 text-white' : 'hover:bg-slate-100'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Eye, Search, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiData, apiList, type Pagination as PaginationMeta } from '../lib/api'
import { formatMoney, formatDate, ORDER_STATUSES, ORDER_STATUS_STYLES } from '../lib/format'
import StatusBadge from '../components/ui/StatusBadge'
import Pagination from '../components/ui/Pagination'
import Drawer from '../components/ui/Drawer'
import EmptyState from '../components/ui/EmptyState'

interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
}

interface AdminOrder {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  paymentMethod: string | null
  createdAt: string
  user: { firstName: string | null; lastName: string | null; email: string }
  items: OrderItem[]
  address: {
    firstName: string
    lastName: string
    street: string
    city: string
    state: string
    zip: string
    country: string
    phone?: string | null
  } | null
}

const TABS: Array<'All' | (typeof ORDER_STATUSES)[number]> = ['All', ...ORDER_STATUSES]

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'All' | string>('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminOrder | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (status !== 'All') params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      const { items, pagination: p } = await apiList<AdminOrder>({ url: `/orders?${params.toString()}` })
      setOrders(items)
      setPagination(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => {
    load()
  }, [load])

  const changeStatus = async (order: AdminOrder, next: string) => {
    if (next === order.status) return
    setUpdatingId(order.id)
    try {
      const updated = await apiData<AdminOrder>({
        method: 'PATCH',
        url: `/orders/${order.id}/status`,
        data: { status: next },
      })
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: updated.status } : o)))
      setDetail((d) => (d && d.id === order.id ? { ...d, status: updated.status } : d))
      toast.success(`${order.orderNumber} → ${ORDER_STATUS_STYLES[next]?.label ?? next}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Status update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  const exportCsv = () => {
    const rows = [
      ['Order', 'Customer', 'Email', 'Date', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total', 'Status', 'Payment'],
      ...orders.map((o) => [
        o.orderNumber,
        `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim() || o.user.email,
        o.user.email,
        formatDate(o.createdAt),
        String(o.items.length),
        o.subtotal,
        o.discount,
        o.shipping,
        o.tax,
        o.total,
        o.status,
        o.paymentMethod ?? '—',
      ]),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calesta-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const customerName = (o: AdminOrder) =>
    `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim() || o.user.email

  const tableEmpty = useMemo(() => !loading && orders.length === 0, [loading, orders])

  return (
    <div className="space-y-5">
      {/* Status tabs — server-side filter */}
      <div className="admin-card flex w-fit flex-wrap gap-1 p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setStatus(tab)
              setPage(1)
            }}
            className={`rounded-[8px] px-3.5 py-2 text__14 font-medium transition-all duration-200 active:scale-[0.97] ${
              status === tab
                ? 'bg-[#102d26] text-white '
                : 'text-[#6e7f7b] hover:bg-[#f1f3f3] hover:text-[#102d26]'
            }`}
          >
            {tab === 'All' ? 'All' : ORDER_STATUS_STYLES[tab].label}
          </button>
        ))}
      </div>

      {/* Search + export */}
      <div className="admin-card flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca8a5]" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by order number or customer email…"
            aria-label="Search orders"
            className="input-admin pl-11"
          />
        </div>
        <button type="button" onClick={exportCsv} className="btn-admin-outline">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {error ? (
          <div className="p-6 text__14 text-[#a83636]">{error}</div>
        ) : loading ? (
          <div className="space-y-2 p-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-[10px] bg-[#f1f3f3]" />
            ))}
          </div>
        ) : tableEmpty ? (
          <EmptyState
            icon={<ShoppingBag size={18} />}
            title="No orders found"
            hint={status !== 'All' ? `No ${ORDER_STATUS_STYLES[status]?.label.toLowerCase()} orders right now.` : 'Try a different search.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead className="border-b border-[#e7eae9]">
                  <tr>
                    <th className="table-th">Order</th>
                    <th className="table-th">Customer</th>
                    <th className="table-th">Date</th>
                    <th className="table-th">Items</th>
                    <th className="table-th">Total</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f3]">
                  {orders.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      className="transition-colors hover:bg-[#f8f9f8]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <td className="table-td whitespace-nowrap font-medium text-[#102d26] tabular-nums">
                        {order.orderNumber}
                      </td>
                      <td className="table-td">
                        <p className="font-medium text-[#102d26]">{customerName(order)}</p>
                        <p className="mt-0.5 text__12 text-[#9ca8a5]">{order.user.email}</p>
                      </td>
                      <td className="table-td whitespace-nowrap text-[#6e7f7b]">{formatDate(order.createdAt)}</td>
                      <td className="table-td text-center tabular-nums text-[#3f5650]">{order.items.length}</td>
                      <td className="table-td font-semibold tabular-nums text-[#102d26]">
                        {formatMoney(order.total)}
                      </td>
                      <td className="table-td">
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => changeStatus(order, e.target.value)}
                          aria-label={`Status for ${order.orderNumber}`}
                          className={`badge cursor-pointer appearance-none border-0 pr-7 outline-none transition-opacity ${ORDER_STATUS_STYLES[order.status]?.chip ?? ''} ${
                            updatingId === order.id ? 'opacity-50' : ''
                          }`}
                          style={{
                            backgroundImage:
                              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23102d26' stroke-opacity='0.4' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 10px center',
                          }}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {ORDER_STATUS_STYLES[s].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="table-td text-right">
                        <button
                          type="button"
                          onClick={() => setDetail(order)}
                          aria-label={`View ${order.orderNumber}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-[#9ca8a5] transition-colors hover:bg-[#f1f3f3] hover:text-[#102d26] active:scale-[0.97]"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#e7eae9] px-5 py-4">
              <Pagination
                page={pagination?.page ?? 1}
                totalPages={pagination?.totalPages ?? 1}
                total={pagination?.total ?? 0}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Order detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        kicker="Order"
        title={detail?.orderNumber ?? ''}
      >
        {detail && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={detail.status} />
              <span className="text__14 text-[#9ca8a5]">{formatDate(detail.createdAt)}</span>
              {detail.paymentMethod && (
                <span className="admin-chip capitalize">{detail.paymentMethod}</span>
              )}
            </div>

            <div className="rounded-[10px] border border-[#e7eae9] bg-[#f8f9f8] px-5 py-4">
              <p className="admin-kicker">Customer</p>
              <p className="mt-2 text__16 font-medium text-[#102d26]">{customerName(detail)}</p>
              <p className="mt-0.5 text__14 text-[#9ca8a5]">{detail.user.email}</p>
            </div>

            <div>
              <p className="admin-kicker mb-3">Items</p>
              <div className="space-y-2">
                {detail.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-[10px] border border-[#e7eae9] bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text__14 font-medium text-[#102d26]">{item.name}</p>
                      <p className="mt-0.5 text__12 text-[#9ca8a5]">
                        {formatMoney(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="text__14 font-medium tabular-nums text-[#102d26]">
                      {formatMoney(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {detail.address && (
              <div>
                <p className="admin-kicker mb-3">Shipping address</p>
                <div className="rounded-[10px] border border-[#e7eae9] bg-white px-4 py-4 text__14 leading-relaxed text-[#3f5650]">
                  <p className="font-medium text-[#102d26]">
                    {detail.address.firstName} {detail.address.lastName}
                  </p>
                  <p>{detail.address.street}</p>
                  <p>
                    {detail.address.city}, {detail.address.state} {detail.address.zip}
                  </p>
                  <p>{detail.address.country}</p>
                  {detail.address.phone && <p className="mt-1 text-[#9ca8a5]">{detail.address.phone}</p>}
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-[#e7eae9] pt-4 text__14">
              <div className="flex justify-between text-[#6e7f7b]">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatMoney(detail.subtotal)}</span>
              </div>
              {Number(detail.discount) > 0 && (
                <div className="flex justify-between text-[#4a6132]">
                  <span>Discount</span>
                  <span className="tabular-nums">−{formatMoney(detail.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6e7f7b]">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {Number(detail.shipping) === 0 ? 'Free' : formatMoney(detail.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-[#6e7f7b]">
                <span>Tax</span>
                <span className="tabular-nums">{formatMoney(detail.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-[#e7eae9] pt-2 text__16 font-semibold text-[#102d26]">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(detail.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

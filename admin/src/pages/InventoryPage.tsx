import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BellRing, Boxes, Download, PackageX, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, apiData } from '../lib/api'
import { formatDate } from '../lib/format'

interface InventoryItem {
  id: string
  name: string
  slug: string
  images: string[]
  stockCount: number
  lowStockThreshold: number
  inStock: boolean
  updatedAt: string
  category: { id: string; name: string; slug: string }
  pendingNotifications: number
  lowStock: boolean
  outOfStock: boolean
}

interface InventorySummary {
  total: number
  lowStock: number
  outOfStock: number
  pendingNotifications: number
}

interface InventoryResponse {
  items: InventoryItem[]
  summary: InventorySummary
}

function statusChip(item: InventoryItem) {
  if (item.outOfStock) return { label: 'Out of stock', className: 'bg-[#fdeeee] text-[#a83636]' }
  if (item.lowStock) return { label: `Low · ${item.stockCount}`, className: 'bg-[#f7f1de] text-[#7a6420]' }
  return { label: 'Healthy', className: 'bg-[#eaf1e3] text-[#4a6132]' }
}

/** One editable row — keeps its own draft so typing doesn't refetch the table. */
function InventoryRow({
  item,
  onSaved,
}: {
  item: InventoryItem
  onSaved: (updated: InventoryItem, notification: { sent: number; pending: number } | null) => void
}) {
  const [stock, setStock] = useState(String(item.stockCount))
  const [threshold, setThreshold] = useState(String(item.lowStockThreshold))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStock(String(item.stockCount))
    setThreshold(String(item.lowStockThreshold))
  }, [item.stockCount, item.lowStockThreshold])

  const dirty = Number(stock) !== item.stockCount || Number(threshold) !== item.lowStockThreshold
  const chip = statusChip(item)

  const save = async () => {
    setSaving(true)
    try {
      const data = await apiData<InventoryItem & { notification: { sent: number; pending: number } | null }>({
        method: 'PATCH',
        url: `/admin/inventory/${item.id}`,
        data: { stockCount: Number(stock), lowStockThreshold: Number(threshold) },
      })
      const { notification, ...updated } = data
      onSaved(updated, notification)
      if (notification && notification.sent > 0) {
        toast.success(`${notification.sent} customer${notification.sent === 1 ? '' : 's'} notified`)
      } else if (notification && notification.pending > 0) {
        toast(`${notification.pending} customer${notification.pending === 1 ? '' : 's'} waiting — email delivery isn't configured`, {
          icon: '📧',
        })
      } else {
        toast.success(`${item.name} updated`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.tr className="transition-colors hover:bg-[#f8f9f8]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <td className="table-td">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
            {item.images[0] ? (
              <img src={item.images[0]} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <Boxes size={14} className="text-[#9ca8a5]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[#102d26]">{item.name}</p>
            <p className="mt-0.5 truncate text__12 text-[#9ca8a5]">/{item.slug}</p>
          </div>
        </div>
      </td>
      <td className="table-td whitespace-nowrap text-[#3f5650]">{item.category?.name ?? '—'}</td>
      <td className="table-td">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-[84px] rounded-[8px] border border-[#e7eae9] bg-white px-2 py-1.5 text__14 tabular-nums text-[#102d26] outline-none focus:border-[#102d26]"
            aria-label={`Stock for ${item.name}`}
          />
          <span className="text__12 text-[#9ca8a5]">units</span>
        </div>
      </td>
      <td className="table-td">
        <input
          type="number"
          min={0}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-[76px] rounded-[8px] border border-[#e7eae9] bg-white px-2 py-1.5 text__14 tabular-nums text-[#102d26] outline-none focus:border-[#102d26]"
          aria-label={`Low-stock threshold for ${item.name}`}
        />
      </td>
      <td className="table-td">
        <span className={`badge ${chip.className}`}>{chip.label}</span>
      </td>
      <td className="table-td">
        {item.pendingNotifications > 0 ? (
          <span className="inline-flex items-center gap-1.5 text__14 text-[#7a6420]">
            <BellRing size={14} /> {item.pendingNotifications} waiting
          </span>
        ) : (
          <span className="text__14 text-[#9ca8a5]">—</span>
        )}
      </td>
      <td className="table-td whitespace-nowrap text__12 text-[#9ca8a5]">{formatDate(item.updatedAt)}</td>
      <td className="table-td text-right">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="btn-admin disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Update'}
        </button>
      </td>
    </motion.tr>
  )
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiData<InventoryResponse>({
        url: `/admin/inventory${lowStockOnly ? '?lowStock=1' : ''}`,
      })
      setItems(data.items ?? [])
      setSummary(data.summary ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inventory')
    } finally {
      setLoading(false)
    }
  }, [lowStockOnly])

  useEffect(() => {
    void load()
  }, [load])

  const download = async (type: 'products' | 'customers' | 'orders') => {
    try {
      const res = await api.get(`/admin/export/${type}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calesta-${type}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${type[0].toUpperCase()}${type.slice(1)} CSV exported`)
    } catch {
      toast.error('Export failed')
    }
  }

  const cards = useMemo(
    () => [
      { label: 'SKUs tracked', value: summary?.total ?? 0, icon: Boxes, tone: 'text-[#102d26]' },
      { label: 'Low stock', value: summary?.lowStock ?? 0, icon: AlertTriangle, tone: 'text-[#7a6420]' },
      { label: 'Out of stock', value: summary?.outOfStock ?? 0, icon: PackageX, tone: 'text-[#a83636]' },
      { label: 'Waiting for restock', value: summary?.pendingNotifications ?? 0, icon: BellRing, tone: 'text-[#1f5c46]' },
    ],
    [summary]
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="admin-kicker">Inventory</p>
          <h2 className="mt-2 font-display text__32 font-medium text-[#102d26]">Stock control</h2>
          <p className="mt-1 text__14 text-[#6e7f7b]">
            Restock a product and everyone waiting gets emailed automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="btn-admin-outline">
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" onClick={() => void download('products')} className="btn-admin-outline">
            <Download size={14} /> Products CSV
          </button>
          <button type="button" onClick={() => void download('customers')} className="btn-admin-outline">
            <Download size={14} /> Customers CSV
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            className="admin-metric-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <div className="flex items-center justify-between">
              <p className="admin-kicker">{card.label}</p>
              <card.icon size={16} className={card.tone} />
            </div>
            <p className="mt-4 font-display text__32 font-medium tabular-nums text-[#102d26]">{card.value}</p>
          </motion.div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="admin-card flex w-fit gap-1 p-1.5">
          <button
            type="button"
            onClick={() => setLowStockOnly(false)}
            className={`rounded-[8px] px-3 py-1.5 text__14 transition-colors ${
              !lowStockOnly ? 'bg-[#102d26] text-white' : 'text-[#6e7f7b] hover:text-[#102d26]'
            }`}
          >
            All products
          </button>
          <button
            type="button"
            onClick={() => setLowStockOnly(true)}
            className={`rounded-[8px] px-3 py-1.5 text__14 transition-colors ${
              lowStockOnly ? 'bg-[#102d26] text-white' : 'text-[#6e7f7b] hover:text-[#102d26]'
            }`}
          >
            Needs attention
          </button>
        </div>
        <p className="text__12 text-[#9ca8a5]">
          Low-stock threshold is per product — the storefront hides anything at zero.
        </p>
      </div>

      <div className="admin-card overflow-hidden">
        {error ? (
          <div className="p-6 text__14 text-[#a83636]">{error}</div>
        ) : loading ? (
          <div className="space-y-2 p-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-[10px] bg-[#f1f3f3]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text__16 font-medium text-[#102d26]">Everything is well stocked</p>
            <p className="mt-1 text__14 text-[#9ca8a5]">No products need attention right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-[#e7eae9]">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">Collection</th>
                  <th className="table-th">Stock</th>
                  <th className="table-th">Alert at</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Restock alerts</th>
                  <th className="table-th">Updated</th>
                  <th className="table-th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f3]">
                {items.map((item) => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    onSaved={(updated) => {
                      setItems((rows) => rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
                      void load()
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

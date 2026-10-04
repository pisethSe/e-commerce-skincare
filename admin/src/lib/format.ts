/** Shared formatting + status styling for the admin. */

export const formatMoney = (value: number | string | null | undefined): string =>
  `$${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatMoneyShort = (value: number | string | null | undefined): string => {
  const n = Number(value ?? 0)
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `$${n.toFixed(0)}`
}

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const percentDelta = (current: number, last: number): string => {
  if (last === 0) return current > 0 ? 'New' : '—'
  const pct = ((current - last) / last) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

export const isPositiveDelta = (current: number, last: number): boolean => {
  if (last === 0) return current > 0
  return current >= last
}

export const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const

/** Quiet status tints — soft chip, colored dot, readable text. */
export const ORDER_STATUS_STYLES: Record<string, { chip: string; dot: string; label: string }> = {
  PENDING: { chip: 'bg-[#f1f3f3] text-[#5d6f6a]', dot: 'bg-[#9ca8a5]', label: 'Pending' },
  PROCESSING: { chip: 'bg-[#f7f1de] text-[#7a6420]', dot: 'bg-[#c9a96e]', label: 'Processing' },
  SHIPPED: { chip: 'bg-[#ddf0e9] text-[#1f5c46]', dot: 'bg-[#2e8b64]', label: 'Shipped' },
  DELIVERED: { chip: 'bg-[#eaf1e3] text-[#4a6132]', dot: 'bg-[#6f8a4a]', label: 'Delivered' },
  CANCELLED: { chip: 'bg-[#fdeeee] text-[#a83636]', dot: 'bg-[#d64545]', label: 'Cancelled' },
  REFUNDED: { chip: 'bg-[#fbe9e0] text-[#9c5530]', dot: 'bg-[#e5b07d]', label: 'Refunded' },
}

/** Slugifies a product/journal title the same way the backend does. */
export const slugify = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, '-')

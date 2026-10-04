import React from 'react'
import { ORDER_STATUS_STYLES } from '../../lib/format'

interface StatusBadgeProps {
  status: string
  className?: string
}

/** Order status pill — soft Calesta tint, status dot, tabular label. */
export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = ORDER_STATUS_STYLES[status] ?? ORDER_STATUS_STYLES.PENDING
  return (
    <span className={`badge ${style.chip} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {style.label}
    </span>
  )
}

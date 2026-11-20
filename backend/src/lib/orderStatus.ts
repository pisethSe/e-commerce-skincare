/**
 * Order lifecycle rules. Statuses are intentionally explicit for fulfillment,
 * so an order can only advance along a small set of legal paths. Reactivating a
 * cancelled order is allowed because the controller restores its stock and
 * coupon reservation in the same transaction.
 */

export const ORDER_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: ['PENDING', 'PROCESSING'],
  REFUNDED: [],
}

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value)

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  from === to || TRANSITIONS[from].includes(to)

export const isInactiveStatus = (status: OrderStatus): boolean =>
  status === 'CANCELLED' || status === 'REFUNDED'

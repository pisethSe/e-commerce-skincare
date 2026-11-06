import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BadgeCheck,
  Ban,
  LogOut,
  MapPin,
  Package,
  ReceiptText,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { useAuthStore, useUIStore } from '../lib/store'
import { getApiUrl, apiFetch } from '../lib/api'
import { useMoney } from '../lib/currency'
import { useLang, useT } from '../lib/i18n'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { OrderStatusChip, OrderTimeline } from '../components/order/OrderTimeline'

interface MyOrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  product?: { name: string; images: string[] }
}

interface MyOrder {
  id: string
  orderNumber: string
  status: string
  paymentStatus?: string
  paymentMethod?: string | null
  trackingNumber?: string | null
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  notes?: string | null
  createdAt: string
  items: MyOrderItem[]
}

interface SavedAddress {
  id: string
  firstName: string
  lastName: string
  street: string
  city: string
  state: string
  zip: string
  country: string
  phone?: string | null
  isDefault: boolean
}

type AccountTab = 'orders' | 'profile' | 'addresses'
type OrderFilter = 'all' | 'active' | 'past'

const orderFilters: Array<{ value: OrderFilter; key: 'account.filterAll' | 'account.filterActive' | 'account.filterPast' }> = [
  { value: 'all', key: 'account.filterAll' },
  { value: 'active', key: 'account.filterActive' },
  { value: 'past', key: 'account.filterPast' },
]

export default function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const logout = useAuthStore((s) => s.logout)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const [tab, setTab] = useState<AccountTab>('orders')
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filteredOrders, setFilteredOrders] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<MyOrder | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const t = useT()
  const lang = useLang()
  const { money } = useMoney()

  useEffect(() => {
    document.title = 'Calesta — My Account'
  }, [])

  useEffect(() => {
    setOrders([])
    setPage(1)
    setTotalPages(1)
    setFilteredOrders(0)
    setTotalOrders(0)
    setTotalSpent(0)
    setError(null)
  }, [accessToken, orderFilter])

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    let alive = true
    const firstPage = page === 1
    if (firstPage) setLoading(true)
    else setLoadingMore(true)
    setError(null)

    const statusQuery = orderFilter === 'all' ? '' : `&status=${orderFilter}`
    apiFetch(`/api/orders/my?page=${page}&limit=10${statusQuery}`, {
      token: accessToken,
    })
      .then((r) => r.json())
      .then((result) => {
        if (!alive) return
        if (result.success) {
          const next = result.data ?? []
          setOrders((prev) => (firstPage ? next : [...prev, ...next]))
          setFilteredOrders(result.pagination?.total ?? next.length)
          setTotalOrders(result.summary?.totalOrders ?? result.pagination?.total ?? next.length)
          setTotalSpent(Number(result.summary?.totalSpent ?? 0))
          setTotalPages(result.pagination?.totalPages ?? 1)
        } else {
          setError(result.message ?? 'Could not load your orders.')
        }
      })
      .catch(() => {
        if (alive) setError('Could not load your orders — is the API running?')
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
        setLoadingMore(false)
      })

    return () => {
      alive = false
    }
  }, [accessToken, page, orderFilter])

  useEffect(() => {
    if (!accessToken || tab !== 'addresses') return
    let alive = true
    setAddressesLoading(true)
    apiFetch('/api/users/addresses', { token: accessToken })
      .then((r) => r.json())
      .then((result) => {
        if (alive && result.success) setAddresses(result.data ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setAddressesLoading(false)
      })
    return () => {
      alive = false
    }
  }, [accessToken, tab])

  const cancelOrder = async () => {
    if (!cancelTarget || !accessToken) return
    setCancelling(true)
    try {
      const res = await apiFetch(`/api/orders/${cancelTarget.id}/cancel`, {
        method: 'PATCH',
        token: accessToken,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? 'Could not cancel this order.')
      }
      setOrders((current) => {
        if (orderFilter === 'active') {
          return current.filter((order) => order.id !== cancelTarget.id)
        }
        return current.map((order) =>
          order.id === cancelTarget.id ? { ...order, status: 'CANCELLED' } : order
        )
      })
      if (orderFilter === 'active') {
        setFilteredOrders((current) => Math.max(0, current - 1))
      }
      // Cancelled orders no longer count toward lifetime spend.
      setTotalSpent((current) => Math.max(0, current - Number(cancelTarget.total)))
      setCancelTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this order.')
      setCancelTarget(null)
    } finally {
      setCancelling(false)
    }
  }

  /* ---------- Not signed in ---------- */
  if (!user) {
    return (
      <div className="bg-Mneutral-50 pt-[140px]">
        <div className="container-custom rounded-[32px] bg-white px-[20px] py-[80px] text-center xs:px-[40px]">
          <ShoppingBag size={64} strokeWidth={1} className="mx-auto mb-6 text-Mneutral-300" />
          <h1 className="mb-3 text__40 font-medium text-Mneutral-900">{t('account.signInFirst')}</h1>
          <p className="mb-8 text__18 text-Mneutral-600">
            {t('account.signInHint')}
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="filled-pill-button"
          >
            {t('checkout.signIn')}
          </button>
        </div>
      </div>
    )
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null
  const confirmLogoutAction = () => {
    setConfirmLogout(false)
    logout()
  }

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="section-template pt-[32px]">
        <div className="container-custom flex flex-col gap-[12px]">
          {/* Profile card */}
          <div className="rounded-[32px] bg-white px-[20px] py-[28px] xs:px-[40px] xs:py-[40px] xl:px-[56px]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-Mneutral-900 text__18 font-medium text-white">
                  {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'C'}
                </div>
                <div>
                  <p className="mb-1 text__14 font-medium uppercase tracking-[0.28em] text-Mneutral-400">
                    {t('account.myAccount')}
                  </p>
                  <h1 className="text__32 font-medium">
                    {t('account.hi', { name: user.firstName })}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text__14 text-Mneutral-500">
                    {user.email}
                    <BadgeCheck size={14} className="text-sage-600" />
                    {memberSince && <span>· {t('account.memberSince', { date: memberSince })}</span>}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className="outline-pill-button px-5 py-3 text__14"
              >
                <LogOut size={14} />
                {t('account.logout')}
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ProfileLink
                icon={<ReceiptText size={18} strokeWidth={1.75} />}
                title={t('account.myOrders')}
                hint={t('account.myOrdersHint')}
                active={tab === 'orders'}
                onClick={() => setTab('orders')}
              />
              <ProfileLink
                icon={<UserRound size={18} strokeWidth={1.75} />}
                title={t('account.myAccount')}
                hint={t('account.myAccountHint')}
                active={tab === 'profile'}
                onClick={() => setTab('profile')}
              />
              <ProfileLink
                icon={<MapPin size={18} strokeWidth={1.75} />}
                title={t('account.myAddresses')}
                hint={t('account.myAddressesHint')}
                active={tab === 'addresses'}
                onClick={() => setTab('addresses')}
              />
            </div>

            {totalOrders > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-Mneutral-50 px-5 py-4">
                  <p className="text__14 text-Mneutral-500">{t('account.ordersPlaced')}</p>
                  <p className="mt-1 text__24 font-medium tabular-nums">{totalOrders}</p>
                </div>
                <div className="rounded-[24px] bg-Mneutral-50 px-5 py-4">
                  <p className="text__14 text-Mneutral-500">{t('account.totalSpent')}</p>
                  <p className="mt-1 text__24 font-medium tabular-nums">{money(totalSpent)}</p>
                </div>
                <div className="col-span-2 rounded-[24px] bg-Mneutral-50 px-5 py-4 md:col-span-1">
                  <p className="text__14 text-Mneutral-500">{t('account.freeShipping')}</p>
                  <p className="mt-1 text__24 font-medium">{t('common.freeShippingOverShort')}</p>
                </div>
              </div>
            )}
          </div>

          {tab === 'orders' && (
            <div className="rounded-[32px] bg-white px-[20px] py-[28px] xs:px-[40px] xs:py-[40px] xl:px-[56px]">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-3 text__18 text-Mneutral-400">{t('account.orderHistory')}</p>
                  <h2 className="text__48 font-medium">{t('account.yourRituals')}</h2>
                </div>
                {totalOrders > 0 && (
                  <p className="text__18 text-Mneutral-500 tabular-nums">
                    {t('account.ordersCount', { count: filteredOrders })}
                  </p>
                )}
              </div>

              <div className="mb-6 flex flex-wrap gap-2 border-b border-Mneutral-100 pb-4">
                {orderFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setOrderFilter(filter.value)}
                    className={`rounded-full px-[16px] py-[8px] text__14 transition-colors ${
                      orderFilter === filter.value
                        ? 'bg-Mneutral-900 text-white'
                        : 'border border-Mneutral-200 text-Mneutral-600 hover:border-Mneutral-900 hover:text-Mneutral-900'
                    }`}
                  >
                    {t(filter.key)}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[120px] animate-pulse rounded-[28px] bg-Mneutral-50" />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-[24px] bg-[#fdeeee] px-5 py-4 text__14 text-[#a83636]">{error}</div>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center">
                  <Package size={48} strokeWidth={1} className="mx-auto mb-4 text-Mneutral-300" />
                  <p className="text__24 font-medium">
                    {orderFilter === 'all' ? t('account.noOrders') : t('account.noFilteredOrders')}
                  </p>
                  <p className="mt-2 text__16 text-Mneutral-500">
                    {orderFilter === 'all' ? t('account.noOrdersHint') : t('account.noFilteredOrdersHint')}
                  </p>
                  <Link to="/shop" className="filled-pill-button mt-6">
                    {t('common.startShopping')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order, i) => {
                    const canCancel = order.status === 'PENDING' && order.paymentStatus !== 'PAID'
                    return (
                      <motion.div
                        key={order.id}
                        className="rounded-[28px] border border-Mneutral-100 p-4 md:p-5"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-medium tabular-nums text-Mneutral-900">
                              {order.orderNumber}
                            </span>
                            <OrderStatusChip status={order.status} />
                            {order.paymentStatus && (
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  order.paymentStatus === 'PAID'
                                    ? 'bg-[#eaf1e3] text-[#4a6132]'
                                    : 'bg-[#f7f1de] text-[#7a6420]'
                                }`}
                              >
                                {order.paymentStatus === 'PAID' ? t('account.paid') : t('account.unpaid')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text__14 text-Mneutral-500">
                              {new Date(order.createdAt).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text__18 font-medium tabular-nums">
                              {money(order.total)}
                            </span>
                          </div>
                        </div>

                        <OrderTimeline status={order.status} trackingNumber={order.trackingNumber} />

                        <div className="mt-4 space-y-2 border-t border-Mneutral-100 pt-4">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
                                {item.product?.images?.[0] ? (
                                  <img
                                    src={item.product.images[0]}
                                    alt={item.name}
                                    className="h-full w-full object-contain p-1"
                                  />
                                ) : (
                                  <Package size={14} className="text-Mneutral-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text__14 font-medium">{item.name}</p>
                                <p className="text__12 text-Mneutral-500 tabular-nums">
                                  {money(Number(item.price))} × {item.quantity}
                                </p>
                              </div>
                              <span className="text__14 font-medium tabular-nums text-Mneutral-700">
                                {money(Number(item.price) * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-Mneutral-100 pt-4">
                          <Link
                            to={`/track?order=${encodeURIComponent(order.orderNumber)}`}
                            className="text__14 text-Mneutral-600 underline underline-offset-4 hover:text-Mneutral-900"
                          >
                            {t('account.trackOrder')}
                          </Link>
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(order)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-Mneutral-200 px-4 py-2 text__14 text-Mneutral-600 transition-colors hover:border-[#a83636] hover:text-[#a83636]"
                            >
                              <Ban size={14} />
                              {t('account.cancelOrder')}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                  {page < totalPages && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setPage((current) => current + 1)}
                        disabled={loadingMore}
                        className="pill-button disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingMore ? t('account.loadingMore') : t('account.loadMore')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'profile' && (
            <div className="rounded-[32px] bg-white px-[20px] py-[28px] xs:px-[40px] xs:py-[40px] xl:px-[56px]">
              <p className="mb-3 text__18 text-Mneutral-400">{t('account.accountDetails')}</p>
              <h2 className="text__48 font-medium">{t('account.yourDetails')}</h2>
              <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
                <Detail label={t('checkout.firstName')} value={user.firstName} />
                <Detail label={t('checkout.lastName')} value={user.lastName} />
                <Detail label={t('checkout.email')} value={user.email} />
                <Detail label={t('account.memberSinceLabel')} value={memberSince ?? '—'} />
              </div>
              <p className="mt-8 max-w-xl text__14 leading-relaxed text-Mneutral-500">
                {t('account.detailsHint')}
              </p>
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className="outline-pill-button mt-6 px-5 py-3 text__14"
              >
                <LogOut size={14} />
                {t('account.logout')}
              </button>
            </div>
          )}

          {tab === 'addresses' && (
            <div className="rounded-[32px] bg-white px-[20px] py-[28px] xs:px-[40px] xs:py-[40px] xl:px-[56px]">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-3 text__18 text-Mneutral-400">{t('account.savedAddresses')}</p>
                  <h2 className="text__48 font-medium">{t('account.myAddresses')}</h2>
                </div>
                <Link to="/checkout" className="pill-button">
                  {t('account.addAddress')}
                </Link>
              </div>

              {addressesLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-[24px] bg-Mneutral-50" />
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-Mneutral-200 px-6 py-12 text-center">
                  <MapPin size={40} strokeWidth={1} className="mx-auto mb-3 text-Mneutral-300" />
                  <p className="text__20 font-medium">{t('account.noAddresses')}</p>
                  <p className="mt-2 text__14 text-Mneutral-500">{t('account.noAddressesHint')}</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {addresses.map((address) => (
                    <div key={address.id} className="rounded-[24px] border border-Mneutral-100 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text__16 font-medium">
                            {address.firstName} {address.lastName}
                          </p>
                          <p className="mt-2 text__14 leading-relaxed text-Mneutral-600">
                            {address.street}
                            <br />
                            {address.state}, {address.city}
                            {address.zip ? ` ${address.zip}` : ''}
                            <br />
                            {address.country}
                          </p>
                          {address.phone && (
                            <p className="mt-2 text__14 text-Mneutral-500">{address.phone}</p>
                          )}
                        </div>
                        {address.isDefault && (
                          <span className="rounded-full bg-[#eaf1e3] px-2.5 py-1 text-[11px] font-medium text-[#4a6132]">
                            {t('account.defaultAddress')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={t('account.cancelOrderTitle')}
        message={t('account.cancelOrderMessage', { number: cancelTarget?.orderNumber ?? '' })}
        confirmLabel={cancelling ? t('account.cancelling') : t('account.cancelOrderConfirm')}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => void cancelOrder()}
      />

      <ConfirmDialog
        open={confirmLogout}
        title={t('nav.logoutConfirmTitle')}
        message={t('nav.logoutConfirm', { name: user.firstName })}
        confirmLabel={t('nav.yesLogout')}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={confirmLogoutAction}
      />
    </div>
  )
}

function ProfileLink({
  icon,
  title,
  hint,
  active,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-[24px] border p-4 text-left transition-colors ${
        active ? 'border-Mneutral-900 bg-Mneutral-50' : 'border-Mneutral-100 hover:border-Mneutral-400'
      }`}
    >
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-Mneutral-700">
        {icon}
      </span>
      <span>
        <span className="block text__16 font-medium">{title}</span>
        <span className="mt-0.5 block text__12 leading-relaxed text-Mneutral-500">{hint}</span>
      </span>
    </button>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-Mneutral-50 px-5 py-4">
      <p className="text__12 font-medium uppercase tracking-wide text-Mneutral-400">{label}</p>
      <p className="mt-1 text__16 text-Mneutral-900">{value || '—'}</p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BadgeCheck, Package, ShoppingBag, LogOut, ArrowRight } from 'lucide-react'
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
  trackingNumber?: string | null
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  createdAt: string
  items: MyOrderItem[]
}

export default function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const logout = useAuthStore((s) => s.logout)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const [orders, setOrders] = useState<MyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const t = useT()
  const lang = useLang()
  const { money } = useMoney()

  useEffect(() => {
    document.title = 'Calesta — My Account'
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    apiFetch('/api/orders/my', {
      token: accessToken, headers: { },
    })
      .then((r) => r.json())
      .then((result) => {
        if (!alive) return
        if (result.success) setOrders(result.data ?? [])
        else setError(result.message ?? 'Could not load your orders.')
        setLoading(false)
      })
      .catch(() => {
        if (alive) {
          setError('Could not load your orders — is the API running?')
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [accessToken])

  /* ---------- Not signed in ---------- */
  if (!user) {
    return (
      <div className="bg-Mneutral-50 pt-[140px]">
        <div className="container-custom rounded-[32px] bg-white px-[20px] py-[80px] text-center xs:px-[40px]">
          <ShoppingBag size={64} strokeWidth={1} className="mx-auto mb-6 text-Mneutral-300" />
          <h1 className="mb-3 text__40 font-medium text-Mneutral-900">Sign in to see your orders</h1>
          <p className="mb-8 text__18 text-Mneutral-600">
            Your profile, order history, and rituals live here once you sign in.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="filled-pill-button"
          >
            Sign in
          </button>
        </div>
      </div>
    )
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null
  const totalSpent = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + Number(o.total), 0)

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
                    t('account.myAccount')
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

            {orders.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-Mneutral-50 px-5 py-4">
                  <p className="text__14 text-Mneutral-500">{t('account.ordersPlaced')}</p>
                  <p className="mt-1 text__24 font-medium tabular-nums">{orders.length}</p>
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

          {/* Order history */}
          <div className="rounded-[32px] bg-white px-[20px] py-[28px] xs:px-[40px] xs:py-[40px] xl:px-[56px]">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text__18 text-Mneutral-400">{t('account.orderHistory')}</p>
                <h2 className="text__48 font-medium">{t('account.yourRituals')}</h2>
              </div>
              {orders.length > 0 && (
                <p className="text__18 text-Mneutral-500 tabular-nums">{t('account.ordersCount', { count: orders.length })}</p>
              )}
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
                <p className="text__24 font-medium">{t('account.noOrders')}</p>
                <p className="mt-2 text__16 text-Mneutral-500">
                  {t('account.noOrdersHint')}
                </p>
                <Link to="/shop" className="filled-pill-button mt-6">
                  {t('common.startShopping')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order, i) => {
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
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text__14 text-Mneutral-500">
                            {new Date(order.createdAt).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
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
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

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

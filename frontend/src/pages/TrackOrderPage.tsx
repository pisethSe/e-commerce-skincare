import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Package, Search } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { useMoney } from '../lib/currency'
import { useAuthStore } from '../lib/store'
import { useLang, useT, type TKey } from '../lib/i18n'
import { OrderStatusChip, OrderTimeline } from '../components/order/OrderTimeline'

interface TrackedItem {
  name: string
  quantity: number
  price: number
  product?: { slug: string; images: string[] } | null
}

interface TrackedOrder {
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod?: string | null
  trackingNumber?: string | null
  createdAt: string
  updatedAt: string
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  itemCount: number
  items: TrackedItem[]
  shippingTo: { firstName: string; lastName: string; city: string; country: string }
}

const PAYMENT_STATUS: Record<string, TKey> = {
  PAID: 'track.paid',
  UNPAID: 'track.unpaid',
  REFUNDED: 'track.paymentRefunded',
}

const PAYMENT_METHOD: Record<string, TKey> = {
  card: 'checkout.card',
  aba_payway: 'checkout.aba',
  bakong: 'checkout.bakong',
}

/**
 * Public order tracking — order number + the email used at checkout.
 * No session needed, and the API only returns what a shopper needs to see.
 */
export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(() => searchParams.get('order') ?? '')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signedIn = Boolean(useAuthStore((s) => s.user))
  const t = useT()
  const lang = useLang()
  const { money } = useMoney()

  useEffect(() => {
    document.title = 'Calesta — Track Order'
  }, [])

  const lookUp = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!orderNumber.trim() || !email.trim()) {
      setError(t('track.required'))
      return
    }

    setLoading(true)
    setOrder(null)
    try {
      const res = await apiFetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      })
      const json = await res.json().catch(() => null)

      if (res.ok && json?.success) {
        setOrder(json.data)
        // Keep the shareable number in the URL — never the email.
        setSearchParams({ order: json.data.orderNumber }, { replace: true })
      } else if (res.status === 404) {
        setError(t('track.notFound'))
      } else if (res.status === 429) {
        setError(t('track.rateLimited'))
      } else {
        setError(json?.message ?? t('track.error'))
      }
    } catch {
      setError(t('track.error'))
    } finally {
      setLoading(false)
    }
  }

  const trackAnother = () => {
    setOrder(null)
    setOrderNumber('')
    setError(null)
    setSearchParams({}, { replace: true })
  }

  const placedOn = order
    ? new Date(order.createdAt).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="container-custom py-12 md:py-16">
        <div className="mx-auto max-w-[760px]">
          <p className="text__14 uppercase tracking-[0.28em] text-Mneutral-400">{t('track.eyebrow')}</p>
          <h1 className="mt-3 text__40 font-medium">{t('track.title')}</h1>
          <p className="mt-3 max-w-[560px] text__16 leading-relaxed text-Mneutral-600">
            {t('track.subtitle')}
          </p>

          <form
            onSubmit={lookUp}
            className="mt-8 rounded-[28px] border border-Mneutral-100 bg-white p-5 md:p-6"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label htmlFor="track-order-number" className="block">
                <span className="mb-2 block text__14 text-Mneutral-600">{t('track.orderNumber')}</span>
                <input
                  id="track-order-number"
                  name="orderNumber"
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder={t('track.orderPlaceholder')}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(error) || undefined}
                  className="w-full rounded-full border border-Mneutral-100 px-5 py-3 text__16 uppercase tabular-nums tracking-wide outline-none transition-colors placeholder:normal-case placeholder:tracking-normal focus:border-Mneutral-900"
                />
              </label>

              <label htmlFor="track-email" className="block">
                <span className="mb-2 block text__14 text-Mneutral-600">{t('track.email')}</span>
                <input
                  id="track-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('track.emailPlaceholder')}
                  autoComplete="email"
                  aria-invalid={Boolean(error) || undefined}
                  className="w-full rounded-full border border-Mneutral-100 px-5 py-3 text__16 outline-none transition-colors focus:border-Mneutral-900"
                />
              </label>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-[16px] bg-[#fdeeee] px-4 py-3 text__14 text-[#a83636]"
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={loading} className="filled-pill-button disabled:opacity-60">
                <Search size={16} />
                {loading ? t('track.searching') : t('track.submit')}
              </button>
              <p className="text__12 text-Mneutral-400">{t('track.privacy')}</p>
            </div>
          </form>

          {order && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 space-y-4"
            >
              <div className="rounded-[28px] border border-Mneutral-100 bg-white p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text__12 uppercase tracking-[0.22em] text-Mneutral-400">
                      {t('track.resultEyebrow', { number: order.orderNumber })}
                    </p>
                    <p className="mt-2 text__14 text-Mneutral-500">
                      {t('track.placedOn', { date: placedOn })}
                    </p>
                  </div>
                  <OrderStatusChip status={order.status} />
                </div>

                <OrderTimeline status={order.status} trackingNumber={order.trackingNumber} />

                <div className="mt-5 grid gap-4 border-t border-Mneutral-100 pt-5 sm:grid-cols-2">
                  <div>
                    <p className="text__12 uppercase tracking-[0.18em] text-Mneutral-400">
                      {t('track.shippingTo')}
                    </p>
                    <p className="mt-1 text__14 font-medium">
                      {order.shippingTo.firstName} {order.shippingTo.lastName}
                    </p>
                    <p className="text__14 text-Mneutral-500">
                      {order.shippingTo.city}, {order.shippingTo.country}
                    </p>
                  </div>
                  <div>
                    <p className="text__12 uppercase tracking-[0.18em] text-Mneutral-400">
                      {t('track.payment')}
                    </p>
                    <p className="mt-1 text__14 font-medium">
                      {t(PAYMENT_STATUS[order.paymentStatus] ?? 'track.unpaid')}
                      {order.paymentMethod
                        ? ` · ${t(PAYMENT_METHOD[order.paymentMethod] ?? 'checkout.card')}`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.35fr_0.9fr]">
                <div className="rounded-[28px] border border-Mneutral-100 bg-white p-5">
                  <h2 className="text__14 uppercase tracking-[0.18em] text-Mneutral-400">
                    {t('track.items')}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {order.items.map((item, index) => {
                      const image = item.product?.images?.[0]
                      const line = (
                        <>
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
                            {image ? (
                              <img src={image} alt={item.name} className="h-full w-full object-contain p-1" />
                            ) : (
                              <Package size={16} className="text-Mneutral-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text__14 font-medium">{item.name}</p>
                            <p className="text__12 tabular-nums text-Mneutral-500">
                              {money(item.price)} × {item.quantity}
                            </p>
                          </div>
                          <span className="text__14 font-medium tabular-nums text-Mneutral-700">
                            {money(item.price * item.quantity)}
                          </span>
                        </>
                      )
                      return item.product?.slug ? (
                        <Link
                          key={`${item.name}-${index}`}
                          to={`/products/${item.product.slug}`}
                          className="flex items-center gap-3 rounded-[18px] transition-colors hover:bg-Mneutral-50"
                        >
                          {line}
                        </Link>
                      ) : (
                        <div key={`${item.name}-${index}`} className="flex items-center gap-3">
                          {line}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-[28px] border border-Mneutral-100 bg-white p-5">
                  <h2 className="text__14 uppercase tracking-[0.18em] text-Mneutral-400">
                    {t('track.summary')}
                  </h2>
                  <dl className="mt-4 space-y-2 text__14">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-Mneutral-500">{t('common.subtotal')}</dt>
                      <dd className="tabular-nums">{money(order.subtotal)}</dd>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex items-center justify-between gap-4 text-sage-700">
                        <dt>{t('common.discount')}</dt>
                        <dd className="tabular-nums">−{money(order.discount)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-Mneutral-500">{t('common.shipping')}</dt>
                      <dd className="tabular-nums">
                        {order.shipping === 0 ? t('common.free') : money(order.shipping)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-Mneutral-500">{t('common.tax')}</dt>
                      <dd className="tabular-nums">{money(order.tax)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-Mneutral-100 pt-3 text__18 font-medium">
                      <dt>{t('common.total')}</dt>
                      <dd className="tabular-nums">{money(order.total)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white px-5 py-4">
                <button type="button" onClick={trackAnother} className="text__14 text-Mneutral-500 underline underline-offset-4">
                  {t('track.trackAnother')}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {signedIn && (
                    <Link
                      to="/account"
                      className="inline-flex items-center rounded-full border border-Mneutral-900 px-5 py-2.5 text__14 font-medium transition-colors hover:bg-Mneutral-900 hover:text-white"
                    >
                      {t('track.viewOrders')}
                    </Link>
                  )}
                  <Link
                    to="/shop"
                    className="inline-flex items-center rounded-full bg-Mneutral-900 px-5 py-2.5 text__14 font-medium text-white transition-opacity hover:opacity-90"
                  >
                    {t('common.continueShopping')}
                  </Link>
                </div>
              </div>

              <p className="text-center text__14 text-Mneutral-500">
                {t('track.help')}{' '}
                <a href="mailto:support@calesta.com" className="underline underline-offset-4">
                  support@calesta.com
                </a>
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}

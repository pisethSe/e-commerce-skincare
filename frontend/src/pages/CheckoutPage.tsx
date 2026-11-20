import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Download,
  Lock,
  ChevronDown,
  MapPin,
  ShoppingBag,
  QrCode,
  Tag,
  Wallet,
  X,
} from 'lucide-react'
import { useCartStore, useAuthStore, useUIStore } from '../lib/store'
import { useMoney } from '../lib/currency'
import { useT } from '../lib/i18n'
import { getApiUrl, apiFetch } from '../lib/api'
import {
  CAMBODIA_PROVINCES,
  PHNOM_PENH_KHANS,
  isValidProvince,
  isValidKhan,
  isValidKhPhone,
  buildCambodiaAddress,
  type LocationType,
} from '../lib/cambodia'
import ImageWithFallback from '../components/ui/ImageWithFallback'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const steps = ['info', 'shipping', 'payment'] as const
type Step = (typeof steps)[number]

type PaymentChoice = 'aba_payway' | 'cod'

interface PaymentConfig {
  stripe: boolean
  bakong: boolean
  abaPayway: boolean
  currency: 'USD' | 'KHR'
}

interface CheckoutForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  /** Phnom Penh or a province — chosen explicitly so nobody picks the wrong list. */
  locationType: LocationType | ''
  /** Khan when in Phnom Penh, province name otherwise. */
  area: string
  /** House number and street, e.g. "House 12, Street 215". */
  street: string
}

const INITIAL_FORM: CheckoutForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  locationType: '',
  area: '',
  street: '',
}

const STANDARD_SHIPPING = 8.95

export default function CheckoutPage() {
  const { items, total, coupon, couponError, applyCoupon, clearCoupon, clearCart } = useCartStore()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const t = useT()
  const { money, alt } = useMoney()

  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM)
  const [stepError, setStepError] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  // Cash on delivery is the default in Cambodia — no app or card required.
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('cod')
  const [confirmPlace, setConfirmPlace] = useState(false)
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    stripe: false,
    bakong: false,
    abaPayway: false,
    currency: 'USD',
  })
  const [abaPayment, setAbaPayment] = useState<{ orderId: string; orderNumber: string; total: number } | null>(null)
  const [abaQr, setAbaQr] = useState<{ qrImage: string; qr: string; amount: string } | null>(null)
  const [abaSeconds, setAbaSeconds] = useState(180)
  const [abaExpired, setAbaExpired] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [notes, setNotes] = useState('')
  const [couponDraft, setCouponDraft] = useState('')
  const [couponApplying, setCouponApplying] = useState(false)

  useEffect(() => {
    document.title = 'Calesta — Checkout'
  }, [])

  // Which gateways are live?
  useEffect(() => {
    fetch(getApiUrl('/api/payments/config'))
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPaymentConfig(json.data)
      })
      .catch(() => {})
  }, [])

  // Prefill contact details for logged-in customers
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        firstName: f.firstName || user.firstName,
        lastName: f.lastName || user.lastName,
        email: f.email || user.email,
      }))
    }
  }, [user])

  const subtotal = total()
  const discount = coupon?.discount ?? 0
  // Sandbox/test products should not incur delivery or VAT fees.
  const isTestOrder = subtotal > 0 && subtotal < 1
  // One shipping method — standard, free over $75 (after discount)
  const shipping = isTestOrder || subtotal - discount >= 75 ? 0 : STANDARD_SHIPPING
  // Cambodia VAT — 10%
  const tax = isTestOrder ? 0 : (subtotal - discount) * 0.10
  const orderTotal = subtotal - discount + shipping + tax

  const gatewayDemo = paymentChoice === 'aba_payway' && !paymentConfig.abaPayway

  const setField = (key: keyof CheckoutForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const applyCheckoutCoupon = async () => {
    setCouponApplying(true)
    const applied = await applyCoupon(couponDraft)
    if (applied) setCouponDraft('')
    setCouponApplying(false)
  }

  const validateStep = (target: Step): boolean => {
    if (target === 'shipping') {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setStepError(t('checkout.errName'))
        return false
      }
      if (!form.email.trim() || !form.email.includes('@')) {
        setStepError(t('checkout.errEmail'))
        return false
      }
      if (!form.phone.trim()) {
        setStepError(t('checkout.errPhoneRequired'))
        return false
      }
      if (!isValidKhPhone(form.phone)) {
        setStepError(t('checkout.errPhone'))
        return false
      }
    }
    if (target === 'payment') {
      if (!form.locationType) {
        setStepError(t('checkout.errLocation'))
        return false
      }
      if (!form.area.trim()) {
        setStepError(t('checkout.errArea'))
        return false
      }
      if (form.locationType === 'phnom_penh' && !isValidKhan(form.area)) {
        setStepError(t('checkout.errKhan'))
        return false
      }
      if (form.locationType === 'province' && !isValidProvince(form.area)) {
        setStepError(t('checkout.errProvince'))
        return false
      }
      if (!form.street.trim()) {
        setStepError(t('checkout.errStreet'))
        return false
      }
    }
    setStepError(null)
    return true
  }

  const goTo = (target: Step) => {
    if (steps.indexOf(target) <= steps.indexOf(step) || validateStep(target)) {
      setStep(target)
      setStepError(null)
    }
  }

  const placeOrder = async () => {
    if (!accessToken || !user) {
      openAuthModal('login')
      return
    }
    setConfirmPlace(false)
    setPlacing(true)
    setOrderError(null)
    try {
      // apiFetch retries once after silently refreshing an expired access token —
      // no more forced re-login mid-checkout
      const location = form.locationType || 'province'
      const { city, state, zip, country } = buildCambodiaAddress(location, form.area)
      const addressRes = await apiFetch('/api/users/addresses', {
        method: 'POST',
        token: accessToken, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          street: form.street.trim(),
          city,
          state,
          zip,
          country,
          phone: form.phone.trim() || null,
          isDefault: false,
        }),
      })
      const addressResult = await addressRes.json()
      if (!addressRes.ok || !addressResult.success) {
        throw new Error(addressResult.message || 'Could not save the shipping address.')
      }

      // Create the order
      const orderRes = await apiFetch('/api/orders', {
        method: 'POST',
        token: accessToken, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            productSlug: i.product.slug,
            quantity: i.quantity,
          })),
          addressId: addressResult.data.id,
          ...(coupon ? { couponCode: coupon.code } : {}),
          paymentMethod: paymentChoice,
          shippingMethod: 'standard',
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      })
      const orderResult = await orderRes.json()
      if (!orderRes.ok || !orderResult.success) {
        throw new Error(orderResult.message || 'Could not place the order.')
      }

      const orderId: string = orderResult.data.id
      setOrderNumber(orderResult.data.orderNumber)
      setReceiptOrderId(orderId)

      // ABA PayWay — show the live KHQR and verify payment.
      if (paymentChoice === 'aba_payway') {
        setAbaPayment({
          orderId,
          orderNumber: orderResult.data.orderNumber,
          total: Number(orderResult.data.total),
        })
        setAbaQr(null)
        setAbaSeconds(180)
        setAbaExpired(false)
        setStep('payment')
        return
      }

      clearCart()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not place the order.'
      if (message.toLowerCase().includes('token') || message.toLowerCase().includes('unauthorized')) {
        openAuthModal('login')
      }
      setOrderError(message)
    } finally {
      setPlacing(false)
    }
  }

  /* ---------- ABA PayWay KHQR payment ---------- */
  useEffect(() => {
    if (!abaPayment || !accessToken) return
    let alive = true
    apiFetch('/api/payments/aba/qr', {
      method: 'POST',
      token: accessToken, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: abaPayment.orderId }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return
        if (json.success && json.data?.qrImage) {
          setAbaQr({
            qrImage: json.data.qrImage,
            qr: json.data.qr,
            amount: json.data.amount,
          })
        } else {
          setOrderError(json.message ?? null)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [abaPayment, accessToken])

  useEffect(() => {
    if (!abaPayment) return
    const countdown = window.setInterval(() => {
      setAbaSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(countdown)
          setAbaExpired(true)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(countdown)
  }, [abaPayment])

  useEffect(() => {
    if (!abaPayment || !accessToken || abaExpired) return
    let alive = true
    const checkPayment = async () => {
      setVerifying(true)
      try {
        const res = await apiFetch('/api/payments/aba/verify', {
          method: 'POST',
          token: accessToken,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: abaPayment.orderId }),
        })
        const json = await res.json()
        if (!alive) return
        if (json.success && json.data?.paymentStatus === 'PAID') {
          setAbaPayment(null)
          setAbaExpired(false)
          setOrderError(null)
          clearCart()
        }
      } catch {
        // Keep polling; transient gateway failures do not close the payment.
      } finally {
        if (alive) setVerifying(false)
      }
    }

    const poll = window.setInterval(checkPayment, 3000)
    void checkPayment()
    return () => {
      alive = false
      window.clearInterval(poll)
    }
  }, [abaPayment, accessToken, abaExpired])

  const downloadReceipt = async () => {
    if (!receiptOrderId || !accessToken) return
    try {
      const res = await apiFetch(`/api/orders/${encodeURIComponent(receiptOrderId)}`, {
        token: accessToken,
        headers: {},
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not load receipt')
      const order = json.data
      const escapeHtml = (value: unknown) =>
        String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const itemRows = (order.items || []).map((item: { name: string; quantity: number; price: unknown }) =>
        `<tr><td>${escapeHtml(item.name)} × ${item.quantity}</td><td>$${Number(item.price).toFixed(2)}</td></tr>`
      ).join('')
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(order.orderNumber)}</title><style>body{font-family:Arial,sans-serif;max-width:680px;margin:40px auto;color:#102d26}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:10px;border-bottom:1px solid #ddd}td:last-child{text-align:right}.totals td{border:0}.track{margin-top:24px}</style></head><body><h1>Calesta Receipt</h1><p>${escapeHtml(order.orderNumber)}</p><table>${itemRows}</table><table class="totals"><tr><td>Subtotal</td><td>$${Number(order.subtotal).toFixed(2)}</td></tr><tr><td>Shipping</td><td>$${Number(order.shipping).toFixed(2)}</td></tr><tr><td>VAT</td><td>$${Number(order.tax).toFixed(2)}</td></tr><tr><td><strong>Total</strong></td><td><strong>$${Number(order.total).toFixed(2)}</strong></td></tr></table><p class="track">Tracking: ${escapeHtml(order.orderNumber)}</p></body></html>`
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `calesta-receipt-${order.orderNumber}.html`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Could not download receipt')
    }
  }

  /* ---------- Confirmation ---------- */
  if (orderNumber && !abaPayment) {
    return (
      <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
        <div className="container-custom py-16">
          <motion.div
            className="mx-auto max-w-[560px] rounded-[32px] bg-white px-[20px] py-[56px] text-center xs:px-[40px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-50 text-sage-600">
              <CheckCircle2 size={28} />
            </div>
            <p className="mt-6 text__14 uppercase tracking-[0.28em] text-Mneutral-400">
              ORDER CONFIRMED
            </p>
            <h1 className="mt-3 text__40 font-medium">Thank you, {form.firstName || 'friend'}</h1>
            <p className="mt-4 text__16 leading-relaxed text-Mneutral-600">
              Your order <span className="font-medium text-Mneutral-900 tabular-nums">{orderNumber}</span> is
              confirmed and will ship soon. A confirmation email is on its way to {form.email}.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/shop" className="filled-pill-button">
                Continue Shopping
              </Link>
              <Link
                to={`/track?order=${encodeURIComponent(orderNumber)}`}
                className="outline-pill-button"
              >
                {t('track.submit')}
              </Link>
              <button type="button" onClick={downloadReceipt} className="outline-pill-button">
                <Download size={15} />
                Download Receipt
              </button>
              <a
                href={`https://t.me/Calestaskincarebot?start=${encodeURIComponent(orderNumber)}`}
                target="_blank"
                rel="noreferrer"
                className="outline-pill-button"
              >
                Open Telegram
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  /* ---------- ABA PayWay QR view ---------- */
  if (abaPayment) {
    const closeAbaPayment = async () => {
      try {
        await apiFetch(`/api/orders/${encodeURIComponent(abaPayment.orderId)}/cancel`, {
          method: 'PATCH',
          token: accessToken || undefined,
          headers: { 'Content-Type': 'application/json' },
        })
      } catch {
        // Keep the cart and payment step available even if cancellation refreshes in flight.
      } finally {
        setAbaPayment(null)
        setAbaQr(null)
        setAbaExpired(false)
        setOrderNumber(null)
        setReceiptOrderId(null)
        setStep('payment')
        setOrderError(null)
      }
    }
    const abaMinutes = Math.floor(abaSeconds / 60)
    const abaRemainder = abaSeconds % 60

    return (
      <div
        className="fixed inset-0 z-[95] flex items-center justify-center bg-Mneutral-900/55 p-3 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="ABA PayWay payment"
      >
        <motion.div
          className="w-full max-w-[360px] overflow-hidden rounded-[16px] bg-white text-center shadow-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          <div className="relative flex h-14 items-center px-5">
            <p className="text__16 font-semibold text-Mneutral-900">KHQRcc</p>
            <div className="ml-auto mr-7 flex items-center gap-2 text__12 text-Mneutral-500 tabular-nums">
              <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3a9 9 0 1 1-8.2 5.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3.8 8.25V3.7h4.55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {abaMinutes}:{abaRemainder.toString().padStart(2, '0')}
            </div>
            <button
              type="button"
              onClick={closeAbaPayment}
              aria-label="Close ABA PayWay payment"
              className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-Mneutral-400 hover:bg-Mneutral-50 hover:text-Mneutral-900"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mx-5 rounded-[12px] bg-[#ed1c24] px-5 pb-5 pt-4 text-white">
            <p className="text__12 font-medium">KHQR</p>
            <div className="mt-4">
              <p className="text__12 text-white/80">{form.firstName || abaPayment.orderNumber}</p>
              <p className="mt-1 text__18 font-semibold tabular-nums">{abaQr?.amount ? `$${abaQr.amount}` : money(abaPayment.total)} <span className="text__12 font-normal">USD</span></p>
            </div>
          </div>

          <div className="mx-5 -mt-1 rounded-b-[12px] bg-white px-5 pb-5">
            <div className="mx-auto flex h-[230px] w-[230px] items-center justify-center rounded-[12px] border border-Mneutral-100 bg-white p-3">
              {abaQr ? (
                <img src={abaQr.qrImage} alt="ABA PayWay KHQR payment code" className="h-full w-full object-contain" />
              ) : (
                <p className="text__12 text-Mneutral-400">Preparing QR…</p>
              )}
            </div>
          </div>

          <div className="px-8 pb-6">
            {abaExpired ? (
              <p role="status" className="text__14 text-[#a83636]">This QR code has expired. Close and try again.</p>
            ) : (
              <p className="text__14 leading-5 text-Mneutral-500">
                Scan with <span className="font-medium text-Mneutral-700">ABA Mobile</span>, or other mobile banking apps supporting KHQR
              </p>
            )}
            {verifying && !abaExpired && (
              <p role="status" className="mt-3 text__12 text-Mneutral-400">Checking payment…</p>
            )}
            {orderError && (
              <p role="alert" className="mt-3 text__12 text-[#a83636]">{orderError}</p>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  /* ---------- Empty bag ---------- */
  if (items.length === 0) {
    return (
      <div className="bg-Mneutral-50 pt-[140px]">
        <div className="container-custom rounded-[32px] bg-white px-[20px] py-[80px] text-center xs:px-[40px]">
          <ShoppingBag size={64} strokeWidth={1} className="mx-auto mb-6 text-Mneutral-300" />
          <h1 className="mb-3 text__40 font-medium text-Mneutral-900">{t('checkout.nothing')}</h1>
          <p className="mb-8 text__18 text-Mneutral-600">{t('checkout.nothingHint')}</p>
          <Link to="/shop" className="filled-pill-button">
            {t('common.startShopping')}
          </Link>
        </div>
      </div>
    )
  }

  /* ---------- Checkout flow ---------- */
  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <div className="container-custom py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] bg-white px-[20px] py-[24px] xs:px-[40px] xs:py-[40px] xl:px-[56px]">
            <Link to="/" className="mb-10 inline-block text__24 font-medium">
              Calesta
            </Link>

            <div className="mb-8 flex items-center gap-2 text__14">
              {steps.map((current, index) => (
                <React.Fragment key={current}>
                  <button
                    type="button"
                    onClick={() => goTo(current)}
                    className={`capitalize transition-colors ${
                      step === current ? 'font-medium text-Mneutral-900' : 'text-Mneutral-400 hover:text-Mneutral-600'
                    }`}
                  >
                    {current === 'info' ? t('checkout.stepInfo') : current === 'shipping' ? t('checkout.stepShipping') : t('checkout.stepPayment')}
                  </button>
                  {index < steps.length - 1 && <ChevronDown className="rotate-[-90deg] text-Mneutral-300" size={12} />}
                </React.Fragment>
              ))}
            </div>

            {!user && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-cream-100/60 px-5 py-4">
                <p className="text__14 text-Mneutral-700">
                  {t('checkout.haveAccount')}
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="outline-pill-button px-5 py-2.5 text__14"
                >
                  {t('checkout.signIn')}
                </button>
              </div>
            )}

            {step === 'info' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <h2 className="mb-6 text__32 font-medium">{t('checkout.contactInfo')}</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <CheckoutInput label={t('checkout.firstName')} placeholder="Sophie" value={form.firstName} onChange={(v) => setField('firstName', v)} />
                  <CheckoutInput label={t('checkout.lastName')} placeholder="Martin" value={form.lastName} onChange={(v) => setField('lastName', v)} />
                </div>
                <CheckoutInput label={t('checkout.email')} placeholder="sophie@example.com" type="email" value={form.email} onChange={(v) => setField('email', v)} />
                <CheckoutInput label={t('checkout.phone')} placeholder="012 345 678" type="tel" value={form.phone} onChange={(v) => setField('phone', v)} />
                {stepError && (
                  <p role="alert" className="rounded-[16px] bg-blush-50 px-4 py-3 text__14 text-blush-700">
                    {stepError}
                  </p>
                )}
                <button type="button" onClick={() => goTo('shipping')} className="filled-pill-button mt-4">
                  {t('checkout.continueShipping')} <ArrowRight size={15} />
                </button>
              </motion.div>
            )}

            {step === 'shipping' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="mb-6 text__32 font-medium">{t('checkout.shippingAddress')}</h2>
                <div>
                  <p className="mb-2 block text__14 text-Mneutral-500">{t('checkout.livingNow')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { value: 'phnom_penh' as const, label: t('checkout.phnomPenh'), desc: t('checkout.phnomPenhDesc') },
                      { value: 'province' as const, label: t('checkout.province'), desc: t('checkout.provinceDesc') },
                    ].map((option) => {
                      const selected = form.locationType === option.value
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-[20px] border p-4 transition-colors ${
                            selected ? 'border-Mneutral-900 bg-Mneutral-50' : 'border-Mneutral-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="locationType"
                            checked={selected}
                            onChange={() => setForm((f) => ({ ...f, locationType: option.value, area: '' }))}
                            className="accent-[#102d26]"
                          />
                          <MapPin size={16} className="flex-shrink-0 text-Mneutral-500" />
                          <span>
                            <span className="block text__16 font-medium">{option.label}</span>
                            <span className="block text__12 text-Mneutral-500">{option.desc}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="checkout-area" className="mb-2 block text__14 text-Mneutral-500">
                    {form.locationType === 'phnom_penh'
                      ? t('checkout.khan')
                      : form.locationType === 'province'
                        ? t('checkout.province')
                        : t('checkout.area')}
                  </label>
                  <div className="relative">
                    <select
                      id="checkout-area"
                      value={form.area}
                      disabled={!form.locationType}
                      onChange={(e) => setField('area', e.target.value)}
                      className="w-full appearance-none rounded-full border border-Mneutral-100 bg-white px-4 py-3 text__16 outline-none transition-colors focus:border-Mneutral-900 disabled:bg-Mneutral-50 disabled:text-Mneutral-400"
                    >
                      <option value="">
                        {form.locationType === 'phnom_penh'
                          ? t('checkout.chooseKhan')
                          : form.locationType === 'province'
                            ? t('checkout.chooseProvince')
                            : t('checkout.chooseArea')}
                      </option>
                      {(form.locationType === 'phnom_penh' ? PHNOM_PENH_KHANS : CAMBODIA_PROVINCES).map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-Mneutral-400" />
                  </div>
                </div>

                <CheckoutInput
                  label={t('checkout.houseStreet')}
                  placeholder={t('checkout.houseStreetPlaceholder')}
                  value={form.street}
                  onChange={(v) => setField('street', v)}
                />

                <div className="flex items-center gap-2 rounded-full border border-Mneutral-100 bg-Mneutral-50 px-4 py-3">
                  <span className="text__16 text-Mneutral-700">🇰🇭 {t('checkout.cambodia')}</span>
                  <span className="ml-auto text__12 text-Mneutral-400">{t('checkout.shipCambodiaOnly')}</span>
                </div>

                <h2 className="mb-2 mt-8 text__32 font-medium">{t('checkout.shippingMethod')}</h2>
                <div className="flex items-center gap-4 rounded-[24px] border border-Mneutral-900 bg-Mneutral-50 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-Mneutral-900 text-white">
                    <ShoppingBag size={15} />
                  </div>
                  <div className="flex-1">
                    <p className="text__16 font-medium">{t('checkout.standardDelivery')}</p>
                    <p className="text__14 text-Mneutral-500">{t('checkout.standardDeliveryDesc')}</p>
                  </div>
                  <span className="text__16 font-medium">
                    {shipping === 0 ? t('common.free') : money(shipping)}
                  </span>
                </div>
                {stepError && (
                  <p role="alert" className="rounded-[16px] bg-blush-50 px-4 py-3 text__14 text-blush-700">
                    {stepError}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep('info')} className="outline-pill-button">
                    <ArrowLeft size={15} /> {t('common.back')}
                  </button>
                  <button type="button" onClick={() => goTo('payment')} className="filled-pill-button">
                    {t('checkout.continuePayment')} <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <h2 className="mb-6 flex items-center gap-2 text__32 font-medium">
                  <Lock size={16} className="text-Mneutral-500" />
                  {t('checkout.payment')}
                </h2>

                {[
                  { value: 'cod' as const, label: t('checkout.cod'), desc: t('checkout.codDesc'), icon: Banknote, recommended: false },
                  { value: 'aba_payway' as const, label: t('checkout.aba'), desc: t('checkout.abaDesc'), icon: Wallet, recommended: true },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-4 rounded-[24px] border border-Mneutral-100 p-4 transition-colors has-[:checked]:border-Mneutral-900 has-[:checked]:bg-Mneutral-50"
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentChoice === option.value}
                        onChange={() => setPaymentChoice(option.value)}
                        className="accent-[#102d26]"
                      />
                      {option.value === 'aba_payway' ? (
                        <div className="flex h-10 w-[72px] flex-shrink-0 items-center justify-center rounded-lg border border-Mneutral-100 bg-white p-1.5">
                          <img src="/images/aba-payway.png" alt="" className="h-full w-full object-contain" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-Mneutral-100 text-Mneutral-700">
                          <Icon size={16} />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text__16 font-medium">{option.label}</p>
                          {option.recommended && (
                            <span className="rounded-full bg-[#eaf1e3] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#4a6132]">
                              {t('checkout.recommended')}
                            </span>
                          )}
                        </div>
                        <p className="text__14 text-Mneutral-500">{option.desc}</p>
                      </div>
                    </label>
                  )
                })}

                {paymentChoice === 'aba_payway' && (
                  <div className="flex items-center gap-3 rounded-[20px] bg-cream-100/50 px-4 py-3 text__12 text-Mneutral-600">
                    <img src="/images/aba-payway.png" alt="" className="h-7 w-[110px] object-contain" />
                    <span>{t('checkout.abaRedirect')}</span>
                  </div>
                )}

                {paymentChoice === 'cod' && (
                  <p className="flex items-start gap-2 rounded-[20px] bg-cream-100/50 px-4 py-3 text__12 text-Mneutral-600">
                    <Banknote size={14} className="mt-0.5 flex-shrink-0 text-sage-600" />
                    {t('checkout.codNote')}
                  </p>
                )}

                {gatewayDemo && (
                  <p className="flex items-center gap-2 rounded-[20px] bg-cream-100/50 px-4 py-3 text__12 text-Mneutral-600">
                    <BadgeCheck size={14} className="flex-shrink-0 text-sage-600" />
                    {t('checkout.demoNote')}
                  </p>
                )}

                <div>
                  <label htmlFor="checkout-notes" className="mb-2 block text__14 text-Mneutral-500">
                    {t('checkout.orderNotes')}
                  </label>
                  <textarea
                    id="checkout-notes"
                    value={notes}
                    maxLength={500}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={t('checkout.orderNotesPlaceholder')}
                    rows={3}
                    className="w-full resize-none rounded-[20px] border border-Mneutral-100 px-4 py-3 text__16 outline-none transition-colors focus:border-Mneutral-900"
                  />
                  <p className="mt-1 text-right text__12 text-Mneutral-400 tabular-nums">{notes.length}/500</p>
                </div>

                {orderError && (
                  <p role="alert" className="rounded-[16px] bg-blush-50 px-4 py-3 text__14 text-blush-700">
                    {orderError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('shipping')} className="outline-pill-button" disabled={placing}>
                    <ArrowLeft size={15} /> {t('common.back')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmPlace(true)}
                    disabled={placing}
                    className="filled-pill-button flex-1 justify-center disabled:opacity-60"
                  >
                    {paymentChoice === 'cod' ? (
                      <Banknote size={16} />
                    ) : (
                      <QrCode size={16} />
                    )}
                    {placing
                      ? t('checkout.placing')
                      : paymentChoice === 'cod'
                        ? t('checkout.placeOrder', { amount: money(orderTotal) })
                        : t('checkout.payNow', { amount: money(orderTotal) })}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-Mneutral-400">
                  <Lock size={10} />
                  {t('checkout.secure')}
                </div>
              </motion.div>
            )}
          </div>

          {/* Order summary */}
          <div className="h-fit rounded-[32px] bg-white p-6 lg:sticky lg:top-24">
            <h3 className="mb-5 text__28 font-medium">{t('checkout.orderSummary')}</h3>
            <div className="mb-5 space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3">
                  <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
                    <ImageWithFallback
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-full w-full object-contain p-1.5"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#fbf5ea,#f0e4cf)]"
                      fallbackText={item.product.name}
                    />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-Mneutral-900 text-[9px] text-white tabular-nums">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text__16 font-medium">{item.product.name}</p>
                    <p className="text__14 text-Mneutral-400">{item.product.volume}</p>
                  </div>
                  <span className="text__16 font-medium tabular-nums">{money(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mb-4 rounded-[20px] bg-Mneutral-50 p-4">
              <p className="mb-2 flex items-center gap-2 text__14 font-medium text-Mneutral-700">
                <Tag size={14} />
                {t('checkout.offers')}
              </p>
              {coupon ? (
                <div className="flex items-center justify-between gap-3 rounded-full bg-white px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text__14 font-medium text-sage-700">
                    <BadgeCheck size={14} />
                    {coupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={clearCoupon}
                    aria-label={t('checkout.removeOffer')}
                    className="rounded-full p-1 text-Mneutral-400 transition-colors hover:text-Mneutral-900"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponDraft}
                    onChange={(event) => setCouponDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void applyCheckoutCoupon()
                    }}
                    placeholder={t('checkout.offerPlaceholder')}
                    aria-label={t('checkout.offerPlaceholder')}
                    className="min-w-0 flex-1 rounded-full border border-Mneutral-200 bg-white px-3 py-2 text__14 uppercase outline-none focus:border-Mneutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCheckoutCoupon()}
                    disabled={couponApplying}
                    className="rounded-full bg-Mneutral-900 px-4 py-2 text__12 font-medium text-white transition-colors hover:bg-Mneutral-700 disabled:opacity-60"
                  >
                    {couponApplying ? t('checkout.applyingOffer') : t('checkout.applyOffer')}
                  </button>
                </div>
              )}
              {couponError && <p className="mt-2 text__12 text-blush-700">{couponError}</p>}
            </div>

            <div className="space-y-2 border-t border-Mneutral-100 pt-4 text__16">
              <div className="flex justify-between text-Mneutral-600">
                <span>{t('common.subtotal')}</span>
                <span className="tabular-nums">{money(subtotal)}</span>
              </div>
              {coupon && (
                <div className="flex justify-between text-sage-600">
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck size={13} />
                    {coupon.code}
                  </span>
                  <span className="tabular-nums">−{money(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-Mneutral-600">
                <span>{t('checkout.shippingStandard')}</span>
                <span>{shipping === 0 ? t('common.free') : money(shipping)}</span>
              </div>
              <div className="flex justify-between text-Mneutral-600">
                <span>{t('common.tax')}</span>
                <span className="tabular-nums">{money(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-Mneutral-100 pt-2 font-medium text-Mneutral-900">
                <span>{t('common.total')}</span>
                <span className="tabular-nums">{money(orderTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPlace}
        title={t('checkout.confirmTitle')}
        message={t('checkout.confirmMessage', { amount: money(orderTotal), email: form.email || t('checkout.yourInbox') })}
        confirmLabel={t('checkout.yesPlace')}
        onCancel={() => setConfirmPlace(false)}
        onConfirm={placeOrder}
      />
    </div>
  )
}

/* Card details — captured locally, never sent (the Stripe-ready backend expects a payment token) */
function CheckoutInput({
  label,
  placeholder,
  type = 'text',
  inputMode,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  type?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  value: string
  onChange: (value: string) => void
}) {
  const id = React.useId()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text__14 text-Mneutral-500">{label}</label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-Mneutral-100 px-4 py-3 text__16 outline-none transition-colors focus:border-Mneutral-900"
      />
    </div>
  )
}

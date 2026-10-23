import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CreditCard,
  Lock,
  ChevronDown,
  MapPin,
  ShoppingBag,
  QrCode,
  Wallet,
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

type PaymentChoice = 'card' | 'aba_payway' | 'bakong' | 'cod'

interface PaymentConfig {
  stripe: boolean
  bakong: boolean
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
  const { items, total, coupon, clearCart } = useCartStore()
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
  const [orderError, setOrderError] = useState<string | null>(null)
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' })
  // Cash on delivery is the default in Cambodia — no app or card required.
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('cod')
  const [confirmPlace, setConfirmPlace] = useState(false)
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({ stripe: false, bakong: false, currency: 'USD' })
  const [bakongPayment, setBakongPayment] = useState<{ orderId: string; orderNumber: string; total: number } | null>(null)
  const [bakongQr, setBakongQr] = useState<{ qrImage: string; qr: string; currency: string } | null>(null)
  const [verifying, setVerifying] = useState(false)

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
  // One shipping method — standard, free over $75 (after discount)
  const shipping = subtotal - discount >= 75 ? 0 : STANDARD_SHIPPING
  // Cambodia VAT — 10%
  const tax = (subtotal - discount) * 0.10
  const orderTotal = subtotal - discount + shipping + tax

  // Only warn about simulated gateways when the selected one is not live.
  const gatewayDemo =
    paymentChoice !== 'cod' &&
    ((paymentChoice === 'card' && !paymentConfig.stripe) ||
      paymentChoice === 'aba_payway' ||
      (paymentChoice === 'bakong' && !paymentConfig.bakong))

  const setField = (key: keyof CheckoutForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

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
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          addressId: addressResult.data.id,
          ...(coupon ? { couponCode: coupon.code } : {}),
          paymentMethod: paymentChoice,
          shippingMethod: 'standard',
        }),
      })
      const orderResult = await orderRes.json()
      if (!orderRes.ok || !orderResult.success) {
        throw new Error(orderResult.message || 'Could not place the order.')
      }

      const orderId: string = orderResult.data.id
      setOrderNumber(orderResult.data.orderNumber)

      // Card + Stripe configured → hosted Stripe Checkout
      if (paymentChoice === 'card' && paymentConfig.stripe) {
        const sessionRes = await apiFetch('/api/payments/stripe/session', {
          method: 'POST',
          token: accessToken, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const sessionJson = await sessionRes.json()
        if (sessionJson.success && sessionJson.data?.url) {
          window.location.href = sessionJson.data.url
          return
        }
        // Stripe unavailable — fall through to the demo confirmation
      }

      // Bakong → show the KHQR and settle on verify
      if (paymentChoice === 'bakong') {
        setBakongPayment({ orderId, orderNumber: orderResult.data.orderNumber, total: orderTotal })
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

  /* ---------- Bakong KHQR payment ---------- */
  useEffect(() => {
    if (!bakongPayment || !accessToken) return
    let alive = true
    apiFetch('/api/payments/bakong/qr', {
      method: 'POST',
      token: accessToken, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: bakongPayment.orderId }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return
        if (json.success && json.data?.qrImage) {
          setBakongQr({ qrImage: json.data.qrImage, qr: json.data.qr, currency: json.data.currency })
        } else {
          // Gateway not configured — the demo flow still completes below
          setOrderError(json.message ?? null)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [bakongPayment, accessToken])

  const verifyBakong = async () => {
    if (!bakongPayment || !accessToken) return
    setVerifying(true)
    setOrderError(null)
    try {
      const res = await apiFetch('/api/payments/bakong/verify', {
        method: 'POST',
        token: accessToken, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: bakongPayment.orderId }),
      })
      const json = await res.json()
      if (json.success && json.data?.paymentStatus === 'PAID') {
        setBakongPayment(null) // the confirmation view takes over
      } else {
        setOrderError(json.message ?? 'Payment not found yet — scan the QR and try again.')
      }
    } catch {
      setOrderError('Verification is unavailable right now — try again.')
    } finally {
      setVerifying(false)
    }
  }

  /* ---------- Confirmation ---------- */
  if (orderNumber && !bakongPayment) {
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
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  /* ---------- Bakong QR view ---------- */
  if (bakongPayment) {
    return (
      <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
        <div className="container-custom py-12">
          <motion.div
            className="mx-auto max-w-[560px] rounded-[32px] bg-white px-[20px] py-[48px] text-center xs:px-[40px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text__14 uppercase tracking-[0.28em] text-Mneutral-400">BAKONG KHQR</p>
            <h1 className="mt-3 text__40 font-medium">Scan to pay</h1>
            <p className="mt-2 text__18 text-Mneutral-600">
              Order <span className="font-medium tabular-nums">{bakongPayment.orderNumber}</span> ·{' '}
              {money(bakongPayment.total)}
              {paymentConfig.currency === 'KHR' && ' (KHR)'}
            </p>

            <div className="mx-auto mt-8 w-fit rounded-[28px] border border-Mneutral-100 p-4">
              {bakongQr ? (
                <img src={bakongQr.qrImage} alt="Bakong KHQR payment code" className="h-[280px] w-[280px]" />
              ) : (
                <div className="flex h-[280px] w-[280px] items-center justify-center rounded-[20px] bg-Mneutral-50">
                  <p className="text__14 text-Mneutral-400">Preparing QR…</p>
                </div>
              )}
            </div>

            <p className="mt-5 text__14 text-Mneutral-500">
              Open any Cambodian bank app, scan the code, and pay{' '}
              <span className="font-medium text-Mneutral-700">{money(bakongPayment.total)}</span>.
            </p>

            {orderError && (
              <p role="alert" className="mt-4 rounded-[16px] bg-blush-50 px-4 py-3 text__14 text-blush-700">
                {orderError}
              </p>
            )}

            <button
              type="button"
              onClick={verifyBakong}
              disabled={verifying}
              className="filled-pill-button mt-6 w-full justify-center disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {verifying ? t('checkout.checkingPayment') : t('checkout.verifyPayment')}
            </button>
            {!paymentConfig.bakong && (
              <p className="mt-3 text__12 text-Mneutral-400">
                {t('checkout.bakongDemo')}
              </p>
            )}
            <Link to="/" className="mt-4 inline-block text__14 text-Mneutral-500 underline">
              {t('checkout.payLater')}
            </Link>
          </motion.div>
        </div>
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
                    {subtotal - discount >= 75 ? t('common.free') : money(STANDARD_SHIPPING)}
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
                  { value: 'cod' as const, label: t('checkout.cod'), desc: t('checkout.codDesc'), icon: Banknote },
                  { value: 'aba_payway' as const, label: t('checkout.aba'), desc: t('checkout.abaDesc'), icon: Wallet },
                  { value: 'bakong' as const, label: t('checkout.bakong'), desc: t('checkout.bakongDesc'), icon: QrCode },
                  { value: 'card' as const, label: t('checkout.card'), desc: t('checkout.cardDesc'), icon: CreditCard },
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
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-Mneutral-100 text-Mneutral-700">
                        <Icon size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text__16 font-medium">{option.label}</p>
                        <p className="text__14 text-Mneutral-500">{option.desc}</p>
                      </div>
                    </label>
                  )
                })}

                {paymentChoice === 'card' && (
                  <div className="space-y-5 border-t border-Mneutral-100 pt-5">
                    <CheckoutInput label={t('checkout.cardNumber')} placeholder="4242 4242 4242 4242" value={card.number} onChange={(v) => setCard((c) => ({ ...c, number: v }))} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <CheckoutInput label={t('checkout.expiry')} placeholder="MM / YY" value={card.expiry} onChange={(v) => setCard((c) => ({ ...c, expiry: v }))} />
                      <CheckoutInput label={t('checkout.cvc')} placeholder="123" value={card.cvc} onChange={(v) => setCard((c) => ({ ...c, cvc: v }))} />
                    </div>
                    <CheckoutInput label={t('checkout.nameOnCard')} placeholder="Sophie Martin" value={card.name} onChange={(v) => setCard((c) => ({ ...c, name: v }))} />
                  </div>
                )}

                {paymentChoice === 'aba_payway' && (
                  <p className="flex items-center gap-2 rounded-[20px] bg-cream-100/50 px-4 py-3 text__12 text-Mneutral-600">
                    <BadgeCheck size={14} className="flex-shrink-0 text-sage-600" />
                    {t('checkout.abaRedirect')}
                  </p>
                )}

                {paymentChoice === 'bakong' && (
                  <p className="flex items-center gap-2 rounded-[20px] bg-cream-100/50 px-4 py-3 text__12 text-Mneutral-600">
                    <BadgeCheck size={14} className="flex-shrink-0 text-sage-600" />
                    {t('checkout.bakongNote')}
                  </p>
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
                    ) : paymentChoice === 'bakong' ? (
                      <QrCode size={16} />
                    ) : (
                      <CreditCard size={16} />
                    )}
                    {placing ? t('checkout.placing') : t('checkout.placeOrder', { amount: money(orderTotal) })}
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
  return (
    <div>
      <label className="mb-2 block text__14 text-Mneutral-500">{label}</label>
      <input
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

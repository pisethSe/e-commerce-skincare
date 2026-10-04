import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Lock,
  ChevronDown,
  ShoppingBag,
  QrCode,
  Wallet,
} from 'lucide-react'
import { useCartStore, useAuthStore, useUIStore } from '../lib/store'
import { formatPrice } from '../lib/utils'
import { getApiUrl, apiFetch } from '../lib/api'
import { CAMBODIA_PROVINCES, isValidProvince, isValidZip, isValidKhPhone } from '../lib/cambodia'
import ImageWithFallback from '../components/ui/ImageWithFallback'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const steps = ['info', 'shipping', 'payment'] as const
type Step = (typeof steps)[number]

type PaymentChoice = 'card' | 'aba_payway' | 'bakong'

interface CheckoutForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zip: string
  country: string
}

const INITIAL_FORM: CheckoutForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  country: 'Cambodia',
}

const STANDARD_SHIPPING = 8.95

export default function CheckoutPage() {
  const { items, total, coupon, clearCart } = useCartStore()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM)
  const [stepError, setStepError] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' })
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('card')
  const [confirmPlace, setConfirmPlace] = useState(false)

  useEffect(() => {
    document.title = 'Calesta — Checkout'
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

  const setField = (key: keyof CheckoutForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const validateStep = (target: Step): boolean => {
    if (target === 'shipping') {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setStepError('Please enter your first and last name.')
        return false
      }
      if (!form.email.trim() || !form.email.includes('@')) {
        setStepError('Please enter a valid email address.')
        return false
      }
    }
    if (target === 'payment') {
      if (!form.street.trim()) {
        setStepError('Please enter your street address.')
        return false
      }
      if (!form.city.trim()) {
        setStepError('Please enter your city or district.')
        return false
      }
      if (!form.state.trim()) {
        setStepError('Please choose your province.')
        return false
      }
      if (!isValidProvince(form.state)) {
        setStepError("Please choose a valid Cambodian province from the list.")
        return false
      }
      if (!isValidZip(form.zip)) {
        setStepError('Please enter a valid 5-digit postal code (e.g. 12000 for Phnom Penh).')
        return false
      }
      if (form.phone.trim() && !isValidKhPhone(form.phone)) {
        setStepError('Please enter a valid Cambodian phone number (e.g. 012 345 678).')
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
      const addressRes = await apiFetch('/api/users/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: accessToken },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zip: form.zip.trim(),
          country: 'Cambodia',
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
        headers: { 'Content-Type': 'application/json', token: accessToken },
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

      setOrderNumber(orderResult.data.orderNumber)
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

  /* ---------- Confirmation ---------- */
  if (orderNumber) {
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
              <Link to="/" className="outline-pill-button">
                Back Home
              </Link>
            </div>
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
          <h1 className="mb-3 text__40 font-medium text-Mneutral-900">Nothing to check out</h1>
          <p className="mb-8 text__18 text-Mneutral-600">Your bag is empty — add a ritual first</p>
          <Link to="/shop" className="filled-pill-button">
            Start Shopping
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
                    {current}
                  </button>
                  {index < steps.length - 1 && <ChevronDown className="rotate-[-90deg] text-Mneutral-300" size={12} />}
                </React.Fragment>
              ))}
            </div>

            {!user && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-cream-100/60 px-5 py-4">
                <p className="text__14 text-Mneutral-700">
                  Have an account? Sign in to check out faster.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="outline-pill-button px-5 py-2.5 text__14"
                >
                  Sign in
                </button>
              </div>
            )}

            {step === 'info' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <h2 className="mb-6 text__32 font-medium">Contact Information</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <CheckoutInput label="First Name" placeholder="Sophie" value={form.firstName} onChange={(v) => setField('firstName', v)} />
                  <CheckoutInput label="Last Name" placeholder="Martin" value={form.lastName} onChange={(v) => setField('lastName', v)} />
                </div>
                <CheckoutInput label="Email" placeholder="sophie@example.com" type="email" value={form.email} onChange={(v) => setField('email', v)} />
                <CheckoutInput label="Phone" placeholder="012 345 678" type="tel" value={form.phone} onChange={(v) => setField('phone', v)} />
                {stepError && (
                  <p role="alert" className="rounded-[16px] bg-blush-50 px-4 py-3 text__14 text-blush-700">
                    {stepError}
                  </p>
                )}
                <button type="button" onClick={() => goTo('shipping')} className="filled-pill-button mt-4">
                  Continue to Shipping <ArrowRight size={15} />
                </button>
              </motion.div>
            )}

            {step === 'shipping' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="mb-6 text__32 font-medium">Shipping Address</h2>
                <CheckoutInput label="Street Address" placeholder="Street 215, House 12" value={form.street} onChange={(v) => setField('street', v)} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <CheckoutInput label="City / District" placeholder="Phnom Penh" value={form.city} onChange={(v) => setField('city', v)} />
                  <div>
                    <label className="mb-2 block text__14 text-Mneutral-500">Province</label>
                    <div className="relative">
                      <select
                        value={form.state}
                        onChange={(e) => setField('state', e.target.value)}
                        className="w-full appearance-none rounded-full border border-Mneutral-100 bg-white px-4 py-3 text__16 outline-none transition-colors focus:border-Mneutral-900"
                      >
                        <option value="">Choose province…</option>
                        {CAMBODIA_PROVINCES.map((province) => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-Mneutral-400" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <CheckoutInput label="Postal Code" placeholder="12000" inputMode="numeric" value={form.zip} onChange={(v) => setField('zip', v.replace(/[^\d]/g, '').slice(0, 5))} />
                  <div>
                    <label className="mb-2 block text__14 text-Mneutral-500">Country</label>
                    <div className="flex items-center gap-2 rounded-full border border-Mneutral-100 bg-Mneutral-50 px-4 py-3">
                      <span className="text__16 text-Mneutral-700">🇰🇭 Cambodia</span>
                      <span className="ml-auto text__12 text-Mneutral-400">We ship within Cambodia only</span>
                    </div>
                  </div>
                </div>

                <h2 className="mb-2 mt-8 text__32 font-medium">Shipping Method</h2>
                <div className="flex items-center gap-4 rounded-[24px] border border-Mneutral-900 bg-Mneutral-50 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-Mneutral-900 text-white">
                    <ShoppingBag size={15} />
                  </div>
                  <div className="flex-1">
                    <p className="text__16 font-medium">Standard Delivery</p>
                    <p className="text__14 text-Mneutral-500">Nationwide across Cambodia · 2–5 business days</p>
                  </div>
                  <span className="text__16 font-medium">
                    {subtotal - discount >= 75 ? 'Free' : formatPrice(STANDARD_SHIPPING)}
                  </span>
                </div>
                {stepError && (
                  <p role="alert" className="rounded-[16px] bg-blush-50 px-4 py-3 text__14 text-blush-700">
                    {stepError}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep('info')} className="outline-pill-button">
                    <ArrowLeft size={15} /> Back
                  </button>
                  <button type="button" onClick={() => goTo('payment')} className="filled-pill-button">
                    Continue to Payment <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <h2 className="mb-6 flex items-center gap-2 text__32 font-medium">
                  <Lock size={16} className="text-Mneutral-500" />
                  Payment
                </h2>

                {[
                  { value: 'card' as const, label: 'Credit / Debit Card', desc: 'Visa, Mastercard', icon: CreditCard },
                  { value: 'aba_payway' as const, label: 'ABA PayWay', desc: 'Pay via ABA Mobile or cards', icon: Wallet },
                  { value: 'bakong' as const, label: 'Bakong (KHQR)', desc: 'Scan with any Cambodian bank app', icon: QrCode },
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
                    <CheckoutInput label="Card Number" placeholder="4242 4242 4242 4242" value={card.number} onChange={(v) => setCard((c) => ({ ...c, number: v }))} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <CheckoutInput label="Expiry Date" placeholder="MM / YY" value={card.expiry} onChange={(v) => setCard((c) => ({ ...c, expiry: v }))} />
                      <CheckoutInput label="CVC" placeholder="123" value={card.cvc} onChange={(v) => setCard((c) => ({ ...c, cvc: v }))} />
                    </div>
                    <CheckoutInput label="Name on Card" placeholder="Sophie Martin" value={card.name} onChange={(v) => setCard((c) => ({ ...c, name: v }))} />
                  </div>
                )}

                {paymentChoice === 'aba_payway' && (
                  <p className="flex items-center gap-2 rounded-[20px] bg-cream-100/50 px-4 py-3 text__12 text-Mneutral-600">
                    <BadgeCheck size={14} className="flex-shrink-0 text-sage-600" />
                    You'll be redirected to ABA PayWay to complete the payment securely.
                  </p>
                )}

                {paymentChoice === 'bakong' && (
                  <p className="flex items-center gap-2 rounded-[20px] bg-cream-100/50 px-4 py-3 text__12 text-Mneutral-600">
                    <BadgeCheck size={14} className="flex-shrink-0 text-sage-600" />
                    A KHQR code will be shown after you confirm — scan it with any Cambodian bank app.
                  </p>
                )}

                <p className="flex items-center gap-2 rounded-[20px] bg-cream-100/50 px-4 py-3 text__12 text-Mneutral-600">
                  <BadgeCheck size={14} className="flex-shrink-0 text-sage-600" />
                  Demo checkout — no payment is charged. Card processing is Stripe-ready; ABA PayWay and Bakong are wired for merchant credentials.
                </p>

                {orderError && (
                  <p role="alert" className="rounded-[16px] bg-blush-50 px-4 py-3 text__14 text-blush-700">
                    {orderError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('shipping')} className="outline-pill-button" disabled={placing}>
                    <ArrowLeft size={15} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmPlace(true)}
                    disabled={placing}
                    className="filled-pill-button flex-1 justify-center disabled:opacity-60"
                  >
                    <CreditCard size={16} />
                    {placing ? 'Placing order…' : `Place Order · ${formatPrice(orderTotal)}`}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-Mneutral-400">
                  <Lock size={10} />
                  Your payment information is encrypted and secure
                </div>
              </motion.div>
            )}
          </div>

          {/* Order summary */}
          <div className="h-fit rounded-[32px] bg-white p-6 lg:sticky lg:top-24">
            <h3 className="mb-5 text__28 font-medium">Order Summary</h3>
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
                  <span className="text__16 font-medium tabular-nums">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-Mneutral-100 pt-4 text__16">
              <div className="flex justify-between text-Mneutral-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              {coupon && (
                <div className="flex justify-between text-sage-600">
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck size={13} />
                    {coupon.code}
                  </span>
                  <span className="tabular-nums">−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-Mneutral-600">
                <span>Shipping (Standard)</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-Mneutral-600">
                <span>Tax</span>
                <span className="tabular-nums">{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-Mneutral-100 pt-2 font-medium text-Mneutral-900">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(orderTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPlace}
        title="CONFIRM ORDER"
        message={`Place your order for ${formatPrice(orderTotal)}? Your items will be reserved and a confirmation email sent to ${form.email || 'your inbox'}.`}
        confirmLabel="Yes, place order"
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

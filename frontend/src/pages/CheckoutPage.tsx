import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Lock, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore } from '../lib/store'
import { formatPrice } from '../lib/utils'
import ImageWithFallback from '../components/ui/ImageWithFallback'

const steps = ['info', 'shipping', 'payment'] as const

export default function CheckoutPage() {
  const { items, total } = useCartStore()
  const [step, setStep] = useState<(typeof steps)[number]>('info')

  useEffect(() => {
    document.title = 'Calesta — Checkout'
  }, [])

  const subtotal = total()
  const shipping = subtotal >= 75 ? 0 : 8.95
  const tax = subtotal * 0.08

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
                    onClick={() => {
                      if (index <= steps.indexOf(step)) {
                        setStep(current)
                      }
                    }}
                    className={step === current ? 'font-medium text-Mneutral-900' : 'text-Mneutral-400'}
                  >
                    {current}
                  </button>
                  {index < steps.length - 1 && <ChevronDown className="rotate-[-90deg] text-Mneutral-300" size={12} />}
                </React.Fragment>
              ))}
            </div>

            {step === 'info' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <h2 className="mb-6 text__32 font-medium">Contact Information</h2>
                <CheckoutInput label="First Name" placeholder="Sophie" />
                <CheckoutInput label="Last Name" placeholder="Martin" />
                <CheckoutInput label="Email" placeholder="sophie@example.com" type="email" />
                <CheckoutInput label="Phone" placeholder="+1 (555) 000-0000" />
                <h2 className="mb-2 mt-8 text__32 font-medium">Shipping Address</h2>
                <CheckoutInput label="Street Address" placeholder="123 Beauty Lane" />
                <CheckoutInput label="City" placeholder="New York" />
                <CheckoutInput label="State" placeholder="NY" />
                <CheckoutInput label="ZIP Code" placeholder="10001" />
                <CheckoutInput label="Country" placeholder="United States" />
                <button type="button" onClick={() => setStep('shipping')} className="filled-pill-button mt-4">
                  Continue to Shipping
                </button>
              </motion.div>
            )}

            {step === 'shipping' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="mb-6 text__32 font-medium">Shipping Method</h2>
                {[
                  { label: 'Standard Shipping', time: '5–7 business days', price: 'Free' },
                  { label: 'Express Shipping', time: '2–3 business days', price: '$12.95' },
                  { label: 'Overnight', time: 'Next business day', price: '$24.95' },
                ].map((option, index) => (
                  <label
                    key={option.label}
                    className="flex cursor-pointer items-center gap-4 rounded-[24px] border border-Mneutral-100 p-4 transition-colors has-[:checked]:border-Mneutral-900 has-[:checked]:bg-Mneutral-50"
                  >
                    <input type="radio" name="shipping" defaultChecked={index === 0} className="accent-[#102d26]" />
                    <div className="flex-1">
                      <p className="text__16 font-medium">{option.label}</p>
                      <p className="text__14 text-Mneutral-500">{option.time}</p>
                    </div>
                    <span className="text__16 font-medium">{option.price}</span>
                  </label>
                ))}
                <button type="button" onClick={() => setStep('payment')} className="filled-pill-button mt-4">
                  Continue to Payment
                </button>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <h2 className="mb-6 flex items-center gap-2 text__32 font-medium">
                  <Lock size={16} className="text-Mneutral-500" />
                  Payment
                </h2>
                <CheckoutInput label="Card Number" placeholder="4242 4242 4242 4242" />
                <CheckoutInput label="Expiry Date" placeholder="MM / YY" />
                <CheckoutInput label="CVC" placeholder="123" />
                <CheckoutInput label="Name on Card" placeholder="Sophie Martin" />
                <button type="button" className="filled-pill-button mt-4">
                  <CreditCard size={16} />
                  Place Order · {formatPrice(subtotal + shipping + tax)}
                </button>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-Mneutral-400">
                  <Lock size={10} />
                  Your payment information is encrypted and secure
                </div>
              </motion.div>
            )}
          </div>

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
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-Mneutral-900 text-[9px] text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text__16 font-medium">{item.product.name}</p>
                    <p className="text__14 text-Mneutral-400">{item.product.volume}</p>
                  </div>
                  <span className="text__16 font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-Mneutral-100 pt-4 text__16">
              <div className="flex justify-between text-Mneutral-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-Mneutral-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-Mneutral-600">
                <span>Tax</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-Mneutral-100 pt-2 font-medium text-Mneutral-900">
                <span>Total</span>
                <span>{formatPrice(subtotal + shipping + tax)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutInput({
  label,
  placeholder,
  type = 'text',
}: {
  label: string
  placeholder: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-2 block text__14 text-Mneutral-500">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-full border border-Mneutral-100 px-4 py-3 text__16 outline-none transition-colors focus:border-Mneutral-900"
      />
    </div>
  )
}

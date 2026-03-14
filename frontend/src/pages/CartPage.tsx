import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCartStore } from '../lib/store'
import { formatPrice } from '../lib/utils'
import ImageWithFallback from '../components/ui/ImageWithFallback'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCartStore()

  useEffect(() => {
    document.title = 'Calesta — Cart'
  }, [])

  if (items.length === 0) {
    return (
      <div className="bg-Mneutral-50 pt-[140px]">
        <div className="container-custom rounded-[32px] bg-white px-[20px] py-[80px] text-center xs:px-[40px]">
          <ShoppingBag size={64} strokeWidth={1} className="mx-auto mb-6 text-Mneutral-300" />
          <h1 className="mb-3 text__40 font-medium text-Mneutral-900">Your bag is empty</h1>
          <p className="mb-8 text__18 text-Mneutral-600">Discover our luxurious skincare collection</p>
          <Link to="/shop" className="filled-pill-button">
            Start Shopping
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = total()
  const shipping = subtotal >= 75 ? 0 : 8.95
  const tax = subtotal * 0.08
  const orderTotal = subtotal + shipping + tax

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="section-template">
        <div className="container-custom grid gap-[12px] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] bg-white px-[20px] py-[24px] xs:px-[40px] xs:py-[40px] xl:px-[56px]">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text__18 text-Mneutral-400">MY BAG</p>
                <h1 className="text__48 font-medium">Selected Rituals</h1>
              </div>
              <p className="text__18 text-Mneutral-500">{items.length} items</p>
            </div>

            <div className="grid gap-[18px]">
              {items.map((item) => (
                <div key={item.product.id} className="grid gap-4 rounded-[28px] border border-Mneutral-100 p-4 md:grid-cols-[130px_1fr_auto] md:items-center">
                  <div className="overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
                    <ImageWithFallback
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-[140px] w-full object-cover"
                      fallbackClassName="flex h-[140px] w-full items-center justify-center bg-[linear-gradient(180deg,#d7ede7,#c2ddd6)]"
                      fallbackText={item.product.name}
                    />
                  </div>

                  <div>
                    <p className="mb-1 text__14 text-Mneutral-400">{item.product.category.name}</p>
                    <h3 className="text__24 font-medium">{item.product.name}</h3>
                    <p className="mt-2 text__16 text-Mneutral-600">{item.product.tagline}</p>
                    <div className="mt-4 flex items-center gap-2 rounded-full border border-Mneutral-200 px-3 py-2 w-fit">
                      <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <Minus size={14} />
                      </button>
                      <span className="min-w-8 text-center text__16">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4 md:block">
                    <p className="text__24 font-medium">{formatPrice(item.product.price * item.quantity)}</p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="mt-3 inline-flex items-center gap-2 text__14 text-Mneutral-500 transition-colors hover:text-Mneutral-900"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-fit rounded-[32px] bg-white p-6 lg:sticky lg:top-24">
            <h2 className="mb-6 text__32 font-medium">Summary</h2>
            <div className="mb-6 space-y-3 text__16">
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
              <div className="flex justify-between border-t border-Mneutral-100 pt-3 text__20 font-medium">
                <span>Total</span>
                <span>{formatPrice(orderTotal)}</span>
              </div>
            </div>

            <div className="mb-6 rounded-[24px] bg-Mneutral-50 p-4">
              <p className="text__14 text-Mneutral-500">Free shipping on orders over $75</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-Mneutral-100">
                <div
                  className="h-full rounded-full bg-Mbrand-teal transition-all duration-300"
                  style={{ width: `${Math.min(100, (subtotal / 75) * 100)}%` }}
                />
              </div>
            </div>

            <Link to="/checkout" className="filled-pill-button w-full justify-center">
              Proceed to Checkout
            </Link>
            <Link to="/shop" className="mt-4 block text-center text__16 text-Mneutral-600 underline underline-offset-2">
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Trash2, Plus, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCartStore } from '../../lib/store'
import { formatPrice } from '../../lib/utils'
import ImageWithFallback from '../ui/ImageWithFallback'

export default function CartSidebar() {
  const { items, isOpen, toggleCart, removeItem, updateQuantity, total } = useCartStore()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
          />

          {/* Sidebar */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-Mneutral-50 shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-Mneutral-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} strokeWidth={1.5} />
                <span className="text__24 font-medium">Your Bag</span>
                <span className="text__16 text-Mneutral-600">({items.length})</span>
              </div>
              <button
                onClick={toggleCart}
                className="p-2 transition-colors hover:text-Mneutral-600"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <motion.div
                    className="flex h-full flex-col items-center justify-center gap-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <ShoppingBag size={48} strokeWidth={1} className="text-Mneutral-300" />
                    <p className="text__32 text-Mneutral-600">Your bag is empty</p>
                    <p className="text__16 text-Mneutral-500">Add some luxurious treats</p>
                    <button
                      onClick={toggleCart}
                      className="filled-pill-button mt-4"
                    >
                      Shop Now
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <motion.div
                        key={item.product.id}
                        layout
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-4 rounded-[24px] border border-Mneutral-100 bg-white p-4"
                      >
                        {/* Image */}
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
                          <ImageWithFallback
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                            fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#fbf5ea,#f0e4cf)]"
                            fallbackText={item.product.name}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text__16 font-medium text-Mneutral-900 truncate">
                            {item.product.name}
                          </h4>
                          {item.variant && (
                            <p className="mt-0.5 text__14 text-Mneutral-500">{item.variant.name}</p>
                          )}
                          <p className="mt-1 text__16 font-medium text-Mneutral-900">
                            {formatPrice(item.product.price)}
                          </p>

                          {/* Quantity */}
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-Mneutral-200 transition-colors hover:border-Mneutral-900"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-4 text-center text__14 font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-Mneutral-200 transition-colors hover:border-Mneutral-900"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="self-start p-1 text-Mneutral-400 transition-colors hover:text-Mneutral-900"
                        >
                          <Trash2 size={15} strokeWidth={1.5} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <motion.div
                className="space-y-4 border-t border-Mneutral-100 px-6 py-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Free shipping bar */}
                <div>
                  <div className="mb-2 flex justify-between text__14 text-Mneutral-600">
                    <span>Free shipping on orders over $75</span>
                    <span>{formatPrice(Math.max(0, 75 - total()))} away</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-Mneutral-100">
                    <motion.div
                      className="h-full rounded-full bg-Mbrand-teal"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (total() / 75) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-between items-center">
                  <span className="text__16 text-Mneutral-600">Subtotal</span>
                  <span className="text__24 font-medium">{formatPrice(total())}</span>
                </div>
                <p className="text__14 text-Mneutral-500">Taxes and shipping calculated at checkout</p>

                <Link
                  to="/checkout"
                  onClick={toggleCart}
                  className="filled-pill-button w-full justify-center"
                >
                  Checkout
                </Link>
                <Link
                  to="/cart"
                  onClick={toggleCart}
                  className="block text-center text__16 text-Mneutral-600 underline underline-offset-2"
                >
                  View full cart
                </Link>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

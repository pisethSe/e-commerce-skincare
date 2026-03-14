import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { NAV_LINKS } from '../../lib/data'
import { useAuthStore, useCartStore, useUIStore } from '../../lib/store'

export default function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const itemCount = useCartStore((s) => s.itemCount)
  const toggleCart = useCartStore((s) => s.toggleCart)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isMobileMenuOpen, toggleMobileMenu, openAuthModal } = useUIStore()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    useUIStore.getState().closeMobileMenu()
  }, [location.pathname])

  return (
    <>
      <header className="fixed left-0 top-0 z-50 w-full">
        <motion.div
          className={`transition-all duration-300 ${
            scrolled ? 'bg-Mneutral-50/92 backdrop-blur-md' : 'bg-Mneutral-50'
          }`}
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container-custom">
            <div className="relative flex items-center justify-between py-3">
              <Link to="/" className="text__24 relative z-[2] inline-block font-medium text-Mneutral-900">
                Calesta
              </Link>

              <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-[40px] text__16 text-Mneutral-900 md:flex">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className={`transition-opacity duration-200 hover:opacity-100 ${
                      location.pathname === link.href ? 'opacity-100' : 'opacity-75'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                {user ? (
                  <div className="hidden items-center gap-2 md:flex">
                    <span className="rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14">
                      HI, {user.firstName.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={logout}
                      className="rounded-full border border-Mneutral-200 px-[12px] py-[10px] text__14 text-Mneutral-600"
                    >
                      LOGOUT
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="hidden rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14 md:inline-block"
                  >
                    LOGIN
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleCart}
                  className="relative flex h-[40px] w-[40px] items-center justify-center rounded-full border border-Mneutral-200 text-Mneutral-900 md:h-[44px] md:w-[44px]"
                  aria-label="Open cart"
                >
                  <ShoppingBag size={18} strokeWidth={1.75} />
                  {itemCount() > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-Mneutral-900 px-1 text-[10px] font-semibold text-white">
                      {itemCount()}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMobileMenu}
                  className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-Mneutral-900 text-white md:hidden"
                  aria-label="Toggle navigation"
                >
                  {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-Mneutral-50 pt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="container-custom flex flex-col gap-5">
              {NAV_LINKS.map((link, index) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Link
                    to={link.href}
                    className="block text__40 font-medium text-Mneutral-900"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              {user ? (
                <button
                  type="button"
                  onClick={logout}
                  className="mt-4 inline-flex w-fit items-center rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14"
                >
                  LOGOUT
                </button>
              ) : (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="inline-flex w-fit items-center rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14"
                  >
                    LOGIN
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('signup')}
                    className="inline-flex w-fit items-center rounded-full bg-Mneutral-900 px-[12px] py-[10px] text__14 text-white"
                  >
                    SIGN UP
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

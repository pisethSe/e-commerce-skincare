import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { NAV_LINKS } from '../../lib/data'
import { useAuthStore, useCartStore, usePrefsStore, useUIStore } from '../../lib/store'
import { useT } from '../../lib/i18n'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const itemCount = useCartStore((s) => s.itemCount)
  const toggleCart = useCartStore((s) => s.toggleCart)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isMobileMenuOpen, toggleMobileMenu, openAuthModal } = useUIStore()
  const { lang, currency, setLang, setCurrency } = usePrefsStore()
  const t = useT()
  const navKey = (href: string) =>
    href === '/shop' ? 'nav.products' : href === '/journal' ? 'nav.journal' : href === '/about' ? 'nav.about' : 'nav.checkout'

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
                    {t(navKey(link.href) as never)}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                {user ? (
                  <div className="hidden items-center gap-2 md:flex">
                    <Link
                      to="/account"
                      className={`rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14 transition-opacity duration-200 hover:opacity-80 ${
                        location.pathname === '/account' ? 'bg-Mneutral-900 text-white' : ''
                      }`}
                    >
                      {t('nav.hi', { name: user.firstName.toUpperCase() })}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmLogout(true)}
                      className="rounded-full border border-Mneutral-200 px-[12px] py-[10px] text__14 text-Mneutral-600 transition-colors hover:border-Mneutral-900 hover:text-Mneutral-900"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="hidden rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14 md:inline-block"
                  >
                    {t('nav.login')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
                  className="hidden h-[40px] items-center justify-center rounded-full border border-Mneutral-200 px-[10px] text__14 text-Mneutral-900 transition-colors hover:border-Mneutral-900 md:inline-flex"
                  aria-label={t('nav.language')}
                  title={t('nav.language')}
                >
                  {lang === 'en' ? 'ខ្មែរ' : 'EN'}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrency(currency === 'USD' ? 'KHR' : 'USD')}
                  className="hidden h-[40px] items-center justify-center rounded-full border border-Mneutral-200 px-[12px] text__14 font-medium tabular-nums text-Mneutral-900 transition-colors hover:border-Mneutral-900 md:inline-flex"
                  aria-label={t('nav.currency')}
                  title={t('nav.currency')}
                >
                  {currency === 'USD' ? '$ USD' : '៛ KHR'}
                </button>

                <button
                  type="button"
                  onClick={toggleCart}
                  className="relative flex h-[40px] w-[40px] items-center justify-center rounded-full border border-Mneutral-200 text-Mneutral-900 md:h-[44px] md:w-[44px]"
                  aria-label={t('nav.openCart')}
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
                  aria-label={t('nav.toggleMenu')}
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
                    {t(navKey(link.href) as never)}
                  </Link>
                </motion.div>
              ))}
              {user ? (
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    to="/account"
                    className="inline-flex w-fit items-center rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14"
                  >
                    {t('nav.account')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmLogout(true)}
                    className="inline-flex w-fit items-center rounded-full border border-Mneutral-200 px-[12px] py-[10px] text__14 text-Mneutral-600"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="inline-flex w-fit items-center rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14"
                  >
                    {t('nav.login')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('signup')}
                    className="inline-flex w-fit items-center rounded-full bg-Mneutral-900 px-[12px] py-[10px] text__14 text-white"
                  >
                    {t('nav.signup')}
                  </button>
                </div>
              )}
              <div className="mt-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
                  className="inline-flex items-center gap-2 rounded-full border border-Mneutral-200 px-[14px] py-[10px] text__14 text-Mneutral-900"
                  aria-label={t('nav.language')}
                >
                  {lang === 'en' ? 'ភាសាខ្មែរ' : 'English'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency(currency === 'USD' ? 'KHR' : 'USD')}
                  className="inline-flex items-center gap-2 rounded-full border border-Mneutral-200 px-[14px] py-[10px] text__14 font-medium text-Mneutral-900"
                  aria-label={t('nav.currency')}
                >
                  {currency === 'USD' ? '$ USD' : '៛ KHR'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmLogout}
        title={t('nav.logoutConfirmTitle')}
        message={user ? t('nav.logoutConfirm', { name: user.firstName }) : t('nav.logoutConfirmPlain')}
        confirmLabel={t('nav.yesLogout')}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          logout()
          navigate('/')
        }}
      />
    </>
  )
}

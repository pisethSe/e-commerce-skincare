import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Heart, Loader2, Menu, Search, ShoppingBag, X } from 'lucide-react'
import { NAV_LINKS } from '../../lib/data'
import { useAuthStore, useCartStore, usePrefsStore, useUIStore, useWishlistStore } from '../../lib/store'
import { useT } from '../../lib/i18n'
import ConfirmDialog from '../ui/ConfirmDialog'
import ImageWithFallback from '../ui/ImageWithFallback'
import { getApiUrl } from '../../lib/api'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const itemCount = useCartStore((s) => s.itemCount)
  const wishlistCount = useWishlistStore((s) => s.ids.length)
  const toggleCart = useCartStore((s) => s.toggleCart)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isMobileMenuOpen, toggleMobileMenu, openAuthModal, isSearchOpen, toggleSearch } = useUIStore()
  const { lang, currency, setLang, setCurrency } = usePrefsStore()
  const t = useT()

  // Typeahead state for the search overlay
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<Array<{
    id: string
    name: string
    slug: string
    images?: string[]
    category?: { name: string; slug: string }
  }>>([])
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  const navKey = (href: string) =>
    href === '/shop' ? 'nav.products' : href === '/journal' ? 'nav.journal' : href === '/about' ? 'nav.about' : 'nav.checkout'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const state = useUIStore.getState()
    state.closeMobileMenu()
    if (state.isSearchOpen) state.toggleSearch()
  }, [location.pathname, location.search])

  // Live typeahead, debounced; abort in-flight requests when the term changes.
  useEffect(() => {
    if (!isSearchOpen) return
    const term = searchTerm.trim()
    if (term.length < 2) {
      setResults([])
      setSuggestion(null)
      setSearched(false)
      setSearching(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      fetch(getApiUrl(`/api/products/suggest?q=${encodeURIComponent(term)}`), {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('suggest failed')
          return response.json()
        })
        .then((json) => {
          setResults(json.data ?? [])
          setSuggestion(json.suggestion ?? null)
          setSearched(true)
        })
        .catch((error: Error) => {
          if (error.name !== 'AbortError') {
            setResults([])
            setSearched(true)
          }
        })
        .finally(() => setSearching(false))
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchTerm, isSearchOpen])

  useEffect(() => {
    if (!isSearchOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') toggleSearch()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isSearchOpen, toggleSearch])

  const closeSearch = () => {
    toggleSearch()
    setSearchTerm('')
    setResults([])
    setSearched(false)
  }

  const goToResults = (term: string) => {
    const trimmed = term.trim()
    closeSearch()
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop')
  }

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    goToResults(searchTerm)
  }

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
                  onClick={toggleSearch}
                  className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-Mneutral-200 text-Mneutral-900 transition-colors hover:border-Mneutral-900 md:h-[44px] md:w-[44px]"
                  aria-label={t('nav.search')}
                  title={t('nav.search')}
                >
                  <Search size={18} strokeWidth={1.75} />
                </button>

                <Link
                  to="/wishlist"
                  className={`relative hidden h-[40px] w-[40px] items-center justify-center rounded-full border text-Mneutral-900 transition-colors md:inline-flex md:h-[44px] md:w-[44px] ${
                    location.pathname === '/wishlist' ? 'border-Mneutral-900 bg-Mneutral-900 text-white' : 'border-Mneutral-200 hover:border-Mneutral-900'
                  }`}
                  aria-label={t('nav.openWishlist')}
                  title={t('nav.openWishlist')}
                >
                  <Heart size={18} strokeWidth={1.75} className={wishlistCount > 0 ? 'fill-current' : ''} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-Mneutral-900 px-1 text-[10px] font-semibold text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

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
              <Link
                to="/wishlist"
                className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-Mneutral-200 px-[12px] py-[10px] text__14 text-Mneutral-600"
              >
                <Heart size={15} /> {t('nav.wishlist')}
                {wishlistCount > 0 && <span className="text-Mneutral-900">({wishlistCount})</span>}
              </Link>
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

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-Mneutral-900/25 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSearch}
          >
            <motion.div
              className="mx-auto mt-20 w-[calc(100%-32px)] max-w-[680px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(16,45,38,0.18)]"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.search')}
            >
              <form onSubmit={submitSearch} className="flex items-center gap-3 border-b border-Mneutral-100 pl-5 pr-2">
                <Search size={19} strokeWidth={1.75} className="flex-shrink-0 text-Mneutral-400" />
                <input
                  type="search"
                  autoFocus
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('search.placeholder')}
                  aria-label={t('search.placeholder')}
                  className="h-[58px] min-w-0 flex-1 bg-transparent text__16 outline-none placeholder:text-Mneutral-400 [&::-webkit-search-cancel-button]:hidden"
                />
                {searching && <Loader2 size={16} className="animate-spin text-Mneutral-400" />}
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label={t('search.close')}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-Mneutral-400 transition-colors hover:bg-Mneutral-100 hover:text-Mneutral-900"
                >
                  <X size={17} />
                </button>
              </form>

              <div className="max-h-[60vh] overflow-y-auto">
                {searchTerm.trim().length < 2 ? (
                  <p className="px-5 py-8 text-center text__14 text-Mneutral-500">{t('search.hint')}</p>
                ) : results.length > 0 ? (
                  <>
                    {results.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          closeSearch()
                          navigate(`/products/${product.slug}`)
                        }}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-Mneutral-50"
                      >
                        <ImageWithFallback
                          src={product.images?.[0]}
                          alt={product.name}
                          className="h-12 w-12 rounded-[10px] object-cover"
                          fallbackClassName="h-12 w-12 flex-shrink-0 rounded-[10px] bg-Mneutral-100"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text__14 font-medium text-Mneutral-900">{product.name}</span>
                          {product.category?.name && (
                            <span className="block text__12 text-Mneutral-500">{product.category.name}</span>
                          )}
                        </span>
                        <ArrowRight size={15} className="flex-shrink-0 text-Mneutral-400" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => goToResults(searchTerm)}
                      className="flex w-full items-center justify-between border-t border-Mneutral-100 px-5 py-4 text__14 font-medium text-Mneutral-900 transition-colors hover:bg-Mneutral-50"
                    >
                      <span>{t('search.viewAll')}</span>
                      <span className="max-w-[50%] truncate text-Mneutral-500">“{searchTerm.trim()}”</span>
                    </button>
                  </>
                ) : searched ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text__14 text-Mneutral-500">
                      {t('search.noResults', { query: searchTerm.trim() })}
                    </p>
                    {suggestion && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm(suggestion)}
                        className="mt-3 text__16 font-medium text-Mneutral-900 underline underline-offset-4"
                      >
                        {t('search.didYouMean', { term: suggestion })}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
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

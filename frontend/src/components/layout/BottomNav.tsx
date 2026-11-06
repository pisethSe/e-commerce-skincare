import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, LayoutGrid, Search, ShoppingBag, UserRound } from 'lucide-react'
import { useAuthStore, useCartStore, useUIStore } from '../../lib/store'
import { useT } from '../../lib/i18n'

/**
 * Mobile bottom bar mirroring the reference storefront:
 * Home · Products · Search · Cart · You.
 * Desktop keeps the full navbar, so this only renders below `lg`.
 */
export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const t = useT()
  const cartItems = useCartStore((s) => s.items)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const toggleCart = useCartStore((s) => s.toggleCart)
  const user = useAuthStore((s) => s.user)
  const { toggleSearch, openAuthModal } = useUIStore()

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const itemClass = (active: boolean) =>
    `relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium tracking-wide transition-colors ${
      active ? 'text-Mneutral-900' : 'text-Mneutral-400'
    }`

  return (
    <nav
      aria-label={t('nav.mobileMenu')}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-Mneutral-100 bg-Mneutral-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-[520px] items-stretch px-2">
        <Link to="/" className={itemClass(isActive('/'))} aria-current={isActive('/') ? 'page' : undefined}>
          <Home size={19} strokeWidth={1.75} />
          {t('nav.home')}
        </Link>
        <Link to="/shop" className={itemClass(isActive('/shop'))} aria-current={isActive('/shop') ? 'page' : undefined}>
          <LayoutGrid size={19} strokeWidth={1.75} />
          {t('nav.productsShort')}
        </Link>
        <button type="button" onClick={toggleSearch} className={itemClass(false)}>
          <Search size={19} strokeWidth={1.75} />
          {t('nav.searchShort')}
        </button>
        <button type="button" onClick={toggleCart} className={itemClass(false)}>
          <ShoppingBag size={19} strokeWidth={1.75} />
          {itemCount > 0 && (
            <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-Mneutral-900 px-1 text-[9px] font-semibold text-white">
              {itemCount}
            </span>
          )}
          {t('nav.cartShort')}
        </button>
        <button
          type="button"
          onClick={() => (user ? navigate('/account') : openAuthModal('login'))}
          className={itemClass(isActive('/account'))}
        >
          <UserRound size={19} strokeWidth={1.75} />
          {t('nav.you')}
        </button>
      </div>
    </nav>
  )
}

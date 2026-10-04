import React, { useState } from 'react'
import { CalendarDays, LogOut, Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiData } from '../../lib/api'
import { useAuthStore, adminInitials } from '../../lib/authStore'
import ConfirmDialog from '../ui/ConfirmDialog'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Live sales, inventory, and customer activity across your store.',
  },
  '/products': {
    title: 'Products',
    subtitle: 'Curate your collection, pricing, and merchandising presentation.',
  },
  '/orders': {
    title: 'Orders',
    subtitle: 'Track fulfillment, payment, and customer service status.',
  },
  '/customers': {
    title: 'Customers',
    subtitle: 'Relationship, retention, and loyalty insights.',
  },
  '/analytics': {
    title: 'Analytics',
    subtitle: 'Performance snapshots across channels and campaigns.',
  },
  '/reviews': {
    title: 'Reviews',
    subtitle: 'Approve and manage voice-of-customer feedback.',
  },
  '/journal': {
    title: 'Journal',
    subtitle: 'Editorial planning and content publishing.',
  },
  '/coupons': {
    title: 'Coupons',
    subtitle: 'Promotions, launches, and seasonal codes.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Profile, security, and store configuration.',
  },
}

/** Flat white header — live date, live user, search that jumps into the catalog. */
export default function AdminHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const [query, setQuery] = useState('')
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const meta = PAGE_META[pathname] ?? PAGE_META['/']
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/products?search=${encodeURIComponent(q)}`)
  }

  const signOut = async () => {
    setConfirmSignOut(false)
    try {
      const refresh = localStorage.getItem('calesta-admin-refresh')
      await apiData({ method: 'POST', url: '/auth/logout', data: { refreshToken: refresh } })
    } catch {
      // clearing local state regardless
    }
    clear()
    navigate('/', { replace: true })
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-20 border-b border-[#e7eae9] bg-white/95 px-4 pt-4 xs:px-5 lg:left-[248px] lg:px-7 lg:pt-0">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:py-4">
        <div className="min-w-0">
          <h1 className="text__24 font-semibold tracking-[-0.01em] text-[#102d26]">
            {meta.title}
          </h1>
          <p className="mt-0.5 hidden max-w-[620px] text-[13px] text-[#6e7f7b] sm:block">
            {meta.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 pb-3 lg:pb-0">
          <form onSubmit={submitSearch} className="relative hidden xl:block">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca8a5]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog…"
              aria-label="Search catalog"
              className="input-admin w-[240px] pl-9"
            />
          </form>

          <div className="admin-chip hidden xl:inline-flex">
            <CalendarDays size={13} />
            {today}
          </div>

          <div className="flex items-center gap-2.5 rounded-[8px] border border-[#e7eae9] bg-white px-2 py-1.5 pr-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#102d26] text-[10.5px] font-semibold text-white">
              {adminInitials(user)}
            </div>
            <div className="hidden md:block">
              <p className="text-[12.5px] font-medium leading-tight text-[#102d26]">
                {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Admin' : 'Admin'}
              </p>
              <p className="text-[10.5px] leading-tight text-[#9ca8a5]">{user?.email ?? ''}</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              aria-label="Sign out"
              title="Sign out"
              className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-[6px] text-[#9ca8a5] transition-colors hover:bg-[#fdeeee] hover:text-[#d64545]"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out"
        message={`Are you sure you want to sign out${user ? `, ${user.firstName ?? 'Admin'}` : ''}? You'll need to log in again to manage the store.`}
        confirmLabel="Yes, sign out"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={signOut}
      />
    </header>
  )
}

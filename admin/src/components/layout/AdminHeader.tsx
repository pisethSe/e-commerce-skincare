import React from 'react'
import { Bell, CalendarDays, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Control Room',
    subtitle: 'Monitor sales, inventory, and customer activity in one premium dashboard.',
  },
  '/products': {
    title: 'Product Library',
    subtitle: 'Curate your collection, pricing, and merchandising presentation.',
  },
  '/orders': {
    title: 'Order Flow',
    subtitle: 'Track fulfillment, payment, and customer service status in real time.',
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
    subtitle: 'Voice-of-customer and product feedback overview.',
  },
  '/journal': {
    title: 'Journal',
    subtitle: 'Editorial planning and content publishing overview.',
  },
  '/coupons': {
    title: 'Offers',
    subtitle: 'Promotions, launches, and seasonal codes.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Permissions, preferences, and business configuration.',
  },
}

export default function AdminHeader() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] ?? PAGE_META['/']

  return (
    <header className="fixed left-0 right-0 top-0 z-20 px-4 pt-4 xs:px-5 lg:left-[288px] lg:px-8">
      <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4 rounded-[28px] border border-white/80 bg-white/65 px-5 py-4 shadow-soft backdrop-blur-xl">
        <div className="min-w-0">
          <p className="admin-kicker">Lumiere Admin</p>
          <h1 className="mt-2 font-display text__28 font-medium text-Mneutral-900">
            {meta.title}
          </h1>
          <p className="mt-1 max-w-[620px] text__14 text-Mneutral-600">
            {meta.subtitle}
          </p>
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-Mneutral-500"
            />
            <input
              placeholder="Search products, orders, customers..."
              className="input-admin w-[320px] pl-11"
            />
          </div>

          <div className="admin-chip">
            <CalendarDays size={14} />
            Mar 14, 2026
          </div>

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-Mneutral-100 bg-white text-Mneutral-900 transition-colors hover:border-Mneutral-900"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-cream-500" />
          </button>

          <div className="flex items-center gap-3 rounded-full border border-Mneutral-100 bg-white px-2 py-2 pr-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-Mneutral-900 text__14 font-semibold text-white">
              LP
            </div>
            <div>
              <p className="text__14 font-medium text-Mneutral-900">Lumiere Panel</p>
              <p className="text__12 text-Mneutral-500">admin@lumiere.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

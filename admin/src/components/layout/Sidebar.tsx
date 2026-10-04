import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  FileText,
  LayoutDashboard,
  Leaf,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react'
import { apiData } from '../../lib/api'
import { formatMoneyShort } from '../../lib/format'
import { useAuthStore, adminInitials } from '../../lib/authStore'

const PRIMARY_NAV = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Analytics', href: '/analytics', icon: TrendingUp },
]

const SECONDARY_NAV = [
  { label: 'Reviews', href: '/reviews', icon: Star },
  { label: 'Journal', href: '/journal', icon: FileText },
  { label: 'Coupons', href: '/coupons', icon: Tag },
  { label: 'Settings', href: '/settings', icon: Settings },
]

/** Dark flat sidebar — clear navigation, live month figure at the bottom. */
export default function Sidebar() {
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const [monthRevenue, setMonthRevenue] = useState<number | null>(null)
  const [pendingOrders, setPendingOrders] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    apiData<{ revenue: { current: number }; orders: { pending: number } }>({ url: '/admin/stats' })
      .then((data) => {
        if (!alive) return
        setMonthRevenue(data.revenue.current)
        setPendingOrders(data.orders.pending)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [pathname])

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#0b1f19] bg-[#102d26] lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#9edccd] text-[#102d26]">
          <Leaf size={15} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7fa092]">
            Admin
          </p>
          <h2 className="text__16 font-semibold tracking-[0.06em] text-white">CALESTA</h2>
        </div>
      </div>

      <div className="h-px bg-white/[0.07]" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f7f70]">
          Commerce
        </p>
        <div className="space-y-0.5">
          {PRIMARY_NAV.map(({ label, href, icon: Icon }) => (
            <NavLink
              key={label}
              to={href}
              end={href === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">
                <Icon size={15} strokeWidth={2} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f7f70]">
          Content & Growth
        </p>
        <div className="space-y-0.5">
          {SECONDARY_NAV.map(({ label, href, icon: Icon }) => (
            <NavLink
              key={label}
              to={href}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">
                <Icon size={15} strokeWidth={2} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Live month footer */}
      <div className="border-t border-white/[0.07] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f7f70]">
          This month
        </p>
        <p className="mt-1.5 text__20 font-semibold tabular-nums text-white">
          {monthRevenue === null ? '—' : formatMoneyShort(monthRevenue)}
        </p>
        <p className="mt-1 text-[11.5px] text-[#7fa092]">
          {pendingOrders === null
            ? 'Loading store data…'
            : `${pendingOrders} order${pendingOrders === 1 ? '' : 's'} to fulfill`}
        </p>
        {user && (
          <div className="mt-3 flex items-center gap-2.5 border-t border-white/[0.07] pt-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-white/10 text-[10.5px] font-semibold text-white">
              {adminInitials(user)}
            </div>
            <p className="truncate text-[11.5px] text-[#a8bfaf]">{user.email}</p>
          </div>
        )}
      </div>
    </aside>
  )
}

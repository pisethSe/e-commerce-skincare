import React from 'react'
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import {
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react'

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

export default function Sidebar() {
  return (
    <motion.aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[288px] p-4 lg:block"
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="admin-card flex h-full flex-col overflow-hidden px-4 py-5">
        <div className="rounded-[28px] border border-Mneutral-100 bg-gradient-to-br from-white via-cream-50 to-Mneutral-50 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-Mneutral-900 text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="admin-kicker">Premium Commerce</p>
              <h2 className="mt-1 font-display text__24 font-medium text-Mneutral-900">
                LUMIERE
              </h2>
            </div>
          </div>
          <p className="mt-4 text__14 text-Mneutral-600">
            A refined control center for merchandising, orders, and brand storytelling.
          </p>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <div className="mb-6">
            <p className="admin-kicker px-3">Commerce</p>
            <nav className="mt-3 space-y-1.5">
              {PRIMARY_NAV.map(({ label, href, icon: Icon }) => (
                <NavLink
                  key={label}
                  to={href}
                  end={href === '/'}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-link-icon">
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div>
            <p className="admin-kicker px-3">Content & Growth</p>
            <nav className="mt-3 space-y-1.5">
              {SECONDARY_NAV.map(({ label, href, icon: Icon }) => (
                <NavLink
                  key={label}
                  to={href}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-link-icon">
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] bg-Mneutral-900 px-5 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text__12 uppercase tracking-[0.28em] text-white/60">This Week</p>
              <h3 className="mt-2 font-display text__24 font-medium">$52.8k</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10">
              <CircleDollarSign size={18} />
            </div>
          </div>
          <p className="mt-3 text__14 text-white/70">
            Revenue is up 18.2% with strongest traction from serums and replenishment orders.
          </p>
        </div>
      </div>
    </motion.aside>
  )
}

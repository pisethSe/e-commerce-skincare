import React from 'react'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import AdminHeader from './AdminHeader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell relative overflow-hidden">
      <div className="pointer-events-none absolute left-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-cream-200/50 blur-3xl" />
      <div className="pointer-events-none absolute right-[-60px] top-[-40px] h-[260px] w-[260px] rounded-full bg-Mbrand-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-80px] right-[18%] h-[260px] w-[260px] rounded-full bg-sage-200/50 blur-3xl" />

      <Sidebar />

      <div className="relative min-h-screen pl-0 lg:pl-[288px]">
        <AdminHeader />
        <motion.main
          className="px-4 pb-8 pt-[110px] xs:px-5 lg:px-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  )
}

import React from 'react'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import AdminHeader from './AdminHeader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <Sidebar />

      <div className="min-h-screen pl-0 lg:pl-[248px]">
        <AdminHeader />
        <motion.main
          className="px-4 pb-10 pt-[104px] xs:px-5 lg:px-7"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  )
}

import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  kicker?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string
}

/**
 * Slide-out drawer — the admin's standard edit/detail surface.
 * Enters from the right at 260ms with a custom ease-out; closes on
 * overlay click and Escape; locks body scroll while open.
 */
export default function Drawer({ open, onClose, title, kicker, children, footer, width = '520px' }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-[#102d26]/25 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex h-full flex-col bg-white shadow-[0_0_60px_rgba(16,45,38,0.14)]"
            style={{ width: 'min(100vw, ' + width + ')' }}
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e7eae9] px-6 py-5">
              <div>
                {kicker && <p className="admin-kicker">{kicker}</p>}
                <h2 className="mt-1.5 font-display text__24 font-medium text-[#102d26]">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#e7eae9] text-[#6e7f7b] transition-colors hover:border-[#102d26] hover:text-[#102d26] active:scale-[0.97]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer && <div className="border-t border-[#e7eae9] px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

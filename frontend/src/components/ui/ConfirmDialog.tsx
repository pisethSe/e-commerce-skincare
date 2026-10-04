import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Storefront confirmation dialog — soft, rounded, matches the Calesta look.
 * Uses pure CSS animations/transitions (no JS animation loop) so the dialog
 * is always visible the instant it opens and fades out reliably on close.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(open)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Mount immediately on open; unmount 220ms after close so the fade-out plays.
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const t = window.setTimeout(() => setMounted(false), 220)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  // Focus the confirm button so keyboard users land on a real control.
  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  if (!mounted) return null

  return (
    <div
      className={`dialog-overlay-in fixed inset-0 z-[95] flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className="absolute inset-0 bg-Mneutral-900/30 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={`dialog-panel-in relative w-full max-w-[380px] rounded-[28px] bg-white px-[28px] py-[32px] shadow-xl transition-[opacity,transform] duration-200 ease-out ${
          open ? 'translate-y-0 scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <p className="text__14 font-medium uppercase tracking-[0.28em] text-Mneutral-400">
          {title}
        </p>
        <p className="mt-4 text__18 leading-relaxed text-Mneutral-700">{message}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="outline-pill-button flex-1 justify-center px-5 py-3 text__14 sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            className="filled-pill-button flex-1 justify-center px-5 py-3 text__14 sm:flex-none"
          >
            {confirmLabel}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

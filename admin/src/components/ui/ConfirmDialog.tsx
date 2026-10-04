import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}

/**
 * Centered destructive-action confirmation. Quiet, small, decisive.
 * Uses pure CSS animations/transitions (no JS animation loop) so the dialog
 * is always visible the instant it opens and fades out reliably on close.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
  busy = false,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(open)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Mount immediately on open; unmount 200ms after close so the fade-out plays.
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const t = window.setTimeout(() => setMounted(false), 200)
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
      className={`dialog-overlay-in fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-[#102d26]/25 backdrop-blur-[2px]" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={`dialog-panel-in relative w-full max-w-[400px] rounded-[14px] border border-[#e7eae9] bg-white p-6 shadow-lg transition-[opacity,transform] duration-200 ease-out ${
          open ? 'translate-y-0 scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] bg-[#fdeeee] text-[#d64545]">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="font-display text__20 font-medium text-[#102d26]">{title}</h3>
            <p className="mt-2 text__14 leading-relaxed text-[#6e7f7b]">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-admin-outline" disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#d64545] px-5 py-2 text__14 font-semibold text-white transition-colors duration-150 hover:bg-[#b93838] active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

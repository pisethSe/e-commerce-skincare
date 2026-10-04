import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  hint?: string
  action?: React.ReactNode
}

/** Quiet empty state — soft card, small type, one action. */
export default function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="admin-soft-card flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e7eae9] bg-white text-[#9ca8a5]">
          {icon}
        </div>
      )}
      <p className="mt-4 font-display text__18 font-medium text-[#102d26]">{title}</p>
      {hint && <p className="mt-1.5 max-w-[42ch] text__14 text-[#9ca8a5]">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

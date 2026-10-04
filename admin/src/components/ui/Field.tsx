import React from 'react'

interface FieldProps {
  label: string
  children: React.ReactNode
  hint?: string
  className?: string
}

/** Admin form field — tracked uppercase label, inset control, optional hint. */
export default function Field({ label, children, hint, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="label-admin">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text__12 text-[#9ca8a5]">{hint}</p>}
    </div>
  )
}

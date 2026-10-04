import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onChange: (page: number) => void
}

/** Real pagination — tabular page numbers, prev/next, honest counts. */
export default function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-1 pt-1 text__14 text-[#9ca8a5]">
        <span>{total} result{total === 1 ? '' : 's'}</span>
      </div>
    )
  }

  // Compact window: first, last, and up to 3 pages around current
  const pages: (number | '…')[] = []
  const push = (p: number | '…') => pages.push(p)
  const windowStart = Math.max(2, page - 1)
  const windowEnd = Math.min(totalPages - 1, page + 1)
  push(1)
  if (windowStart > 2) push('…')
  for (let p = windowStart; p <= windowEnd; p++) push(p)
  if (windowEnd < totalPages - 1) push('…')
  if (totalPages > 1) push(totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1 text__14 text-[#9ca8a5]">
      <span className="tabular-nums">
        Page {page} of {totalPages} · {total} results
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[#e7eae9] text-[#6e7f7b] transition-colors hover:border-[#102d26] hover:text-[#102d26] disabled:opacity-40 disabled:hover:border-[#e7eae9]"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-[#9ca8a5]">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-[7px] text__14 font-medium tabular-nums transition-colors ${
                p === page
                  ? 'bg-[#102d26] text-white'
                  : 'border border-[#e7eae9] text-[#6e7f7b] hover:border-[#102d26] hover:text-[#102d26]'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[#e7eae9] text-[#6e7f7b] transition-colors hover:border-[#102d26] hover:text-[#102d26] disabled:opacity-40 disabled:hover:border-[#e7eae9]"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

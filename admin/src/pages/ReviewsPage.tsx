import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiData, apiList, type Pagination as PaginationMeta } from '../lib/api'
import { formatDate } from '../lib/format'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'

interface Review {
  id: string
  rating: number
  title: string | null
  body: string
  verified: boolean
  approved: boolean
  createdAt: string
  user: { firstName: string | null; lastName: string | null; email: string }
  product: { id: string; name: string; slug: string; images: string[] }
}

const TABS = ['All', 'Pending approval', 'Approved'] as const

/** Reviews — approve, unapprove, and delete customer feedback. */
export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [tab, setActiveTab] = useState<(typeof TABS)[number]>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Review | null>(null)
  const [busyDelete, setBusyDelete] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (tab === 'Pending approval') params.set('approved', 'false')
      if (tab === 'Approved') params.set('approved', 'true')
      const { items, pagination: p } = await apiList<Review>({ url: `/reviews?${params.toString()}` })
      setReviews(items)
      setPagination(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [page, tab])

  useEffect(() => {
    load()
  }, [load])

  const setApproved = async (review: Review, approved: boolean) => {
    setTogglingId(review.id)
    try {
      const updated = await apiData<Review>({
        method: 'PATCH',
        url: `/reviews/${review.id}/approved`,
        data: { approved },
      })
      setReviews((prev) =>
        tab === 'All'
          ? prev.map((r) => (r.id === review.id ? { ...r, approved: updated.approved } : r))
          : prev.filter((r) => r.id !== review.id)
      )
      toast.success(approved ? 'Review approved and published' : 'Review hidden from storefront')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await apiData({ method: 'DELETE', url: `/reviews/${deleting.id}` })
      toast.success('Review deleted')
      setDeleting(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusyDelete(false)
    }
  }

  const customerName = (r: Review) =>
    `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim() || r.user.email

  return (
    <div className="space-y-5">
      <div className="admin-card flex w-fit flex-wrap gap-1 p-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setActiveTab(t)
              setPage(1)
            }}
            className={`rounded-[8px] px-3.5 py-2 text__14 font-medium transition-all duration-200 active:scale-[0.97] ${
              tab === t
                ? 'bg-[#102d26] text-white '
                : 'text-[#6e7f7b] hover:bg-[#f1f3f3] hover:text-[#102d26]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {error ? (
          <div className="admin-card p-6 text__14 text-[#a83636]">{error}</div>
        ) : loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="admin-card h-[120px] animate-pulse" />
          ))
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<Star size={18} />}
            title="No reviews here"
            hint={
              tab === 'Pending approval'
                ? 'Nothing waiting for approval — new storefront reviews land here.'
                : 'No reviews match this filter yet.'
            }
          />
        ) : (
          reviews.map((review, i) => (
            <motion.div
              key={review.id}
              className="admin-card p-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
                    {review.product.images?.[0] ? (
                      <img src={review.product.images[0]} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <Star size={14} className="text-[#9ca8a5]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[#102d26]">{review.product.name}</p>
                      {review.verified && (
                        <span className="badge bg-[#eaf1e3] text-[#4a6132]">Verified purchase</span>
                      )}
                      <span
                        className={`badge ${
                          review.approved ? 'bg-[#ddf0e9] text-[#102d26]' : 'bg-[#f7f1de] text-[#7a6420]'
                        }`}
                      >
                        {review.approved ? 'Published' : 'Awaiting approval'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, s) => (
                        <Star
                          key={s}
                          size={13}
                          className={s < review.rating ? 'fill-[#c9a96e] text-[#c9a96e]' : 'text-[#d9dedc]'}
                        />
                      ))}
                      <span className="ml-2 text__12 text-[#9ca8a5] tabular-nums">{review.rating}.0</span>
                    </div>
                    <p className="mt-2 max-w-[72ch] text__14 leading-relaxed text-[#3f5650]">
                      {review.title && <span className="font-medium text-[#102d26]">{review.title} — </span>}
                      {review.body}
                    </p>
                    <p className="mt-2 text__12 text-[#9ca8a5]">
                      {customerName(review)} · {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-shrink-0 gap-1.5">
                  {review.approved ? (
                    <button
                      type="button"
                      onClick={() => setApproved(review, false)}
                      disabled={togglingId === review.id}
                      aria-label="Unpublish review"
                      title="Unpublish"
                      className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#9ca8a5] transition-colors hover:bg-[#f7f1de] hover:text-[#7a6420] active:scale-[0.97] disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setApproved(review, true)}
                      disabled={togglingId === review.id}
                      aria-label="Approve review"
                      title="Approve"
                      className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#5a7a3a] transition-colors hover:bg-[#eaf1e3] hover:text-[#4a6132] active:scale-[0.97] disabled:opacity-50"
                    >
                      <Check size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleting(review)}
                    aria-label="Delete review"
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#9ca8a5] transition-colors hover:bg-[#fdeeee] hover:text-[#a83636] active:scale-[0.97]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="admin-card px-5 py-4">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onChange={setPage}
          />
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete review"
        message={`The review of "${deleting?.product.name}" will be permanently removed. This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busyDelete}
      />
    </div>
  )
}

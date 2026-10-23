import React, { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useAuthStore, useUIStore } from '../../lib/store'
import { translate, useLang, useT } from '../../lib/i18n'

interface Review {
  id: string
  rating: number
  title: string | null
  body: string
  verified: boolean
  approved: boolean
  createdAt: string
  user: { firstName: string | null; lastName: string | null; avatar: string | null }
}

interface ReviewSummary {
  average: number
  total: number
  distribution: Record<string, number>
}

interface MyReviewState {
  signedIn: boolean
  review: Review | null
  canReview: boolean
  purchased: boolean
}

type Sort = 'newest' | 'highest' | 'lowest'

const PAGE_SIZE = 6
const EMPTY_SUMMARY: ReviewSummary = {
  average: 0,
  total: 0,
  distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
}

function Stars({
  value,
  size = 16,
  className = '',
  label,
}: {
  value: number
  size?: number
  className?: string
  label?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={label ?? `${value} / 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          strokeWidth={1.5}
          className={star <= Math.round(value) ? 'fill-current text-Mneutral-900' : 'text-Mneutral-300'}
        />
      ))}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'C'
  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#eef2ee] text__14 font-semibold text-[#4a6132]">
      {initial}
    </span>
  )
}

function displayName(review: Review): string {
  const first = review.user?.firstName?.trim() ?? ''
  const last = review.user?.lastName?.trim() ?? ''
  if (!first && !last) return 'Calesta customer'
  return [first, last ? `${last.charAt(0)}.` : ''].filter(Boolean).join(' ')
}

/** Storefront reviews: rating summary, approved review list, and a moderated write form. */
export default function ProductReviews({
  productId,
  fallbackRating = 0,
  fallbackCount = 0,
}: {
  productId: string
  fallbackRating?: number
  fallbackCount?: number
}) {
  const t = useT()
  const lang = useLang()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY)
  const [sort, setSort] = useState<Sort>('newest')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [listError, setListError] = useState('')

  const [mine, setMine] = useState<MyReviewState | null>(null)
  const [mineLoading, setMineLoading] = useState(false)

  const [stars, setStars] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [lang]
  )

  useEffect(() => {
    let alive = true
    setLoading(true)
    setListError('')
    apiFetch(`/api/reviews/product/${productId}?page=1&limit=${PAGE_SIZE}&sort=${sort}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(json?.message ?? 'reviews-error')
        return json
      })
      .then((json) => {
        if (!alive) return
        setReviews(json.data ?? [])
        setSummary(json.summary ?? EMPTY_SUMMARY)
        setPage(1)
      })
      .catch(() => {
        if (alive) setListError(translate(lang, 'reviews.error'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [productId, sort, lang])

  // "My review" is only meaningful once signed in.
  useEffect(() => {
    if (!user || !accessToken) {
      setMine(null)
      return
    }
    let alive = true
    setMineLoading(true)
    apiFetch(`/api/reviews/product/${productId}/mine`, { token: accessToken })
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(json?.message ?? '')
        return json.data as MyReviewState
      })
      .then((data) => {
        if (alive) setMine(data)
      })
      .catch(() => {
        if (alive) setMine(null)
      })
      .finally(() => {
        if (alive) setMineLoading(false)
      })
    return () => {
      alive = false
    }
  }, [productId, user, accessToken])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await apiFetch(
        `/api/reviews/product/${productId}?page=${nextPage}&limit=${PAGE_SIZE}&sort=${sort}`
      )
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message ?? t('reviews.error'))
      setReviews((current) => [...current, ...(json.data ?? [])])
      setPage(nextPage)
    } catch {
      setListError(t('reviews.error'))
    } finally {
      setLoadingMore(false)
    }
  }

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!accessToken) return
    setFormError('')

    if (stars < 1) {
      setFormError(t('reviews.ratingRequired'))
      return
    }
    if (body.trim().length < 10) {
      setFormError(t('reviews.bodyTooShort'))
      return
    }

    setSubmitting(true)
    try {
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        token: accessToken,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating: stars,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message ?? t('reviews.submitError'))
      setMine((current) => ({
        signedIn: true,
        purchased: current?.purchased ?? false,
        canReview: false,
        review: json.data as Review,
      }))
      setTitle('')
      setBody('')
      setStars(0)
    } catch (err) {
      setFormError(err instanceof Error && err.message ? err.message : t('reviews.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  const total = summary.total || fallbackCount
  const average = summary.total > 0 ? summary.average : fallbackRating
  const hasMore = reviews.length < total

  return (
    <section id="reviews" className="section-template scroll-mt-28 pt-0">
      <div className="container-custom">
        <div className="rounded-[32px] bg-white px-5 py-10 xs:px-8 md:px-12 xl:px-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-3 text__18 font-medium uppercase text-Mneutral-400">{t('reviews.title')}</p>
              <h2 className="text__48">{t('reviews.title')}</h2>
            </div>
            {total > 0 && (
              <label className="inline-flex items-center gap-2 text__14 text-Mneutral-500">
                <span className="sr-only">{t('reviews.sortNewest')}</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as Sort)}
                  className="h-[42px] rounded-full border border-Mneutral-200 bg-white px-4 pr-9 text__14 text-Mneutral-900 outline-none focus:border-Mneutral-900"
                  style={{
                    appearance: 'none',
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23102d26' stroke-opacity='0.4' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 14px center',
                  }}
                >
                  <option value="newest">{t('reviews.sortNewest')}</option>
                  <option value="highest">{t('reviews.sortHighest')}</option>
                  <option value="lowest">{t('reviews.sortLowest')}</option>
                </select>
              </label>
            )}
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-14">
            {/* Summary + write form */}
            <aside className="space-y-8">
              <div>
                <div className="flex items-end gap-3">
                  <span className="text-[56px] font-medium leading-none text-Mneutral-900">
                    {average > 0 ? average.toFixed(1) : '—'}
                  </span>
                  <div className="pb-1">
                    <Stars
                      value={average}
                      size={16}
                      label={t('reviews.starsLabel', { count: average.toFixed(1) })}
                    />
                    <p className="mt-1 text__12 text-Mneutral-500">
                      {total > 0
                        ? t(total === 1 ? 'reviews.basedOn' : 'reviews.basedOnPlural', { count: total })
                        : t('reviews.none')}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution[String(star)] ?? 0
                    const width = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-3 text__12 text-Mneutral-500">
                        <span className="w-3 tabular-nums">{star}</span>
                        <Star size={11} className="fill-current text-Mneutral-400" />
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-Mneutral-100">
                          <div
                            className="h-full rounded-full bg-Mneutral-900 transition-[width] duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-Mneutral-200 p-5">
                <p className="text__18 font-medium text-Mneutral-900">{t('reviews.write')}</p>

                {!user ? (
                  <div className="mt-3">
                    <p className="text__14 text-Mneutral-500">{t('reviews.signInPrompt')}</p>
                    <button
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="pill-button mt-4"
                    >
                      {t('reviews.signIn')}
                    </button>
                  </div>
                ) : mineLoading ? (
                  <div className="mt-4 h-20 animate-pulse rounded-[16px] bg-Mneutral-100" />
                ) : mine?.review ? (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text__12 font-medium uppercase tracking-wide text-Mneutral-500">
                        {t('reviews.yourReview')}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          mine.review.approved
                            ? 'bg-[#eaf1e3] text-[#4a6132]'
                            : 'bg-[#f7f1de] text-[#7a6420]'
                        }`}
                      >
                        {mine.review.approved ? t('reviews.published') : t('reviews.pendingShort')}
                      </span>
                    </div>
                    <Stars value={mine.review.rating} size={13} className="mt-3" />
                    {mine.review.title && (
                      <p className="mt-2 text__14 font-medium text-Mneutral-900">{mine.review.title}</p>
                    )}
                    <p className="mt-1 whitespace-pre-line text__14 text-Mneutral-600">{mine.review.body}</p>
                    {!mine.review.approved && (
                      <p className="mt-3 rounded-[12px] bg-Mneutral-50 px-3 py-2 text__12 text-Mneutral-500">
                        {t('reviews.pending')}
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={submitReview} className="mt-4 space-y-4">
                    <div>
                      <span className="text__12 font-medium uppercase tracking-wide text-Mneutral-500">
                        {t('reviews.rating')}
                      </span>
                      <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHoveredStar(0)}>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const lit = star <= (hoveredStar || stars)
                          return (
                            <button
                              key={star}
                              type="button"
                              onMouseEnter={() => setHoveredStar(star)}
                              onFocus={() => setHoveredStar(star)}
                              onBlur={() => setHoveredStar(0)}
                              onClick={() => setStars(star)}
                              aria-label={t('reviews.starsLabel', { count: star })}
                              className="rounded p-0.5 transition-transform hover:scale-110"
                            >
                              <Star
                                size={24}
                                strokeWidth={1.5}
                                className={lit ? 'fill-current text-Mneutral-900' : 'text-Mneutral-300'}
                              />
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <label className="block">
                      <span className="text__12 font-medium uppercase tracking-wide text-Mneutral-500">
                        {t('reviews.titleLabel')}
                      </span>
                      <input
                        type="text"
                        value={title}
                        maxLength={120}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={t('reviews.titlePlaceholder')}
                        className="mt-2 h-[44px] w-full rounded-[12px] border border-Mneutral-200 px-3 text__14 outline-none focus:border-Mneutral-900"
                      />
                    </label>

                    <label className="block">
                      <span className="text__12 font-medium uppercase tracking-wide text-Mneutral-500">
                        {t('reviews.bodyLabel')}
                      </span>
                      <textarea
                        value={body}
                        maxLength={2000}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder={t('reviews.bodyPlaceholder')}
                        rows={4}
                        required
                        className="mt-2 w-full resize-none rounded-[12px] border border-Mneutral-200 px-3 py-3 text__14 outline-none focus:border-Mneutral-900"
                      />
                    </label>

                    {formError && <p className="text__12 text-[#a83636]">{formError}</p>}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="filled-pill-button w-full disabled:opacity-60"
                    >
                      {submitting ? t('reviews.submitting') : t('reviews.submit')}
                    </button>
                    <p className="text-[11px] leading-relaxed text-Mneutral-400">
                      {t('reviews.moderationNote')}
                    </p>
                  </form>
                )}
              </div>
            </aside>

            {/* Review list */}
            <div>
              {loading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-28 animate-pulse rounded-[20px] bg-Mneutral-50" />
                  ))}
                </div>
              ) : listError ? (
                <p className="rounded-[16px] bg-Mneutral-50 px-5 py-6 text__14 text-[#a83636]">{listError}</p>
              ) : reviews.length === 0 ? (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-Mneutral-200 px-6 py-10 text-center">
                  <p className="max-w-sm text__16 text-Mneutral-500">{t('reviews.none')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <article key={review.id} className="border-b border-Mneutral-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <Avatar name={displayName(review)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text__14 font-medium text-Mneutral-900">{displayName(review)}</span>
                            {review.verified && (
                              <span className="rounded-full bg-[#eaf1e3] px-2 py-0.5 text-[11px] font-medium text-[#4a6132]">
                                {t('reviews.verified')}
                              </span>
                            )}
                            <span className="ml-auto text__12 text-Mneutral-400">
                              {dateFormatter.format(new Date(review.createdAt))}
                            </span>
                          </div>
                          <Stars
                            value={review.rating}
                            size={13}
                            className="mt-1.5"
                            label={t('reviews.starsLabel', { count: review.rating })}
                          />
                          {review.title && (
                            <p className="mt-2 text__16 font-medium text-Mneutral-900">{review.title}</p>
                          )}
                          <p className="mt-1 whitespace-pre-line text__14 leading-relaxed text-Mneutral-600">
                            {review.body}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}

                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                      className="pill-button disabled:opacity-60"
                    >
                      {loadingMore ? t('reviews.loading') : t('reviews.loadMore')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

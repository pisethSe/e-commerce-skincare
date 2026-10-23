import React from 'react'
import { useT, type TKey } from '../../lib/i18n'

/**
 * Shared order progress UI. Used by the account page and the public tracking
 * page so a status always reads the same everywhere a shopper sees it.
 */

const STATUS_STYLES: Record<string, { chip: string; key: TKey }> = {
  PENDING: { chip: 'bg-Mneutral-100 text-Mneutral-600', key: 'account.pending' },
  PROCESSING: { chip: 'bg-[#f7f1de] text-[#7a6420]', key: 'account.processing' },
  SHIPPED: { chip: 'bg-[#ddf0e9] text-[#1f5c46]', key: 'account.shipped' },
  DELIVERED: { chip: 'bg-[#eaf1e3] text-[#4a6132]', key: 'account.delivered' },
  CANCELLED: { chip: 'bg-[#fdeeee] text-[#a83636]', key: 'account.cancelledStatus' },
  REFUNDED: { chip: 'bg-[#fbe9e0] text-[#9c5530]', key: 'account.refundedStatus' },
}

export function OrderStatusChip({ status }: { status: string }) {
  const t = useT()
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING
  return <span className={`badge ${style.chip}`}>{t(style.key)}</span>
}

const TIMELINE_STEPS = [
  { key: 'PENDING', labelKey: 'account.placed' },
  { key: 'PROCESSING', labelKey: 'account.processing' },
  { key: 'SHIPPED', labelKey: 'account.shipped' },
  { key: 'DELIVERED', labelKey: 'account.delivered' },
] as const

export function OrderTimeline({
  status,
  trackingNumber,
}: {
  status: string
  trackingNumber?: string | null
}) {
  const t = useT()

  if (status === 'CANCELLED') {
    return (
      <div className="mt-4 rounded-[20px] bg-[#fdeeee] px-4 py-3 text__14 text-[#a83636]">
        {t('account.cancelled')}
        {trackingNumber ? ` ${t('account.trackingReference', { number: trackingNumber })}.` : ''}
      </div>
    )
  }
  if (status === 'REFUNDED') {
    return (
      <div className="mt-4 rounded-[20px] bg-[#fbe9e0] px-4 py-3 text__14 text-[#9c5530]">
        {t('account.refunded')}
        {trackingNumber ? ` ${t('account.trackingReference', { number: trackingNumber })}.` : ''}
      </div>
    )
  }

  const currentIndex = TIMELINE_STEPS.findIndex((step) => step.key === status)
  return (
    <div className="mt-4">
      <div className="flex items-center">
        {TIMELINE_STEPS.map((step, i) => {
          const done = i <= currentIndex
          const last = i === TIMELINE_STEPS.length - 1
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-medium transition-colors ${
                    done ? 'border-sage-600 bg-sage-600 text-white' : 'border-Mneutral-300 bg-white text-Mneutral-400'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span className={`mt-1 text__12 ${done ? 'font-medium text-Mneutral-700' : 'text-Mneutral-400'}`}>
                  {t(step.labelKey)}
                </span>
              </div>
              {!last && (
                <div className={`mx-2 h-[2px] flex-1 rounded-full ${i < currentIndex ? 'bg-sage-600' : 'bg-Mneutral-200'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
      {(status === 'SHIPPED' || status === 'DELIVERED') && trackingNumber && (
        <p className="mt-3 text__14 text-Mneutral-600">
          {t('account.trackingNumber')}{' '}
          <span className="font-medium tabular-nums text-Mneutral-900">{trackingNumber}</span>
        </p>
      )}
    </div>
  )
}

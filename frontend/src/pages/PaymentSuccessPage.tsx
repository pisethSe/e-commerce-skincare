import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useAuthStore } from '../lib/store'
import { apiFetch } from '../lib/api'
import { useT } from '../lib/i18n'

/**
 * Stripe Checkout return — verifies the session server-side and settles the
 * order. Unpaid orders stay visible on the account page either way.
 */
export default function PaymentSuccessPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'working' | 'paid' | 'unpaid' | 'error'>('working')
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const t = useT()

  useEffect(() => {
    document.title = 'Calesta — Payment'
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setStatus('error')
      setMessage('Please sign in to view your payment.')
      return
    }
    const orderId = searchParams.get('orderId')
    const sessionId = searchParams.get('session_id')
    if (!orderId) {
      setStatus('error')
      setMessage('Missing order reference.')
      return
    }
    let alive = true
    ;(async () => {
      try {
        const res = await apiFetch(
          `/api/payments/stripe/verify?orderId=${encodeURIComponent(orderId)}${sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ''}`,
          { token: accessToken, headers: { } },
        )
        const json = await res.json()
        if (!alive) return
        if (json.success && json.data?.paymentStatus === 'PAID') {
          setOrderNumber(json.data.orderNumber ?? null)
          setStatus('paid')
        } else {
          setStatus('unpaid')
          setMessage(json.message ?? t('pay.pendingBody'))
        }
      } catch {
        if (alive) {
          setStatus('unpaid')
          setMessage('We could not verify the payment right now — check your account page shortly.')
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [accessToken, searchParams])

  return (
    <div className="bg-Mneutral-50 pt-[140px]">
      <div className="container-custom rounded-[32px] bg-white px-[20px] py-[80px] text-center xs:px-[40px]">
        {status === 'paid' ? (
          <>
            <CheckCircle2 size={56} strokeWidth={1.2} className="mx-auto mb-6 text-sage-600" />
            <p className="text__14 uppercase tracking-[0.28em] text-Mneutral-400">{t('pay.received')}</p>
            <h1 className="mt-3 text__40 font-medium text-Mneutral-900">{t('pay.thanks')}</h1>
            {orderNumber && (
              <p className="mt-4 text__18 text-Mneutral-600">
                {t('pay.thanksBody', { number: orderNumber })}
              </p>
            )}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/account" className="filled-pill-button">{t('pay.viewOrders')}</Link>
              {orderNumber && (
                <Link
                  to={`/track?order=${encodeURIComponent(orderNumber)}`}
                  className="outline-pill-button"
                >
                  {t('track.submit')}
                </Link>
              )}
              <Link to="/shop" className="outline-pill-button">{t('common.continueShopping')}</Link>
            </div>
          </>
        ) : status === 'error' ? (
          <>
            <XCircle size={56} strokeWidth={1.2} className="mx-auto mb-6 text-[#a83636]" />
            <h1 className="mb-3 text__40 font-medium text-Mneutral-900">{t('pay.signInContinue')}</h1>
            <p className="mb-8 text__18 text-Mneutral-600">{message}</p>
            <Link to="/" className="filled-pill-button">{t('common.backHome')}</Link>
          </>
        ) : (
          <>
            <XCircle size={56} strokeWidth={1.2} className="mx-auto mb-6 text-amber-600" />
            <h1 className="mb-3 text__40 font-medium text-Mneutral-900">
              {status === 'working' ? t('pay.verifying') : t('pay.pending')}
            </h1>
            <p className="mb-8 text__18 text-Mneutral-600">{message}</p>
            <Link to="/account" className="filled-pill-button">{t('pay.viewOrders')}</Link>
          </>
        )}
      </div>
    </div>
  )
}

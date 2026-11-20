import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useT, type TKey } from '../lib/i18n'

export type LegalKind = 'privacy' | 'terms' | 'shipping'

const CONTENT: Record<LegalKind, {
  title: TKey
  intro: TKey
  body: TKey[]
}> = {
  privacy: {
    title: 'legal.privacy',
    intro: 'legal.privacyIntro',
    body: ['legal.privacyData', 'legal.privacyUse', 'legal.privacyRights', 'legal.privacyContact'],
  },
  terms: {
    title: 'legal.terms',
    intro: 'legal.termsIntro',
    body: ['legal.termsOrders', 'legal.termsPricing', 'legal.termsLiability', 'legal.termsContact'],
  },
  shipping: {
    title: 'legal.shipping',
    intro: 'legal.shippingIntro',
    body: ['legal.shippingDelivery', 'legal.shippingReturns', 'legal.shippingContact'],
  },
}

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const t = useT()
  const content = CONTENT[kind]

  useEffect(() => {
    document.title = `Calesta — ${t(content.title)}`
  }, [content.title, t])

  return (
    <div className="bg-Mneutral-50 pt-[120px] text-Mneutral-900">
      <section className="section-template">
        <div className="container-custom max-w-3xl">
          <p className="text__14 uppercase tracking-[0.2em] text-Mneutral-400">{t('legal.lastUpdated')}</p>
          <h1 className="mt-4 text__48">{t(content.title)}</h1>
          <p className="mt-6 text__18 leading-relaxed text-Mneutral-600">{t(content.intro)}</p>

          <div className="mt-10 grid gap-8">
            {content.body.map((key) => (
              <p key={key} className="text__16 leading-relaxed text-Mneutral-600">
                {t(key)}
              </p>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-3 border-t border-Mneutral-200 pt-6">
            <Link to="/privacy" className="pill-button">{t('footer.privacy')}</Link>
            <Link to="/terms" className="pill-button">{t('footer.terms')}</Link>
            <Link to="/shipping-returns" className="pill-button">{t('footer.shipping')}</Link>
            <Link to="/" className="pill-button bg-Mneutral-900 text-white">{t('common.backHome')}</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

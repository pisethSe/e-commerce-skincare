import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { useT } from '../../lib/i18n'

export default function NewsletterSection() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setTimeout(() => setStatus('done'), 1200)
  }

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #fdf9f3 0%, #f5e1c8 50%, #eecba3 100%)',
        }}
      />
      {/* Decorative */}
      <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-[#c9a96e]/10 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-sage-200/40 blur-3xl" />

      <div className="container-custom relative z-10 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p className="font-accent italic text-[#c9a96e] text-xl mb-3">{t('newsletter.kicker')}</p>
          <h2 className="heading-xl mb-4">
            {t('newsletter.title1')}<br />
            <span className="font-accent italic">{t('newsletter.title2')}</span>
          </h2>
          <p className="text-charcoal-500 max-w-md mx-auto mb-10">{t('newsletter.body')}</p>

          {status === 'done' ? (
            <motion.div
              className="flex items-center justify-center gap-3 text-sage-600"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle size={22} />
              <span className="font-medium text-lg">{t('newsletter.welcome')}</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 border border-charcoal-300 bg-white/80 backdrop-blur-sm text-charcoal-900 placeholder:text-charcoal-400 px-5 py-4 text-sm outline-none focus:border-[#c9a96e] transition-colors"
                required
              />
              <motion.button
                type="submit"
                className="btn-primary whitespace-nowrap"
                disabled={status === 'loading'}
                whileTap={{ scale: 0.97 }}
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Joining...
                  </span>
                ) : (
                  <>{t('home.subscribe')} <ArrowRight size={14} /></>
                )}
              </motion.button>
            </form>
          )}

          <p className="text-xs text-charcoal-400 mt-4">
            No spam, ever. Unsubscribe anytime. Read our{' '}
            <a href="/privacy" className="underline hover:text-[#c9a96e] transition-colors">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

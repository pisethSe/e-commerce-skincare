import React from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Leaf, FlaskConical, Heart } from 'lucide-react'
import { useT } from '../../lib/i18n'

const VALUES = [
  { icon: Leaf, titleKey: 'brand.cleanConscious', descKey: 'brand.cleanConsciousDesc' },
  { icon: FlaskConical, titleKey: 'brand.scienceBacked', descKey: 'brand.scienceBackedDesc' },
  { icon: Heart, titleKey: 'brand.ethicallyMade', descKey: 'brand.ethicallyMadeDesc' },
] as const

export default function BrandSection() {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [60, -60])

  return (
    <section ref={ref} className="section-padding bg-cream-50 overflow-hidden">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Image collage */}
          <div className="relative h-[560px] order-2 lg:order-1">
            <motion.div
              className="absolute left-0 top-0 w-3/5 h-4/5 overflow-hidden shadow-xl"
              style={{ y }}
            >
              <img
                src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&q=80"
                alt="Skincare ritual"
                className="w-full h-full object-cover"
              />
            </motion.div>
            <motion.div
              className="absolute right-0 bottom-0 w-2/5 h-3/5 overflow-hidden shadow-xl"
              style={{ y: useTransform(scrollYProgress, [0, 1], [-40, 40]) }}
            >
              <img
                src="https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=500&q=80"
                alt="Ingredients"
                className="w-full h-full object-cover"
              />
            </motion.div>
            {/* Gold accent box */}
            <div className="absolute right-4 top-16 w-28 h-28 border-2 border-[#c9a96e] opacity-40" />
            {/* Stats badge */}
            <motion.div
              className="absolute left-4 bottom-8 bg-charcoal-900 text-cream-50 px-6 py-4 shadow-xl"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <p className="font-display text-3xl font-semibold text-[#c9a96e]">97%</p>
              <p className="text-xs text-cream-400 mt-1 tracking-wide">{t('brand.stat')}</p>
            </motion.div>
          </div>

          {/* Text content */}
          <div className="order-1 lg:order-2">
            <div data-aos="fade-up">
              <p className="font-accent italic text-[#c9a96e] text-lg mb-3">{t('brand.kicker')}</p>
              <h2 className="heading-xl mb-6">
                {t('brand.title1')}<br />
                <span className="font-accent italic">{t('brand.title2')}</span>
              </h2>
              <div className="gold-divider ml-0 mb-6" />
              <p className="text-charcoal-600 leading-relaxed mb-4">{t('brand.body1')}</p>
              <p className="text-charcoal-600 leading-relaxed mb-10">{t('brand.body2')}</p>
            </div>

            {/* Values */}
            <div className="space-y-6 mb-10">
              {VALUES.map((val, i) => (
                <motion.div
                  key={val.titleKey}
                  className="flex gap-4"
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                >
                  <div className="w-10 h-10 bg-cream-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <val.icon size={18} className="text-[#c9a96e]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-medium text-charcoal-900 mb-1">{t(val.titleKey)}</h4>
                    <p className="text-sm text-charcoal-500 leading-relaxed">{t(val.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link to="/about" className="btn-primary" data-aos="fade-up">
              {t('brand.ourStory')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

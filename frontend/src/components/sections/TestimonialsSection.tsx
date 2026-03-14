import React, { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { TESTIMONIALS } from '../../lib/data'

export default function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const x1 = useTransform(scrollYProgress, [0, 1], [0, -80])
  const x2 = useTransform(scrollYProgress, [0, 1], [0, 80])

  return (
    <section ref={ref} className="section-padding bg-charcoal-900 overflow-hidden relative">
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <p className="font-display text-[15vw] font-bold text-charcoal-800 whitespace-nowrap">
          LUMINOUS
        </p>
      </div>

      <div className="container-custom relative z-10">
        <div className="text-center mb-14" data-aos="fade-up">
          <p className="font-accent italic text-[#c9a96e] text-lg mb-2">Real Results</p>
          <h2 className="heading-xl text-cream-50">
            Skin transformations<br />
            <span className="font-accent italic">you can see</span>
          </h2>
          <div className="gold-divider" />
        </div>

        {/* Row 1 — slides left */}
        <motion.div style={{ x: x1 }} className="flex gap-6 mb-6">
          {TESTIMONIALS.slice(0, 2).map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
          {/* Duplicate for seamlessness */}
          {TESTIMONIALS.slice(0, 2).map((t) => (
            <TestimonialCard key={`${t.id}-dup`} testimonial={t} />
          ))}
        </motion.div>

        {/* Row 2 — slides right */}
        <motion.div style={{ x: x2 }} className="flex gap-6">
          {TESTIMONIALS.slice(2).map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
          {TESTIMONIALS.slice(2).map((t) => (
            <TestimonialCard key={`${t.id}-dup`} testimonial={t} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function TestimonialCard({ testimonial }: { testimonial: typeof TESTIMONIALS[0] }) {
  return (
    <div className="flex-shrink-0 w-80 bg-charcoal-800/80 backdrop-blur-sm p-6 border border-charcoal-700">
      <Quote size={24} className="text-[#c9a96e] mb-4" strokeWidth={1} />

      {/* Stars */}
      <div className="flex gap-0.5 mb-4">
        {[1,2,3,4,5].map((s) => (
          <Star key={s} size={12} className="fill-[#c9a96e] text-[#c9a96e]" />
        ))}
      </div>

      <p className="text-cream-300 text-sm leading-relaxed mb-5 font-accent italic text-base">
        "{testimonial.text}"
      </p>

      <div className="flex items-center gap-3">
        <img
          src={testimonial.avatar}
          alt={testimonial.name}
          className="w-10 h-10 rounded-full object-cover border border-charcoal-600"
        />
        <div>
          <p className="text-cream-100 text-sm font-medium">{testimonial.name}</p>
          <p className="text-charcoal-500 text-xs">{testimonial.handle}</p>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] text-[#c9a96e] tracking-wider uppercase border border-[#c9a96e]/30 px-2 py-0.5">
            Verified
          </span>
        </div>
      </div>

      <p className="text-xs text-charcoal-500 mt-3 pt-3 border-t border-charcoal-700">
        Re: {testimonial.product}
      </p>
    </div>
  )
}

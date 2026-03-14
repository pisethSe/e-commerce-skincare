import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { MARQUEE_ITEMS } from '../../lib/data'

export default function MarqueeSection() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <div className="bg-charcoal-900 py-4 overflow-hidden">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-4 mx-6 text-cream-300 text-xs font-medium tracking-[0.18em] uppercase flex-shrink-0"
          >
            <Sparkles size={10} className="text-[#c9a96e] flex-shrink-0" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

import React from 'react'
import { motion } from 'framer-motion'
import { Instagram } from 'lucide-react'

const IG_IMAGES = [
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',
  'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80',
  'https://images.unsplash.com/photo-1574156863536-37fbc5e1cfef?w=400&q=80',
  'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80',
  'https://images.unsplash.com/photo-1567721913486-6585f069b3f4?w=400&q=80',
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&q=80',
]

export default function InstagramSection() {
  return (
    <section className="py-16 bg-cream-50">
      <div className="text-center mb-8" data-aos="fade-up">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Instagram size={18} className="text-[#c9a96e]" />
          <p className="font-accent italic text-[#c9a96e] text-lg">@lumiereskin</p>
        </div>
        <h2 className="heading-md">Share your glow</h2>
        <p className="text-charcoal-500 text-sm mt-2">Tag us to be featured</p>
      </div>

      {/* Scrollable row */}
      <div className="flex gap-2 overflow-hidden">
        {IG_IMAGES.map((src, i) => (
          <motion.a
            key={i}
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-48 h-48 md:w-56 md:h-56 overflow-hidden group relative"
            data-aos="fade-up"
            data-aos-delay={i * 50}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={src}
              alt={`Instagram post ${i + 1}`}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Instagram size={24} className="text-white" />
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  )
}

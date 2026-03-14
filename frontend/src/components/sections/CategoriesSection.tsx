import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { CATEGORIES } from '../../lib/data'

export default function CategoriesSection() {
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="text-center mb-14" data-aos="fade-up">
          <p className="font-accent italic text-[#c9a96e] text-lg mb-2">Shop by Concern</p>
          <h2 className="heading-xl">Find your<br /><span className="font-accent italic">perfect ritual</span></h2>
          <div className="gold-divider" />
        </div>

        {/* Grid — asymmetric layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              className={`group relative overflow-hidden cursor-pointer ${
                i === 0 ? 'col-span-2 row-span-2 md:col-span-2' :
                i === 1 ? 'col-span-2 md:col-span-1' : ''
              }`}
              data-aos="fade-up"
              data-aos-delay={i * 60}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <Link to={`/shop?category=${cat.slug}`}>
                <div className={`relative overflow-hidden bg-cream-100 ${
                  i === 0 ? 'aspect-[4/5]' : 'aspect-square'
                }`}>
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/70 via-charcoal-900/20 to-transparent" />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <h3 className="font-display text-xl text-white font-medium mb-0.5">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-cream-300 mb-3">{cat.productCount} products</p>
                    <motion.div
                      className="flex items-center gap-1 text-xs text-cream-200 font-medium tracking-wider uppercase opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                    >
                      Shop now <ArrowUpRight size={12} />
                    </motion.div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

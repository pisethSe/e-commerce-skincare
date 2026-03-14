import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductCard from '../ui/ProductCard'
import { PRODUCTS } from '../../lib/data'

export default function FeaturedProducts() {
  const featured = PRODUCTS.filter((p) => p.isFeatured).slice(0, 4)

  return (
    <section className="section-padding bg-cream-50">
      <div className="container-custom">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
          <div data-aos="fade-up">
            <p className="font-accent italic text-[#c9a96e] text-lg mb-2">Our Bestsellers</p>
            <h2 className="heading-xl">
              Loved by thousands,<br />
              <span className="font-accent italic">formulated for you</span>
            </h2>
          </div>
          <motion.div
            data-aos="fade-up"
            data-aos-delay="100"
          >
            <Link to="/shop" className="flex items-center gap-2 text-sm font-medium tracking-widest uppercase hover:text-[#c9a96e] transition-colors group">
              View All
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Product Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((product, i) => (
            <motion.div
              key={product.id}
              data-aos="fade-up"
              data-aos-delay={i * 80}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

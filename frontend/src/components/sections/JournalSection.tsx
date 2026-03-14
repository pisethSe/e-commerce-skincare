import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock } from 'lucide-react'
import { BLOG_POSTS } from '../../lib/data'
import { formatDate } from '../../lib/utils'

export default function JournalSection() {
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
          <div data-aos="fade-up">
            <p className="font-accent italic text-[#c9a96e] text-lg mb-2">The Lumière Journal</p>
            <h2 className="heading-xl">
              Skincare wisdom,<br />
              <span className="font-accent italic">curated for you</span>
            </h2>
          </div>
          <Link
            to="/journal"
            className="flex items-center gap-2 text-sm font-medium tracking-widest uppercase hover:text-[#c9a96e] transition-colors group mt-4 md:mt-0"
            data-aos="fade-up"
          >
            All Articles <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post, i) => (
            <motion.article
              key={post.id}
              className="group cursor-pointer"
              data-aos="fade-up"
              data-aos-delay={i * 100}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
            >
              <Link to={`/journal/${post.slug}`}>
                {/* Image */}
                <div className="overflow-hidden mb-5 aspect-[4/3]">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-[#c9a96e] bg-cream-100 px-2 py-1">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-charcoal-400">
                    <Clock size={10} />
                    {post.readTime} min read
                  </span>
                </div>

                <h3 className="font-display text-xl font-medium text-charcoal-900 group-hover:text-[#c9a96e] transition-colors leading-snug mb-3">
                  {post.title}
                </h3>
                <p className="text-sm text-charcoal-500 leading-relaxed mb-4">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between text-xs text-charcoal-400">
                  <span>{post.author}</span>
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

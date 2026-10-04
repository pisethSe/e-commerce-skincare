import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogStore } from '../lib/catalog'
import { formatDate } from '../lib/utils'
import ImageWithFallback from '../components/ui/ImageWithFallback'

export default function JournalPage() {
  const { posts } = useCatalogStore()

  useEffect(() => {
    document.title = 'Calesta — Journal'
  }, [])

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="section-template pt-[32px]">
        <div className="container-custom">
          <div className="overflow-hidden rounded-[32px] bg-white px-[20px] py-[28px] xs:px-[40px] xs:py-[40px] xl:px-[80px] xl:py-[64px]">
            <p className="mb-4 font-medium text__18 text-Mneutral-400">OUR JOURNAL</p>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <h1 className="text__56 font-medium">Stories, rituals, and ingredient notes from the Calesta studio.</h1>
              <p className="text__18 text-Mneutral-600">
                Editorial content shaped to the same calm, spacious visual rhythm as the rest of the experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-0 section-template">
        <div className="container-custom">
          {posts.length === 0 ? (
            <div className="rounded-[32px] bg-white px-[20px] py-[64px] text-center xs:px-[40px]">
              <p className="text__32 font-medium">No stories yet</p>
              <p className="mt-3 text__18 text-Mneutral-600">Journal posts will appear here once published.</p>
            </div>
          ) : (
          <Link to="/journal" className="grid gap-[12px] md:grid-cols-2">
            <div className="overflow-hidden rounded-[32px]">
              <ImageWithFallback
                src={posts[0].coverImage}
                alt={posts[0].title}
                className="h-full w-full object-cover"
                fallbackClassName="flex min-h-[340px] w-full items-center justify-center rounded-[32px] bg-[linear-gradient(180deg,#d7ede7,#c2ddd6)]"
                fallbackText={posts[0].title}
              />
            </div>

            <div className="rounded-[32px] bg-white px-[20px] py-[24px] xs:px-[40px] xs:py-[40px] xl:px-[64px] xl:py-[64px]">
              <p className="mb-4 font-medium text__18 text-Mneutral-400">FEATURED ARTICLE</p>
              <h2 className="text__48">{posts[0].title}</h2>
              <p className="my-[32px] text__20 text-Mneutral-600">{posts[0].excerpt}</p>
              <div className="flex flex-wrap items-center gap-4 text__16 text-Mneutral-500">
                <span>{posts[0].author}</span>
                <span>{formatDate(posts[0].publishedAt)}</span>
                <span>{posts[0].readTime} min read</span>
              </div>
            </div>
          </Link>
          )}

          <div className="mt-[32px] grid grid-cols-1 gap-[20px] md:grid-cols-2">
            {posts.slice(1).map((post) => (
              <article key={post.id} className="overflow-hidden rounded-[32px] bg-white">
                <div className="overflow-hidden">
                  <ImageWithFallback
                    src={post.coverImage}
                    alt={post.title}
                    className="h-[320px] w-full object-cover"
                    fallbackClassName="flex h-[320px] w-full items-center justify-center bg-[linear-gradient(180deg,#d7ede7,#c2ddd6)]"
                    fallbackText={post.title}
                  />
                </div>
                <div className="px-[20px] py-[24px] xs:px-[32px] xs:py-[32px]">
                  <p className="mb-3 font-medium text__14 text-Mneutral-400">{post.category}</p>
                  <h3 className="text__32 font-medium">{post.title}</h3>
                  <p className="my-[20px] text__18 text-Mneutral-600">{post.excerpt}</p>
                  <div className="flex items-center justify-between gap-4 text__14 text-Mneutral-500">
                    <span>{formatDate(post.publishedAt)}</span>
                    <span>{post.readTime} min read</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

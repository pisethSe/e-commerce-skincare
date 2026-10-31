import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ImageWithFallback from '../components/ui/ImageWithFallback'
import { getApiUrl } from '../lib/api'
import { useLang, useT } from '../lib/i18n'
import type { BlogPost } from '../types'

export default function JournalPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const t = useT()
  const lang = useLang()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    fetch(getApiUrl(`/api/blog/${encodeURIComponent(slug ?? '')}`))
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          if (!cancelled) setStatus(res.status === 404 ? 'missing' : 'error')
          return
        }
        if (!cancelled) {
          setPost(json.data as BlogPost)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (post) document.title = `Calesta — ${post.title}`
    else if (status === 'missing') document.title = 'Calesta — Story not found'
  }, [post, status])

  const paragraphs = (post?.body ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="section-template pt-[32px]">
        <div className="container-custom">
          <Link
            to="/journal"
            className="mb-5 inline-flex items-center gap-2 text__14 text-Mneutral-500 transition-colors hover:text-Mneutral-900"
          >
            <ArrowLeft size={15} />
            {t('journalPage.back')}
          </Link>

          {status === 'loading' && (
            <div className="rounded-[32px] bg-white px-[20px] py-[64px] text-center xs:px-[40px]">
              <p className="text__18 text-Mneutral-500">{t('journalPage.loading')}</p>
            </div>
          )}

          {status === 'missing' && (
            <div className="rounded-[32px] bg-white px-[20px] py-[64px] text-center xs:px-[40px]">
              <p className="text__32 font-medium">{t('journalPage.notFound')}</p>
              <Link to="/journal" className="mt-5 inline-flex text__16 underline">
                {t('journalPage.back')}
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-[32px] bg-white px-[20px] py-[64px] text-center xs:px-[40px]">
              <p className="text__32 font-medium">{t('journalPage.loadError')}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 text__16 underline"
              >
                {t('journalPage.retry')}
              </button>
            </div>
          )}

          {status === 'ready' && post && (
            <article className="mx-auto max-w-[860px] overflow-hidden rounded-[32px] bg-white">
              {post.coverImage && (
                <ImageWithFallback
                  src={post.coverImage}
                  alt={post.title}
                  className="h-[260px] w-full object-cover xs:h-[360px]"
                  fallbackClassName="flex h-[260px] w-full items-center justify-center bg-[linear-gradient(180deg,#d7ede7,#c2ddd6)] xs:h-[360px]"
                  fallbackText={post.title}
                />
              )}

              <div className="px-[20px] py-[32px] xs:px-[40px] xs:py-[48px] xl:px-[72px]">
                <p className="mb-3 font-medium text__14 uppercase tracking-[0.2em] text-Mneutral-400">
                  {post.category}
                </p>
                <h1 className="text__48 font-medium">{post.title}</h1>
                {post.excerpt && <p className="mt-4 text__20 text-Mneutral-600">{post.excerpt}</p>}

                <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-Mneutral-100 pb-6 text__14 text-Mneutral-500">
                  <span>{post.author}</span>
                  <span>
                    {new Date(post.publishedAt).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span>{t('journalPage.minRead', { count: post.readTime ?? 0 })}</span>
                </div>

                <div className="mt-8 grid gap-5 text__18 leading-relaxed text-Mneutral-700">
                  {paragraphs.length > 0 ? (
                    paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
                  ) : (
                    <p>{post.excerpt}</p>
                  )}
                </div>
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  )
}

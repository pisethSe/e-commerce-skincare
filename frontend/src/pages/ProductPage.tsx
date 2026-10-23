import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, Share2 } from 'lucide-react'
import { normalizeProduct, useCatalogStore } from '../lib/catalog'
import { getApiUrl } from '../lib/api'
import { useAuthStore } from '../lib/store'
import type { Product } from '../types'
import { useMoney } from '../lib/currency'
import { useCategoryName, useT } from '../lib/i18n'
import { useCartStore, useWishlistStore } from '../lib/store'
import ProductCard from '../components/ui/ProductCard'
import ImageWithFallback from '../components/ui/ImageWithFallback'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { products, categories } = useCatalogStore()
  const catalogProduct = products.find((item) => item.slug === slug)
  const [remoteProduct, setRemoteProduct] = useState<Product | null>(null)
  const product = catalogProduct ?? remoteProduct
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyState, setNotifyState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [notifyError, setNotifyError] = useState('')
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const { toggle, has } = useWishlistStore()
  const t = useT()
  const categoryName = useCategoryName()
  const { money } = useMoney()
  const outOfStock = Boolean(product && (!product.inStock || (product.stockCount ?? 1) <= 0))

  // Sold-out products are hidden from the listing, but direct links still work.
  useEffect(() => {
    if (catalogProduct || !slug) {
      setRemoteProduct(null)
      return
    }
    let alive = true
    fetch(getApiUrl(`/api/products/${slug}`))
      .then(async (res) => {
        if (!res.ok) return null
        const json = await res.json()
        return json?.data ? normalizeProduct(json.data, categories) : null
      })
      .then((next) => {
        if (alive) setRemoteProduct(next)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [slug, catalogProduct, categories])

  useEffect(() => {
    if (user?.email) setNotifyEmail((current) => current || user.email)
  }, [user])

  const handleNotify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!product) return
    setNotifyState('sending')
    setNotifyError('')
    try {
      const res = await fetch(getApiUrl(`/api/products/${product.id}/stock-notification`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.message ?? t('product.notifyError'))
      setNotifyState('done')
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : t('product.notifyError'))
      setNotifyState('idle')
    }
  }

  useEffect(() => {
    if (product) {
      document.title = `Calesta — ${product.name}`
    }
    setSelectedImage(0)
    setQuantity(1)
  }, [product, slug])

  if (!product) {
    return (
      <div className="bg-Mneutral-50 pt-[120px] text-center text-Mneutral-900">
        <p className="text__32 font-medium">{t('product.notFound')}</p>
        <Link to="/shop" className="pill-button mt-6">
          {t('product.backToShop')}
        </Link>
      </div>
    )
  }

  const related = products.filter((item) => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 4)
  const wished = has(product.id)

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="px-4 pt-[20px] !pb-0 lg:pt-0">
        <div className="relative minW1600:mx-auto minW1600:w-[1300px]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text__14 font-medium text-Mneutral-900 backdrop-blur-sm"
          >
            <ArrowLeft size={14} />
            {t('common.back')}
          </button>

          <h1 className="absolute bottom-[8%] left-1/2 z-10 w-full -translate-x-1/2 text-center text__64 text-white">
            {t('product.careLine', { category: categoryName(product.category.slug, product.category.name) })}
          </h1>

          <ImageWithFallback
            src={product.images[selectedImage]}
            alt={product.name}
            className="h-[680px] w-full rounded-[32px] object-cover md:h-[760px]"
            fallbackClassName="flex h-[680px] w-full items-center justify-center rounded-[32px] bg-[linear-gradient(180deg,#8cc8bb,#6aa89a)] md:h-[760px]"
            fallbackText={product.name}
            loading="eager"
          />
        </div>
      </section>

      <section className="section-template">
        <div className="container-custom text-center">
          <p className="mb-[24px] text__18 text-Mneutral-400">{categoryName(product.category.slug, product.category.name).toUpperCase()}</p>
          <h2 className="text__48">
            {product.description}
          </h2>
        </div>
      </section>

      <section className="pt-0 section-template">
        <div className="container-custom grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2">
            <div className="flex h-full w-full flex-wrap rounded-[32px] bg-white px-[20px] py-[20px] xs:px-[40px] xs:py-[40px] xl:px-[64px] xl:py-[64px]">
              <div className="w-full">
                <p className="mb-4 font-medium text__18 text-Mneutral-400">{categoryName(product.category.slug, product.category.name).toUpperCase()}</p>
                <h2 className="text__48">{t('product.ingredients')}</h2>
              </div>

              <p className="text__24 text-Mneutral-600">
                {product.longDescription || product.description}
              </p>

              <div className="grid grid-cols-1 gap-[24px] text-Mneutral-600">
                <div>
                  <h5 className="text__18 font-semibold">{t('product.texture')}</h5>
                  <p className="text__18 text-Mneutral-700">{t('product.textureValue')}</p>
                </div>
                <div>
                  <h5 className="text__18 font-semibold">{t('product.idealFor')}</h5>
                  <p className="text__18 text-Mneutral-700">{t('product.idealValue')}</p>
                </div>
                <div>
                  <h5 className="text__18 font-semibold">{t('product.keyBenefits')}</h5>
                  <p className="text__18 text-Mneutral-700">
                    {product.benefits?.join(', ') || t('product.benefitsFallback')}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex w-full flex-wrap items-center gap-3 self-end">
                <button
                  type="button"
                  onClick={() => addItem(product, quantity)}
                  disabled={outOfStock}
                  className="filled-pill-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {outOfStock ? t('product.soldOut') : `${t('common.addToBag')} · ${money(product.price)}`}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(product.id)}
                  className={`pill-button ${wished ? 'bg-Mneutral-900 text-white' : ''}`}
                >
                  <Heart size={16} />
                  {wished ? t('product.saved') : t('product.save')}
                </button>
                <button type="button" className="pill-button">
                  <Share2 size={16} />
                  {t('product.share')}
                </button>
              </div>

              {outOfStock && (
                <div className="mt-6 w-full rounded-[24px] border border-Mneutral-200 bg-white p-5">
                  <p className="text__16 font-medium text-Mneutral-900">{t('product.notifyTitle')}</p>
                  <p className="mt-1 text__14 text-Mneutral-500">{t('product.outOfStockHint')}</p>
                  {notifyState === 'done' ? (
                    <p className="mt-4 rounded-[14px] bg-[#eaf1e3] px-4 py-3 text__14 text-[#4a6132]">
                      {t('product.notifySuccess')}
                    </p>
                  ) : (
                    <form onSubmit={handleNotify} className="mt-4 flex flex-col gap-2 xs:flex-row">
                      <input
                        type="email"
                        required
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder={t('product.notifyPlaceholder')}
                        className="h-[46px] w-full rounded-full border border-Mneutral-200 bg-white px-4 text__14 text-Mneutral-900 outline-none focus:border-Mneutral-900"
                      />
                      <button
                        type="submit"
                        disabled={notifyState === 'sending'}
                        className="filled-pill-button whitespace-nowrap disabled:opacity-60"
                      >
                        {notifyState === 'sending' ? t('product.notifying') : t('product.notifyButton')}
                      </button>
                    </form>
                  )}
                  {notifyError && <p className="mt-2 text__12 text-[#a83636]">{notifyError}</p>}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[32px]">
              <ImageWithFallback
                src={product.images[1] || product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
                fallbackClassName="flex h-full min-h-[320px] w-full items-center justify-center bg-[linear-gradient(180deg,#8cc8bb,#6aa89a)]"
                fallbackText={product.name}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2">
            <div className="order-2 overflow-hidden rounded-[32px] md:order-1">
              <ImageWithFallback
                src={product.images[2] || product.images[0]}
                alt={`${product.name} detail`}
                className="h-full w-full object-cover"
                fallbackClassName="flex h-full min-h-[320px] w-full items-center justify-center bg-[linear-gradient(180deg,#cfd7a2,#b9c06d)]"
                fallbackText={product.name}
              />
            </div>

            <div className="order-1 flex h-full w-full flex-wrap rounded-[32px] bg-white px-[20px] py-[20px] xs:px-[40px] xs:py-[40px] xl:px-[64px] xl:py-[64px] md:order-2">
              <div className="w-full">
                <p className="mb-4 font-medium text__18 text-Mneutral-400">{categoryName(product.category.slug, product.category.name).toUpperCase()}</p>
                <h2 className="text__48">{t('product.howToUse')}</h2>
              </div>

              <div className="mt-4 grid self-end gap-[24px] text-Mneutral-600 md:mt-[116px]">
                <p className="text__24">
                  {product.howToUse || t('product.howToUseFallback')}
                </p>
                <p className="text__24">{t('product.careNote')}</p>

                <div className="mt-[24px] flex items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full border border-Mneutral-200 px-3 py-2">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text__18">
                      −
                    </button>
                    <span className="min-w-8 text-center text__16">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(quantity + 1)} className="text__18">
                      +
                    </button>
                  </div>
                  <span className="text__24 font-medium">{money(product.price)}</span>
                </div>
              </div>
            </div>
          </div>

          {product.images.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-3">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`overflow-hidden rounded-[20px] border p-1 transition-all duration-300 ${
                    selectedImage === index ? 'border-Mneutral-900 bg-white' : 'border-transparent'
                  }`}
                >
                  <ImageWithFallback
                    src={image}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    className="h-[88px] w-[88px] rounded-[16px] object-cover"
                    fallbackClassName="flex h-[88px] w-[88px] items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#d7ede7,#c2ddd6)]"
                    fallbackText={product.name}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-template">
          <div className="container-custom">
            <h2 className="mb-[2.5rem] text__48">{t('product.moreToExplore')}</h2>
            <div className="grid grid-cols-1 gap-[20px] xs:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, HeartOff } from 'lucide-react'
import { normalizeProduct, useCatalogStore } from '../lib/catalog'
import { getApiUrl } from '../lib/api'
import { useWishlistStore } from '../lib/store'
import { useT } from '../lib/i18n'
import ProductCard from '../components/ui/ProductCard'
import type { Product } from '../types'

/**
 * Wishlist — saved products live in localStorage, so the list survives reloads.
 * Seed data may be offline; sold-out saves are resolved through ?all=1 so they
 * stay visible here even though the shop hides them.
 */
export default function WishlistPage() {
  const t = useT()
  const { products, categories } = useCatalogStore()
  const ids = useWishlistStore((s) => s.ids)
  const toggle = useWishlistStore((s) => s.toggle)
  const [extra, setExtra] = useState<Product[]>([])

  const missingIds = useMemo(
    () => ids.filter((id) => !products.some((product) => product.id === id)),
    [ids, products]
  )
  const missingKey = missingIds.join(',')

  useEffect(() => {
    if (!missingKey) {
      setExtra([])
      return
    }
    let alive = true
    fetch(getApiUrl('/api/products?all=1&limit=200'))
      .then(async (res) => {
        if (!res.ok) return null
        const json = await res.json()
        return (json?.data ?? []).map((product: any) => normalizeProduct(product, categories))
      })
      .then((list) => {
        if (alive && list) setExtra(list)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [missingKey, categories])

  const saved = useMemo(
    () =>
      ids
        .map(
          (id) =>
            products.find((product) => product.id === id) ??
            extra.find((product) => product.id === id) ??
            null
        )
        .filter((product): product is Product => Boolean(product)),
    [ids, products, extra]
  )

  return (
    <div className="bg-Mneutral-50 pb-20 pt-[120px] text-Mneutral-900">
      <section className="section-template !pt-0">
        <div className="container-custom">
          <p className="mb-3 text__18 font-medium uppercase text-Mneutral-400">{t('nav.wishlist')}</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text__64">{t('wishlist.title')}</h1>
              <p className="mt-3 max-w-xl text__16 text-Mneutral-500">{t('wishlist.sub')}</p>
            </div>
            {ids.length > 0 && (
              <p className="text__14 tabular-nums text-Mneutral-500">{t('wishlist.saved', { count: ids.length })}</p>
            )}
          </div>

          {saved.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center rounded-[32px] border border-dashed border-Mneutral-200 bg-white px-6 py-20 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-Mneutral-50 text-Mneutral-400">
                <Heart size={26} strokeWidth={1.5} />
              </span>
              <p className="mt-5 text__24 font-medium">{t('wishlist.empty')}</p>
              <p className="mt-2 max-w-sm text__14 text-Mneutral-500">{t('wishlist.emptyHint')}</p>
              <Link to="/shop" className="pill-button mt-6">
                {t('wishlist.shop')}
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-8 xs:grid-cols-2 lg:grid-cols-4">
              {saved.map((product) => {
                const outOfStock = !product.inStock || (product.stockCount ?? 1) <= 0
                return (
                  <div key={product.id} className="relative">
                    <button
                      type="button"
                      onClick={() => toggle(product.id)}
                      aria-label={t('wishlist.remove')}
                      title={t('wishlist.remove')}
                      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-Mneutral-200 bg-white/90 text-Mneutral-900 backdrop-blur transition-colors hover:border-Mneutral-900 hover:bg-white"
                    >
                      <HeartOff size={15} strokeWidth={1.75} />
                    </button>
                    {outOfStock && (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text__12 font-medium text-Mneutral-500 backdrop-blur">
                        {t('wishlist.soldOut')}
                      </span>
                    )}
                    <ProductCard product={product} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

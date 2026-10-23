import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import ProductCard from '../components/ui/ProductCard'
import { normalizeProduct, useCatalogStore } from '../lib/catalog'
import { getApiUrl } from '../lib/api'
import { Product } from '../types'
import { translate, useCategoryName, useLang, useT, type TKey } from '../lib/i18n'

type SortValue = 'relevance' | 'newest' | 'bestseller' | 'price_asc' | 'price_desc' | 'rating'

interface Facets {
  categories: Array<{ slug: string; name: string; count: number }>
  price: { min: number; max: number }
  ratings: { '3': number; '4': number }
}

interface Filters {
  q: string
  category: string
  minPrice: string
  maxPrice: string
  rating: string
  sort: SortValue
}

const sortOptions: Array<{ key: TKey; value: SortValue }> = [
  { key: 'shop.sortRelevance', value: 'relevance' },
  { key: 'shop.sortNewest', value: 'newest' },
  { key: 'shop.sortBestsellers', value: 'bestseller' },
  { key: 'shop.sortRating', value: 'rating' },
  { key: 'shop.sortPriceAsc', value: 'price_asc' },
  { key: 'shop.sortPriceDesc', value: 'price_desc' },
]

const priceBuckets: Array<{
  key: string
  min: string
  max: string
  labelKey: TKey
  labelVars: Record<string, string>
}> = [
  { key: 'under', min: '', max: '40', labelKey: 'shop.priceUnder', labelVars: { amount: '$40' } },
  { key: 'mid', min: '40', max: '70', labelKey: 'shop.priceBetween', labelVars: { min: '$40', max: '$70' } },
  { key: 'over', min: '70', max: '', labelKey: 'shop.priceOver', labelVars: { amount: '$70' } },
]

const PAGE_SIZE = 12

function readFilters(params: URLSearchParams): Filters {
  const q = params.get('q') ?? ''
  return {
    q,
    category: params.get('category') ?? '',
    minPrice: params.get('min') ?? '',
    maxPrice: params.get('max') ?? '',
    rating: params.get('rating') ?? '',
    sort: (params.get('sort') as SortValue | null) ?? (q ? 'relevance' : 'newest'),
  }
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories } = useCatalogStore()
  const t = useT()
  const lang = useLang()
  const categoryName = useCategoryName()

  const [filters, setFilters] = useState<Filters>(() => readFilters(searchParams))
  const [queryInput, setQueryInput] = useState(filters.q)
  const [debouncedQuery, setDebouncedQuery] = useState(filters.q)
  const [page, setPage] = useState(1)
  const [tick, setTick] = useState(0)

  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [facets, setFacets] = useState<Facets | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = filters.q ? `Calesta — Search: ${filters.q}` : 'Calesta — Our Products'
  }, [filters.q])

  // Debounce typing; the URL and the request follow the settled term.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(queryInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [queryInput])

  useEffect(() => {
    setFilters((previous) => {
      if (previous.q === debouncedQuery) return previous
      // Entering a search switches to relevance; clearing it returns to newest.
      const sort: SortValue =
        !previous.q && debouncedQuery ? 'relevance'
        : previous.q && !debouncedQuery ? 'newest'
        : previous.sort
      return { ...previous, q: debouncedQuery, sort }
    })
    setPage(1)
  }, [debouncedQuery])

  // Two-way URL sync. The ref records the last URL *we* wrote so an external
  // navigation (navbar search, back/forward) is adopted instead of overwritten
  // by this page's stale filter state.
  const urlKey = searchParams.toString()
  const lastWrittenUrl = useRef(urlKey)

  useEffect(() => {
    if (urlKey === lastWrittenUrl.current) return
    const next = readFilters(new URLSearchParams(urlKey))
    lastWrittenUrl.current = urlKey
    setFilters(next)
    setQueryInput(next.q)
    setDebouncedQuery(next.q)
    setPage(1)
  }, [urlKey])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.category) params.set('category', filters.category)
    if (filters.minPrice) params.set('min', filters.minPrice)
    if (filters.maxPrice) params.set('max', filters.maxPrice)
    if (filters.rating) params.set('rating', filters.rating)
    if (filters.sort !== (filters.q ? 'relevance' : 'newest')) params.set('sort', filters.sort)
    const next = params.toString()
    if (next === urlKey) return
    lastWrittenUrl.current = next
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams, urlKey])

  useEffect(() => {
    const controller = new AbortController()
    const isFirstPage = page === 1
    if (isFirstPage) setLoading(true)
    else setLoadingMore(true)
    setError('')

    const params = new URLSearchParams()
    if (filters.q) params.set('search', filters.q)
    if (filters.category) params.set('category', filters.category)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.rating) params.set('rating', filters.rating)
    params.set('sortBy', filters.q ? filters.sort : filters.sort === 'relevance' ? 'newest' : filters.sort)
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))

    fetch(getApiUrl(`/api/products?${params.toString()}`), { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json().catch(() => null)
        if (!response.ok || !json?.success) throw new Error(json?.message ?? 'search failed')
        return json
      })
      .then((json) => {
        const normalized = (json.data ?? []).map((product: any) => normalizeProduct(product, categories))
        setItems((previous) => (isFirstPage ? normalized : [...previous, ...normalized]))
        setTotal(json.pagination?.total ?? 0)
        setFacets(json.facets ?? null)
        setSuggestion(json.search?.suggestion ?? null)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(translate(lang, 'shop.searchError'))
      })
      .finally(() => {
        if (isFirstPage) setLoading(false)
        else setLoadingMore(false)
      })

    return () => controller.abort()
  }, [filters, page, categories, lang, tick])

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((previous) => ({ ...previous, ...patch }))
    setPage(1)
  }

  const clearSearch = () => {
    setQueryInput('')
    setDebouncedQuery('')
    updateFilters({ q: '' })
  }

  const clearAll = () => {
    setQueryInput('')
    setDebouncedQuery('')
    setFilters({ q: '', category: '', minPrice: '', maxPrice: '', rating: '', sort: 'newest' })
    setPage(1)
  }

  const applySuggestion = (term: string) => {
    setQueryInput(term)
    setDebouncedQuery(term)
    updateFilters({ q: term })
  }

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.rating ? 1 : 0)

  const facetCategories = useMemo(() => {
    if (filters.q && facets) {
      return facets.categories.map((entry) => ({
        slug: entry.slug,
        name: entry.name,
        count: entry.count,
      }))
    }
    return categories.map((category) => ({ slug: category.slug, name: category.name, count: undefined }))
  }, [filters.q, facets, categories])

  const visibleSorts = filters.q
    ? sortOptions
    : sortOptions.filter((option) => option.value !== 'relevance')

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="section-template pt-[32px]">
        <div className="container-custom">
          <div className="overflow-hidden rounded-[32px] bg-white px-[20px] py-[28px] xs:px-[40px] xs:py-[40px] xl:px-[80px] xl:py-[64px]">
            <p className="mb-4 font-medium text__18 text-Mneutral-400">{t('shop.kicker')}</p>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <h1 className="text__56 font-medium">{t('shop.title')}</h1>
              </div>
              <div>
                <p className="text__18 text-Mneutral-600">{t('shop.sub')}</p>
                <div className="relative mt-5">
                  <Search
                    size={18}
                    strokeWidth={1.75}
                    className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-Mneutral-400"
                  />
                  <input
                    type="search"
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder={t('shop.searchPlaceholder')}
                    aria-label={t('shop.searchLabel')}
                    className="h-[54px] w-full rounded-full border border-Mneutral-200 bg-Mneutral-50 pl-12 pr-12 text__16 text-Mneutral-900 outline-none transition-colors placeholder:text-Mneutral-400 focus:border-Mneutral-900 focus:bg-white [&::-webkit-search-cancel-button]:hidden"
                  />
                  {queryInput && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      aria-label={t('shop.clearSearch')}
                      className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-Mneutral-400 transition-colors hover:bg-Mneutral-100 hover:text-Mneutral-900"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-0 section-template">
        <div className="container-custom">
          <div className="mb-[20px] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateFilters({ category: '' })}
                className={`rounded-full px-[16px] py-[10px] text__14 transition-all duration-300 ${
                  filters.category === '' ? 'bg-Mneutral-900 text-white' : 'border border-Mneutral-200 text-Mneutral-900'
                }`}
              >
                {t('shop.allProducts')}
              </button>
              {facetCategories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() =>
                    updateFilters({ category: filters.category === category.slug ? '' : category.slug })
                  }
                  className={`rounded-full px-[16px] py-[10px] text__14 transition-all duration-300 ${
                    filters.category === category.slug
                      ? 'bg-Mneutral-900 text-white'
                      : 'border border-Mneutral-200 text-Mneutral-900'
                  }`}
                >
                  {categoryName(category.slug, category.name)}
                  {category.count !== undefined && (
                    <span className={filters.category === category.slug ? 'ml-1.5 opacity-70' : 'ml-1.5 text-Mneutral-400'}>
                      {category.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text__16 text-Mneutral-600">
                {loading
                  ? t('shop.searching')
                  : total === 1
                    ? t('common.oneProduct')
                    : t('common.productsCount', { count: total })}
              </span>
              <select
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value as SortValue })}
                aria-label={t('shop.sortRelevance')}
                className="rounded-full border border-Mneutral-200 bg-transparent px-4 py-[10px] text__14 outline-none"
              >
                {visibleSorts.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.key)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-[28px] flex flex-wrap items-center gap-2 border-t border-Mneutral-200 pt-4">
            <span className="mr-1 inline-flex items-center gap-1.5 text__12 font-medium uppercase tracking-wide text-Mneutral-400">
              {t('shop.filters')}
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-Mneutral-900 px-1 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </span>

            {priceBuckets.map((bucket) => {
              const active = filters.minPrice === bucket.min && filters.maxPrice === bucket.max
              return (
                <button
                  key={bucket.key}
                  type="button"
                  onClick={() =>
                    updateFilters(
                      active
                        ? { minPrice: '', maxPrice: '' }
                        : { minPrice: bucket.min, maxPrice: bucket.max }
                    )
                  }
                  className={`rounded-full px-[14px] py-[7px] text__12 transition-colors ${
                    active
                      ? 'bg-Mneutral-900 text-white'
                      : 'border border-Mneutral-200 bg-white text-Mneutral-600 hover:border-Mneutral-900 hover:text-Mneutral-900'
                  }`}
                >
                  {t(bucket.labelKey, bucket.labelVars)}
                </button>
              )
            })}

            <span className="mx-1 hidden h-4 w-px bg-Mneutral-200 xs:block" />

            <button
              type="button"
              onClick={() => updateFilters({ rating: filters.rating === '4' ? '' : '4' })}
              className={`rounded-full px-[14px] py-[7px] text__12 transition-colors ${
                filters.rating === '4'
                  ? 'bg-Mneutral-900 text-white'
                  : 'border border-Mneutral-200 bg-white text-Mneutral-600 hover:border-Mneutral-900 hover:text-Mneutral-900'
              }`}
            >
              {t('shop.rating4')}
              {filters.q && facets ? ` (${facets.ratings['4']})` : ''}
            </button>

            {(activeFilterCount > 0 || filters.q) && (
              <button
                type="button"
                onClick={clearAll}
                className="ml-auto text__12 text-Mneutral-500 underline-offset-4 transition-colors hover:text-Mneutral-900 hover:underline"
              >
                {t('shop.clearFilters')}
              </button>
            )}
          </div>

          {filters.q && !loading && (
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text__14 text-Mneutral-500">
              <span>{t('shop.resultsFor', { query: filters.q })}</span>
              {suggestion && (
                <button
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="font-medium text-Mneutral-900 underline underline-offset-4"
                >
                  {t('shop.didYouMean', { term: suggestion })}
                </button>
              )}
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center rounded-[32px] border border-Mneutral-200 bg-white px-6 py-16 text-center">
              <p className="max-w-sm text__16 text-Mneutral-600">{error}</p>
              <button type="button" onClick={() => setTick((value) => value + 1)} className="pill-button mt-5">
                {t('common.continue')}
              </button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-[20px] xs:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-[420px] animate-pulse rounded-[24px] bg-white" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-Mneutral-200 bg-white px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-Mneutral-50 text-Mneutral-400">
                <Search size={22} strokeWidth={1.5} />
              </span>
              <p className="mt-5 text__24 font-medium">{t('shop.noResults')}</p>
              {filters.q && suggestion ? (
                <button
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="mt-2 text__16 text-Mneutral-900 underline underline-offset-4"
                >
                  {t('shop.didYouMean', { term: suggestion })}
                </button>
              ) : (
                <p className="mt-2 max-w-sm text__14 text-Mneutral-500">{t('shop.noResultsHint')}</p>
              )}
              <button type="button" onClick={clearAll} className="pill-button mt-6">
                {t('shop.clearFilters')}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-[20px] xs:grid-cols-2 lg:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {items.length < total && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setPage((value) => value + 1)}
                    disabled={loadingMore}
                    className="pill-button disabled:opacity-60"
                  >
                    {loadingMore ? t('shop.searching') : t('shop.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

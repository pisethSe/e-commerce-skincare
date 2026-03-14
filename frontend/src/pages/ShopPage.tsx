import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ui/ProductCard'
import { CATEGORIES, PRODUCTS } from '../lib/data'
import { Product } from '../types'

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Bestsellers', value: 'bestseller' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
]

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    document.title = 'Calesta — Our Products'
  }, [])

  const filtered = useMemo(() => {
    const result: Product[] = PRODUCTS.filter((product) => (
      selectedCategory ? product.category.slug === selectedCategory : true
    ))

    switch (sortBy) {
      case 'price_asc':
        return [...result].sort((a, b) => a.price - b.price)
      case 'price_desc':
        return [...result].sort((a, b) => b.price - a.price)
      case 'bestseller':
        return [...result].sort((a, b) => Number(Boolean(b.isBestseller)) - Number(Boolean(a.isBestseller)))
      default:
        return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  }, [selectedCategory, sortBy])

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="section-template pt-[32px]">
        <div className="container-custom">
          <div className="overflow-hidden rounded-[32px] bg-white px-[20px] py-[28px] xs:px-[40px] xs:py-[40px] xl:px-[80px] xl:py-[64px]">
            <p className="mb-4 font-medium text__18 text-Mneutral-400">OUR PRODUCTS</p>
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text__56 font-medium">Find the ritual that fits your skin.</h1>
              </div>
              <p className="text__18 text-Mneutral-600">
                Explore our cleanser, serum, moisturizer, and targeted treatment lineup crafted to match the Calesta visual experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-0 section-template">
        <div className="container-custom">
          <div className="mb-[32px] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`rounded-full px-[16px] py-[10px] text__14 transition-all duration-300 ${
                  selectedCategory === '' ? 'bg-Mneutral-900 text-white' : 'border border-Mneutral-200 text-Mneutral-900'
                }`}
              >
                All Products
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`rounded-full px-[16px] py-[10px] text__14 transition-all duration-300 ${
                    selectedCategory === category.slug ? 'bg-Mneutral-900 text-white' : 'border border-Mneutral-200 text-Mneutral-900'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text__16 text-Mneutral-600">{filtered.length} products</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-full border border-Mneutral-200 bg-transparent px-4 py-[10px] text__14 outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-[20px] xs:grid-cols-2 lg:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

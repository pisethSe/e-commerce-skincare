import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ImageOff, Package, Pencil, Plus, Search, Star, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiData, apiList, type Pagination as PaginationMeta } from '../lib/api'
import { formatMoney, formatDate, slugify } from '../lib/format'
import Pagination from '../components/ui/Pagination'
import Drawer from '../components/ui/Drawer'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Field from '../components/ui/Field'

interface Category {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  name: string
  slug: string
  tagline: string | null
  description: string
  longDescription: string | null
  price: string
  comparePrice: string | null
  volume: string | null
  categoryId: string
  category: { id: string; name: string; slug: string }
  images: string[]
  tags: string[]
  ingredients: string[]
  benefits: string[]
  howToUse: string | null
  isNew: boolean
  isBestseller: boolean
  isFeatured: boolean
  inStock: boolean
  stockCount: number
  rating: string
  reviewCount: number
  createdAt: string
}

interface ProductForm {
  name: string
  tagline: string
  description: string
  longDescription: string
  price: string
  comparePrice: string
  volume: string
  categoryId: string
  imagesText: string
  tagsText: string
  ingredientsText: string
  benefitsText: string
  howToUse: string
  isNew: boolean
  isBestseller: boolean
  isFeatured: boolean
  inStock: boolean
  stockCount: string
}

const EMPTY_FORM: ProductForm = {
  name: '',
  tagline: '',
  description: '',
  longDescription: '',
  price: '',
  comparePrice: '',
  volume: '',
  categoryId: '',
  imagesText: '',
  tagsText: '',
  ingredientsText: '',
  benefitsText: '',
  howToUse: '',
  isNew: false,
  isBestseller: false,
  isFeatured: false,
  inStock: true,
  stockCount: '0',
}

const linesToList = (text: string): string[] =>
  text.split('\n').map((s) => s.trim()).filter(Boolean)

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [busyDelete, setBusyDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ all: '1', page: String(page), limit: '8', sortBy: 'newest' })
      if (category !== 'All') params.set('category', category)
      if (search.trim()) params.set('search', search.trim())
      const { items, pagination: p } = await apiList<Product>({ url: `/products?${params.toString()}` })
      setProducts(items)
      setPagination(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [page, category, search])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    apiList<Category>({ url: '/categories' })
      .then(({ items }) => setCategories(items))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? '' })
    setDrawerOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setForm({
      name: product.name,
      tagline: product.tagline ?? '',
      description: product.description,
      longDescription: product.longDescription ?? '',
      price: String(product.price),
      comparePrice: product.comparePrice ? String(product.comparePrice) : '',
      volume: product.volume ?? '',
      categoryId: product.categoryId,
      imagesText: product.images.join('\n'),
      tagsText: product.tags.join(', '),
      ingredientsText: product.ingredients.join('\n'),
      benefitsText: product.benefits.join('\n'),
      howToUse: product.howToUse ?? '',
      isNew: product.isNew,
      isBestseller: product.isBestseller,
      isFeatured: product.isFeatured,
      inStock: product.inStock,
      stockCount: String(product.stockCount),
    })
    setDrawerOpen(true)
  }

  const setField = (key: keyof ProductForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  const uploadFile = async (file: File | undefined) => {
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const data = new FormData()
      data.append('image', file)
      const token = localStorage.getItem('calesta-admin-token')
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: data,
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Upload failed')
      }
      // Append the uploaded URL to the image list
      setForm((f) => ({
        ...f,
        imagesText: f.imagesText.trim()
          ? `${f.imagesText.trimEnd()}\n${result.data.url}`
          : result.data.url,
      }))
      toast.success('Image uploaded')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      slug: slugify(form.name.trim()),
      tagline: form.tagline.trim() || null,
      description: form.description.trim(),
      longDescription: form.longDescription.trim() || null,
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
      volume: form.volume.trim() || null,
      categoryId: form.categoryId,
      images: linesToList(form.imagesText),
      tags: form.tagsText.split(',').map((s) => s.trim()).filter(Boolean),
      ingredients: linesToList(form.ingredientsText),
      benefits: linesToList(form.benefitsText),
      howToUse: form.howToUse.trim() || null,
      isNew: form.isNew,
      isBestseller: form.isBestseller,
      isFeatured: form.isFeatured,
      inStock: form.inStock,
      stockCount: Number(form.stockCount) || 0,
    }
    try {
      if (editing) {
        await apiData({ method: 'PUT', url: `/products/${editing.id}`, data: payload })
        toast.success(`${payload.name} updated`)
      } else {
        await apiData({ method: 'POST', url: '/products', data: payload })
        toast.success(`${payload.name} added to catalog`)
      }
      setDrawerOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await apiData({ method: 'DELETE', url: `/products/${deleting.id}` })
      toast.success(`${deleting.name} removed`)
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyDelete(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="admin-card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca8a5]" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search catalog…"
            aria-label="Search products"
            className="input-admin pl-11"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
          aria-label="Filter by category"
          className="input-admin w-fit cursor-pointer appearance-none pr-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23102d26' stroke-opacity='0.4' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 14px center',
          }}
        >
          <option value="All">All collections</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={openCreate} className="btn-admin">
          <Plus size={15} /> Add product
        </button>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {error ? (
          <div className="p-6 text__14 text-[#a83636]">{error}</div>
        ) : loading ? (
          <div className="space-y-2 p-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-[10px] bg-[#f1f3f3]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package size={18} />}
            title="No products found"
            hint="Try a different search or add your first product to the catalog."
            action={
              <button type="button" onClick={openCreate} className="btn-admin">
                <Plus size={15} /> Add product
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead className="border-b border-[#e7eae9]">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th">Collection</th>
                    <th className="table-th">Price</th>
                    <th className="table-th">Stock</th>
                    <th className="table-th">Flags</th>
                    <th className="table-th">Added</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f3]">
                  {products.map((product, i) => (
                    <motion.tr
                      key={product.id}
                      className="transition-colors hover:bg-[#f8f9f8]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
                            {product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt=""
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <ImageOff size={14} className="text-[#9ca8a5]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#102d26]">{product.name}</p>
                            <p className="mt-0.5 truncate text__12 text-[#9ca8a5]">/{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td whitespace-nowrap text-[#3f5650]">{product.category?.name}</td>
                      <td className="table-td whitespace-nowrap">
                        <span className="font-semibold tabular-nums text-[#102d26]">
                          {formatMoney(product.price)}
                        </span>
                        {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
                          <span className="ml-2 text__12 text-[#9ca8a5] line-through tabular-nums">
                            {formatMoney(product.comparePrice)}
                          </span>
                        )}
                      </td>
                      <td className="table-td">
                        {product.inStock ? (
                          product.stockCount <= 10 ? (
                            <span className="badge bg-[#f7f1de] text-[#7a6420] tabular-nums">
                              {product.stockCount} left
                            </span>
                          ) : (
                            <span className="badge bg-[#eaf1e3] text-[#4a6132] tabular-nums">
                              {product.stockCount}
                            </span>
                          )
                        ) : (
                          <span className="badge bg-[#fdeeee] text-[#a83636]">Out of stock</span>
                        )}
                      </td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-1.5">
                          {product.isFeatured && (
                            <span className="badge bg-[#f7f1de] text-[#7a6420]">Featured</span>
                          )}
                          {product.isBestseller && (
                            <span className="badge bg-[#ddf0e9] text-[#102d26]">Bestseller</span>
                          )}
                          {product.isNew && (
                            <span className="badge bg-[#f1f3f3] text-[#3f5650]">New</span>
                          )}
                          {product.reviewCount > 0 && (
                            <span className="badge bg-white border border-[#e7eae9] text-[#3f5650] tabular-nums">
                              <Star size={10} className="text-[#c9a96e]" /> {Number(product.rating).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-td whitespace-nowrap text-[#6e7f7b]">{formatDate(product.createdAt)}</td>
                      <td className="table-td">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            aria-label={`Edit ${product.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#9ca8a5] transition-colors hover:bg-[#f1f3f3] hover:text-[#102d26] active:scale-[0.97]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(product)}
                            aria-label={`Delete ${product.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#9ca8a5] transition-colors hover:bg-[#fdeeee] hover:text-[#a83636] active:scale-[0.97]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#e7eae9] px-5 py-4">
              <Pagination
                page={pagination?.page ?? 1}
                totalPages={pagination?.totalPages ?? 1}
                total={pagination?.total ?? 0}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Add / edit drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        kicker={editing ? 'Edit product' : 'New product'}
        title={editing ? editing.name : 'Add to catalog'}
        width="600px"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDrawerOpen(false)} className="btn-admin-outline" disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="product-form" className="btn-admin" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
            </button>
          </div>
        }
      >
        <form id="product-form" onSubmit={save} className="space-y-5">
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Radiance Brightening Serum"
              className="input-admin"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tagline">
              <input
                value={form.tagline}
                onChange={(e) => setField('tagline', e.target.value)}
                placeholder="Luminous skin in 14 days"
                className="input-admin"
              />
            </Field>
            <Field label="Volume">
              <input
                value={form.volume}
                onChange={(e) => setField('volume', e.target.value)}
                placeholder="30ml / 1 fl oz"
                className="input-admin"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              required
              rows={2}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Short storefront description"
              className="input-admin resize-none"
            />
          </Field>

          <Field label="Full description">
            <textarea
              rows={4}
              value={form.longDescription}
              onChange={(e) => setField('longDescription', e.target.value)}
              placeholder="Longer product story shown on the detail page"
              className="input-admin resize-none"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (USD)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="68"
                className="input-admin tabular-nums"
              />
            </Field>
            <Field label="Compare at">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.comparePrice}
                onChange={(e) => setField('comparePrice', e.target.value)}
                placeholder="85"
                className="input-admin tabular-nums"
              />
            </Field>
            <Field label="Stock count">
              <input
                type="number"
                min="0"
                value={form.stockCount}
                onChange={(e) => setField('stockCount', e.target.value)}
                className="input-admin tabular-nums"
              />
            </Field>
          </div>

          <Field label="Collection">
            <select
              required
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
              className="input-admin cursor-pointer appearance-none"
            >
              <option value="" disabled>
                Choose a collection…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Image URLs"
            hint="One URL per line — or upload a file below."
          >
            <textarea
              rows={3}
              value={form.imagesText}
              onChange={(e) => setField('imagesText', e.target.value)}
              placeholder={'/images/Card-2.png\n/images/Content.png'}
              className="input-admin resize-none font-mono text__12"
            />
          </Field>

          <div className="flex items-center gap-3">
            <label className="btn-admin-outline cursor-pointer">
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => uploadFile(e.target.files?.[0])}
              />
            </label>
            {uploadError && (
              <p role="alert" className="text__12 text-[#a83636]">{uploadError}</p>
            )}
          </div>

          {linesToList(form.imagesText).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {linesToList(form.imagesText).slice(0, 6).map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="h-14 w-12 overflow-hidden rounded-[12px] border border-[#e7eae9] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]"
                >
                  <img src={src} alt="" className="h-full w-full object-contain p-1" />
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tags" hint="Comma separated">
              <input
                value={form.tagsText}
                onChange={(e) => setField('tagsText', e.target.value)}
                placeholder="brightening, vitamin c"
                className="input-admin"
              />
            </Field>
            <Field label="How to use">
              <input
                value={form.howToUse}
                onChange={(e) => setField('howToUse', e.target.value)}
                placeholder="Apply 3–4 drops morning and evening"
                className="input-admin"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ingredients" hint="One per line">
              <textarea
                rows={3}
                value={form.ingredientsText}
                onChange={(e) => setField('ingredientsText', e.target.value)}
                placeholder={'Ascorbic Acid 15%\nNiacinamide 5%'}
                className="input-admin resize-none"
              />
            </Field>
            <Field label="Benefits" hint="One per line">
              <textarea
                rows={3}
                value={form.benefitsText}
                onChange={(e) => setField('benefitsText', e.target.value)}
                placeholder={'Brightens dark spots\nEvens skin tone'}
                className="input-admin resize-none"
              />
            </Field>
          </div>

          <div className="space-y-3 rounded-[10px] border border-[#e7eae9] bg-[#f8f9f8] px-5 py-4">
            {(
              [
                ['inStock', 'In stock', 'Purchasable in the storefront'],
                ['isFeatured', 'Featured', 'Shown in the home featured grid'],
                ['isBestseller', 'Bestseller', 'Badged as a best seller'],
                ['isNew', 'New', 'Badged as new'],
              ] as Array<[keyof ProductForm, string, string]>
            ).map(([key, label, hint]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block text__14 font-medium text-[#102d26]">{label}</span>
                  <span className="block text__12 text-[#9ca8a5]">{hint}</span>
                </span>
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => setField(key, e.target.checked)}
                  className="h-5 w-5 cursor-pointer accent-[#102d26]"
                />
              </label>
            ))}
          </div>
        </form>
      </Drawer>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleting !== null}
        title="Remove product"
        message={`"${deleting?.name}" will be permanently removed from the catalog. This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busyDelete}
      />
    </div>
  )
}

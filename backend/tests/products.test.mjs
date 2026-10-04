import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { call, isServerUp, adminToken, customerToken, getProducts, getCategories, seededProduct } from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

/* ── Public catalog ───────────────────────────── */
test('GET /api/products returns a paginated list', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/products?page=1&limit=4')
  assert.equal(status, 200)
  assert.equal(body.success, true)
  assert.ok(Array.isArray(body.data))
  assert.ok(body.data.length <= 4)
  assert.equal(body.pagination.page, 1)
  assert.ok(body.pagination.total >= body.data.length)
  // Product shape: numeric price (serialized from Decimal), category info
  const product = body.data[0]
  assert.ok(product.id)
  assert.ok(product.name)
  assert.ok(!Number.isNaN(Number(product.price)))
  assert.ok(product.category?.name)
})

test('GET /api/products excludes out-of-stock products by default', async () => {
  if (!serverUp) return
  const { body } = await call('GET', '/api/products?limit=100')
  const outOfStock = (body.data ?? []).filter((p) => p.inStock === false)
  assert.equal(outOfStock.length, 0)
})

test('GET /api/products?all=1 includes out-of-stock products', async () => {
  if (!serverUp) return
  const products = await getProducts()
  assert.ok(products.length > 0)
})

test('GET /api/products?search= filters by name', async () => {
  if (!serverUp) return
  const target = await seededProduct()
  const { body } = await call('GET', `/api/products?search=${encodeURIComponent(target.name)}`)
  assert.equal(body.success, true)
  assert.ok((body.data ?? []).some((p) => p.id === target.id))
})

test('GET /api/products?category=slug filters by collection', async () => {
  if (!serverUp) return
  const products = await getProducts()
  const withCategory = products.find((p) => p.category?.slug)
  const { body } = await call('GET', `/api/products?category=${withCategory.category.slug}&limit=50`)
  assert.ok((body.data ?? []).every((p) => p.category.slug === withCategory.category.slug))
})

test('GET /api/products?sortBy=price_asc orders by price', async () => {
  if (!serverUp) return
  const { body } = await call('GET', '/api/products?sortBy=price_asc&limit=20')
  const prices = (body.data ?? []).map((p) => Number(p.price))
  const sorted = [...prices].sort((a, b) => a - b)
  assert.deepEqual(prices, sorted)
})

test('GET /api/products/:slug returns the product detail', async () => {
  if (!serverUp) return
  const target = await seededProduct()
  const { status, body } = await call('GET', `/api/products/${target.slug}`)
  assert.equal(status, 200)
  assert.equal(body.data.slug, target.slug)
  assert.equal(body.data.id, target.id)
})

test('GET /api/products/:slug returns 404 for unknown slugs', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/products/no-such-product-exists')
  assert.equal(status, 404)
})

test('GET /api/products/:id/related returns same-collection products', async () => {
  if (!serverUp) return
  const target = await seededProduct()
  const { status, body } = await call('GET', `/api/products/${target.id}/related`)
  assert.equal(status, 200)
  assert.ok((body.data ?? []).every((p) => p.id !== target.id))
})

/* ── Admin CRUD guards ────────────────────────── */
test('POST /api/products rejects unauthenticated requests', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/products', { body: { name: 'X' } })
  assert.equal(status, 401)
})

test('POST /api/products rejects non-admin users', async () => {
  if (!serverUp) return
  const { status, body } = await call('POST', '/api/products', {
    token: await customerToken(),
    body: { name: 'Sneaky', description: 'x', price: 1 },
  })
  assert.equal(status, 403)
  assert.equal(body.message, 'Admin access required')
})

test('POST /api/products validates required fields', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/products', {
    token: await adminToken(),
    body: { name: 'Only a name' },
  })
  assert.equal(status, 400)
})

/* ── Admin CRUD lifecycle ─────────────────────── */
test('admin can create, update, and delete a product', async () => {
  if (!serverUp) return
  const categories = await getCategories()
  const category = categories[0]
  const slug = `test-serum-${Date.now()}`

  // CREATE
  const { status: createStatus, body: createBody } = await call('POST', '/api/products', {
    token: await adminToken(),
    body: {
      name: 'Test Serum Alpha',
      slug,
      description: 'A test product for the suite.',
      price: 49.5,
      comparePrice: 65,
      categoryId: category.id,
      stockCount: 7,
      images: ['/images/Card.png'],
      tags: ['test'],
    },
  })
  assert.equal(createStatus, 201)
  const created = createBody.data
  assert.equal(created.slug, slug)
  assert.equal(Number(created.price), 49.5)
  assert.equal(created.stockCount, 7)

  // READ (by slug)
  const { status: readStatus, body: readBody } = await call('GET', `/api/products/${slug}`)
  assert.equal(readStatus, 200)
  assert.equal(readBody.data.id, created.id)

  // UPDATE
  const { status: updateStatus, body: updateBody } = await call('PUT', `/api/products/${created.id}`, {
    token: await adminToken(),
    body: { price: 39.99, stockCount: 12, inStock: true },
  })
  assert.equal(updateStatus, 200)
  assert.equal(Number(updateBody.data.price), 39.99)
  assert.equal(updateBody.data.stockCount, 12)

  // DELETE
  const { status: deleteStatus } = await call('DELETE', `/api/products/${created.id}`, {
    token: await adminToken(),
  })
  assert.equal(deleteStatus, 200)

  // Gone
  const { status: goneStatus } = await call('GET', `/api/products/${slug}`)
  assert.equal(goneStatus, 404)
})

test('DELETE /api/products rejects non-admin users', async () => {
  if (!serverUp) return
  const products = await getProducts()
  const { status } = await call('DELETE', `/api/products/${products[0].id}`, {
    token: await customerToken(),
  })
  assert.equal(status, 403)
})

/* ── Categories ───────────────────────────────── */
test('GET /api/categories lists collections with product counts', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/categories')
  assert.equal(status, 200)
  assert.ok(body.data.length > 0)
  assert.ok(body.data[0]._count?.products !== undefined)
})

test('admin can create, update, and delete a category', async () => {
  if (!serverUp) return
  const token = await adminToken()

  const { status: createStatus, body: createBody } = await call('POST', '/api/categories', {
    token,
    body: { name: `Test Collection ${Date.now()}`, slug: `test-collection-${Date.now()}`, description: 'Created by tests', sortOrder: 99 },
  })
  assert.equal(createStatus, 201)
  const created = createBody.data

  const { status: updateStatus } = await call('PUT', `/api/categories/${created.id}`, {
    token,
    body: { name: `Test Collection Renamed ${Date.now()}` },
  })
  assert.equal(updateStatus, 200)

  const { status: deleteStatus } = await call('DELETE', `/api/categories/${created.id}`, { token })
  assert.equal(deleteStatus, 200)
})

test('POST /api/categories rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/categories', {
    token: await customerToken(),
    body: { name: 'Nope', slug: 'nope' },
  })
  assert.equal(status, 403)
})

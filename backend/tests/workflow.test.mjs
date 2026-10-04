/**
 * Business-workflow tests — the rules that keep the store's data consistent:
 * order cancellation restocks, coupon usage accounting, slug/category guards,
 * and clean errors instead of 500s for every admin operation.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { isServerUp, call, adminToken, customerToken, makeUser, makeAddress, freshProducts, getCategories, ok } from './helpers.mjs'

const serverUp = await isServerUp()

/** Creates a dedicated admin product (unique slug) — fully isolated from other tests. */
async function makeProduct(overrides = {}) {
  const token = await adminToken()
  const cats = await getCategories()
  const slug = `test-wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const { status, body } = await call('POST', '/api/products', {
    token,
    body: {
      name: `WF Test Product ${slug.slice(-4)}`,
      slug,
      description: 'Workflow test product',
      price: 25,
      categoryId: cats[0]?.id,
      inStock: true,
      stockCount: 10,
      ...overrides,
    },
  })
  assert.equal(status, 201, `makeProduct failed: ${body.message ?? ''}`)
  return body.data
}

/** Creates a dedicated coupon with a unique code. */
async function makeCoupon(overrides = {}) {
  const token = await adminToken()
  const code = `WFT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`
  const { status, body } = await call('POST', '/api/coupons', {
    token,
    body: { code, type: 'PERCENTAGE', value: 10, active: true, ...overrides },
  })
  assert.equal(status, 201, `makeCoupon failed: ${body.message ?? ''}`)
  return body.data
}

/** Fetches a coupon's live row (usedCount, active) by code. */
async function couponByCode(code) {
  const token = await adminToken()
  const { body } = await call('GET', '/api/coupons', { token })
  return (body.data ?? []).find((c) => c.code === code) ?? null
}

/** Fetches a product's live row (stockCount, inStock) by id. */
async function productById(id) {
  const products = await freshProducts()
  return products.find((p) => p.id === id) ?? null
}

/* ── Order cancellation restocks ───────────────── */

test('cancelling an order restores stock and re-lists a depleted product', async () => {
  if (!serverUp) return
  const product = await makeProduct({ stockCount: 5, price: 20 })
  const user = await makeUser('wf-restock')
  const addressId = await makeAddress(user.token)

  // Order ALL units — depletes stock and flips inStock off
  const { status, body } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 5 }], addressId, shippingMethod: 'standard' },
  })
  assert.equal(status, 201, `order failed: ${body.message ?? ''}`)

  const afterOrder = await productById(product.id)
  assert.equal(afterOrder.stockCount, 0, 'stock should be depleted')
  assert.equal(afterOrder.inStock, false, 'product should be delisted when depleted')

  // Admin cancels the order — stock must come back
  const admin = await adminToken()
  const { status: cancelStatus, body: cancelBody } = await call('PATCH', `/api/orders/${body.data.id}/status`, {
    token: admin,
    body: { status: 'CANCELLED' },
  })
  assert.equal(cancelStatus, 200, `cancel failed: ${cancelBody.message ?? ''}`)

  const afterCancel = await productById(product.id)
  assert.equal(afterCancel.stockCount, 5, 'stock must be restored on cancel')
  assert.equal(afterCancel.inStock, true, 'product must be re-listed on cancel')
})

test('cancelling an order releases the coupon usage', async () => {
  if (!serverUp) return
  const coupon = await makeCoupon({ value: 10 })
  const product = await makeProduct({ stockCount: 10, price: 50 })
  const user = await makeUser('wf-coupon')
  const addressId = await makeAddress(user.token)

  const before = await couponByCode(coupon.code)
  assert.equal(Number(before.usedCount), 0)

  const { status, body } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, couponCode: coupon.code },
  })
  assert.equal(status, 201)
  assert.ok(Number(body.data.discount) > 0, 'coupon discount should apply')

  const during = await couponByCode(coupon.code)
  assert.equal(Number(during.usedCount), 1, 'usage should increment on purchase')

  const admin = await adminToken()
  await call('PATCH', `/api/orders/${body.data.id}/status`, { token: admin, body: { status: 'CANCELLED' } })

  const after = await couponByCode(coupon.code)
  assert.equal(Number(after.usedCount), 0, 'usage must be released on cancel')
})

test('re-activating a cancelled order re-reserves stock and coupon usage', async () => {
  if (!serverUp) return
  const coupon = await makeCoupon({ value: 5 })
  const product = await makeProduct({ stockCount: 3, price: 40 })
  const user = await makeUser('wf-reactivate')
  const addressId = await makeAddress(user.token)

  const { body } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 2 }], addressId, couponCode: coupon.code },
  })
  assert.equal(body.data.status, 'PENDING')

  const admin = await adminToken()
  await call('PATCH', `/api/orders/${body.data.id}/status`, { token: admin, body: { status: 'CANCELLED' } })
  const afterCancel = await productById(product.id)
  assert.equal(afterCancel.stockCount, 3)

  // Re-activate — stock re-reserved, coupon re-consumed
  await call('PATCH', `/api/orders/${body.data.id}/status`, { token: admin, body: { status: 'PROCESSING' } })
  const afterReactivate = await productById(product.id)
  assert.equal(afterReactivate.stockCount, 1, 'stock must re-reserve on re-activation')
  const couponRow = await couponByCode(coupon.code)
  assert.equal(Number(couponRow.usedCount), 1, 'coupon usage must be re-consumed on re-activation')
})

test('double-cancel does not double-restock (idempotent)', async () => {
  if (!serverUp) return
  const product = await makeProduct({ stockCount: 4, price: 15 })
  const user = await makeUser('wf-double')
  const addressId = await makeAddress(user.token)

  const { status, body } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 4 }], addressId },
  })
  assert.equal(status, 201)
  const admin = await adminToken()
  await call('PATCH', `/api/orders/${body.data.id}/status`, { token: admin, body: { status: 'CANCELLED' } })
  const first = await productById(product.id)
  assert.equal(first.stockCount, 4)

  // Cancel again — must be a no-op for stock
  const { status: secondStatus } = await call('PATCH', `/api/orders/${body.data.id}/status`, {
    token: admin, body: { status: 'CANCELLED' },
  })
  assert.equal(secondStatus, 200)
  const second = await productById(product.id)
  assert.equal(second.stockCount, 4, 'double-cancel must not double-restock')
})

test('status change emails are attempted for the customer (graceful without SMTP)', async () => {
  if (!serverUp) return
  const product = await makeProduct({ stockCount: 5, price: 20 })
  const user = await makeUser('wf-email')
  const addressId = await makeAddress(user.token)
  const { body } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })
  const admin = await adminToken()
  // A status change must succeed end-to-end even with no SMTP configured
  const { status, body: updated } = await call('PATCH', `/api/orders/${body.data.id}/status`, {
    token: admin, body: { status: 'SHIPPED' },
  })
  assert.equal(status, 200)
  assert.equal(updated.data.status, 'SHIPPED')
  // Restore state for other tests
  await call('PATCH', `/api/orders/${body.data.id}/status`, { token: admin, body: { status: 'CANCELLED' } })
})

/* ── Coupon rules at order time ───────────────── */

test('order with a usage-capped coupon is rejected', async () => {
  if (!serverUp) return
  const coupon = await makeCoupon({ value: 20, maxUses: 1 })
  const product = await makeProduct({ stockCount: 10, price: 30 })
  const user = await makeUser('wf-cap')
  const addressId = await makeAddress(user.token)

  // First order consumes the single use
  const first = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, couponCode: coupon.code },
  })
  assert.equal(first.status, 201)

  // Second order with the same coupon must be rejected
  const second = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, couponCode: coupon.code },
  })
  assert.equal(second.status, 400)
  assert.match(second.body.message, /usage limit/i)
})

test('order with an expired coupon is rejected (never silently un-discounted)', async () => {
  if (!serverUp) return
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const coupon = await makeCoupon({ value: 20, expiresAt: yesterday })
  const product = await makeProduct({ stockCount: 10, price: 30 })
  const user = await makeUser('wf-expired')
  const addressId = await makeAddress(user.token)

  const { status, body } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, couponCode: coupon.code },
  })
  assert.equal(status, 400, `expected 400, got ${status}: ${body.message ?? ''}`)
  assert.match(body.message, /expired/i)

  // And /validate agrees
  const validate = await call('POST', '/api/coupons/validate', {
    body: { code: coupon.code, orderTotal: 100 },
  })
  assert.equal(validate.status, 404)
  assert.match(validate.body.message, /expired/i)
})

test('order with an unknown coupon code is rejected', async () => {
  if (!serverUp) return
  const user = await makeUser('wf-unknowncoupon')
  const addressId = await makeAddress(user.token)
  const product = await makeProduct({ stockCount: 5, price: 20 })
  const { status, body } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, couponCode: 'NOPE-NOPE' },
  })
  assert.equal(status, 400)
  assert.match(body.message, /invalid or expired/i)
})

test('order below a coupon minimum is rejected', async () => {
  if (!serverUp) return
  const coupon = await makeCoupon({ value: 10, minOrderAmt: 500 })
  const product = await makeProduct({ stockCount: 5, price: 20 })
  const user = await makeUser('wf-minorder')
  const addressId = await makeAddress(user.token)
  const { status, body } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, couponCode: coupon.code },
  })
  assert.equal(status, 400)
  assert.match(body.message, /minimum order/i)
})

/* ── Coupon admin validation ───────────────────── */

test('duplicate coupon code is rejected with 409 (not a 500)', async () => {
  if (!serverUp) return
  const coupon = await makeCoupon({ value: 5 })
  const admin = await adminToken()
  const { status, body } = await call('POST', '/api/coupons', {
    token: admin,
    body: { code: coupon.code, type: 'PERCENTAGE', value: 15, active: true },
  })
  assert.equal(status, 409)
  assert.match(body.message, /already exists/i)
})

test('coupon validation: percentage over 100, missing code, bad type, non-positive value', async () => {
  if (!serverUp) return
  const admin = await adminToken()

  const over100 = await call('POST', '/api/coupons', {
    token: admin, body: { code: `BIG${Date.now().toString(36).toUpperCase()}`, type: 'PERCENTAGE', value: 150, active: true },
  })
  assert.equal(over100.status, 400)
  assert.match(over100.body.message, /100/)

  const noCode = await call('POST', '/api/coupons', {
    token: admin, body: { type: 'PERCENTAGE', value: 10, active: true },
  })
  assert.equal(noCode.status, 400)
  assert.match(noCode.body.message, /code/i)

  const badType = await call('POST', '/api/coupons', {
    token: admin, body: { code: `BT${Date.now().toString(36).toUpperCase()}`, type: 'GARBAGE', value: 10 },
  })
  assert.equal(badType.status, 400)
  assert.match(badType.body.message, /type/i)

  const zeroValue = await call('POST', '/api/coupons', {
    token: admin, body: { code: `ZV${Date.now().toString(36).toUpperCase()}`, type: 'FIXED', value: 0 },
  })
  assert.equal(zeroValue.status, 400)
  assert.match(zeroValue.body.message, /value/i)
})

test('coupon PATCH/DELETE return 404 for unknown ids (not a 500)', async () => {
  if (!serverUp) return
  const admin = await adminToken()
  const patch = await call('PATCH', '/api/coupons/does-not-exist', { token: admin, body: { active: false } })
  assert.equal(patch.status, 404)
  const del = await call('DELETE', '/api/coupons/does-not-exist', { token: admin })
  assert.equal(del.status, 404)
})

/* ── Catalog guards ────────────────────────────── */

test('product with order history cannot be deleted — clean 409 with guidance', async () => {
  if (!serverUp) return
  const product = await makeProduct({ stockCount: 10, price: 20 })
  const user = await makeUser('wf-fk')
  const addressId = await makeAddress(user.token)
  await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })

  const admin = await adminToken()
  const { status, body } = await call('DELETE', `/api/products/${product.id}`, { token: admin })
  assert.equal(status, 409, `expected 409, got ${status}: ${body.message ?? ''}`)
  assert.match(body.message, /order history/i)

  // The product still exists
  const still = await productById(product.id)
  ok(still, 'product must still exist after a blocked delete')

  // Clean up: out-of-stock it, then delete is still blocked (order items remain)
  await call('PUT', `/api/products/${product.id}`, { token: admin, body: { inStock: false, stockCount: 0 } })
  const retry = await call('DELETE', `/api/products/${product.id}`, { token: admin })
  assert.equal(retry.status, 409)
})

test('product create/update with a duplicate slug returns 409 (not a 500)', async () => {
  if (!serverUp) return
  const product = await makeProduct()
  const admin = await adminToken()

  const dup = await call('POST', '/api/products', {
    token: admin,
    body: {
      name: 'Duplicate Slug Probe', slug: product.slug, description: 'dup', price: 10,
      categoryId: product.categoryId, inStock: true, stockCount: 1,
    },
  })
  assert.equal(dup.status, 409)
  assert.match(dup.body.message, /slug/i)

  const dupUpdate = await call('PUT', `/api/products/${product.id}`, {
    token: admin, body: { slug: (await makeProduct()).slug },
  })
  assert.equal(dupUpdate.status, 409)
})

test('product update with a nonexistent category returns 400 (not a 500)', async () => {
  if (!serverUp) return
  const product = await makeProduct()
  const admin = await adminToken()
  const { status, body } = await call('PUT', `/api/products/${product.id}`, {
    token: admin, body: { categoryId: 'nonexistent-category-id' },
  })
  assert.equal(status, 400)
  assert.match(body.message, /category/i)
})

test('category with products cannot be deleted — clean 409 with guidance', async () => {
  if (!serverUp) return
  const cats = await getCategories()
  const withProducts = cats.find((c) => (c._count?.products ?? 0) > 0)
  ok(withProducts, 'seed data should include a category with products')

  const admin = await adminToken()
  const { status, body } = await call('DELETE', `/api/categories/${withProducts.id}`, { token: admin })
  assert.equal(status, 409)
  assert.match(body.message, /collection|product/i)
})

test('empty category deletes cleanly; duplicate name returns 409; unknown id 404', async () => {
  if (!serverUp) return
  const admin = await adminToken()
  const name = `WF Collection ${Date.now().toString(36)}`

  const created = await call('POST', '/api/categories', {
    token: admin, body: { name, slug: `wf-collection-${Date.now().toString(36)}`, sortOrder: 99 },
  })
  assert.equal(created.status, 201)

  const dup = await call('POST', '/api/categories', { token: admin, body: { name, slug: `wf-dup-${Date.now().toString(36)}` } })
  assert.equal(dup.status, 409)
  assert.match(dup.body.message, /already exists/i)

  const del = await call('DELETE', `/api/categories/${created.body.data.id}`, { token: admin })
  assert.equal(del.status, 200)

  const gone = await call('DELETE', `/api/categories/${created.body.data.id}`, { token: admin })
  assert.equal(gone.status, 404)
})

test('review and blog deletes return 404 for unknown ids (not a 500)', async () => {
  if (!serverUp) return
  const admin = await adminToken()
  const review = await call('DELETE', '/api/reviews/does-not-exist', { token: admin })
  assert.equal(review.status, 404)
  const blog = await call('DELETE', '/api/blog/does-not-exist', { token: admin })
  assert.equal(blog.status, 404)
})

test('blog create with a duplicate slug returns 409 (not a 500)', async () => {
  if (!serverUp) return
  const admin = await adminToken()
  const { body } = await call('GET', '/api/blog?all=1&limit=1', { token: admin })
  const existing = body.data?.[0]
  ok(existing, 'seed data should include at least one blog post')

  const dup = await call('POST', '/api/blog', {
    token: admin,
    body: {
      title: 'Duplicate Slug Probe', slug: existing.slug, excerpt: 'x', body: 'x',
      category: 'Skincare', author: 'Calesta', readTime: 3, published: false,
    },
  })
  assert.equal(dup.status, 409)
  assert.match(dup.body.message, /slug/i)
})

/* ── Cleanup ───────────────────────────────────── */

test('cleanup: workflow fixtures are deleted or delisted', async () => {
  if (!serverUp) return
  const admin = await adminToken()

  // Products: delete where possible; order history blocks deletion, so delist
  const products = await freshProducts()
  for (const p of products.filter((p) => p.slug.startsWith('test-wf-'))) {
    const del = await call('DELETE', `/api/products/${p.id}`, { token: admin })
    if (del.status !== 200) {
      await call('PUT', `/api/products/${p.id}`, { token: admin, body: { inStock: false, stockCount: 0 } })
    }
  }

  // Coupons
  const { body: couponList } = await call('GET', '/api/coupons', { token: admin })
  for (const c of (couponList.data ?? []).filter((c) => c.code.startsWith('WFT'))) {
    await call('DELETE', `/api/coupons/${c.id}`, { token: admin })
  }

  // Workflow categories (empty by now)
  const { body: catList } = await call('GET', '/api/categories', { token: admin })
  for (const c of (catList.data ?? []).filter((c) => (c.slug ?? '').startsWith('wf-'))) {
    await call('DELETE', `/api/categories/${c.id}`, { token: admin })
  }
})

import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  call, isServerUp, adminToken, customerToken,
  pickStockedProduct, seededProduct, getProducts, makeUser, makeAddress,
} from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

/* ── Create reviews ───────────────────────────── */
test('POST /api/reviews creates a review with a verified purchase badge', async () => {
  if (!serverUp) return
  const user = await makeUser('rev')
  const addressId = await makeAddress(user.token)
  const product = await pickStockedProduct(1)

  // Buy it first
  const { body: created } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })

  // Deliver it — "verified purchase" requires a DELIVERED or SHIPPED order
  await call('PATCH', `/api/orders/${created.data.id}/status`, {
    token: await adminToken(),
    body: { status: 'DELIVERED' },
  })

  const { status, body } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 5, title: 'Great', body: 'Really great product for testing.' },
  })
  assert.equal(status, 201)
  assert.equal(body.data.rating, 5)
  assert.equal(body.data.verified, true)
})

test('POST /api/reviews marks unverified for non-purchasers', async () => {
  if (!serverUp) return
  const user = await makeUser('rev2')
  const product = await seededProduct()

  const { status, body } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 4, body: 'Bought nothing, still reviewing.' },
  })
  assert.equal(status, 201)
  assert.equal(body.data.verified, false)
})

test('POST /api/reviews rejects duplicate reviews by the same user', async () => {
  if (!serverUp) return
  const user = await makeUser('rev3')
  // Use a stable seeded product — parallel tests may delete their own test products
  const product = await seededProduct()
  const reviewBody = { productId: product.id, rating: 4, body: 'First take.' }

  const first = await call('POST', '/api/reviews', { token: user.token, body: reviewBody })
  assert.equal(first.status, 201)
  const { status } = await call('POST', '/api/reviews', { token: user.token, body: reviewBody })
  assert.equal(status, 409)
})

test('POST /api/reviews validates rating range and required body', async () => {
  if (!serverUp) return
  const user = await makeUser('rev4')
  const product = await seededProduct()

  const { status: tooHigh } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 9, body: 'x' },
  })
  assert.equal(tooHigh, 400)

  const { status: noBody } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 5 },
  })
  assert.equal(noBody, 400)
})

test('POST /api/reviews rejects unauthenticated requests', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/reviews', { body: { productId: 'x', rating: 5, body: 'y' } })
  assert.equal(status, 401)
})

/* ── Read reviews ─────────────────────────────── */
test('GET /api/reviews/product/:id only shows approved reviews', async () => {
  if (!serverUp) return
  const user = await makeUser('rev5')
  const product = await seededProduct()

  const { body: created } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 5, body: 'Awaiting moderation.' },
  })
  assert.equal(created.data.approved, false)

  // Not approved → hidden from the public product reviews
  const { body: list } = await call('GET', `/api/reviews/product/${product.id}`)
  const visible = (list.data ?? []).some((r) => r.id === created.data.id)
  assert.equal(visible, false)

  // Approve as admin → now visible
  await call('PATCH', `/api/reviews/${created.data.id}/approved`, {
    token: await adminToken(),
    body: { approved: true },
  })
  const { body: listAfter } = await call('GET', `/api/reviews/product/${product.id}`)
  const visibleAfter = (listAfter.data ?? []).some((r) => r.id === created.data.id)
  assert.equal(visibleAfter, true)
})

/* ── Admin review management ──────────────────── */
test('GET /api/reviews (admin) lists all reviews with pagination', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/reviews?limit=5', { token: await adminToken() })
  assert.equal(status, 200)
  assert.ok(Array.isArray(body.data))
  assert.ok(body.pagination.total >= body.data.length)
  assert.ok(body.data[0].user?.email !== undefined)
  assert.ok(body.data[0].product?.name !== undefined)
})

test('GET /api/reviews rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/reviews', { token: await customerToken() })
  assert.equal(status, 403)
})

test('PATCH approve recalculates the product aggregate rating', async () => {
  if (!serverUp) return
  const user = await makeUser('rev6')
  const product = await seededProduct()

  // Baseline: approved reviews on this product BEFORE the test
  const { body: beforeList } = await call('GET', `/api/reviews/product/${product.id}`)
  const approvedBefore = beforeList.data ?? []
  const beforeSum = approvedBefore.reduce((s, r) => s + r.rating, 0)
  const beforeCount = approvedBefore.length
  const baselineRating = beforeCount > 0 ? beforeSum / beforeCount : 0

  const { body: created } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 2, body: 'Not for me.' },
  })

  await call('PATCH', `/api/reviews/${created.data.id}/approved`, {
    token: await adminToken(),
    body: { approved: true },
  })

  // Aggregate = average of ALL approved reviews, including the new 2-star one
  const expectedAvg = (beforeSum + 2) / (beforeCount + 1)
  const { body: detail } = await call('GET', `/api/products/${product.slug}`)
  assert.ok(
    Math.abs(Number(detail.data.rating) - expectedAvg) < 0.02,
    `rating ${detail.data.rating} vs expected ${expectedAvg}`
  )

  // Unapprove → aggregate returns to the baseline
  await call('PATCH', `/api/reviews/${created.data.id}/approved`, {
    token: await adminToken(),
    body: { approved: false },
  })
  const { body: after } = await call('GET', `/api/products/${product.slug}`)
  assert.ok(
    Math.abs(Number(after.data.rating) - baselineRating) < 0.02,
    `rating ${after.data.rating} vs baseline ${baselineRating}`
  )
})

test('admin can delete a review', async () => {
  if (!serverUp) return
  const user = await makeUser('rev7')
  const product = await seededProduct()
  const { body: created } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 3, body: 'To be deleted.' },
  })

  const { status } = await call('DELETE', `/api/reviews/${created.data.id}`, { token: await adminToken() })
  assert.equal(status, 200)
  const { status: gone } = await call('PATCH', `/api/reviews/${created.data.id}/approved`, {
    token: await adminToken(),
    body: { approved: true },
  })
  assert.equal(gone, 404)
})

/* ── Storefront review summary + own review ───── */
test('GET /api/reviews/product/:id returns a rating summary with a 5-star distribution', async () => {
  if (!serverUp) return
  const product = await seededProduct()

  const { status, body } = await call('GET', `/api/reviews/product/${product.id}?limit=2`)
  assert.equal(status, 200)
  assert.ok(body.summary, 'summary is present')
  assert.equal(body.summary.total, body.pagination.total)
  assert.deepEqual(Object.keys(body.summary.distribution).sort(), ['1', '2', '3', '4', '5'])

  const bucketTotal = Object.values(body.summary.distribution).reduce((sum, count) => sum + count, 0)
  assert.equal(bucketTotal, body.summary.total, 'distribution adds up to the total')

  if (body.summary.total > 0) {
    assert.ok(body.summary.average > 0 && body.summary.average <= 5)
  } else {
    assert.equal(body.summary.average, 0)
  }
})

test('GET /api/reviews/product/:id/mine reports anonymous and signed-in states', async () => {
  if (!serverUp) return
  const product = await seededProduct()

  const anonymous = await call('GET', `/api/reviews/product/${product.id}/mine`)
  assert.equal(anonymous.status, 200)
  assert.equal(anonymous.body.data.signedIn, false)
  assert.equal(anonymous.body.data.review, null)
  assert.equal(anonymous.body.data.canReview, false)

  const user = await makeUser('mine')
  const before = await call('GET', `/api/reviews/product/${product.id}/mine`, { token: user.token })
  assert.equal(before.body.data.signedIn, true)
  assert.equal(before.body.data.canReview, true)
  assert.equal(before.body.data.review, null)

  const { body: created } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 4, body: 'A thoughtful review for the mine endpoint.' },
  })
  assert.equal(created.success, true)

  const after = await call('GET', `/api/reviews/product/${product.id}/mine`, { token: user.token })
  assert.equal(after.body.data.canReview, false)
  assert.equal(after.body.data.review.id, created.data.id)
  assert.equal(after.body.data.review.approved, false, 'pending reviews are still returned to their author')
})

test('pending reviews do not affect the public summary until approved', async () => {
  if (!serverUp) return
  const user = await makeUser('summary')
  const product = await seededProduct()

  const { body: before } = await call('GET', `/api/reviews/product/${product.id}`)
  const totalBefore = before.summary.total

  const { body: created } = await call('POST', '/api/reviews', {
    token: user.token,
    body: { productId: product.id, rating: 5, body: 'Five stars, pending moderation.' },
  })

  const { body: pending } = await call('GET', `/api/reviews/product/${product.id}`)
  assert.equal(pending.summary.total, totalBefore, 'unapproved reviews stay out of the summary')

  const admin = await adminToken()
  await call('PATCH', `/api/reviews/${created.data.id}/approved`, { token: admin, body: { approved: true } })

  const { body: approved } = await call('GET', `/api/reviews/product/${product.id}`)
  assert.equal(approved.summary.total, totalBefore + 1)
  assert.ok(approved.data.some((review) => review.id === created.data.id))
})

test('POST /api/reviews validates integer ratings and review length, and trims input', async () => {
  if (!serverUp) return
  const product = await seededProduct()

  const fractional = await makeUser('val1')
  const fractionalRes = await call('POST', '/api/reviews', {
    token: fractional.token,
    body: { productId: product.id, rating: 4.5, body: 'Half a star is not a rating.' },
  })
  assert.equal(fractionalRes.status, 400)

  const short = await makeUser('val2')
  const shortRes = await call('POST', '/api/reviews', {
    token: short.token,
    body: { productId: product.id, rating: 5, body: 'Too short' },
  })
  assert.equal(shortRes.status, 400, 'bodies under 10 characters are rejected')

  const long = await makeUser('val3')
  const longRes = await call('POST', '/api/reviews', {
    token: long.token,
    body: { productId: product.id, rating: 5, body: 'x'.repeat(2001) },
  })
  assert.equal(longRes.status, 400, 'bodies over 2,000 characters are rejected')

  const valid = await makeUser('val4')
  const created = await call('POST', '/api/reviews', {
    token: valid.token,
    body: {
      productId: product.id,
      rating: 5,
      title: `  ${'T'.repeat(150)}  `,
      body: '   A perfectly valid review with surrounding whitespace.   ',
    },
  })
  assert.equal(created.status, 201)
  assert.equal(created.body.data.body, 'A perfectly valid review with surrounding whitespace.')
  assert.equal(created.body.data.title.length, 120, 'long titles are truncated, not rejected')
})

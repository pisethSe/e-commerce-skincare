import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { call, isServerUp, adminToken, customerToken, makeUser, getProducts, BASE, stableProducts, seededProduct } from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

test('POST /api/uploads rejects unauthenticated requests', async () => {
  if (!serverUp) return
  const form = new FormData()
  const res = await fetch(`${BASE}/api/uploads`, { method: 'POST', body: form })
  assert.equal(res.status, 401)
})

test('admin can upload an image and the URL serves statically', async () => {
  if (!serverUp) return
  // 1x1 transparent PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  )
  const token = await adminToken()
  const form = new FormData()
  form.append('image', new Blob([png], { type: 'image/png' }), 'test.png')
  const res = await fetch(`${BASE}/api/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const result = await res.json()
  assert.equal(res.status, 201)
  assert.ok(result.data.url.startsWith('/uploads/'))

  // The uploaded file serves back
  const serve = await fetch(`${BASE}${result.data.url}`)
  assert.equal(serve.status, 200)
  assert.equal(serve.headers.get('content-type'), 'image/png')
})

test('non-admin cannot upload images', async () => {
  if (!serverUp) return
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  )
  const form = new FormData()
  form.append('image', new Blob([png], { type: 'image/png' }), 'sneaky.png')
  const res = await fetch(`${BASE}/api/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await customerToken()}` },
    body: form,
  })
  assert.equal(res.status, 403)
})

test('cart requires authentication', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/cart')
  assert.equal(status, 401)
})

test('full cart lifecycle: add, read, update, remove, clear', async () => {
  if (!serverUp) return
  const user = await makeUser('cart')
  // Stable seeded products — immune to parallel test cleanups
  const [productA, productB] = await stableProducts(2)

  // ADD — the API returns 200 with the upserted item
  const { status: addStatus, body: addBody } = await call('POST', '/api/cart', {
    token: user.token,
    body: { productId: productA.id, quantity: 2 },
  })
  assert.equal(addStatus, 200)
  assert.equal(addBody.success, true)

  // READ — the cart contains the item
  const { body: cartBody } = await call('GET', '/api/cart', { token: user.token })
  const items = cartBody.data ?? []
  const found = items.find((i) => i.productId === productA.id || i.product?.id === productA.id)
  assert.ok(found, 'added product should appear in the cart')
  assert.equal(found.quantity, 2)

  // ADD same product again — quantity increments or merges
  await call('POST', '/api/cart', { token: user.token, body: { productId: productA.id, quantity: 1 } })
  const { body: merged } = await call('GET', '/api/cart', { token: user.token })
  const mergedItem = (merged.data ?? []).find((i) => (i.productId ?? i.product?.id) === productA.id)
  assert.ok(mergedItem.quantity >= 2, 'quantity should persist after a second add')

  // UPDATE — set quantity to 4
  const { status: updateStatus } = await call('PATCH', `/api/cart/${productA.id}`, {
    token: user.token,
    body: { quantity: 4 },
  })
  assert.equal(updateStatus, 200)
  const { body: afterUpdate } = await call('GET', '/api/cart', { token: user.token })
  const updated = (afterUpdate.data ?? []).find((i) => (i.productId ?? i.product?.id) === productA.id)
  assert.equal(updated.quantity, 4)

  // UPDATE to 0 — removes the item
  await call('PATCH', `/api/cart/${productA.id}`, { token: user.token, body: { quantity: 0 } })
  const { body: afterZero } = await call('GET', '/api/cart', { token: user.token })
  const zeroed = (afterZero.data ?? []).find((i) => (i.productId ?? i.product?.id) === productA.id)
  assert.ok(!zeroed, 'setting quantity to 0 should remove the item')

  // ADD second product, then REMOVE it
  await call('POST', '/api/cart', { token: user.token, body: { productId: productB.id, quantity: 1 } })
  const { status: removeStatus } = await call('DELETE', `/api/cart/${productB.id}`, { token: user.token })
  assert.equal(removeStatus, 200)
  const { body: afterRemove } = await call('GET', '/api/cart', { token: user.token })
  const removed = (afterRemove.data ?? []).find((i) => (i.productId ?? i.product?.id) === productB.id)
  assert.ok(!removed, 'removed product should not appear in the cart')

  // CLEAR
  await call('POST', '/api/cart', { token: user.token, body: { productId: productA.id, quantity: 3 } })
  const { status: clearStatus } = await call('DELETE', '/api/cart', { token: user.token })
  assert.equal(clearStatus, 200)
  const { body: afterClear } = await call('GET', '/api/cart', { token: user.token })
  assert.equal((afterClear.data ?? []).length, 0)
})

test('carts are isolated per user', async () => {
  if (!serverUp) return
  const userA = await makeUser('cartA')
  const userB = await makeUser('cartB')
  const product = await seededProduct()

  await call('POST', '/api/cart', { token: userA.token, body: { productId: product.id, quantity: 1 } })

  const { body: cartB } = await call('GET', '/api/cart', { token: userB.token })
  assert.equal((cartB.data ?? []).length, 0, 'user B should not see user A\'s cart')
})

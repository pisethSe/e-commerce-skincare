import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  call, isServerUp, adminToken, customerToken,
  pickStockedProduct, freshProducts, makeUser, makeAddress,
} from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

/* ── Create order — happy path with coupon math ── */
test('POST /api/orders creates an order with correct coupon, shipping, and tax math', async () => {
  if (!serverUp) return
  const user = await makeUser('order')
  const addressId = await makeAddress(user.token)
  const product = await pickStockedProduct(2)

  const { status, body } = await call('POST', '/api/orders', {
    token: user.token,
    body: {
      items: [{ productId: product.id, quantity: 2 }],
      addressId,
      couponCode: 'WELCOME15', // 15%
      paymentMethod: 'card',
    },
  })
  assert.equal(status, 201)
  const order = body.data

  // Math: subtotal = price * 2; discount = 15%; shipping = 0 if >= 75 else 8.95; tax 8%
  const subtotal = Number(product.price) * 2
  const discount = subtotal * 0.15
  const shipping = subtotal - discount >= 75 ? 0 : 8.95
  const tax = (subtotal - discount) * 0.08
  const total = subtotal - discount + shipping + tax

  assert.ok(Math.abs(Number(order.subtotal) - subtotal) < 0.01, `subtotal ${order.subtotal} vs ${subtotal}`)
  assert.ok(Math.abs(Number(order.discount) - discount) < 0.01)
  assert.ok(Math.abs(Number(order.shipping) - shipping) < 0.01)
  assert.ok(Math.abs(Number(order.tax) - tax) < 0.01)
  assert.ok(Math.abs(Number(order.total) - total) < 0.01)
  assert.ok(order.orderNumber.startsWith('LUM-'))
  assert.equal(order.status, 'PENDING')
  assert.equal(order.items.length, 1)
  assert.equal(order.items[0].quantity, 2)
})

test('POST /api/orders decrements product stock', async () => {
  if (!serverUp) return
  const user = await makeUser('stock')
  const addressId = await makeAddress(user.token)
  const product = await pickStockedProduct(1)

  const beforeStock = product.stockCount
  const { status } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })
  assert.equal(status, 201)

  const { body: detail } = await call('GET', `/api/products/${product.slug}`)
  if (detail.data) {
    assert.equal(detail.data.stockCount, beforeStock - 1)
  }
})

test('POST /api/orders has one shipping method and accepts card/aba_payway/bakong', async () => {
  if (!serverUp) return
  const user = await makeUser('ship')
  const addressId = await makeAddress(user.token)
  // Six orders from one product — needs a product with plenty of stock
  const product = await pickStockedProduct(10)

  // Legacy method names map back to standard pricing (free over $75, else 8.95)
  for (const legacy of ['express', 'overnight', 'teleport']) {
    const { status: legacyStatus, body: legacyBody } = await call('POST', '/api/orders', {
      token: user.token,
      body: { items: [{ productId: product.id, quantity: 1 }], addressId, shippingMethod: legacy },
    })
    assert.equal(legacyStatus, 201, `legacy method ${legacy} should still place an order: ${legacyBody.message ?? ''}`)
    const expectedShipping = Number(legacyBody.data.subtotal) >= 75 ? 0 : 8.95
    assert.ok(
      Math.abs(Number(legacyBody.data.shipping) - expectedShipping) < 0.01,
      `${legacy} shipping should be standard (${expectedShipping}), got ${legacyBody.data.shipping}`
    )
  }

  // Payment methods — all three accepted
  for (const paymentMethod of ['card', 'aba_payway', 'bakong']) {
    const { status: statusOk, body: payOrder } = await call('POST', '/api/orders', {
      token: user.token,
      body: { items: [{ productId: product.id, quantity: 1 }], addressId, paymentMethod },
    })
    assert.equal(statusOk, 201, `paymentMethod ${paymentMethod} should be accepted`)
    assert.equal(payOrder.data.paymentMethod, paymentMethod, 'payment method should be recorded')
  }

  // Unknown payment method rejected
  const { status: badPay, body: badPayBody } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, paymentMethod: 'paypal' },
  })
  assert.equal(badPay, 400)
  assert.match(badPayBody.message, /card, aba_payway, or bakong/i)
})

/* ── Create order — validation ─────────────────── */
test('POST /api/orders rejects empty item lists', async () => {
  if (!serverUp) return
  const user = await makeUser('o1')
  const addressId = await makeAddress(user.token)
  const { status } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [], addressId },
  })
  assert.equal(status, 400)
})

test('POST /api/orders rejects missing address', async () => {
  if (!serverUp) return
  const product = await pickStockedProduct(1)
  const user = await makeUser('o2')
  const { status } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }] },
  })
  assert.equal(status, 400)
})

test('POST /api/orders rejects an address owned by someone else', async () => {
  if (!serverUp) return
  const owner = await makeUser('o3')
  const attacker = await makeUser('o4')
  const addressId = await makeAddress(owner.token)
  const product = await pickStockedProduct(1)
  const { status } = await call('POST', '/api/orders', {
    token: attacker.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })
  assert.equal(status, 400)
})

test('POST /api/orders rejects unknown product ids', async () => {
  if (!serverUp) return
  const user = await makeUser('o5')
  const addressId = await makeAddress(user.token)
  const { status } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: 'nonexistent-product-id', quantity: 1 }], addressId },
  })
  assert.equal(status, 404)
})

test('POST /api/orders rejects unauthenticated requests', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/orders', { body: { items: [{ productId: 'x', quantity: 1 }] } })
  assert.equal(status, 401)
})

/* ── Read orders ──────────────────────────────── */
test('GET /api/orders/my lists the customer\'s own orders', async () => {
  if (!serverUp) return
  const token = await customerToken()
  const { status, body } = await call('GET', '/api/orders/my', { token })
  assert.equal(status, 200)
  assert.ok(Array.isArray(body.data))
  assert.ok(body.pagination.total >= 1)
})

test('GET /api/orders/my rejects unauthenticated requests', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/orders/my')
  assert.equal(status, 401)
})

test('GET /api/orders/:id works for the order owner', async () => {
  if (!serverUp) return
  const user = await makeUser('o6')
  const addressId = await makeAddress(user.token)
  const product = await pickStockedProduct(1)
  const { body: created } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })
  const { status, body } = await call('GET', `/api/orders/${created.data.id}`, { token: user.token })
  assert.equal(status, 200)
  assert.equal(body.data.id, created.data.id)
})

test('GET /api/orders/:id hides other users\' orders', async () => {
  if (!serverUp) return
  const owner = await makeUser('o7')
  const stranger = await makeUser('o8')
  const addressId = await makeAddress(owner.token)
  const product = await pickStockedProduct(1)
  const { body: created } = await call('POST', '/api/orders', {
    token: owner.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })
  const { status } = await call('GET', `/api/orders/${created.data.id}`, { token: stranger.token })
  assert.equal(status, 404)
})

/* ── Admin order management ───────────────────── */
test('GET /api/orders (admin) lists all orders', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/orders?limit=5', { token: await adminToken() })
  assert.equal(status, 200)
  assert.ok(body.data.length >= 1)
  assert.ok(body.pagination.total >= body.data.length)
})

test('GET /api/orders rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/orders', { token: await customerToken() })
  assert.equal(status, 403)
})

test('PATCH /api/orders/:id/status updates the order status (admin)', async () => {
  if (!serverUp) return
  const user = await makeUser('o9')
  const addressId = await makeAddress(user.token)
  const product = await pickStockedProduct(1)
  const { body: created } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })

  const { status, body } = await call('PATCH', `/api/orders/${created.data.id}/status`, {
    token: await adminToken(),
    body: { status: 'SHIPPED' },
  })
  assert.equal(status, 200)
  assert.equal(body.data.status, 'SHIPPED')
})

test('PATCH /api/orders/:id/status rejects invalid statuses', async () => {
  if (!serverUp) return
  const user = await makeUser('o10')
  const addressId = await makeAddress(user.token)
  const product = await pickStockedProduct(1)
  const { body: created } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId },
  })
  const { status } = await call('PATCH', `/api/orders/${created.data.id}/status`, {
    token: await adminToken(),
    body: { status: 'TELEPORTED' },
  })
  assert.equal(status, 400)
})

test('PATCH /api/orders/:id/status rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('PATCH', '/api/orders/some-id/status', {
    token: await customerToken(),
    body: { status: 'SHIPPED' },
  })
  assert.equal(status, 403)
})

/* ── Admin stats ──────────────────────────────── */
test('GET /api/admin/stats returns the full dashboard shape', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/admin/stats', { token: await adminToken() })
  assert.equal(status, 200)
  const data = body.data
  assert.ok(data.revenue && typeof data.revenue.current === 'number')
  assert.ok(data.orders && typeof data.orders.pending === 'number')
  assert.ok(data.customers && typeof data.customers.current === 'number')
  assert.ok(Array.isArray(data.revenueChart) && data.revenueChart.length === 7)
  assert.ok(Array.isArray(data.recentOrders))
  assert.ok(Array.isArray(data.topProducts))
})

test('GET /api/admin/stats rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/admin/stats', { token: await customerToken() })
  assert.equal(status, 403)
})

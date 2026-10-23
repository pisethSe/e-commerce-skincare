import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  call, isServerUp, adminToken,
  pickStockedProduct, makeUser, makeAddress,
} from './helpers.mjs'

let serverUp = false
let fixture = null

before(async () => {
  serverUp = await isServerUp()
  if (!serverUp) return

  // One real order shared by the read-only assertions. Status/tracking tests
  // come last, so the earlier expectations always see the original order.
  const user = await makeUser('track')
  const addressId = await makeAddress(user.token)
  const product = await pickStockedProduct(2)
  const { status, body } = await call('POST', '/api/orders', {
    token: user.token,
    body: {
      items: [{ productId: product.id, quantity: 2 }],
      addressId,
      paymentMethod: 'aba_payway',
    },
  })
  assert.equal(status, 201)
  fixture = { user, product, order: body.data }
})

const track = (body) => call('POST', '/api/orders/track', { body })

test('POST /api/orders/track requires an order number and email', async () => {
  if (!serverUp) return

  for (const body of [{}, { orderNumber: fixture.order.orderNumber }, { email: fixture.user.email }]) {
    const { status, body: response } = await track(body)
    assert.equal(status, 400)
    assert.match(response.message, /order number and email/i)
  }
})

test('POST /api/orders/track hides whether an order number exists', async () => {
  if (!serverUp) return

  const unknown = await track({ orderNumber: 'LUM-NOPE-0000', email: 'nobody@test.calesta.dev' })
  assert.equal(unknown.status, 404)

  // A real order number with the wrong email must look identical to an
  // unknown order — no confirmation that the number exists.
  const wrongEmail = await track({
    orderNumber: fixture.order.orderNumber,
    email: 'not-the-buyer@test.calesta.dev',
  })
  assert.equal(wrongEmail.status, 404)
  assert.equal(wrongEmail.body.message, unknown.body.message)
})

test('POST /api/orders/track returns a limited, case-insensitive order view', async () => {
  if (!serverUp) return

  const { status, body } = await track({
    orderNumber: `  ${fixture.order.orderNumber.toLowerCase()}  `,
    email: `  ${fixture.user.email.toUpperCase()}  `,
  })
  assert.equal(status, 200)

  const data = body.data
  assert.equal(data.orderNumber, fixture.order.orderNumber)
  assert.equal(data.status, 'PENDING')
  assert.equal(data.paymentStatus, 'UNPAID')
  assert.equal(data.paymentMethod, 'aba_payway')
  assert.equal(data.itemCount, 2)
  assert.equal(data.items.length, 1)
  assert.equal(data.items[0].quantity, 2)
  assert.equal(typeof data.items[0].price, 'number')
  assert.equal(typeof data.total, 'number')
  assert.equal(typeof data.subtotal, 'number')
  assert.equal(data.shippingTo.city, 'Phnom Penh')
  assert.equal(data.shippingTo.country, 'Cambodia')

  // Only what a shopper needs: no account ids, email, or payment references.
  for (const privateField of ['id', 'userId', 'email', 'addressId', 'paymentId', 'couponId']) {
    assert.equal(privateField in data, false, `${privateField} leaked in the public payload`)
  }
})

test('POST /api/orders/track reflects admin status and tracking updates', async () => {
  if (!serverUp) return

  const admin = await adminToken()
  const orderId = fixture.order.id
  const orderNumber = fixture.order.orderNumber
  const email = fixture.user.email

  const shipped = await call('PATCH', `/api/orders/${orderId}/status`, {
    token: admin,
    body: { status: 'SHIPPED' },
  })
  assert.equal(shipped.status, 200)

  const tracking = await call('PATCH', `/api/orders/${orderId}/tracking`, {
    token: admin,
    body: { trackingNumber: 'KH-123456789' },
  })
  assert.equal(tracking.status, 200)

  const { status, body } = await track({ orderNumber, email })
  assert.equal(status, 200)
  assert.equal(body.data.status, 'SHIPPED')
  assert.equal(body.data.trackingNumber, 'KH-123456789')
})

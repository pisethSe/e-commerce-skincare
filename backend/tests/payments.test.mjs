/**
 * Payment tests — the KHQR encoder (unit), the payment config flags, and the
 * credential-gated gateway endpoints. Without merchant credentials the
 * gateways respond 501 and the Bakong flow settles in demo mode.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildKhqr, crc16, parseKhqr } from '../src/lib/khqr.ts'
import { call, isServerUp, customerToken, makeUser, makeAddress, pickStockedProduct } from './helpers.mjs'

const serverUp = await isServerUp()

/* ── KHQR encoder (pure unit — no server needed) ── */
test('KHQR payload: EMVCo structure, currency, amount, and CRC checksum', () => {
  const qr = buildKhqr({
    bakongAccountId: 'piseth@aba',
    merchantName: 'CALESTA',
    merchantCity: 'PHNOM PENH',
    amount: 55.15,
    currency: 'USD',
    billNumber: 'LUM-TEST-0001',
  })

  const tags = parseKhqr(qr)
  assert.equal(tags['00'], '01', 'payload format indicator')
  assert.equal(tags['01'], '12', 'dynamic point of initiation')
  assert.equal(tags['53'], '840', 'USD currency code')
  assert.equal(tags['54'], '55.15', 'amount with 2 decimals')
  assert.equal(tags['58'], 'KH', 'country code')
  assert.equal(tags['59'], 'CALESTA', 'merchant name')
  assert.equal(tags['60'], 'PHNOM PENH', 'merchant city')
  // Tag 29 nests Bakong's application identifier + the account ID
  const account = parseKhqr(tags['29'])
  assert.equal(account['00'], 'A000000775', 'Bakong application identifier')
  assert.equal(account['01'], 'piseth@aba', 'Bakong account ID')
  // Tag 62/05 carries the bill number
  const additional = parseKhqr(tags['62'])
  assert.equal(additional['05'], 'LUM-TEST-0001', 'bill number = order reference')

  // The trailing CRC must equal CRC-16/CCITT over the payload + '6304'
  const body = qr.slice(0, -4)
  assert.equal(qr.slice(-4), crc16(body), 'CRC checksum matches the payload')
})

test('KHQR: KHR amounts are whole riel with the 116 currency code', () => {
  const qr = buildKhqr({
    bakongAccountId: 'piseth@aba',
    merchantName: 'CALESTA',
    amount: 225850.7,
    currency: 'KHR',
    billNumber: 'LUM-TEST-0002',
  })
  const tags = parseKhqr(qr)
  assert.equal(tags['53'], '116', 'KHR currency code')
  assert.equal(tags['54'], '225851', 'amount rounded to whole riel')
})

test('KHQR: long merchant names and bill numbers are truncated to spec', () => {
  const qr = buildKhqr({
    bakongAccountId: 'piseth@aba',
    merchantName: 'A Very Long Merchant Name That Exceeds Limits',
    amount: 10,
    currency: 'USD',
    billNumber: 'AN-EXTREMELY-LONG-ORDER-REFERENCE-NUMBER-123456789',
  })
  const tags = parseKhqr(qr)
  assert.ok(tags['59'].length <= 25, 'merchant name max 25 chars')
  const additional = parseKhqr(tags['62'])
  assert.ok(additional['05'].length <= 25, 'bill number max 25 chars')
})

/* ── Payment endpoints (server) ─────────────────── */

test('GET /api/payments/config reports gateway availability', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/payments/config')
  assert.equal(status, 200)
  assert.equal(typeof body.data.stripe, 'boolean')
  assert.equal(typeof body.data.bakong, 'boolean')
  assert.ok(['USD', 'KHR'].includes(body.data.currency))
})

test('Bakong QR requires authentication and a configured account', async () => {
  if (!serverUp) return
  const anon = await call('POST', '/api/payments/bakong/qr', { body: { orderId: 'x' } })
  assert.equal(anon.status, 401)
})

test('Bakong verify settles the order (demo mode without a token)', async () => {
  if (!serverUp) return
  const user = await makeUser('pay')
  const addressId = await makeAddress(user.token)
  const product = await pickStockedProduct(5)
  const { body: orderBody } = await call('POST', '/api/orders', {
    token: user.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, paymentMethod: 'bakong' },
  })
  assert.equal(orderBody.data.paymentStatus, 'UNPAID', 'orders start unpaid')

  const { status, body } = await call('POST', '/api/payments/bakong/verify', {
    token: user.token,
    body: { orderId: orderBody.data.id },
  })
  // With a Bakong token configured this is a real check; without one the demo
  // settles the order — both paths answer success
  assert.equal(status, 200, `verify failed: ${body.message ?? ''}`)
  assert.equal(body.data.paymentStatus, 'PAID')

  // The order is now paid for real in the database
  const mine = await call('GET', `/api/orders/${orderBody.data.id}`, { token: user.token })
  assert.equal(mine.body.data.paymentStatus, 'PAID')
  assert.ok(mine.body.data.paymentId, 'a payment reference was recorded')
})

test('Bakong verify for another user\'s order is 404', async () => {
  if (!serverUp) return
  const owner = await makeUser('payowner')
  const stranger = await makeUser('paystranger')
  const addressId = await makeAddress(owner.token)
  const product = await pickStockedProduct(5)
  const { body: orderBody } = await call('POST', '/api/orders', {
    token: owner.token,
    body: { items: [{ productId: product.id, quantity: 1 }], addressId, paymentMethod: 'bakong' },
  })
  const { status } = await call('POST', '/api/payments/bakong/verify', {
    token: stranger.token,
    body: { orderId: orderBody.data.id },
  })
  assert.equal(status, 404)
})

test('Stripe endpoints answer 501 until credentials are configured', async () => {
  if (!serverUp) return
  const user = await makeUser('stripe')
  const { status: sessionStatus, body: sessionBody } = await call('POST', '/api/payments/stripe/session', {
    token: user.token,
    body: { orderId: 'whatever' },
  })
  if (sessionStatus === 501) {
    assert.match(sessionBody.message, /not configured/i)
  } else {
    // If a real key is configured locally, the missing order must 404 instead
    assert.equal(sessionStatus, 404)
  }
  const { status: verifyStatus } = await call('GET', '/api/payments/stripe/verify?orderId=x&session_id=y', {
    token: user.token,
  })
  assert.ok([501, 404].includes(verifyStatus), 'verify is 501 unconfigured or 404 for a missing order')
})

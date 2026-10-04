import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { call, isServerUp, adminToken, customerToken } from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

/* ── Validate (public) ────────────────────────── */
test('coupon validate computes a percentage discount correctly', async () => {
  if (!serverUp) return
  const { status, body } = await call('POST', '/api/coupons/validate', {
    body: { code: 'WELCOME15', orderTotal: 100 },
  })
  assert.equal(status, 200)
  assert.equal(body.success, true)
  assert.ok(Math.abs(Number(body.data.discount) - 15) < 0.01, `expected 15, got ${body.data.discount}`)
})

test('coupon validate computes a fixed discount correctly', async () => {
  if (!serverUp) return
  // FREESHIP is $9 off with a $50 minimum
  const { status, body } = await call('POST', '/api/coupons/validate', {
    body: { code: 'FREESHIP', orderTotal: 80 },
  })
  assert.equal(status, 200)
  assert.ok(Math.abs(Number(body.data.discount) - 9) < 0.01)
})

test('coupon validate rejects codes below the minimum order', async () => {
  if (!serverUp) return
  const { status, body } = await call('POST', '/api/coupons/validate', {
    body: { code: 'FREESHIP', orderTotal: 30 },
  })
  assert.equal(status, 400)
  assert.ok(body.message.includes('Minimum order'))
})

test('coupon validate rejects unknown codes', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/coupons/validate', {
    body: { code: 'NO-SUCH-CODE', orderTotal: 100 },
  })
  assert.equal(status, 404)
})

/* ── Admin CRUD ───────────────────────────────── */
test('admin can create, toggle, and delete a coupon', async () => {
  if (!serverUp) return
  const token = await adminToken()
  const code = `TEST-${Date.now().toString(36).toUpperCase()}`

  // CREATE — 20% off
  const { status: createStatus, body: createBody } = await call('POST', '/api/coupons', {
    token,
    body: { code, type: 'PERCENTAGE', value: 20, active: true, maxUses: 10 },
  })
  assert.equal(createStatus, 201)
  const created = createBody.data

  // The new code validates
  const { status: validStatus, body: validBody } = await call('POST', '/api/coupons/validate', {
    body: { code, orderTotal: 50 },
  })
  assert.equal(validStatus, 200)
  assert.ok(Math.abs(Number(validBody.data.discount) - 10) < 0.01)

  // TOGGLE off via PATCH
  const { status: patchStatus, body: patchBody } = await call('PATCH', `/api/coupons/${created.id}`, {
    token,
    body: { active: false },
  })
  assert.equal(patchStatus, 200)
  assert.equal(patchBody.data.active, false)

  // Deactivated code no longer validates
  const { status: inactiveStatus } = await call('POST', '/api/coupons/validate', {
    body: { code, orderTotal: 50 },
  })
  assert.equal(inactiveStatus, 404)

  // DELETE
  const { status: deleteStatus } = await call('DELETE', `/api/coupons/${created.id}`, { token })
  assert.equal(deleteStatus, 200)
  const { status: gone } = await call('POST', '/api/coupons/validate', {
    body: { code, orderTotal: 50 },
  })
  assert.equal(gone, 404)
})

test('GET /api/coupons (admin) lists all coupons', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/coupons', { token: await adminToken() })
  assert.equal(status, 200)
  assert.ok(body.data.length >= 3, 'seeded coupons should be listed')
})

test('GET /api/coupons rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/coupons', { token: await customerToken() })
  assert.equal(status, 403)
})

test('POST /api/coupons rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/coupons', {
    token: await customerToken(),
    body: { code: 'SNEAKY', type: 'PERCENTAGE', value: 99 },
  })
  assert.equal(status, 403)
})

test('PATCH /api/coupons rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('PATCH', '/api/coupons/some-id', {
    token: await customerToken(),
    body: { active: false },
  })
  assert.equal(status, 403)
})

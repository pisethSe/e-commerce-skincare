import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { call, isServerUp, adminToken, customerToken, makeUser, BASE } from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

/* ── Health ───────────────────────────────────── */
test('GET /health returns ok', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/health')
  assert.equal(status, 200)
  assert.equal(body.status, 'ok')
})

/* ── Register ─────────────────────────────────── */
test('POST /auth/register creates an account and returns tokens', async () => {
  if (!serverUp) return
  const email = `reg-${Date.now()}@test.calesta.dev`
  const { status, body } = await call('POST', '/api/auth/register', {
    body: { email, password: 'Register@123', firstName: 'Reg', lastName: 'Tester' },
  })
  assert.equal(status, 201)
  assert.equal(body.success, true)
  assert.equal(body.data.user.email, email)
  assert.equal(body.data.user.role, 'USER')
  assert.ok(body.data.accessToken)
  assert.ok(body.data.refreshToken)
})

test('POST /auth/register rejects missing fields', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/auth/register', { body: { email: 'x@x.dev' } })
  assert.equal(status, 400)
})

test('POST /auth/register rejects short passwords', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/auth/register', {
    body: { email: `short-${Date.now()}@test.calesta.dev`, password: 'short', firstName: 'A', lastName: 'B' },
  })
  assert.equal(status, 400)
})

test('POST /auth/register rejects duplicate emails', async () => {
  if (!serverUp) return
  const email = `dup-${Date.now()}@test.calesta.dev`
  await call('POST', '/api/auth/register', {
    body: { email, password: 'Register@123', firstName: 'D', lastName: 'U' },
  })
  const { status } = await call('POST', '/api/auth/register', {
    body: { email, password: 'Register@123', firstName: 'D', lastName: 'U' },
  })
  assert.equal(status, 409)
})

/* ── Login ────────────────────────────────────── */
test('POST /auth/login succeeds with valid credentials', async () => {
  if (!serverUp) return
  const { status, body } = await call('POST', '/api/auth/login', {
    body: { email: 'sophie@example.com', password: 'User@lumiere123' },
  })
  assert.equal(status, 200)
  assert.equal(body.data.user.email, 'sophie@example.com')
  assert.equal(body.data.user.role, 'USER')
})

test('POST /auth/login rejects wrong password', async () => {
  if (!serverUp) return
  const { status, body } = await call('POST', '/api/auth/login', {
    body: { email: 'sophie@example.com', password: 'wrong-password' },
  })
  assert.equal(status, 401)
  assert.equal(body.success, false)
})

test('POST /auth/login rejects unknown users', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/auth/login', {
    body: { email: 'nobody@nowhere.dev', password: 'whatever123' },
  })
  assert.equal(status, 401)
})

test('POST /auth/login rejects missing credentials', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/auth/login', { body: { email: 'sophie@example.com' } })
  assert.equal(status, 400)
})

/* ── Session ──────────────────────────────────── */
test('GET /auth/me returns the current user with a valid token', async () => {
  if (!serverUp) return
  const token = await customerToken()
  const { status, body } = await call('GET', '/api/auth/me', { token })
  assert.equal(status, 200)
  assert.equal(body.data.email, 'sophie@example.com')
})

test('GET /auth/me rejects missing tokens', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/auth/me')
  assert.equal(status, 401)
})

test('GET /auth/me rejects invalid tokens', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/auth/me', { token: 'not-a-real-token' })
  assert.equal(status, 401)
})

test('POST /auth/refresh rotates tokens and invalidates the old refresh token', async () => {
  if (!serverUp) return
  const user = await makeUser('refresh')
  const { body: first } = await call('POST', '/api/auth/refresh', { body: { refreshToken: user.refreshToken } })
  assert.equal(first.success, true)
  assert.ok(first.data.accessToken)
  assert.ok(first.data.refreshToken)
  // The old refresh token was rotated away — reusing it must fail
  const { status } = await call('POST', '/api/auth/refresh', { body: { refreshToken: user.refreshToken } })
  assert.equal(status, 401)
})

test('POST /auth/refresh rejects invalid refresh tokens', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/auth/refresh', { body: { refreshToken: 'bogus' } })
  assert.equal(status, 401)
})

test('POST /auth/logout invalidates the refresh token', async () => {
  if (!serverUp) return
  const user = await makeUser('logout')
  const { body: loginBody } = await call('POST', '/api/auth/login', {
    body: { email: user.email, password: user.password },
  })
  const refreshToken = loginBody.data.refreshToken
  const { status } = await call('POST', '/api/auth/logout', { body: { refreshToken } })
  assert.equal(status, 200)
  const { status: refreshStatus } = await call('POST', '/api/auth/refresh', { body: { refreshToken } })
  assert.equal(refreshStatus, 401)
})

/* ── Change password ──────────────────────────── */
test('PATCH /auth/change-password rejects a wrong current password', async () => {
  if (!serverUp) return
  const user = await makeUser('pw')
  const { status } = await call('PATCH', '/api/auth/change-password', {
    token: user.token,
    body: { currentPassword: 'wrong-current', newPassword: 'NewPassword@123' },
  })
  assert.equal(status, 401)
})

test('PATCH /auth/change-password rejects short new passwords', async () => {
  if (!serverUp) return
  const user = await makeUser('pw2')
  const { status } = await call('PATCH', '/api/auth/change-password', {
    token: user.token,
    body: { currentPassword: user.password, newPassword: 'short' },
  })
  assert.equal(status, 400)
})

test('PATCH /auth/change-password works and old sessions are invalidated', async () => {
  if (!serverUp) return
  const user = await makeUser('pw3')
  const { status } = await call('PATCH', '/api/auth/change-password', {
    token: user.token,
    body: { currentPassword: user.password, newPassword: 'BrandNew@12345' },
  })
  assert.equal(status, 200)
  // Login with the NEW password succeeds
  const { status: newLogin } = await call('POST', '/api/auth/login', {
    body: { email: user.email, password: 'BrandNew@12345' },
  })
  assert.equal(newLogin, 200)
  // Login with the OLD password fails
  const { status: oldLogin } = await call('POST', '/api/auth/login', {
    body: { email: user.email, password: user.password },
  })
  assert.equal(oldLogin, 401)
})

/* ── Role guards smoke check ──────────────────── */
test('role tokens resolve to the right roles', async () => {
  if (!serverUp) return
  const admin = await call('GET', '/api/auth/me', { token: await adminToken() })
  assert.equal(admin.body.data.role, 'ADMIN')
  const customer = await call('GET', '/api/auth/me', { token: await customerToken() })
  assert.equal(customer.body.data.role, 'USER')
})

/* ── Google OAuth2 ────────────────────────────── */
test('GET /api/auth/google redirects to Google consent with the configured client', async () => {
  if (!serverUp) return
  const res = await fetch(`${BASE}/api/auth/google`, { redirect: 'manual' })
  assert.equal(res.status, 302)
  const location = res.headers.get('location') ?? ''
  assert.ok(location.includes('accounts.google.com'), 'should redirect to Google')
  assert.ok(location.includes('client_id='), 'should include the client id param')
  assert.ok(location.includes('redirect_uri='), 'should include the redirect uri')
  assert.ok(location.includes('scope=openid'), 'should request openid scope')
})

test('Google callback with an invalid code redirects to the frontend with an error', async () => {
  if (!serverUp) return
  const res = await fetch(`${BASE}/api/auth/google/callback?code=fake-invalid-code`, { redirect: 'manual' })
  assert.equal(res.status, 302)
  const location = res.headers.get('location') ?? ''
  assert.ok(location.includes('/auth/callback'), 'should redirect to the frontend callback page')
  assert.ok(location.includes('status=error'), 'should carry the error status')
})

test('Google callback without a code redirects with an error', async () => {
  if (!serverUp) return
  const res = await fetch(`${BASE}/api/auth/google/callback`, { redirect: 'manual' })
  assert.equal(res.status, 302)
  const location = res.headers.get('location') ?? ''
  assert.ok(location.includes('status=error'))
})

test('login response includes createdAt for the account page', async () => {
  if (!serverUp) return
  const { status, body } = await call('POST', '/api/auth/login', {
    body: { email: 'sophie@example.com', password: 'User@lumiere123' },
  })
  assert.equal(status, 200)
  assert.ok(body.data.user.createdAt, 'createdAt should be in the login response')
})

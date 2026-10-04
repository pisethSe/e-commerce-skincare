/**
 * Calesta test helpers — a thin API client over the running backend (:5001).
 * Tests run against the real local PostgreSQL, so they cover every feature
 * end-to-end. Tokens are cached per role to stay under the auth rate limit.
 */
export const BASE = process.env.API_URL ?? 'http://localhost:5001'

let serverUp = null

export async function isServerUp() {
  if (serverUp !== null) return serverUp
  try {
    const res = await fetch(`${BASE}/health`)
    serverUp = res.ok
  } catch {
    serverUp = false
  }
  return serverUp
}

export async function call(method, path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  })
  let body
  try {
    body = await res.json()
  } catch {
    body = { success: false, message: `non-JSON response (${res.status})` }
  }
  return { status: res.status, body }
}

/* ── Cached role tokens ───────────────────────── */
const tokens = new Map()

export async function loginAs(email, password) {
  const key = `${email}:${password}`
  const cached = tokens.get(key)
  if (cached) return cached
  const { status, body } = await call('POST', '/api/auth/login', { body: { email, password } })
  if (status !== 200 || !body.data?.accessToken) {
    throw new Error(`loginAs failed for ${email}: ${status} ${body.message ?? ''}`)
  }
  const value = { accessToken: body.data.accessToken, refreshToken: body.data.refreshToken }
  tokens.set(key, value)
  return value
}

export const adminToken = () => loginAs('admin@lumiere.com', 'Admin@lumiere123').then(t => t.accessToken)
export const customerToken = () => loginAs('sophie@example.com', 'User@lumiere123').then(t => t.accessToken)

/* ── Fixtures ─────────────────────────────────── */
let cachedProducts = null

export async function getProducts() {
  if (cachedProducts) return cachedProducts
  const { body } = await call('GET', '/api/products?all=1&limit=50')
  cachedProducts = body.data ?? []
  return cachedProducts
}

/** Fresh fetch (no cache) — stock changes as parallel tests create orders. */
export async function freshProducts() {
  const { body } = await call('GET', '/api/products?all=1&limit=50')
  return body.data ?? []
}

/** Picks an in-stock product with enough units for order tests.
 *  Prefers stable seeded stock — test-created products belong to their own
 *  tests, so parallel files never consume each other's fixtures. */
export async function pickStockedProduct(minQuantity = 1) {
  const products = await freshProducts()
  const stable = (p) => !p.slug.startsWith('test-') && !p.slug.startsWith('put-diag') && !p.slug.startsWith('test-wf-')
  const product =
    products.find((p) => stable(p) && p.inStock && (p.stockCount ?? 0) >= Math.max(minQuantity, 5)) ??
    products.find((p) => stable(p) && p.inStock && (p.stockCount ?? 0) >= minQuantity) ??
    products.find((p) => p.inStock && (p.stockCount ?? 0) >= Math.max(minQuantity, 5)) ??
    products.find((p) => p.inStock && (p.stockCount ?? 0) >= minQuantity)
  if (!product) throw new Error('no in-stock product with enough units for the test')
  return product
}

let cachedCategories = null

export async function getCategories() {
  if (cachedCategories) return cachedCategories
  const { body } = await call('GET', '/api/categories')
  cachedCategories = body.data ?? []
  return cachedCategories
}

/** Fetches a stable seeded product (by slug) that tests never delete. */
export async function seededProduct() {
  const slugs = ['radiance-brightening-serum', 'gentle-foam-cleanser', 'hyaluronic-acid-booster', 'silk-barrier-moisturizer']
  const products = await freshProducts()
  for (const slug of slugs) {
    const found = products.find((p) => p.slug === slug)
    if (found) return found
  }
  // Fall back to any product that isn't a test-created one
  const stable = products.find((p) => !p.slug.startsWith('test-') && !p.slug.startsWith('put-diag'))
  if (!stable) throw new Error('no stable seeded product found')
  return stable
}

/** Returns N distinct stable (non-test) products — immune to test cleanups. */
export async function stableProducts(count = 2) {
  const products = await freshProducts()
  const stable = products.filter(
    (p) => !p.slug.startsWith('test-') && !p.slug.startsWith('put-diag') && !p.slug.startsWith('test-wf-'),
  )
  if (stable.length < count) throw new Error(`need ${count} stable products, found ${stable.length}`)
  return stable.slice(0, count)
}

/** Registers a throwaway user; returns { email, password, token, id }. */
export async function makeUser(prefix = 'test') {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.calesta.dev`
  const password = 'Testing@12345'
  const { status, body } = await call('POST', '/api/auth/register', {
    body: { email, password, firstName: 'Test', lastName: 'User' },
  })
  if (status !== 201) throw new Error(`makeUser failed: ${status} ${body.message ?? ''}`)
  return {
    email,
    password,
    token: body.data.accessToken,
    id: body.data.user.id,
    refreshToken: body.data.refreshToken,
  }
}

/** Creates a shipping address for a user token; returns the address id. */
export async function makeAddress(token) {
  const { status, body } = await call('POST', '/api/users/addresses', {
    token,
    body: {
      firstName: 'Test', lastName: 'User',
      street: '42 Test Lane', city: 'Testville', state: 'TS', zip: '00000',
      country: 'United States', isDefault: false,
    },
  })
  if (status !== 201) throw new Error(`makeAddress failed: ${status} ${body.message ?? ''}`)
  return body.data.id
}

export function ok(assertion, message) {
  if (!assertion) throw new Error(message)
}

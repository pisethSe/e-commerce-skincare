import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  BASE,
  call,
  isServerUp,
  adminToken,
  customerToken,
  getCategories,
} from './helpers.mjs'

let serverUp = false
before(async () => {
  serverUp = await isServerUp()
})

/* Products created here are deleted again at the end of the file. */
const createdIds = []

async function createTestProduct(overrides = {}) {
  const token = await adminToken()
  const categories = await getCategories()
  const slug = `test-restock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const { status, body } = await call('POST', '/api/products', {
    token,
    body: {
      name: 'Test Restock Serum',
      slug,
      description: 'Temporary fixture for inventory tests.',
      price: 20,
      categoryId: categories[0].id,
      stockCount: 0,
      inStock: false,
      ...overrides,
    },
  })
  assert.equal(status, 201, `create product failed: ${body.message ?? ''}`)
  createdIds.push(body.data.id)
  return body.data
}

async function fetchCsv(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return { res, text: await res.text() }
}

after(async () => {
  if (!serverUp) return
  const token = await adminToken()
  for (const id of createdIds) {
    await call('DELETE', `/api/products/${id}`, { token })
  }
})

/* ── Access control ── */
test('inventory endpoints are admin-only', async () => {
  if (!serverUp) return

  const anonymous = await call('GET', '/api/admin/inventory')
  assert.equal(anonymous.status, 401)

  const customer = await customerToken()
  const forbidden = await call('GET', '/api/admin/inventory', { token: customer })
  assert.equal(forbidden.status, 403)

  const patch = await call('PATCH', '/api/admin/inventory/not-a-real-id', {
    token: customer,
    body: { stockCount: 5 },
  })
  assert.equal(patch.status, 403)
})

/* ── Listing + summary ── */
test('GET /api/admin/inventory returns stock levels, thresholds, and summary', async () => {
  if (!serverUp) return
  const product = await createTestProduct({ stockCount: 3, inStock: true })
  const token = await adminToken()

  const { status, body } = await call('GET', '/api/admin/inventory', { token })
  assert.equal(status, 200)
  assert.ok(Array.isArray(body.data.items))
  assert.equal(typeof body.data.summary.total, 'number')
  assert.equal(typeof body.data.summary.lowStock, 'number')
  assert.equal(typeof body.data.summary.outOfStock, 'number')
  assert.equal(typeof body.data.summary.pendingNotifications, 'number')

  const row = body.data.items.find((p) => p.id === product.id)
  assert.ok(row, 'created product is listed')
  assert.equal(row.stockCount, 3)
  assert.equal(row.lowStockThreshold, 10)
  assert.equal(row.lowStock, true)
  assert.equal(row.outOfStock, false)
  assert.equal(row.pendingNotifications, 0)
})

test('GET /api/admin/inventory?lowStock=1 only returns products needing attention', async () => {
  if (!serverUp) return
  const healthy = await createTestProduct({ stockCount: 500, inStock: true })
  const token = await adminToken()

  const { status, body } = await call('GET', '/api/admin/inventory?lowStock=1', { token })
  assert.equal(status, 200)
  assert.ok(body.data.items.every((p) => p.lowStock || p.outOfStock))
  assert.equal(body.data.items.some((p) => p.id === healthy.id), false)
})

/* ── Validation ── */
test('PATCH /api/admin/inventory rejects invalid stock and threshold values', async () => {
  if (!serverUp) return
  const product = await createTestProduct({ stockCount: 5, inStock: true })
  const token = await adminToken()

  for (const bad of [-1, 1.5, 'many', 1_000_001]) {
    const { status } = await call('PATCH', `/api/admin/inventory/${product.id}`, {
      token,
      body: { stockCount: bad },
    })
    assert.equal(status, 400, `stockCount=${bad} should be rejected`)
  }

  const { status: thresholdStatus } = await call('PATCH', `/api/admin/inventory/${product.id}`, {
    token,
    body: { lowStockThreshold: -2 },
  })
  assert.equal(thresholdStatus, 400)

  const missing = await call('PATCH', '/api/admin/inventory/not-a-real-id', {
    token,
    body: { stockCount: 5 },
  })
  assert.equal(missing.status, 404)
})

/* ── Back-in-stock subscription ── */
test('POST /api/products/:id/stock-notification validates input and is idempotent', async () => {
  if (!serverUp) return
  const product = await createTestProduct()

  const invalid = await call('POST', `/api/products/${product.id}/stock-notification`, {
    body: { email: 'not-an-email' },
  })
  assert.equal(invalid.status, 400)

  const missing = await call('POST', `/api/products/${product.id}/stock-notification`, { body: {} })
  assert.equal(missing.status, 400)

  const unknown = await call('POST', '/api/products/not-a-real-id/stock-notification', {
    body: { email: 'waiting@example.com' },
  })
  assert.equal(unknown.status, 404)

  const first = await call('POST', `/api/products/${product.id}/stock-notification`, {
    body: { email: 'Waiting@Example.com' },
  })
  assert.equal(first.status, 201)
  assert.equal(first.body.success, true)

  // Same email again (different casing) — still a success, no duplicate row.
  const second = await call('POST', `/api/products/${product.id}/stock-notification`, {
    body: { email: 'waiting@example.com' },
  })
  assert.equal(second.status, 201)

  const token = await adminToken()
  const { body } = await call('GET', '/api/admin/inventory', { token })
  const row = body.data.items.find((p) => p.id === product.id)
  assert.equal(row.pendingNotifications, 1)
})

test('restocking a sold-out product notifies waiting customers', async () => {
  if (!serverUp) return
  const product = await createTestProduct({ stockCount: 0, inStock: false })
  const token = await adminToken()

  await call('POST', `/api/products/${product.id}/stock-notification`, {
    body: { email: 'first-waiter@example.com' },
  })
  await call('POST', `/api/products/${product.id}/stock-notification`, {
    body: { email: 'second-waiter@example.com' },
  })

  const { status, body } = await call('PATCH', `/api/admin/inventory/${product.id}`, {
    token,
    body: { stockCount: 25 },
  })
  assert.equal(status, 200)
  assert.equal(body.data.stockCount, 25)
  assert.equal(body.data.inStock, true, 'stock above zero flips inStock back on')
  assert.equal(body.data.outOfStock, false)
  assert.equal(body.data.pendingNotifications, 2)

  // SMTP is not configured in test runs, so delivery stays pending (never silently dropped).
  assert.equal(body.data.notification.pending, 2)
  assert.equal(body.data.notification.sent, 0)

  // Subscribing while the product is purchasable is refused.
  const tooLate = await call('POST', `/api/products/${product.id}/stock-notification`, {
    body: { email: 'third-waiter@example.com' },
  })
  assert.equal(tooLate.status, 400)
})

test('setting stock to zero marks the product sold out automatically', async () => {
  if (!serverUp) return
  const product = await createTestProduct({ stockCount: 12, inStock: true })
  const token = await adminToken()

  const { status, body } = await call('PATCH', `/api/admin/inventory/${product.id}`, {
    token,
    body: { stockCount: 0 },
  })
  assert.equal(status, 200)
  assert.equal(body.data.stockCount, 0)
  assert.equal(body.data.inStock, false)
  assert.equal(body.data.outOfStock, true)
  assert.equal(body.data.lowStock, false)

  // The public product page still resolves, so "email me" keeps working.
  const publicProduct = await call('GET', `/api/products/${product.slug}`)
  assert.equal(publicProduct.status, 200)
  assert.equal(publicProduct.body.data.id, product.id)

  // An explicit inStock: true cannot override zero units.
  const contradictory = await call('PATCH', `/api/admin/inventory/${product.id}`, {
    token,
    body: { stockCount: 0, inStock: true },
  })
  assert.equal(contradictory.status, 200)
  assert.equal(contradictory.body.data.inStock, false)

  // The same rule applies through the general product editor.
  const viaProductEditor = await call('PUT', `/api/products/${product.id}`, {
    token,
    body: { stockCount: 7, inStock: true },
  })
  assert.equal(viaProductEditor.status, 200)
  assert.equal(viaProductEditor.body.data.inStock, true)

  const soldOutAgain = await call('PUT', `/api/products/${product.id}`, {
    token,
    body: { stockCount: 0, inStock: true },
  })
  assert.equal(soldOutAgain.status, 200)
  assert.equal(soldOutAgain.body.data.inStock, false)
  assert.equal(soldOutAgain.body.data.stockCount, 0)
})

/* ── Analytics ── */
test('GET /api/admin/analytics returns a zero-filled series for an empty range', async () => {
  if (!serverUp) return
  const token = await adminToken()

  const { status, body } = await call(
    'GET',
    '/api/admin/analytics?from=2020-01-01&to=2020-01-07',
    { token },
  )
  assert.equal(status, 200)
  assert.deepEqual(body.data.range, { from: '2020-01-01', to: '2020-01-07', days: 7 })
  assert.equal(body.data.series.length, 7)
  assert.ok(body.data.series.every((point) => point.revenue === 0 && point.orders === 0))
  assert.equal(body.data.totals.revenue, 0)
  assert.equal(body.data.totals.orders, 0)
  assert.deepEqual(body.data.topProducts, [])
  assert.deepEqual(body.data.categoryRevenue, [])
  assert.deepEqual(body.data.statusCounts, [])
})

test('analytics validates ranges and exposes shape invariants', async () => {
  if (!serverUp) return
  const token = await adminToken()

  const backwards = await call('GET', '/api/admin/analytics?from=2026-05-01&to=2026-04-01', { token })
  assert.equal(backwards.status, 400)

  const tooLong = await call('GET', '/api/admin/analytics?from=2019-01-01&to=2026-01-01', { token })
  assert.equal(tooLong.status, 400)

  const invalid = await call('GET', '/api/admin/analytics?from=nope', { token })
  assert.equal(invalid.status, 400)

  const { status, body } = await call(
    'GET',
    '/api/admin/analytics?from=2026-01-01&to=2026-12-31',
    { token },
  )
  assert.equal(status, 200)
  const data = body.data
  assert.equal(data.series.length, data.range.days)
  assert.equal(
    data.statusCounts.reduce((sum, row) => sum + row.count, 0),
    data.totals.orders,
    'status counts add up to the order total',
  )
  assert.ok(data.totals.averageOrderValue >= 0)
  assert.ok(Array.isArray(data.topProducts))
  assert.ok(data.topProducts.length <= 6)
})

test('analytics is admin-only', async () => {
  if (!serverUp) return
  assert.equal((await call('GET', '/api/admin/analytics')).status, 401)
  const customer = await customerToken()
  assert.equal((await call('GET', '/api/admin/analytics', { token: customer })).status, 403)
})

/* ── CSV exports ── */
test('CSV exports stream attachments with expected headers', async () => {
  if (!serverUp) return
  const token = await adminToken()

  const cases = [
    { type: 'orders', first: '"Order","Date","Status"' },
    { type: 'products', first: '"Name","Slug","Category"' },
    { type: 'customers', first: '"First name","Last name","Email"' },
    { type: 'reviews', first: '"Date","Product","Customer"' },
  ]

  for (const { type, first } of cases) {
    const { res, text } = await fetchCsv(`/api/admin/export/${type}`, token)
    assert.equal(res.status, 200, `${type} export failed`)
    assert.match(res.headers.get('content-type') ?? '', /text\/csv/)
    assert.match(res.headers.get('content-disposition') ?? '', new RegExp(`attachment; filename="calesta-${type}-`))
    assert.ok(text.includes(first), `${type} export starts with the expected columns`)
  }

  // Fetch bytes: Response.text() strips the BOM, so check the raw stream.
  const raw = await fetch(`${BASE}/api/admin/export/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const bytes = Buffer.from(await raw.arrayBuffer())
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'CSV starts with a UTF-8 BOM')

  const unknown = await call('GET', '/api/admin/export/unicorns', { token })
  assert.equal(unknown.status, 400)
})

test('CSV exports are protected and honour date ranges', async () => {
  if (!serverUp) return
  assert.equal((await fetchCsv('/api/admin/export/orders')).res.status, 401)

  const customer = await customerToken()
  assert.equal((await fetchCsv('/api/admin/export/orders', customer)).res.status, 403)

  const token = await adminToken()
  const { res, text } = await fetchCsv(
    '/api/admin/export/orders?from=2020-01-01&to=2020-01-31',
    token,
  )
  assert.equal(res.status, 200)
  const lines = text.trim().split('\r\n')
  assert.equal(lines.length, 1, 'empty range exports just the header row')
})

test('exports quote commas, quotes, and newlines safely', async () => {
  if (!serverUp) return
  // The product name contains a comma and a double quote — it must round-trip.
  const product = await createTestProduct({
    name: 'Test, "Quoted" Serum',
    stockCount: 4,
    inStock: true,
  })
  const token = await adminToken()

  const { text } = await fetchCsv('/api/admin/export/products', token)
  const line = text.split('\r\n').find((row) => row.includes(product.slug))
  assert.ok(line, 'created product appears in the export')
  assert.ok(line.includes('"Test, ""Quoted"" Serum"'), `CSV escaping broken: ${line}`)
})

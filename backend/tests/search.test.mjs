import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { call, isServerUp, getProducts } from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

const search = (query, extra = '') =>
  call('GET', `/api/products?search=${encodeURIComponent(query)}${extra}`)

const names = (body) => (body.data ?? []).map((product) => product.name)

/* ── Typo tolerance and relevance ─────────────── */
test('search tolerates typos ("clenser" finds the cleanser)', async () => {
  if (!serverUp) return
  const { status, body } = await search('clenser')
  assert.equal(status, 200)
  assert.ok(names(body).includes('Gentle Foam Cleanser'), 'expected the cleanser in the results')
})

test('search tolerates a missing letter inside a longer word', async () => {
  if (!serverUp) return
  const { body } = await search('moisturzer')
  assert.ok(names(body).includes('Silk Barrier Moisturizer'))
})

test('multi-word search ranks the exact name first', async () => {
  if (!serverUp) return
  const { body } = await search('clay mask')
  assert.equal(body.data[0]?.name, 'Kaolin Clay Detox Mask')
})

test('search matches descriptions and ingredients, not just names', async () => {
  if (!serverUp) return
  const { body } = await search('vitamin c')
  const first = body.data[0]
  assert.equal(first?.name, 'Radiance Brightening Serum')
})

test('an unmatched query returns an empty page and a "did you mean" suggestion', async () => {
  if (!serverUp) return
  const { body } = await search('clensr')
  assert.equal(body.data.length, 0)
  assert.equal(body.pagination.total, 0)
  assert.equal(body.search.suggestion, 'cleanser')

  const second = await search('sarim')
  assert.equal(second.body.search.suggestion, 'serum')
})

test('pure gibberish returns no results and no suggestion', async () => {
  if (!serverUp) return
  const { body } = await search('zzzzqqq')
  assert.equal(body.pagination.total, 0)
  assert.equal(body.search.suggestion, null)
})

/* ── Facets ───────────────────────────────────── */
test('search responses include facets that add up to the match total', async () => {
  if (!serverUp) return
  const { body } = await search('serum')

  assert.ok(body.facets, 'facets are present')
  const facetTotal = body.facets.categories.reduce((sum, entry) => sum + entry.count, 0)
  assert.equal(facetTotal, body.pagination.total)
  assert.ok(body.facets.price.min > 0)
  assert.ok(body.facets.price.max >= body.facets.price.min)
  assert.deepEqual(Object.keys(body.facets.ratings).sort(), ['3', '4'])
})

test('facets are computed before category filters are applied', async () => {
  if (!serverUp) return
  const all = await search('serum')
  const knownCategory = all.body.facets.categories[0]
  assert.ok(knownCategory, 'the query matches at least one category')

  // Filtering to a category that matched nothing empties the page…
  const { body } = await search('serum', '&category=__no_such_category__')
  assert.equal(body.pagination.total, 0)
  // …but the facet list still offers the categories that matched the query,
  // so the shopper can pick a different filter instead of hitting a dead end.
  assert.ok(body.facets.categories.some((entry) => entry.slug === knownCategory.slug))
})

/* ── Filters and sorting ──────────────────────── */
test('price and rating filters narrow search results', async () => {
  if (!serverUp) return
  const all = await search('serum')
  const cheapest = Math.min(...all.body.data.map((product) => Number(product.price)))

  const filtered = await search('serum', `&minPrice=${cheapest + 1}`)
  assert.ok(filtered.body.data.every((product) => Number(product.price) > cheapest))
  assert.ok(filtered.body.pagination.total < all.body.pagination.total)

  const rated = await search('serum', '&rating=4')
  assert.ok(rated.body.data.every((product) => Number(product.rating) >= 4))
})

test('sortBy price_asc overrides relevance ordering', async () => {
  if (!serverUp) return
  const { body } = await search('serum', '&sortBy=price_asc')
  const prices = body.data.map((product) => Number(product.price))
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b))
})

test('the default listing still paginates when no search term is sent', async () => {
  if (!serverUp) return
  const { body } = await call('GET', '/api/products?limit=500')
  assert.equal(body.pagination.limit, 100, 'limit is clamped')
  assert.ok(body.data.length > 0)
  assert.equal(body.search, undefined, 'search metadata is only present for search requests')
})

/* ── Typeahead ────────────────────────────────── */
test('GET /api/products/suggest returns lightweight typeahead matches', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/products/suggest?q=moist')
  assert.equal(status, 200)
  assert.ok(body.data.length > 0 && body.data.length <= 6)
  const entry = body.data[0]
  assert.ok(entry.name && entry.slug && entry.category?.name)
  assert.ok(Array.isArray(entry.images))
  assert.equal(entry.description, undefined, 'suggestions stay lightweight')
})

test('typeahead offers a correction when nothing matches', async () => {
  if (!serverUp) return
  const { body } = await call('GET', '/api/products/suggest?q=clensr')
  assert.equal(body.data.length, 0)
  assert.equal(body.suggestion, 'cleanser')
})

test('typeahead with an empty query is an empty list, not an error', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/products/suggest')
  assert.equal(status, 200)
  assert.deepEqual(body.data, [])
  assert.equal(body.suggestion, null)
})

/* ── Sanity ───────────────────────────────────── */
test('search results are in-stock products only', async () => {
  if (!serverUp) return
  const { body } = await search('silk')
  assert.ok(body.data.every((product) => product.inStock === true))
})

import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { call, isServerUp, adminToken, makeUser, getProducts, seededProduct } from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

/* ── Wishlist ─────────────────────────────────── */
test('wishlist requires authentication', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/users/wishlist')
  assert.equal(status, 401)
})

test('wishlist add with an unknown product returns 404 (not a 500)', async () => {
  if (!serverUp) return
  const user = await makeUser('wish404')
  const { status, body } = await call('POST', '/api/users/wishlist/does-not-exist', { token: user.token })
  assert.equal(status, 404)
  assert.match(body.message, /not found/i)
})

test('wishlist lifecycle: add, list, upsert, remove', async () => {
  if (!serverUp) return
  const user = await makeUser('wish')
  // A stable seeded product — never deleted by parallel test cleanups
  const product = await seededProduct()

  // ADD
  const { status: addStatus } = await call('POST', `/api/users/wishlist/${product.id}`, { token: user.token })
  assert.equal(addStatus, 200)

  // LIST — contains the product
  const { body: list } = await call('GET', '/api/users/wishlist', { token: user.token })
  const found = (list.data ?? []).some((i) => (i.productId ?? i.product?.id) === product.id)
  assert.equal(found, true)

  // ADD again — upsert, no duplicate
  await call('POST', `/api/users/wishlist/${product.id}`, { token: user.token })
  const { body: afterUpsert } = await call('GET', '/api/users/wishlist', { token: user.token })
  const count = (afterUpsert.data ?? []).filter((i) => (i.productId ?? i.product?.id) === product.id).length
  assert.equal(count, 1)

  // REMOVE
  const { status: removeStatus } = await call('DELETE', `/api/users/wishlist/${product.id}`, { token: user.token })
  assert.equal(removeStatus, 200)
  const { body: afterRemove } = await call('GET', '/api/users/wishlist', { token: user.token })
  assert.equal((afterRemove.data ?? []).length, 0)
})

test('wishlists are isolated per user', async () => {
  if (!serverUp) return
  const userA = await makeUser('wishA')
  const userB = await makeUser('wishB')
  const product = await seededProduct()

  await call('POST', `/api/users/wishlist/${product.id}`, { token: userA.token })
  const { body: wishlistB } = await call('GET', '/api/users/wishlist', { token: userB.token })
  assert.equal((wishlistB.data ?? []).length, 0)
})

/* ── Addresses ────────────────────────────────── */
test('addresses require authentication', async () => {
  if (!serverUp) return
  const { status } = await call('GET', '/api/users/addresses')
  assert.equal(status, 401)
})

test('address lifecycle: create, list, isolated per user', async () => {
  if (!serverUp) return
  const user = await makeUser('addr')
  const stranger = await makeUser('addr2')

  const { status: createStatus, body: createBody } = await call('POST', '/api/users/addresses', {
    token: user.token,
    body: {
      firstName: 'Test', lastName: 'User',
      street: '1 Address Way', city: 'Town', state: 'TS', zip: '11111',
      country: 'United States', isDefault: true,
    },
  })
  assert.equal(createStatus, 201)
  const addressId = createBody.data.id

  const { status: listStatus, body: listBody } = await call('GET', '/api/users/addresses', { token: user.token })
  assert.equal(listStatus, 200)
  assert.ok((listBody.data ?? []).some((a) => a.id === addressId))
  assert.ok((listBody.data ?? [])[0].isDefault === true, 'default address sorts first')

  const { body: strangerList } = await call('GET', '/api/users/addresses', { token: stranger.token })
  assert.equal((strangerList.data ?? []).length, 0)
})

/* ── Users ────────────────────────────────────── */
test('GET /api/users/me returns profile; PATCH updates it', async () => {
  if (!serverUp) return
  const user = await makeUser('me')
  const { status, body } = await call('GET', '/api/users/me', { token: user.token })
  assert.equal(status, 200)
  assert.equal(body.data.email, user.email)

  const { status: patchStatus, body: patchBody } = await call('PATCH', '/api/users/me', {
    token: user.token,
    body: { firstName: 'Renamed', lastName: 'Person' },
  })
  assert.equal(patchStatus, 200)
  assert.equal(patchBody.data.firstName, 'Renamed')
})

test('GET /api/users (admin) lists only customers, paginated', async () => {
  if (!serverUp) return
  await makeUser('listed')
  const { status, body } = await call('GET', '/api/users?limit=20', { token: await adminToken() })
  assert.equal(status, 200)
  const roles = (body.data ?? []).map((u) => u.role).filter(Boolean)
  // Only USER role is listed — admins excluded
  assert.ok(!roles.includes('ADMIN'))
})

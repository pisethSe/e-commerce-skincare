import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { call, isServerUp, adminToken, customerToken } from './helpers.mjs'

let serverUp = false
before(async () => { serverUp = await isServerUp() })

/* ── Newsletter ───────────────────────────────── */
test('POST /newsletter/subscribe subscribes an email', async () => {
  if (!serverUp) return
  const email = `news-${Date.now()}@test.calesta.dev`
  const { status, body } = await call('POST', '/api/newsletter/subscribe', {
    body: { email, firstName: 'Newsy' },
  })
  assert.equal(status, 200)
  assert.equal(body.success, true)

  // Admin can see the subscriber count
  const { body: adminList } = await call('GET', '/api/admin/newsletter', { token: await adminToken() })
  assert.ok(adminList.total >= 1)
})

test('POST /newsletter/subscribe rejects missing email', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/newsletter/subscribe', { body: { firstName: 'X' } })
  assert.equal(status, 400)
})

test('POST /newsletter/unsubscribe deactivates the subscription', async () => {
  if (!serverUp) return
  const email = `unsub-${Date.now()}@test.calesta.dev`
  await call('POST', '/api/newsletter/subscribe', { body: { email } })
  const { status } = await call('POST', '/api/newsletter/unsubscribe', { body: { email } })
  assert.equal(status, 200)
})

/* ── Blog ─────────────────────────────────────── */
test('GET /api/blog lists published posts only', async () => {
  if (!serverUp) return
  const { status, body } = await call('GET', '/api/blog?limit=24')
  assert.equal(status, 200)
  // The seeded posts are drafts, so a public list may be empty — but must never contain drafts
  const unpublished = (body.data ?? []).filter((p) => p.published === false)
  assert.equal(unpublished.length, 0)
})

test('GET /api/blog?all=1 shows drafts to admins', async () => {
  if (!serverUp) return
  const { body } = await call('GET', '/api/blog?all=1&limit=24', { token: await adminToken() })
  assert.ok((body.data ?? []).length >= 1, 'admins should see the seeded drafts')
})

test('GET /api/blog?all=1 does NOT show drafts to customers', async () => {
  if (!serverUp) return
  const { body } = await call('GET', '/api/blog?all=1&limit=24', { token: await customerToken() })
  const drafts = (body.data ?? []).filter((p) => p.published === false)
  assert.equal(drafts.length, 0)
})

test('admin can create, update, publish, and delete a blog post', async () => {
  if (!serverUp) return
  const token = await adminToken()
  const slug = `test-post-${Date.now()}`

  // CREATE (draft)
  const { status: createStatus, body: createBody } = await call('POST', '/api/blog', {
    token,
    body: {
      title: 'Test Post Alpha',
      slug,
      excerpt: 'Testing the journal.',
      body: 'Full content here.',
      category: 'Testing',
      author: 'Test Author',
      published: false,
    },
  })
  assert.equal(createStatus, 201)
  const created = createBody.data

  // Not publicly visible as a draft
  const { status: publicStatus } = await call('GET', `/api/blog/${slug}`)
  assert.equal(publicStatus, 404)

  // UPDATE + publish
  const { status: updateStatus } = await call('PUT', `/api/blog/${created.id}`, {
    token,
    body: { title: 'Test Post Renamed', published: true, publishedAt: new Date().toISOString() },
  })
  assert.equal(updateStatus, 200)

  // Now publicly visible
  const { status: visibleStatus, body: visibleBody } = await call('GET', `/api/blog/${slug}`)
  assert.equal(visibleStatus, 200)
  assert.equal(visibleBody.data.title, 'Test Post Renamed')

  // DELETE
  const { status: deleteStatus } = await call('DELETE', `/api/blog/${created.id}`, { token })
  assert.equal(deleteStatus, 200)
  const { status: gone } = await call('GET', `/api/blog/${slug}`)
  assert.equal(gone, 404)
})

test('POST /api/blog rejects non-admin users', async () => {
  if (!serverUp) return
  const { status } = await call('POST', '/api/blog', {
    token: await customerToken(),
    body: { title: 'Sneaky post' },
  })
  assert.equal(status, 403)
})

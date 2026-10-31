import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { useAuthStore } from './store'

const user = {
  id: 'u1',
  email: 'sophie@example.com',
  firstName: 'Sophie',
  lastName: 'Martin',
  role: 'USER' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  vi.unstubAllGlobals()
})

describe('apiFetch token refresh', () => {
  it('shares one refresh across concurrent 401s and retries both requests', async () => {
    const calls: string[] = []

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)

      if (url === '/api/auth/refresh') {
        return json({
          success: true,
          data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
        })
      }

      const authorization = new Headers(init?.headers).get('Authorization')
      if (authorization === 'Bearer old-token') {
        return new Response(null, { status: 401 })
      }

      return json({ success: true })
    })

    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({
      user,
      accessToken: 'old-token',
      refreshToken: 'old-refresh',
    })

    const [first, second] = await Promise.all([
      apiFetch('/api/orders/my', { token: 'old-token' }),
      apiFetch('/api/addresses', { token: 'old-token' }),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(calls.filter((url) => url === '/api/auth/refresh')).toHaveLength(1)
    expect(useAuthStore.getState().accessToken).toBe('new-token')
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh')
  })

  it('returns the original 401 when the refresh token is rejected', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/auth/refresh') return new Response(null, { status: 401 })
      return new Response(null, { status: 401 })
    })

    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({
      user,
      accessToken: 'old-token',
      refreshToken: 'bad-refresh',
    })

    const res = await apiFetch('/api/orders/my', { token: 'old-token' })

    expect(res.status).toBe(401)
    expect(useAuthStore.getState().user?.email).toBe('sophie@example.com')
  })
})

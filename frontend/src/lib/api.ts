const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!apiBaseUrl) {
    return normalizedPath
  }

  return `${apiBaseUrl}${normalizedPath}`
}

import { useAuthStore } from './store'

/**
 * fetch with silent token refresh — when a request comes back 401/token-expired,
 * uses the refresh token to get a new access token and retries once, updating
 * the stored session. This is why users no longer get logged out mid-checkout
 * when their short-lived access token expires.
 */
// A page can fire several authenticated requests at once (for example the
// account page in React StrictMode). Without a shared promise each 401 starts
// its own refresh, and rotating refresh tokens make all but one fail — which
// used to force shoppers to log in again mid-session.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const store = useAuthStore.getState()
      if (!store.refreshToken || !store.user) return null

      const refreshRes = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: store.refreshToken }),
      })
      if (!refreshRes.ok) return null

      const json = await refreshRes.json()
      if (!json.success || !json.data?.accessToken) return null

      // The shopper may have logged out while the refresh was in flight.
      const current = useAuthStore.getState()
      if (!current.user) return null

      current.setSession({
        user: current.user,
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken ?? store.refreshToken,
      })
      return json.data.accessToken as string
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<Response> {
  const doFetch = (token?: string) => {
    const headers = new Headers(options.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(getApiUrl(path), { ...options, headers })
  }

  const res = await doFetch(options.token)
  if (res.status !== 401) return res

  const accessToken = await refreshAccessToken()
  if (!accessToken) return res

  return doFetch(accessToken)
}

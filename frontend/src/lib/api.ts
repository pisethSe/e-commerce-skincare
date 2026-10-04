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
export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<Response> {
  const doFetch = (token?: string) => {
    const headers = new Headers(options.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(getApiUrl(path), { ...options, headers })
  }

  let res = await doFetch(options.token)
  if (res.status !== 401) return res

  const store = useAuthStore.getState()
  const refreshToken = store.refreshToken
  if (!refreshToken || !store.user) return res

  try {
    const refreshRes = await fetch(getApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!refreshRes.ok) return res
    const json = await refreshRes.json()
    if (!json.success || !json.data?.accessToken) return res
    store.setSession({
      user: store.user,
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
    })
    return await doFetch(json.data.accessToken)
  } catch {
    return res
  }
}

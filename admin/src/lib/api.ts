import axios from 'axios'
import type { AxiosError, AxiosRequestConfig } from 'axios'

/**
 * Admin API client.
 * - Relative baseURL so calls go through the Vite dev proxy (/api → :5001).
 * - Attaches the stored admin access token.
 * - On 401, tries one refresh-token rotation, then gives up (authStore clears).
 */

export const TOKEN_KEY = 'calesta-admin-token'
export const REFRESH_KEY = 'calesta-admin-refresh'

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY)
export const getStoredRefresh = () => localStorage.getItem(REFRESH_KEY)
export const storeTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Single-flight refresh: concurrent 401s share one refresh call.
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefresh()
  if (!refreshToken) return null
  try {
    const res = await axios.post('/api/auth/refresh', { refreshToken })
    const { accessToken, refreshToken: next } = res.data?.data ?? {}
    if (!accessToken) return null
    storeTokens(accessToken, next ?? refreshToken)
    return accessToken
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status === 401 && config && !config._retried && !config.url?.includes('/auth/')) {
      config._retried = true
      refreshing = refreshing ?? refreshAccessToken()
      const token = await refreshing
      refreshing = null
      if (token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
        return api.request(config)
      }
      clearTokens()
      window.location.href = '/admin'
    }
    return Promise.reject(error)
  }
)

/** Unwraps the API's standard { success, data } envelope; throws readable errors. */
export async function apiData<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await api.request<{ success: boolean; data: T; message?: string }>(config)
    return res.data.data
  } catch (err) {
    const ax = err as AxiosError<{ message?: string }>
    throw new Error(ax.response?.data?.message ?? ax.message ?? 'Something went wrong')
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function apiList<T>(config: AxiosRequestConfig): Promise<{ items: T[]; pagination: Pagination | null }> {
  const res = await api.request<{ success: boolean; data: T[]; pagination?: Pagination }>(config)
  return { items: res.data.data ?? [], pagination: res.data.pagination ?? null }
}

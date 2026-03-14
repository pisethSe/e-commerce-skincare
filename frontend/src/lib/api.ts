const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!apiBaseUrl) {
    return normalizedPath
  }

  return `${apiBaseUrl}${normalizedPath}`
}

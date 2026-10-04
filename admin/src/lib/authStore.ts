import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearTokens, storeTokens } from './api'

export interface AdminUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  avatar?: string | null
}

interface AuthState {
  user: AdminUser | null
  setAuth: (tokens: { accessToken: string; refreshToken: string }, user: AdminUser) => void
  setUser: (user: AdminUser) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setAuth: (tokens, user) => {
        storeTokens(tokens.accessToken, tokens.refreshToken)
        set({ user })
      },
      setUser: (user) => set({ user }),
      clear: () => {
        clearTokens()
        set({ user: null })
      },
    }),
    { name: 'calesta-admin-auth', partialize: (s) => ({ user: s.user }) }
  )
)

export const adminInitials = (user: AdminUser | null): string => {
  if (!user) return 'CA'
  const first = user.firstName?.[0] ?? user.email[0]
  const last = user.lastName?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
}

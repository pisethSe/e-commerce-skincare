import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getApiUrl } from './api'
import { CartItem, CartState, Product, ProductVariant } from '../types'

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      coupon: null,
      couponError: null,

  addItem: (product: Product, quantity = 1, variant?: ProductVariant) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.product.id === product.id && i.variant?.id === variant?.id
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id && i.variant?.id === variant?.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
          isOpen: true,
        }
      }
      return {
        items: [...state.items, { product, quantity, variant }],
        isOpen: true,
      }
    })
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }))
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    }))
  },

  clearCart: () => set({ items: [], coupon: null, couponError: null }),

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  applyCoupon: async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) {
      set({ couponError: 'Enter a coupon code.' })
      return false
    }
    const orderTotal = get()
      .items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    try {
      const response = await fetch(getApiUrl('/api/coupons/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, orderTotal }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        set({ coupon: null, couponError: result.message || 'Invalid or expired coupon.' })
        return false
      }
      set({
        coupon: { code: result.data.coupon.code, discount: Number(result.data.discount) },
        couponError: null,
      })
      return true
    } catch {
      set({ coupon: null, couponError: 'Could not validate the coupon — is the API running?' })
      return false
    }
  },

  clearCoupon: () => set({ coupon: null, couponError: null }),

  total: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  },

  itemCount: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.quantity, 0)
  },
  }),
  {
    name: 'calesta-cart',
    // Persist bag contents + coupon; isOpen is transient UI state
    partialize: (s) => ({ items: s.items, coupon: s.coupon }),
  }
))

// Wishlist store
interface WishlistState {
  ids: string[]
  toggle: (id: string) => void
  has: (id: string) => boolean
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: [],
  toggle: (id: string) =>
    set((state) => ({
      ids: state.ids.includes(id) ? state.ids.filter((i) => i !== id) : [...state.ids, id],
    })),
  has: (id: string) => get().ids.includes(id),
}))

// UI store
interface UIState {
  isMobileMenuOpen: boolean
  isSearchOpen: boolean
  isAuthModalOpen: boolean
  authMode: 'login' | 'signup'
  toggleMobileMenu: () => void
  toggleSearch: () => void
  closeMobileMenu: () => void
  openAuthModal: (mode?: 'login' | 'signup') => void
  closeAuthModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  isAuthModalOpen: false,
  authMode: 'login',
  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  openAuthModal: (mode = 'login') => set({ isAuthModalOpen: true, authMode: mode }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}))

interface AuthState {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: 'USER' | 'ADMIN'
    avatar?: string
    createdAt?: string
  } | null
  accessToken: string | null
  refreshToken: string | null
  setSession: (payload: {
    user: AuthState['user']
    accessToken: string
    refreshToken: string
  }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
    }),
    {
      name: 'calesta-auth',
    }
  )
)

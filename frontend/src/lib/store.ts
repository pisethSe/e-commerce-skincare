import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, CartState, Product, ProductVariant } from '../types'

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,

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

  clearCart: () => set({ items: [] }),

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  total: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  },

  itemCount: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.quantity, 0)
  },
}))

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

// =============================================
// PRODUCT TYPES
// =============================================
export interface Product {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  longDescription?: string
  price: number
  comparePrice?: number
  images: string[]
  category: Category
  categoryId: string
  tags: string[]
  ingredients?: string[]
  benefits?: string[]
  howToUse?: string
  volume?: string
  rating: number
  reviewCount: number
  isNew?: boolean
  isBestseller?: boolean
  isFeatured?: boolean
  inStock: boolean
  variants?: ProductVariant[]
  reviews?: Review[]
  createdAt: string
}

export interface ProductVariant {
  id: string
  name: string
  value: string
  price?: number
  inStock: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  productCount?: number
}

// =============================================
// USER TYPES
// =============================================
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role: 'USER' | 'ADMIN'
  orders?: Order[]
  wishlist?: string[]
  createdAt: string
}

// =============================================
// ORDER TYPES
// =============================================
export interface Order {
  id: string
  orderNumber: string
  userId: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: OrderStatus
  shippingAddress: Address
  paymentMethod: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  product: Product
  quantity: number
  price: number
}

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export interface Address {
  firstName: string
  lastName: string
  street: string
  city: string
  state: string
  zip: string
  country: string
  phone?: string
}

// =============================================
// CART TYPES
// =============================================
export interface CartItem {
  product: Product
  quantity: number
  variant?: ProductVariant
}

export interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  total: () => number
  itemCount: () => number
}

// =============================================
// REVIEW TYPES
// =============================================
export interface Review {
  id: string
  userId: string
  user: Pick<User, 'firstName' | 'lastName' | 'avatar'>
  productId: string
  rating: number
  title: string
  body: string
  verified: boolean
  createdAt: string
}

// =============================================
// BLOG / EDITORIAL TYPES
// =============================================
export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  body: string
  coverImage: string
  category: string
  author: string
  readTime: number
  publishedAt: string
}

// =============================================
// API RESPONSE TYPES
// =============================================
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface FilterOptions {
  category?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestseller'
  search?: string
}

// =============================================
// NEWSLETTER
// =============================================
export interface NewsletterSubscription {
  email: string
  firstName?: string
}

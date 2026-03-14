import { type ClassValue, clsx } from 'clsx'

// Tailwind merge utility
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Format currency
export function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Calculate discount percentage
export function discountPercent(price: number, comparePrice: number): number {
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

// Slugify
export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
}

// Truncate text
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Format date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Generate star array for ratings
export function getStars(rating: number): { type: 'full' | 'half' | 'empty'; key: number }[] {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push({ type: 'full' as const, key: i })
    } else if (i - rating < 1 && i - rating > 0) {
      stars.push({ type: 'half' as const, key: i })
    } else {
      stars.push({ type: 'empty' as const, key: i })
    }
  }
  return stars
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

// Ease functions for GSAP
export const EASES = {
  smooth: 'power2.out',
  expo: 'expo.out',
  elastic: 'elastic.out(1, 0.3)',
  back: 'back.out(1.7)',
}

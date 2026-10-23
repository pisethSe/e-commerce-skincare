import React, { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { useCatalogStore } from './lib/catalog'

// Route-level code splitting keeps the first paint light: the shell, cart and
// navigation load eagerly; each page (and its heavy dependencies) loads on
// demand. ShopPage bundles search; Checkout bundles payment UI, etc.
const HomePage = lazy(() => import('./pages/HomePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const JournalPage = lazy(() => import('./pages/JournalPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const WishlistPage = lazy(() => import('./pages/WishlistPage'))
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))

// AOS init
declare global {
  interface Window {
    AOS?: { init: (opts: object) => void; refresh: () => void }
  }
}

export default function App() {
  const loadCatalog = useCatalogStore((s) => s.load)

  useEffect(() => {
    if (window.AOS) {
      window.AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 80,
      })
    }
    // Load live catalog from the API (falls back to bundled mock data)
    loadCatalog()
  }, [loadCatalog])

  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/products/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/track" element={<TrackOrderPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-Mneutral-50">
      <span
        role="status"
        aria-label="Loading page"
        className="h-9 w-9 animate-spin rounded-full border-2 border-Mneutral-200 border-t-Mneutral-900"
      />
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center pt-20">
      <div className="text-center">
        <p className="font-accent italic text-[#c9a96e] text-8xl mb-4">404</p>
        <h1 className="font-display text-4xl mb-4">Page not found</h1>
        <p className="text-charcoal-500 mb-8">The page you're looking for doesn't exist.</p>
        <a href="/" className="btn-primary">Go Home</a>
      </div>
    </div>
  )
}

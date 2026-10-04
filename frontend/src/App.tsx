import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import AboutPage from './pages/AboutPage'
import JournalPage from './pages/JournalPage'
import AccountPage from './pages/AccountPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import { useCatalogStore } from './lib/catalog'

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
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

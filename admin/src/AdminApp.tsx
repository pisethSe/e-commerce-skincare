import React, { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AdminLayout from './components/layout/AdminLayout'
import LoginPage from './pages/LoginPage'
import { getStoredToken } from './lib/api'
import { useAuthStore } from './lib/authStore'

// Each console page is its own chunk. Analytics is the main win: Recharts is
// only downloaded when an admin opens the analytics view.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'))
const JournalPage = lazy(() => import('./pages/JournalPage'))
const CouponsPage = lazy(() => import('./pages/CouponsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

/**
 * Admin entry — Calesta-branded console.
 * Requires an authenticated ADMIN; unauthenticated visitors see the login gate.
 */
export default function AdminApp() {
  const user = useAuthStore((s) => s.user)
  const [hasToken, setHasToken] = useState(() => Boolean(getStoredToken()))

  // Keep the gate in sync if tokens are cleared from anywhere (e.g. a 401 logout)
  useEffect(() => {
    const id = window.setInterval(() => {
      setHasToken(Boolean(getStoredToken()))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const authenticated = hasToken && user !== null

  return (
    <BrowserRouter basename="/admin">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            border: '1px solid #e7eae9',
            background: '#ffffff',
            color: '#102d26',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(16,45,38,0.10)',
          },
        }}
      />
      {!authenticated ? (
        <LoginPage />
      ) : (
        <AdminLayout>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AdminLayout>
      )}
    </BrowserRouter>
  )
}

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span
        role="status"
        aria-label="Loading page"
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#e7eae9] border-t-[#102d26]"
      />
    </div>
  )
}

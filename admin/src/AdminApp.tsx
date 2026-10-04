import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AdminLayout from './components/layout/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import OrdersPage from './pages/OrdersPage'
import CustomersPage from './pages/CustomersPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ReviewsPage from './pages/ReviewsPage'
import JournalPage from './pages/JournalPage'
import CouponsPage from './pages/CouponsPage'
import SettingsPage from './pages/SettingsPage'
import { getStoredToken } from './lib/api'
import { useAuthStore } from './lib/authStore'

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
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AdminLayout>
      )}
    </BrowserRouter>
  )
}

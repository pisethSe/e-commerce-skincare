import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import OrdersPage from './pages/OrdersPage'

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <div className="text-center">
        <p className="font-display text-2xl text-slate-300 mb-2">{title}</p>
        <p className="text-sm">Coming soon</p>
      </div>
    </div>
  )
}

export default function AdminApp() {
  return (
    <BrowserRouter basename="/admin">
      <AdminLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<PlaceholderPage title="Customers" />} />
          <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
          <Route path="/reviews" element={<PlaceholderPage title="Reviews" />} />
          <Route path="/journal" element={<PlaceholderPage title="Journal" />} />
          <Route path="/coupons" element={<PlaceholderPage title="Coupons" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  )
}

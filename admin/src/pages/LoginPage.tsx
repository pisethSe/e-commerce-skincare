import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, Lock, ShieldCheck } from 'lucide-react'
import { apiData } from '../lib/api'
import { useAuthStore, type AdminUser } from '../lib/authStore'

/** Flat, clean login gate — the storefront's palette, no decoration. */
export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const data = await apiData<{ user: AdminUser; accessToken: string; refreshToken: string }>({
        method: 'POST',
        url: '/auth/login',
        data: { email, password },
      })
      if (data.user.role !== 'ADMIN') {
        setError('This account does not have admin access.')
        return
      }
      setAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f1f3f3] p-4">
      <div className="dialog-panel-in w-full max-w-[400px]">
        <div className="rounded-[14px] border border-[#e7eae9] bg-white p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#102d26] text-[#9edccd]">
              <Leaf size={18} />
            </div>
            <h1 className="mt-5 text__24 font-semibold tracking-[-0.01em] text-[#102d26]">
              Calesta Admin
            </h1>
            <p className="mt-1.5 text__14 text-[#6e7f7b]">
              Sign in to manage your store — orders, catalog, and customers.
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="login-email" className="label-admin">Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lumiere.com"
                className="input-admin"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="label-admin">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca8a5]" />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="input-admin pl-9"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-[8px] border border-[#f6d9d9] bg-[#fdeeee] px-3 py-2.5 text__14 text-[#a83636]"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-admin w-full">
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <ArrowRight size={14} />}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-[#9ca8a5]">
            <ShieldCheck size={12} />
            Seeded admin · admin@lumiere.com · Admin@lumiere123
          </div>
        </div>
      </div>
    </div>
  )
}

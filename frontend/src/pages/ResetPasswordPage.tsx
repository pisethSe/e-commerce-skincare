import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { getApiUrl } from '../lib/api'

/** Password reset landing — the emailed link lands here with a token. */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.title = 'Calesta — Choose a new password'
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!password || !confirm) {
      setError('Please fill in both fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Could not reset the password.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-Mneutral-50 pt-[140px]">
      <div className="container-custom max-w-[560px] rounded-[32px] bg-white px-[20px] py-[56px] xs:px-[40px]">
        {done ? (
          <div className="text-center">
            <CheckCircle2 size={56} strokeWidth={1.2} className="mx-auto mb-6 text-sage-600" />
            <h1 className="text__40 font-medium text-Mneutral-900">Password updated</h1>
            <p className="mt-4 text__18 text-Mneutral-600">
              You can sign in with your new password.
            </p>
            <Link to="/" className="filled-pill-button mt-8">Back Home</Link>
          </div>
        ) : !token ? (
          <div className="text-center">
            <XCircle size={56} strokeWidth={1.2} className="mx-auto mb-6 text-[#a83636]" />
            <h1 className="text__40 font-medium text-Mneutral-900">Missing reset link</h1>
            <p className="mt-4 text__18 text-Mneutral-600">
              Request a fresh link from the sign-in page.
            </p>
            <Link to="/" className="filled-pill-button mt-8">Back Home</Link>
          </div>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text__40 font-medium text-Mneutral-900">
              <Lock size={22} className="text-Mneutral-500" />
              Choose a new password
            </h1>
            <p className="mt-3 text__16 text-Mneutral-600">
              Pick something strong — at least 8 characters with a mix of letters, numbers, and symbols.
            </p>
            <form className="mt-8 space-y-5" onSubmit={submit}>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-full border border-Mneutral-100 px-4 py-3 pr-12 text__16 outline-none transition-colors focus:border-Mneutral-900"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-Mneutral-500"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <input
                type={show ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-full border border-Mneutral-100 px-4 py-3 text__16 outline-none transition-colors focus:border-Mneutral-900"
              />
              {error && (
                <p role="alert" className="rounded-[16px] bg-blush-50 px-4 py-3 text__14 text-blush-700">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="filled-pill-button w-full justify-center disabled:opacity-60">
                {busy ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useAuthStore } from '../lib/store'
import { apiFetch } from '../lib/api'

/**
 * Google OAuth2 return landing — the backend redirects here with tokens in the
 * query. Loads the profile, stores the session, and sends the user on their way.
 */
export default function AuthCallbackPage() {
  const setSession = useAuthStore((s) => s.setSession)
  const [status, setStatus] = useState<'working' | 'success' | 'error'>('working')
  const [message, setMessage] = useState('')

  useEffect(() => {
    document.title = 'Calesta — Signing in'
    const params = new URLSearchParams(window.location.search)
    const resultStatus = params.get('status')
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    const errorMessage = params.get('message')

    if (resultStatus !== 'success' || !accessToken || !refreshToken) {
      setStatus('error')
      setMessage(errorMessage ?? 'Google sign-in failed. Please try again.')
      return
    }

    let alive = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/auth/me', { token: accessToken })
        const json = await res.json()
        if (!alive) return
        if (!json.success) throw new Error(json.message ?? 'Could not load your profile')
        setSession({ user: json.data, accessToken, refreshToken })
        setStatus('success')
        // Clean the tokens out of the URL bar
        window.history.replaceState({}, '', '/auth/callback')
      } catch (err) {
        if (alive) {
          setStatus('error')
          setMessage(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.')
        }
      }
    })()

    return () => {
      alive = false
    }
  }, [setSession])

  return (
    <div className="bg-Mneutral-50 pt-[140px]">
      <div className="container-custom rounded-[32px] bg-white px-[20px] py-[80px] text-center xs:px-[40px]">
        {status === 'error' ? (
          <>
            <XCircle size={56} strokeWidth={1.2} className="mx-auto mb-6 text-[#a83636]" />
            <h1 className="mb-3 text__40 font-medium text-Mneutral-900">Sign-in didn't complete</h1>
            <p className="mb-8 text__18 text-Mneutral-600">{message}</p>
            <Link to="/" className="filled-pill-button">Back Home</Link>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle2 size={56} strokeWidth={1.2} className="mx-auto mb-6 text-sage-600" />
            <h1 className="mb-3 text__40 font-medium text-Mneutral-900">You're signed in</h1>
            <p className="mb-8 text__18 text-Mneutral-600">Welcome to Calesta — taking you home.</p>
            <Link to="/" className="filled-pill-button">Continue</Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 h-14 w-14 animate-pulse rounded-full bg-Mneutral-100" />
            <h1 className="mb-3 text__40 font-medium text-Mneutral-900">Completing sign-in…</h1>
            <p className="text__18 text-Mneutral-600">One moment while we set up your account.</p>
          </>
        )}
      </div>
    </div>
  )
}

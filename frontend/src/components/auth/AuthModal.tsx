import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, X } from 'lucide-react'
import { getApiUrl } from '../../lib/api'
import { useAuthStore, useUIStore } from '../../lib/store'

type AuthMode = 'login' | 'signup'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

/** Simple strength heuristic — length + character variety. */
function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string; bar: string } {
  if (!password) return { score: 0, label: '', bar: '' }
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const classes = [hasLetter, hasNumber, hasSymbol, hasUpper].filter(Boolean).length
  if (password.length < 8 || classes <= 1) return { score: 1, label: 'Weak', bar: 'bg-red-500' }
  if (password.length < 10 || classes <= 2) return { score: 2, label: 'Fair', bar: 'bg-amber-500' }
  return { score: 3, label: 'Strong', bar: 'bg-emerald-600' }
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 5.86C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-5.86C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.86C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal, openAuthModal } = useUIStore()
  const setSession = useAuthStore((s) => s.setSession)
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const title = useMemo(
    () => (authMode === 'login' ? 'LOGIN' : 'CREATE AN ACCOUNT'),
    [authMode]
  )

  const resetState = () => {
    setForm(initialForm)
    setShowPassword(false)
    setShowConfirmPassword(false)
    setError(null)
    setSuccess(null)
    setAcceptTerms(false)
    setLoading(false)
  }

  const handleClose = () => {
    closeAuthModal()
    resetState()
  }

  const handleModeChange = (mode: AuthMode) => {
    openAuthModal(mode)
    setError(null)
    setSuccess(null)
  }

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }

    if (authMode === 'signup') {
      if (!form.firstName || !form.lastName) {
        setError('First name and last name are required.')
        return
      }
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (!acceptTerms) {
        setError('Please accept the terms to continue.')
        return
      }
    }

    setLoading(true)

    try {
      const endpoint = getApiUrl(
        authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      )
      const payload =
        authMode === 'login'
          ? { email: form.email, password: form.password }
          : {
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email,
              password: form.password,
            }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Something went wrong.')
      }

      setSession({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      })

      setSuccess(authMode === 'login' ? 'Logged in successfully.' : 'Account created successfully.')
      window.setTimeout(() => {
        handleClose()
      }, 700)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to continue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed right-3 top-[88px] z-[95] w-[calc(100%-1.5rem)] max-w-[560px] rounded-[32px] bg-white p-[24px] xs:right-4 xs:w-[min(560px,calc(100%-2rem))] xs:p-[40px] md:right-6 lg:right-8 minW1600:right-[max(24px,calc((100vw-1300px)/2))]"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-Mneutral-100 text-Mneutral-900 transition-colors hover:bg-Mneutral-50"
              aria-label="Close auth modal"
            >
              <X size={16} />
            </button>

            <div className="grid grid-cols-1 gap-[32px]">
              <h3 className="text__32">{title}</h3>

              <div className="grid grid-cols-2 text-center text__14">
                <button
                  type="button"
                  className={`border-b py-[12px] ${
                    authMode === 'login'
                      ? 'border-Mneutral-900'
                      : 'border-Mneutral-200 text-Mneutral-400'
                  }`}
                  onClick={() => handleModeChange('login')}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`border-b py-[12px] ${
                    authMode === 'signup'
                      ? 'border-Mneutral-900'
                      : 'border-Mneutral-200 text-Mneutral-400'
                  }`}
                  onClick={() => handleModeChange('signup')}
                >
                  I&apos;m new here
                </button>
              </div>

              <form className="grid grid-cols-1 gap-[24px]" onSubmit={handleSubmit}>
                {authMode === 'signup' && (
                  <>
                    <FieldInput
                      value={form.firstName}
                      onChange={(value) => handleChange('firstName', value)}
                      placeholder="First Name*"
                    />
                    <FieldInput
                      value={form.lastName}
                      onChange={(value) => handleChange('lastName', value)}
                      placeholder="Last Name*"
                    />
                  </>
                )}

                <FieldInput
                  value={form.email}
                  onChange={(value) => handleChange('email', value)}
                  placeholder="Email Address*"
                  type="email"
                />

                <PasswordInput
                  value={form.password}
                  onChange={(value) => handleChange('password', value)}
                  placeholder="Password*"
                  visible={showPassword}
                  toggleVisible={() => setShowPassword((current) => !current)}
                />

                {authMode === 'signup' && form.password && (
                  <div className="-mt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3].map((segment) => (
                          <div
                            key={segment}
                            className={`h-[4px] flex-1 rounded-full transition-colors duration-300 ${
                              passwordStrength(form.password).score >= segment
                                ? passwordStrength(form.password).bar
                                : 'bg-Mneutral-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text__12 text-Mneutral-500">
                        {passwordStrength(form.password).label}
                      </span>
                    </div>
                    {passwordStrength(form.password).score < 3 && (
                      <p className="mt-1.5 text__12 text-Mneutral-400">
                        Tip: use 10+ characters with a mix of upper & lower case, numbers, and symbols for a strong password.
                      </p>
                    )}
                  </div>
                )}

                {authMode === 'signup' && (
                  <>
                    <PasswordInput
                      value={form.confirmPassword}
                      onChange={(value) => handleChange('confirmPassword', value)}
                      placeholder="Confirm Password*"
                      visible={showConfirmPassword}
                      toggleVisible={() => setShowConfirmPassword((current) => !current)}
                    />

                    <button
                      type="button"
                      className="flex items-center gap-2 text-left"
                      onClick={() => setAcceptTerms((current) => !current)}
                    >
                      <span
                        className={`flex h-[20px] w-[20px] items-center justify-center rounded border ${
                          acceptTerms ? 'border-Mneutral-900 bg-Mneutral-900' : 'border-Mneutral-400'
                        }`}
                      >
                        {acceptTerms ? <span className="h-[8px] w-[8px] rounded-sm bg-white" /> : null}
                      </span>
                      <span className="text__14">I&apos;ve read and accept the Terms & Conditions</span>
                    </button>
                  </>
                )}

                {error ? <p className="text__14 text-red-600">{error}</p> : null}
                {success ? <p className="text__14 text-emerald-600">{success}</p> : null}

                {authMode === 'signup' ? (
                  <p className="text__14 text-Mneutral-600">
                    By clicking on &apos;Create an Account&apos;, you accept our confidentiality policies.
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-full bg-Mneutral-900 px-[20px] py-[14px] font-medium text__16 text-center text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : authMode === 'login' ? 'LOGIN' : 'SIGN UP'}
                </button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-Mneutral-200" />
                  <span className="text__12 text-Mneutral-400">or</span>
                  <span className="h-px flex-1 bg-Mneutral-200" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // /api prefix — the vite proxy routes it to the backend
                    window.location.href = getApiUrl('/api/auth/google')
                  }}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-Mneutral-300 bg-white px-[20px] py-[14px] font-medium text__16 text-center text-Mneutral-900 transition-colors hover:bg-Mneutral-50"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function FieldInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <div className="border-b border-Mneutral-400">
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[44px] w-full border-none bg-transparent text-Mneutral-900 text__14 outline-none placeholder:text-Mneutral-400"
        placeholder={placeholder}
      />
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  visible,
  toggleVisible,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  visible: boolean
  toggleVisible: () => void
}) {
  return (
    <div className="flex justify-between gap-2 border-b border-Mneutral-400">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[44px] w-full border-none bg-transparent text-Mneutral-900 text__14 outline-none placeholder:text-Mneutral-400"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={toggleVisible}
        className={`transition-opacity ${visible ? 'opacity-60' : ''}`}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, X } from 'lucide-react'
import { useAuthStore, useUIStore } from '../../lib/store'

type AuthMode = 'login' | 'signup'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
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
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
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

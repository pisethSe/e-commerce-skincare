import React, { useEffect, useState } from 'react'
import { Leaf, LogOut, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiData } from '../lib/api'
import { formatDate } from '../lib/format'
import { useAuthStore, adminInitials, type AdminUser } from '../lib/authStore'
import Field from '../components/ui/Field'
import ConfirmDialog from '../components/ui/ConfirmDialog'

interface Me extends AdminUser {
  emailVerified?: boolean
  createdAt?: string
}

/** Settings — live admin profile, password change, and store info. */
export default function SettingsPage() {
  const { user, setUser, clear } = useAuthStore()
  const [me, setMe] = useState<Me | null>(user)
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  useEffect(() => {
    apiData<Me>({ url: '/users/me' })
      .then((data) => {
        setMe(data)
        setUser(data)
        setFirstName(data.firstName ?? '')
        setLastName(data.lastName ?? '')
      })
      .catch(() => {})
  }, [setUser])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await apiData<Me>({
        method: 'PATCH',
        url: '/users/me',
        data: { firstName: firstName.trim() || null, lastName: lastName.trim() || null },
      })
      setMe((prev) => ({ ...(prev ?? updated), ...updated }))
      setUser({ ...(user as AdminUser), ...updated })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    setSavingPassword(true)
    try {
      await apiData({
        method: 'PATCH',
        url: '/auth/change-password',
        data: { currentPassword, newPassword },
      })
      toast.success('Password changed — all sessions signed out')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed')
    } finally {
      setSavingPassword(false)
    }
  }

  const signOut = async () => {
    setConfirmSignOut(false)
    try {
      const refresh = localStorage.getItem('calesta-admin-refresh')
      await apiData({ method: 'POST', url: '/auth/logout', data: { refreshToken: refresh } })
    } catch {
      // clear local state regardless
    }
    clear()
    window.location.href = '/admin'
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
      <div className="space-y-6">
        {/* Profile */}
        <form onSubmit={saveProfile} className="admin-card p-6">
          <p className="admin-kicker">Profile</p>
          <h2 className="mt-2 font-display text__24 font-medium text-[#102d26]">Your details</h2>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#102d26] text__14 font-semibold text-white">
              {adminInitials(me)}
            </div>
            <div>
              <p className="text__16 font-medium text-[#102d26]">
                {me ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || 'Admin' : 'Admin'}
              </p>
              <p className="text__14 text-[#9ca8a5]">{me?.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Piseth"
                className="input-admin"
              />
            </Field>
            <Field label="Last name">
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Se"
                className="input-admin"
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="submit" className="btn-admin" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>

        {/* Password */}
        <form onSubmit={changePassword} className="admin-card p-6">
          <p className="admin-kicker">Security</p>
          <h2 className="mt-2 font-display text__24 font-medium text-[#102d26]">Change password</h2>

          <div className="mt-6 space-y-4">
            <Field label="Current password">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-admin"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" hint="At least 8 characters">
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-admin"
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-admin"
                />
              </Field>
            </div>

            {passwordError && (
              <p role="alert" className="rounded-[8px] bg-[#fdeeee] px-4 py-3 text__14 text-[#a83636]">
                {passwordError}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button type="submit" className="btn-admin" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* Store info + session */}
      <div className="space-y-6">
        <div className="admin-card p-6">
          <p className="admin-kicker">Store</p>
          <h2 className="mt-2 font-display text__24 font-medium text-[#102d26]">Calesta</h2>
          <div className="mt-5 space-y-3 text__14">
            {[
              ['Storefront', 'http://localhost:3000'],
              ['Admin console', 'http://localhost:3001/admin'],
              ['API', 'http://localhost:5001/health'],
              ['Member since', me?.createdAt ? formatDate(me.createdAt) : '—'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-[10px] border border-[#e7eae9] bg-white px-4 py-3"
              >
                <span className="text-[#6e7f7b]">{label}</span>
                <span className="truncate font-medium text-[#102d26]">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-[10px] bg-[#f8f9f8] px-4 py-4 text__14 text-[#6e7f7b]">
            <Leaf size={15} className="mt-0.5 flex-shrink-0 text-[#5a7a3a]" />
            The store runs on a local PostgreSQL database. Switch
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text__12">backend/.env</code>
            to a Neon connection string for production.
          </div>
        </div>

        <div className="admin-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eaf1e3] text-[#5a7a3a]">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text__14 font-medium text-[#102d26]">Session</p>
                <p className="text__12 text-[#9ca8a5]">Signed in as {me?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[#e7eae9] bg-white px-4 py-2.5 text__14 font-medium text-[#102d26] transition-all duration-200 hover:border-[#f6d9d9] hover:bg-[#fdeeee] hover:text-[#a83636] active:scale-[0.97]"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out"
        message={`Are you sure you want to sign out${me ? `, ${me.firstName ?? 'Admin'}` : ''}? You'll need to log in again to manage the store.`}
        confirmLabel="Yes, sign out"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={signOut}
      />
    </div>
  )
}

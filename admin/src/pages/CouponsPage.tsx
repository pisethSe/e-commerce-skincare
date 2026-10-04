import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Tag, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiData, apiList } from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import Drawer from '../components/ui/Drawer'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Field from '../components/ui/Field'

interface Coupon {
  id: string
  code: string
  type: string
  value: number
  minOrderAmt: number | null
  maxUses: number | null
  usedCount: number
  active: boolean
  expiresAt: string | null
  createdAt: string
}

interface CouponForm {
  code: string
  type: string
  value: string
  minOrderAmt: string
  maxUses: string
  expiresAt: string
  active: boolean
}

const EMPTY_FORM: CouponForm = {
  code: '',
  type: 'PERCENTAGE',
  value: '',
  minOrderAmt: '',
  maxUses: '',
  expiresAt: '',
  active: true,
}

/** Coupons — create, toggle, and delete promotion codes. */
export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Coupon | null>(null)
  const [busyDelete, setBusyDelete] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiList<Coupon>({ url: '/coupons' })
      setCoupons(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrderAmt: form.minOrderAmt ? Number(form.minOrderAmt) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      active: form.active,
    }
    try {
      await apiData({ method: 'POST', url: '/coupons', data: payload })
      toast.success(`Coupon ${payload.code} created`)
      setDrawerOpen(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    setTogglingId(coupon.id)
    try {
      const updated = await apiData<Coupon>({
        method: 'PATCH',
        url: `/coupons/${coupon.id}`,
        data: { active: !coupon.active },
      })
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: updated.active } : c)))
      toast.success(updated.active ? `${coupon.code} activated` : `${coupon.code} deactivated`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await apiData({ method: 'DELETE', url: `/coupons/${deleting.id}` })
      toast.success(`Coupon ${deleting.code} deleted`)
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyDelete(false)
    }
  }

  const usageLabel = (c: Coupon) =>
    c.maxUses ? `${c.usedCount} / ${c.maxUses} uses` : `${c.usedCount} uses`

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setDrawerOpen(true)} className="btn-admin">
          <Plus size={15} /> New coupon
        </button>
      </div>

      {error ? (
        <div className="admin-card p-6 text__14 text-[#a83636]">{error}</div>
      ) : loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="admin-card h-[92px] animate-pulse" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={<Tag size={18} />}
          title="No coupons yet"
          hint="Create a promotion code — customers can apply it in cart and checkout."
          action={
            <button type="button" onClick={() => setDrawerOpen(true)} className="btn-admin">
              <Plus size={15} /> New coupon
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon, i) => (
            <motion.div
              key={coupon.id}
              className="admin-card p-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#102d26] text-white">
                    <Tag size={16} />
                  </div>
                  <div>
                    <p className="font-mono text__16 font-semibold tracking-wide text-[#102d26]">
                      {coupon.code}
                    </p>
                    <span
                      className={`badge mt-1 ${
                        coupon.type === 'PERCENTAGE' ? 'bg-[#f7f1de] text-[#7a6420]' : 'bg-[#ddf0e9] text-[#102d26]'
                      }`}
                    >
                      {coupon.type === 'PERCENTAGE' ? `${Number(coupon.value)}% off` : `${formatMoney(coupon.value)} off`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleting(coupon)}
                  aria-label={`Delete ${coupon.code}`}
                  className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#9ca8a5] transition-colors hover:bg-[#fdeeee] hover:text-[#a83636] active:scale-[0.97]"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-4 space-y-2 text__14">
                <div className="flex justify-between text-[#6e7f7b]">
                  <span>Usage</span>
                  <span className="tabular-nums text-[#102d26]">{usageLabel(coupon)}</span>
                </div>
                {coupon.minOrderAmt && Number(coupon.minOrderAmt) > 0 && (
                  <div className="flex justify-between text-[#6e7f7b]">
                    <span>Minimum order</span>
                    <span className="tabular-nums text-[#102d26]">{formatMoney(coupon.minOrderAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#6e7f7b]">
                  <span>Expires</span>
                  <span className="tabular-nums text-[#102d26]">{formatDate(coupon.expiresAt)}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#e7eae9] pt-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={coupon.active}
                    disabled={togglingId === coupon.id}
                    onChange={() => toggleActive(coupon)}
                    className="h-5 w-5 cursor-pointer accent-[#102d26]"
                  />
                  <span className="text__14 font-medium text-[#102d26]">
                    {coupon.active ? 'Active' : 'Inactive'}
                  </span>
                </label>
                <span className="text__12 text-[#9ca8a5]">
                  {coupon.active ? 'Valid at checkout' : 'Not redeemable'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        kicker="New coupon"
        title="Create a promotion"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDrawerOpen(false)} className="btn-admin-outline" disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="coupon-form" className="btn-admin" disabled={saving}>
              {saving ? 'Creating…' : 'Create coupon'}
            </button>
          </div>
        }
      >
        <form id="coupon-form" onSubmit={save} className="space-y-5">
          <Field label="Code" hint="Customers type this at checkout — stored uppercase.">
            <input
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="GLOW20"
              className="input-admin font-mono uppercase tracking-wide"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="input-admin cursor-pointer"
              >
                <option value="PERCENTAGE">Percentage off</option>
                <option value="FIXED">Fixed amount off</option>
              </select>
            </Field>
            <Field label={form.type === 'PERCENTAGE' ? 'Percent (%)' : 'Amount (USD)'}>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder={form.type === 'PERCENTAGE' ? '20' : '10'}
                className="input-admin tabular-nums"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum order (USD)" hint="Optional">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minOrderAmt}
                onChange={(e) => setForm((f) => ({ ...f, minOrderAmt: e.target.value }))}
                placeholder="50"
                className="input-admin tabular-nums"
              />
            </Field>
            <Field label="Max uses" hint="Optional — blank means unlimited">
              <input
                type="number"
                min="0"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="100"
                className="input-admin tabular-nums"
              />
            </Field>
          </div>

          <Field label="Expires on" hint="Optional">
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="input-admin"
            />
          </Field>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-[#e7eae9] bg-[#f8f9f8] px-5 py-4">
            <span>
              <span className="block text__14 font-medium text-[#102d26]">Active</span>
              <span className="block text__12 text-[#9ca8a5]">Redeemable immediately</span>
            </span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-5 w-5 cursor-pointer accent-[#102d26]"
            />
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete coupon"
        message={`${deleting?.code} will be permanently removed. Customers will no longer be able to redeem it. This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busyDelete}
      />
    </div>
  )
}

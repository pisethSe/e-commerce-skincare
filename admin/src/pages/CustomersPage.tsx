import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Users } from 'lucide-react'
import { apiList, type Pagination as PaginationMeta } from '../lib/api'
import { formatDate } from '../lib/format'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'

interface Customer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: string
  emailVerified: boolean
}

/** Customers — live list from /api/users (admin). */
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items, pagination: p } = await apiList<Customer>({
        url: `/users?page=${page}&limit=12`,
      })
      setCustomers(items)
      setPagination(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const name = (c: Customer) => `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email
  const initials = (c: Customer) =>
    name(c)
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

  return (
    <div className="space-y-5">
      <div className="admin-card overflow-hidden">
        {error ? (
          <div className="p-6 text__14 text-[#a83636]">{error}</div>
        ) : loading ? (
          <div className="space-y-2 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-[10px] bg-[#f1f3f3]" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users size={18} />}
            title="No customers yet"
            hint="Customers appear here once they register in the storefront."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-[#e7eae9]">
                  <tr>
                    <th className="table-th">Customer</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Joined</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f3]">
                  {customers.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      className="transition-colors hover:bg-[#f8f9f8]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] bg-[#f1f3f3] text__12 font-semibold text-[#102d26]">
                            {initials(c)}
                          </div>
                          <p className="font-medium text-[#102d26]">{name(c)}</p>
                        </div>
                      </td>
                      <td className="table-td text-[#6e7f7b]">{c.email}</td>
                      <td className="table-td whitespace-nowrap text-[#6e7f7b]">{formatDate(c.createdAt)}</td>
                      <td className="table-td">
                        {c.emailVerified ? (
                          <span className="badge bg-[#eaf1e3] text-[#4a6132]">
                            <BadgeCheck size={11} /> Verified
                          </span>
                        ) : (
                          <span className="badge bg-[#f1f3f3] text-[#3f5650]">Unverified</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#e7eae9] px-5 py-4">
              <Pagination
                page={pagination?.page ?? 1}
                totalPages={pagination?.totalPages ?? 1}
                total={pagination?.total ?? 0}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

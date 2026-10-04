import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiData, apiList, type Pagination as PaginationMeta } from '../lib/api'
import { formatDate, slugify } from '../lib/format'
import Pagination from '../components/ui/Pagination'
import Drawer from '../components/ui/Drawer'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Field from '../components/ui/Field'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  category: string | null
  author: string | null
  readTime: number | null
  published: boolean
  publishedAt: string | null
  body: string | null
  createdAt: string
}

interface PostForm {
  title: string
  excerpt: string
  coverImage: string
  category: string
  author: string
  readTime: string
  body: string
  published: boolean
}

const EMPTY_FORM: PostForm = {
  title: '',
  excerpt: '',
  coverImage: '',
  category: 'Skincare',
  author: 'Calesta Beauty',
  readTime: '5',
  body: '',
  published: false,
}

/** Journal — create, edit, publish, and delete editorial posts. */
export default function JournalPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [form, setForm] = useState<PostForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<BlogPost | null>(null)
  const [busyDelete, setBusyDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items, pagination: p } = await apiList<BlogPost>({
        url: `/blog?all=1&page=${page}&limit=9`,
      })
      setPosts(items)
      setPagination(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDrawerOpen(true)
  }

  const openEdit = (post: BlogPost) => {
    setEditing(post)
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? '',
      coverImage: post.coverImage ?? '',
      category: post.category ?? 'Skincare',
      author: post.author ?? 'Calesta Beauty',
      readTime: String(post.readTime ?? 5),
      body: post.body ?? '',
      published: post.published,
    })
    setDrawerOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.title.trim()),
      excerpt: form.excerpt.trim() || null,
      coverImage: form.coverImage.trim() || null,
      category: form.category.trim() || null,
      author: form.author.trim() || null,
      readTime: Number(form.readTime) || 5,
      body: form.body.trim() || null,
      published: form.published,
      ...(form.published && !editing?.publishedAt ? { publishedAt: new Date().toISOString() } : {}),
    }
    try {
      if (editing) {
        await apiData({ method: 'PUT', url: `/blog/${editing.id}`, data: payload })
        toast.success(`"${payload.title}" updated`)
      } else {
        await apiData({ method: 'POST', url: '/blog', data: payload })
        toast.success(`"${payload.title}" created`)
      }
      setDrawerOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await apiData({ method: 'DELETE', url: `/blog/${deleting.id}` })
      toast.success('Post deleted')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyDelete(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={openCreate} className="btn-admin">
          <Plus size={15} /> New post
        </button>
      </div>

      {error ? (
        <div className="admin-card p-6 text__14 text-[#a83636]">{error}</div>
      ) : loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="admin-card h-[280px] animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<FileText size={18} />}
          title="No journal posts yet"
          hint="Write your first editorial piece — drafts stay private until published."
          action={
            <button type="button" onClick={openCreate} className="btn-admin">
              <Plus size={15} /> New post
            </button>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                className="admin-card group flex flex-col overflow-hidden"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <div className="relative h-[150px] overflow-hidden bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#b4bcba]">
                      <FileText size={28} />
                    </div>
                  )}
                  <span
                    className={`badge absolute left-3 top-3 ${
                      post.published ? 'bg-[#ddf0e9] text-[#102d26]' : 'bg-[#102d26]/80 text-white'
                    }`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text__12 text-[#9ca8a5]">
                    {post.category && <span className="admin-kicker">{post.category}</span>}
                  </div>
                  <h3 className="mt-2 font-display text__20 font-medium leading-snug text-[#102d26]">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 text__14 leading-relaxed text-[#6e7f7b]">{post.excerpt}</p>
                  )}
                  <p className="mt-3 text__12 text-[#9ca8a5]">
                    {post.author ?? '—'} · {post.readTime ? `${post.readTime} min read` : ''} ·{' '}
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </p>

                  <div className="mt-auto flex gap-2 pt-4">
                    <button type="button" onClick={() => openEdit(post)} className="btn-admin-outline flex-1 justify-center">
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(post)}
                      aria-label={`Delete ${post.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-[7px] border border-[#e7eae9] text-[#9ca8a5] transition-colors hover:border-[#f6d9d9] hover:bg-[#fdeeee] hover:text-[#a83636] active:scale-[0.97]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="admin-card px-5 py-4">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        kicker={editing ? 'Edit post' : 'New post'}
        title={editing ? editing.title : 'Write in the journal'}
        width="600px"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDrawerOpen(false)} className="btn-admin-outline" disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="post-form" className="btn-admin" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create post'}
            </button>
          </div>
        }
      >
        <form id="post-form" onSubmit={save} className="space-y-5">
          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="The ritual of glowing skin"
              className="input-admin"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category">
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Skincare"
                className="input-admin"
              />
            </Field>
            <Field label="Author">
              <input
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                className="input-admin"
              />
            </Field>
            <Field label="Read time (min)">
              <input
                type="number"
                min="1"
                value={form.readTime}
                onChange={(e) => setForm((f) => ({ ...f, readTime: e.target.value }))}
                className="input-admin tabular-nums"
              />
            </Field>
          </div>

          <Field label="Excerpt">
            <textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="A short teaser shown in the journal listing"
              className="input-admin resize-none"
            />
          </Field>

          <Field label="Cover image URL">
            <input
              value={form.coverImage}
              onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
              placeholder="/images/Content.png"
              className="input-admin font-mono text__12"
            />
          </Field>

          {form.coverImage.trim() && (
            <div className="h-[160px] overflow-hidden rounded-[10px] border border-[#e7eae9] bg-[radial-gradient(circle_at_top,#fffaf1,#f4ead6)]">
              <img src={form.coverImage} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <Field label="Content">
            <textarea
              rows={8}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="The full post body…"
              className="input-admin resize-none"
            />
          </Field>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-[#e7eae9] bg-[#f8f9f8] px-5 py-4">
            <span>
              <span className="block text__14 font-medium text-[#102d26]">Published</span>
              <span className="block text__12 text-[#9ca8a5]">
                Visible in the storefront journal — drafts stay private
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              className="h-5 w-5 cursor-pointer accent-[#102d26]"
            />
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete post"
        message={`"${deleting?.title}" will be permanently removed from the journal. This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busyDelete}
      />
    </div>
  )
}

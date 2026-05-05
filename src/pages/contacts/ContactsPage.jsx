import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, Building2, Check, ChevronDown, ChevronLeft, CircleAlert,
  Download, Mail, MapPin, Phone, Plus, RefreshCw, Search, Trash2,
  Upload, User, UserPlus, X, Copy,
} from 'lucide-react'
import { getCurrentUser } from '../../api/auth/authService'
import { listOrganizations } from '../../api/orgs/orgService'
import {
  createContact, deleteContact, downloadImportTemplate,
  getContact, importContacts, listContacts,
} from '../../api/contacts/contactService'

/* ─────────── constants ─────────── */

const STATUS_META = {
  new: { label: 'New', bg: '#EEF2FF', fg: '#4338CA', dot: '#6366F1' },
  contacted: { label: 'Contacted', bg: '#ECFEFF', fg: '#0E7490', dot: '#06B6D4' },
  interested: { label: 'Interested', bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B' },
  applied: { label: 'Applied', bg: '#F5F3FF', fg: '#5B21B6', dot: '#8B5CF6' },
  enrolled: { label: 'Enrolled', bg: '#ECFDF5', fg: '#065F46', dot: '#10B981' },
  dropped: { label: 'Dropped', bg: '#FEF2F2', fg: '#991B1B', dot: '#EF4444' },
}

const STATUS_OPTIONS = Object.keys(STATUS_META)
const SOURCE_OPTIONS = ['web_form', 'referral', 'import_csv', 'manual', 'social', 'other']
const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State', 'Other']

const niceLabel = (v) => v ? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-'

function fmtDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d) ? v : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

const PALETTE = [
  { from: '#6366F1', to: '#8B5CF6', bg: '#EEF2FF', fg: '#4338CA' },
  { from: '#10B981', to: '#059669', bg: '#ECFDF5', fg: '#065F46' },
  { from: '#F59E0B', to: '#EF4444', bg: '#FFFBEB', fg: '#92400E' },
  { from: '#EC4899', to: '#8B5CF6', bg: '#FDF2F8', fg: '#9D174D' },
  { from: '#06B6D4', to: '#3B82F6', bg: '#ECFEFF', fg: '#155E75' },
  { from: '#F97316', to: '#EF4444', bg: '#FFF7ED', fg: '#9A3412' },
]
function palette(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/* ─────────── primitives ─────────── */

function Modal({ open, onClose, title, subtitle, icon: Icon, iconBg = '#EEF2FF', iconFg = '#4F46E5', children, max = 'max-w-md' }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={`relative w-full ${max} max-h-[90vh] rounded-xl bg-white shadow-2xl ring-1 ring-black/6`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-white px-6 pt-6 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: iconBg }}>
                  <Icon size={17} style={{ color: iconFg }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  {subtitle && <p className="mt-0.5 font-mono text-[10px] text-gray-400">{subtitle}</p>}
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl p-1.5 text-gray-300 transition hover:bg-gray-100 hover:text-gray-500">
                <X size={15} />
              </button>
            </div>
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Drawer({ open, onClose, title, subtitle, icon: Icon, iconBg = '#EEF2FF', iconFg = '#4F46E5', children, max = 'max-w-md' }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={`relative flex h-full w-full ${max} flex-col bg-white shadow-2xl`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: iconBg }}>
                  <Icon size={17} style={{ color: iconFg }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  {subtitle && <div className="mt-0.5 font-mono text-[10px] text-gray-400">{subtitle}</div>}
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-gray-300 transition hover:bg-gray-100 hover:text-gray-500">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Field({ id, label, value, onChange, placeholder, type = 'text', leading, autoFocus, maxLength }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <div className="relative">
        {leading && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">{leading}</span>}
        <input
          id={id} type={type} value={value} onChange={onChange}
          placeholder={placeholder} autoFocus={autoFocus} maxLength={maxLength}
          className={`w-full rounded-md border border-gray-200 bg-gray-50 ${leading ? 'pl-10' : 'pl-4'} pr-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100`}
        />
      </div>
    </div>
  )
}

function Select({ id, label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  
  // Find selected option label
  let selectedLabel = placeholder || 'Select...'
  if (value) {
    const found = options.find(o => (typeof o === 'string' ? o : o.value) === value)
    if (found) selectedLabel = typeof found === 'string' ? niceLabel(found) : found.label
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <button
        type="button" id={id} onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 bottom-[calc(100%+4px)] z-20 overflow-hidden rounded-md border border-gray-100 bg-white shadow-xl ring-1 ring-black/5"
            >
              <div className="max-h-60 overflow-y-auto p-1">
                {placeholder && (
                  <button
                    type="button"
                    onClick={() => { onChange({ target: { value: '' } }); setOpen(false) }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition ${!value ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span>{placeholder}</span>
                    {!value && <Check size={14} className="text-indigo-600" />}
                  </button>
                )}
                {options.map((o) => {
                  const val = typeof o === 'string' ? o : o.value
                  const lbl = typeof o === 'string' ? niceLabel(o) : o.label
                  const isSelected = val === value
                  return (
                    <button
                      key={val} type="button"
                      onClick={() => { onChange({ target: { value: val } }); setOpen(false) }}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition ${isSelected ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span>{lbl}</span>
                      {isSelected && <Check size={14} className="text-indigo-600" />}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.new
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: m.bg, color: m.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed top-8 right-8 z-[60]"
        >
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl ring-1 ${toast.type === 'error' ? 'bg-white text-red-600 ring-red-200' : 'bg-gray-950 text-white ring-gray-800'
            }`}>
            {toast.type === 'error'
              ? <X size={15} className="shrink-0 text-red-500" />
              : <Check size={15} className="shrink-0 text-emerald-400" />}
            {toast.msg}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─────────── page ─────────── */

export default function ContactsPage() {
  const me = getCurrentUser()
  const isSuper = me?.role === 'super_admin'
  const [searchParams, setSearchParams] = useSearchParams()

  if (!isSuper) {
    return <ContactsList orgId={me?.org_id || null} isSuper={false} />
  }

  const selectedOrgId = searchParams.get('org')
  return selectedOrgId ? (
    <ContactsList
      orgId={selectedOrgId}
      isSuper
      onBackToOrgs={() => setSearchParams({})}
    />
  ) : (
    <OrgPicker onSelect={(orgId) => setSearchParams({ org: orgId })} />
  )
}

/* ─────────── super_admin org picker ─────────── */

function OrgPicker({ onSelect }) {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const data = await listOrganizations({ limit: 100 })
          if (!cancelled) setOrgs((data.items ?? []).filter(o => o.is_active))
        } catch (e) {
          if (!cancelled) setToast({ msg: e.message || 'Failed to load organizations.', type: 'error' })
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [])

  const filtered = orgs.filter(o => o.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div
      className="min-h-full px-8 py-7"
      style={{ background: 'radial-gradient(ellipse 90% 40% at 60% -10%, rgba(99,102,241,0.07) 0%, transparent 70%), #F9FAFB' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pick an organization</h1>
            <p className="mt-1 text-sm text-gray-500">Choose an organization to view and manage its contacts.</p>
          </div>

          <div className="flex w-full sm:w-auto sm:min-w-[300px] items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
            <Search size={14} className="shrink-0 text-gray-300" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search organizations…"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-300"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-white shadow-sm ring-1 ring-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
              <Building2 size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No organizations found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(o => {
              const c = palette(o.name)
              return (
                <motion.button
                  key={o.org_id}
                  whileHover={{ y: -3 }}
                  onClick={() => onSelect(o.org_id)}
                  className="group flex flex-col rounded-lg bg-white p-5 text-left shadow-sm ring-1 ring-gray-100 transition hover:shadow-lg hover:ring-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-lg"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold text-gray-900">{o.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="font-mono text-[10px] text-gray-400">{o.org_id.slice(0, 8)}…</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(o.org_id)
                            setToast({ msg: 'Organization ID copied!', type: 'success' })
                          }}
                          className="rounded p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                          title="Copy full ID"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <span>Created {fmtDate(o.created_at)}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100">
                      View <ArrowRight size={12} />
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed top-8 right-8 z-[60]"
          >
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl ring-1 ${toast.type === 'error' ? 'bg-white text-red-600 ring-red-200' : 'bg-gray-950 text-white ring-gray-800'
              }`}>
              {toast.type === 'error'
                ? <X size={15} className="shrink-0 text-red-500" />
                : <Check size={15} className="shrink-0 text-emerald-400" />}
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────── contacts list ─────────── */

const INITIAL_FORM = {
  full_name: '', email: '',
  phone_country_code: '+91', phone_number: '',
  city: '', state: '',
  twelfth_score: '', twelfth_board: 'CBSE',
}

function ContactsList({ orgId, isSuper, onBackToOrgs }) {
  const [contacts, setContacts] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [orgName, setOrgName] = useState('')
  const [toast, setToast] = useState(null)

  // create
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

  // import
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importErr, setImportErr] = useState('')

  // view / delete
  const [viewing, setViewing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletingId, setDeletingId] = useState('')

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  // Fetch org name (for header) when super_admin selected an org
  useEffect(() => {
    if (!isSuper) return
    let cancelled = false
    listOrganizations({ limit: 100 }).then(d => {
      if (cancelled) return
      const o = (d.items ?? []).find(x => x.org_id === orgId)
      setOrgName(o?.name || '')
    }).catch(() => { })
    return () => { cancelled = true }
  }, [isSuper, orgId])

  const queryArgs = useMemo(() => ({
    orgId: orgId || undefined,
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
    limit: 20,
  }), [orgId, statusFilter, sourceFilter])

  async function load() {
    setLoading(true)
    try {
      const data = await listContacts(queryArgs)
      setContacts(data.items ?? [])
      setNextCursor(data.next_cursor ?? null)
    } catch (e) {
      showToast(e.message || 'Failed to load contacts.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await listContacts({ ...queryArgs, startAfter: nextCursor })
      setContacts(prev => [...prev, ...(data.items ?? [])])
      setNextCursor(data.next_cursor ?? null)
    } catch (e) {
      showToast(e.message || 'Failed to load more.', 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId, statusFilter, sourceFilter])

  const filtered = contacts.filter(c => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.full_phone || '').includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    )
  })

  /* ── handlers ── */

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { setCreateErr('Full name is required.'); return }
    if (!form.email.trim()) { setCreateErr('Email is required.'); return }
    if (!form.phone_number.trim()) { setCreateErr('Phone number is required.'); return }
    setCreating(true); setCreateErr('')
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_country_code: form.phone_country_code.trim() || '+91',
        phone_number: form.phone_number.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        twelfth_score: form.twelfth_score === '' ? null : Number(form.twelfth_score),
        twelfth_board: form.twelfth_board,
        source: 'manual',
        status: 'new',
      }
      if (isSuper) payload.org_id = orgId
      const created = await createContact(payload)
      setCreateOpen(false); setForm(INITIAL_FORM)
      setContacts(prev => [created, ...prev])
      showToast(`"${created.full_name}" added`)
    } catch (e) {
      setCreateErr(e.message || 'Could not create contact.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDownloadTemplate() {
    try {
      const blob = await downloadImportTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contacts_import_template.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('Template downloaded')
    } catch (e) {
      showToast(e.message || 'Download failed.', 'error')
    }
  }

  async function handleImport(e) {
    e.preventDefault()
    if (!importFile) { setImportErr('Choose a CSV file first.'); return }
    setImporting(true); setImportErr(''); setImportResult(null)
    try {
      const result = await importContacts({ orgId: isSuper ? orgId : undefined, file: importFile })
      setImportResult(result)
      showToast(`${result.created} created, ${result.skipped} skipped`)
      await load()
    } catch (e) {
      setImportErr(e.message || 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  async function handleView(contact) {
    setViewing({ ...contact, _full: contact, _loading: true })
    try {
      const full = await getContact(contact.contact_id)
      setViewing({ ...full, _loading: false })
    } catch (e) {
      setViewing({ ...contact, _loading: false, _err: e.message })
    }
  }

  async function performDelete(contact) {
    setDeletingId(contact.contact_id)
    try {
      await deleteContact(contact.contact_id)
      setContacts(prev => prev.filter(c => c.contact_id !== contact.contact_id))
      showToast(`"${contact.full_name}" deleted`)
      setConfirmDelete(null)
      if (viewing?.contact_id === contact.contact_id) setViewing(null)
    } catch (e) {
      showToast(e.message || 'Delete failed.', 'error')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div
      className="min-h-full px-8 py-7"
      style={{ background: 'radial-gradient(ellipse 90% 40% at 60% -10%, rgba(99,102,241,0.07) 0%, transparent 70%), #F9FAFB' }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            {isSuper && onBackToOrgs && (
              <button
                onClick={onBackToOrgs}
                className="mb-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <ChevronLeft size={12} /> All organizations
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isSuper && orgName ? <>Organization · <span className="font-semibold text-gray-700">{orgName}</span></> : 'Student leads in your pipeline'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => load()}
              className="rounded-md border border-gray-200 bg-white p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 shadow-sm"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <Download size={13} /> Template
            </button>
            <button
              onClick={() => { setImportOpen(true); setImportFile(null); setImportErr(''); setImportResult(null) }}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <Upload size={13} /> Import CSV
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setCreateOpen(true); setForm(INITIAL_FORM); setCreateErr('') }}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              <Plus size={14} /> New contact
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 sm:max-w-sm">
            <Search size={14} className="shrink-0 text-gray-300" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, city…"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-300"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-300 transition hover:text-gray-500">
                <X size={13} />
              </button>
            )}
          </div>
          <FilterSelect
            value={statusFilter} onChange={setStatusFilter}
            placeholder="All statuses" options={STATUS_OPTIONS}
          />
          <FilterSelect
            value={sourceFilter} onChange={setSourceFilter}
            placeholder="All sources" options={SOURCE_OPTIONS}
          />
          <span className="text-xs font-medium text-gray-400">{filtered.length} shown</span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
          {loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyContacts hasFilter={!!(search || statusFilter || sourceFilter)} onCreate={() => { setCreateOpen(true); setForm(INITIAL_FORM); setCreateErr('') }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">12th</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => {
                    const p = palette(c.full_name || c.email || '')
                    const initials = (c.full_name || c.email || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
                    return (
                      <tr
                        key={c.contact_id}
                        onClick={() => handleView(c)}
                        className="cursor-pointer transition hover:bg-gray-50/70"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                              style={{ background: p.bg, color: p.fg }}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">{c.full_name}</p>
                              <p className="truncate text-xs text-gray-400">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{c.full_phone || '-'}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-600">
                          {c.city ? <>{c.city}{c.state ? `, ${c.state}` : ''}</> : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {c.twelfth_score != null ? (
                            <div>
                              <p className="font-semibold text-gray-800">{c.twelfth_score}%</p>
                              <p className="font-mono text-[10px] text-gray-400">{c.twelfth_board || '-'}</p>
                            </div>
                          ) : <span className="text-gray-600">-</span>}
                        </td>
                        <td className="px-5 py-3.5"><StatusPill status={c.status} /></td>
                        <td className="px-5 py-3.5 text-xs text-gray-600">{niceLabel(c.source)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(c) }}
                            className="rounded-lg p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                            title="Delete contact"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {nextCursor && !loading && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingMore ? <RefreshCw size={13} className="animate-spin" /> : <ChevronDown size={13} />}
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      <Modal
        open={createOpen} onClose={() => setCreateOpen(false)}
        title="New contact" subtitle={isSuper && orgName ? orgName : undefined}
        icon={UserPlus} max="max-w-2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field id="cname" label="Full name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Manish Vazzula" leading={<User size={14} />} autoFocus />
          <Field id="cemail" label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="manish@example.com" leading={<Mail size={14} />} />
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <Field id="ccode" label="Code" value={form.phone_country_code} onChange={e => setForm(f => ({ ...f, phone_country_code: e.target.value }))} placeholder="+91" />
            <Field id="cphone" label="Phone number" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="9876543210" leading={<Phone size={14} />} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ccity" label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Hyderabad" leading={<MapPin size={14} />} />
            <Field id="cstate" label="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="Telangana" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="cscore" label="12th score (%)" type="text" value={form.twelfth_score} maxLength={5}
              onChange={e => {
                let val = e.target.value.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                if (val.length > 5) val = val.slice(0, 5);
                setForm(f => ({ ...f, twelfth_score: val }));
              }}
              placeholder="e.g. 92.50"
            />
            <Select id="cboard" label="12th board" value={form.twelfth_board} onChange={e => setForm(f => ({ ...f, twelfth_board: e.target.value }))} options={BOARD_OPTIONS} />
          </div>
          {createErr && <p className="text-xs font-medium text-red-500">{createErr}</p>}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
              Cancel
            </button>
            <motion.button
              type="submit" disabled={creating}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {creating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={14} />}
              {creating ? 'Creating…' : 'Create'}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* ── Import modal ── */}
      <Modal
        open={importOpen} onClose={() => setImportOpen(false)}
        title="Import contacts" subtitle="CSV upload" icon={Upload}
        iconBg="#ECFDF5" iconFg="#059669"
      >
        <form onSubmit={handleImport} className="space-y-4">
          <p className="text-xs text-gray-500">
            Use the template format. Need it?{' '}
            <button type="button" onClick={handleDownloadTemplate} className="font-semibold text-indigo-600 hover:underline">
              Download template
            </button>
          </p>
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/30">
            <input
              type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
            />
            <Upload size={20} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">
              {importFile ? importFile.name : 'Click to choose a CSV file'}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">.csv, up to a few MB</p>
          </label>
          {importErr && <p className="text-xs font-medium text-red-500">{importErr}</p>}
          {importResult && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-xs ring-1 ring-emerald-100">
              <p className="font-semibold text-emerald-800">
                {importResult.total_rows} rows · {importResult.created} created · {importResult.skipped} skipped
              </p>
              {importResult.errors?.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-0.5 text-emerald-900/80">
                  {importResult.errors.slice(0, 5).map((er, i) => <li key={i}>{typeof er === 'string' ? er : JSON.stringify(er)}</li>)}
                  {importResult.errors.length > 5 && <li>… and {importResult.errors.length - 5} more</li>}
                </ul>
              )}
            </div>
          )}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={() => setImportOpen(false)} className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
              Close
            </button>
            <motion.button
              type="submit" disabled={importing || !importFile}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            >
              {importing ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={14} />}
              {importing ? 'Uploading…' : 'Upload'}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* ── View drawer ── */}
      <Drawer
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.full_name || 'Contact'}
        subtitle={viewing?.contact_id && (
          <div className="flex items-center gap-1.5">
            <span>{viewing.contact_id}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(viewing.contact_id)
                showToast('Contact ID copied!')
              }}
              className="rounded p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              title="Copy ID"
            >
              <Copy size={10} />
            </button>
          </div>
        )}
        icon={User} max="max-w-lg"
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <StatusPill status={viewing.status} />
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                {niceLabel(viewing.source)}
              </span>
            </div>

            <DetailGrid rows={[
              { k: 'Email', v: viewing.email },
              { k: 'Phone', v: viewing.full_phone },
              { k: 'City', v: viewing.city },
              { k: 'State', v: viewing.state },
              { k: '12th score (%)', v: viewing.twelfth_score ?? '-' },
              { k: '12th board', v: viewing.twelfth_board || '-' },
              { k: 'Created', v: fmtDate(viewing.created_at) },
              { k: 'Updated', v: fmtDate(viewing.updated_at) },
            ]} />

            {viewing.call_profile && (
              <div className="rounded-md border border-gray-100 p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Call profile</p>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Interested</span>
                    <span className="font-semibold text-gray-900">{viewing.call_profile.interested ? 'Yes' : 'No'}</span>
                  </div>
                  {viewing.call_profile.lost_reason && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Lost reason</span>
                      <span className="font-semibold text-gray-900">{viewing.call_profile.lost_reason}</span>
                    </div>
                  )}
                  {viewing.call_profile.interested_programs && viewing.call_profile.interested_programs.length > 0 && (
                    <div className="pt-1">
                      <p className="mb-1.5 text-xs text-gray-500">Programs Interested</p>
                      <div className="flex flex-wrap gap-1.5">
                        {viewing.call_profile.interested_programs.map(p => (
                          <span key={p} className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewing.call_profile.exam_scores && viewing.call_profile.exam_scores.length > 0 && (
                    <div className="pt-1">
                      <p className="mb-1.5 text-xs text-gray-500">Exam scores</p>
                      <div className="space-y-1.5">
                        {viewing.call_profile.exam_scores.map((e, idx) => (
                          <div key={idx} className="rounded-md bg-gray-50 p-3 text-xs">
                            <p className="mb-2 font-semibold text-gray-800">{e.exam}</p>
                            <div className="flex gap-4 text-gray-500">
                              <div>Score: <span className="font-semibold text-gray-700">{e.score}</span></div>
                              <div>Rank: <span className="font-semibold text-gray-700">{e.rank}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setViewing(null)}
                className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => { setConfirmDelete(viewing); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border border-red-100 bg-red-50 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Delete confirm ── */}
      <Modal
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        title="Delete contact?" icon={CircleAlert}
        iconBg="#FEF2F2" iconFg="#DC2626"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 px-4 py-3.5 text-sm text-red-900 ring-1 ring-red-100">
              <p className="font-semibold">"{confirmDelete.full_name}" will be permanently deleted.</p>
              <p className="mt-1 text-xs text-red-800/80">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
                Cancel
              </button>
              <motion.button
                onClick={() => performDelete(confirmDelete)}
                disabled={deletingId === confirmDelete.contact_id}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #F87171, #DC2626)' }}
              >
                {deletingId === confirmDelete.contact_id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={14} />}
                {deletingId === confirmDelete.contact_id ? 'Deleting…' : 'Delete'}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toast={toast} />
    </div>
  )
}

/* ─────────── small components ─────────── */

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <div className="relative">
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{niceLabel(o)}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function DetailGrid({ rows }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map(({ k, v }) => (
        <div key={k} className="rounded-md border border-gray-100 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{k}</p>
          <p className="mt-1 text-sm font-medium text-gray-800 break-words">{v ?? '-'}</p>
        </div>
      ))}
    </div>
  )
}

function EmptyContacts({ hasFilter, onCreate }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
        {hasFilter ? <Search size={20} className="text-gray-300" /> : <UserPlus size={20} className="text-gray-300" />}
      </div>
      <p className="text-base font-semibold text-gray-800">
        {hasFilter ? 'No contacts match your filters' : 'No contacts yet'}
      </p>
      <p className="mt-1 text-sm text-gray-400">
        {hasFilter ? 'Try clearing search or filters' : 'Add your first lead to start tracking the pipeline.'}
      </p>
      {!hasFilter && (
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
          onClick={onCreate}
          className="mt-5 flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
        >
          <Plus size={14} /> New contact
        </motion.button>
      )}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Building2, Check, ChevronDown, CircleAlert,
  PhoneCall, RefreshCw, Search, UserPlus, X, Copy, Download, Bot, Variable,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useTheme } from '../../hooks/useTheme'
import { getCurrentUser } from '../../api/auth/authService'
import { listOrganizations } from '../../api/orgs/orgService'
import { listContacts } from '../../api/contacts/contactService'
import { bulkCallContacts, getCallStatus } from '../../api/agents/agentService'
import { getOrganizationAgentContext } from '../../api/agents/orgScopedAgentService'

/* ─────────── shared meta ─────────── */

const STATUS_META = {
  new:        { label: 'New',        dot: '#6366F1', light: { bg: '#EEF2FF', fg: '#4338CA' }, dark: { bg: 'rgba(99,102,241,0.15)',  fg: '#A5B4FC' } },
  contacted:  { label: 'Contacted',  dot: '#06B6D4', light: { bg: '#ECFEFF', fg: '#0E7490' }, dark: { bg: 'rgba(6,182,212,0.13)',   fg: '#67E8F9' } },
  interested: { label: 'Interested', dot: '#F59E0B', light: { bg: '#FEF3C7', fg: '#92400E' }, dark: { bg: 'rgba(245,158,11,0.13)',  fg: '#FCD34D' } },
  applied:    { label: 'Applied',    dot: '#8B5CF6', light: { bg: '#F5F3FF', fg: '#5B21B6' }, dark: { bg: 'rgba(139,92,246,0.15)', fg: '#C4B5FD' } },
  enrolled:   { label: 'Enrolled',   dot: '#10B981', light: { bg: '#ECFDF5', fg: '#065F46' }, dark: { bg: 'rgba(16,185,129,0.13)', fg: '#6EE7B7' } },
  dropped:    { label: 'Dropped',    dot: '#EF4444', light: { bg: '#FEF2F2', fg: '#991B1B' }, dark: { bg: 'rgba(239,68,68,0.13)',  fg: '#FCA5A5' } },
}
const niceLabel = (v) => v ? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-'

const PALETTE_LIGHT = [
  { bg: '#EEF2FF', fg: '#4338CA' }, { bg: '#ECFDF5', fg: '#065F46' },
  { bg: '#FFFBEB', fg: '#92400E' }, { bg: '#FDF2F8', fg: '#9D174D' },
  { bg: '#ECFEFF', fg: '#155E75' }, { bg: '#FFF7ED', fg: '#9A3412' },
]
const PALETTE_DARK = [
  { bg: 'rgba(99,102,241,0.18)',  fg: '#A5B4FC' }, { bg: 'rgba(16,185,129,0.15)', fg: '#6EE7B7' },
  { bg: 'rgba(245,158,11,0.15)',  fg: '#FCD34D' }, { bg: 'rgba(236,72,153,0.15)', fg: '#F9A8D4' },
  { bg: 'rgba(6,182,212,0.14)',   fg: '#67E8F9' }, { bg: 'rgba(249,115,22,0.15)', fg: '#FDBA74' },
]
function palette(name = '', theme = 'light') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const pal = theme === 'dark' ? PALETTE_DARK : PALETTE_LIGHT
  return pal[h % pal.length]
}

function fmtDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d) ? v : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}
function fmtTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d) ? v : new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d)
}

function toDynamicVariableState(placeholders = {}) {
  return Object.fromEntries(
    Object.entries(placeholders || {}).map(([key, value]) => [key, value == null ? '' : String(value)]),
  )
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
            className={`relative w-full ${max} max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl`}
            style={{ background: 'var(--surface)', outline: '1px solid var(--hair)' }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-5" style={{ background: 'var(--surface)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: iconBg }}>
                  <Icon size={17} style={{ color: iconFg }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  {subtitle && <p className="mt-0.5 font-mono text-[10px] text-gray-400">{subtitle}</p>}
                </div>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-gray-300 transition hover:bg-gray-100 hover:text-gray-500">
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

function StatusPill({ status }) {
  const [theme] = useTheme()
  const m = STATUS_META[status] || STATUS_META.new
  const c = theme === 'dark' ? m.dark : m.light
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: c.bg, color: c.fg }}>
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
          initial={{ opacity: 0, x: 20, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed top-8 right-8 z-[60]"
        >
          <div
            className="flex items-center gap-3 rounded-md px-5 py-3.5 text-sm font-medium shadow-2xl"
            style={toast.type === 'error'
              ? { background: 'var(--surface)', color: '#F87171', outline: '1px solid rgba(248,113,113,0.25)', boxShadow: 'var(--shadow-lg)' }
              : { background: 'var(--ink)', color: 'var(--bg)', outline: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }
            }
          >
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

export default function CallsPage() {
  const me = getCurrentUser()
  const isSuper = me?.role === 'super_admin'
  const [searchParams, setSearchParams] = useSearchParams()

  if (!isSuper) {
    return <CallsList orgId={me?.org_id || null} isSuper={false} />
  }

  const selectedOrgId = searchParams.get('org')
  return selectedOrgId ? (
    <CallsList
      orgId={selectedOrgId}
      isSuper
      onBackToOrgs={() => setSearchParams({})}
    />
  ) : (
    <OrgPicker onSelect={(orgId) => setSearchParams({ org: orgId })} />
  )
}

/* ─────────── org picker (super_admin) ─────────── */

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
      className="app-page-bg min-h-full px-8 py-7"
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900">Pick an organization</h1>
        <p className="mt-1 text-sm text-gray-500">Choose an organization to call its contacts.</p>

        <div className="mt-6 mb-5 flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 sm:max-w-sm">
          <Search size={14} className="shrink-0 text-gray-300" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-300"
          />
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
                <motion.div
                  key={o.org_id} whileHover={{ y: -3 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(o.org_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(o.org_id)
                    }
                  }}
                  className="group flex cursor-pointer flex-col rounded-lg bg-white p-5 text-left shadow-sm ring-1 ring-gray-100 transition hover:shadow-lg hover:ring-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ background: c.bg, color: c.fg }}>
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
                      Open <ArrowRight size={12} />
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  )
}

/* ─────────── export columns definition ─────────── */

const EXPORT_COLUMNS = [
  { key: 'full_name', label: 'Full Name', checked: true, extract: (c) => c.full_name || '-' },
  { key: 'email', label: 'Email', checked: true, extract: (c) => c.email || '-' },
  { key: 'full_phone', label: 'Phone', checked: true, extract: (c) => c.full_phone || '-' },
  { key: 'city', label: 'City', checked: false, extract: (c) => c.city || '-' },
  { key: 'state', label: 'State', checked: false, extract: (c) => c.state || '-' },
  { key: 'status', label: 'Status', checked: true, extract: (c) => niceLabel(c.status) },
  { key: 'source', label: 'Source', checked: false, extract: (c) => niceLabel(c.source) },
  { key: 'program', label: 'Program', checked: false, extract: (c) => c.program || '-' },
  { key: 'contact_id', label: 'Contact ID', checked: false, extract: (c) => c.contact_id || '-' },
  { key: 'created_at', label: 'Created At', checked: false, extract: (c) => fmtDate(c.created_at) },
  { key: 'callback_requested', label: 'Callback Requested', checked: false, extract: (c) => c.callback_requested ? 'Yes' : 'No' },
  {
    key: 'callback_time_utc', label: 'Callback Time (IST)', checked: false, extract: (c) => {
      if (!c.callback_time_utc) return '-'
      const d = new Date(c.callback_time_utc)
      if (isNaN(d)) return c.callback_time_utc
      return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(d)
    }
  },
]

/* ─────────── calls list ─────────── */

function CallsList({ orgId, isSuper, onBackToOrgs }) {
  const navigate = useNavigate()
  const [theme] = useTheme()
  const [contacts, setContacts] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter] = useState('new')
  const [orgName, setOrgName] = useState('')
  const [orgLocation, setOrgLocation] = useState('')
  const [toast, setToast] = useState(null)

  const [selected, setSelected] = useState(() => new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [calling, setCalling] = useState(false)
  const [results, setResults] = useState(null) // { results, total, succeeded, failed }
  const [agentName, setAgentName] = useState('')
  const [agentId, setAgentId] = useState('')
  const [dynamicVariables, setDynamicVariables] = useState({})
  const [loadingAgent, setLoadingAgent] = useState(false)
  const [agentError, setAgentError] = useState('')

  /* ── export state ── */
  const [exportOpen, setExportOpen] = useState(false)
  const [exportCols, setExportCols] = useState(() => EXPORT_COLUMNS.map(c => ({ ...c })))

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    listOrganizations({ limit: 100 }).then(d => {
      if (cancelled) return
      const o = (d.items ?? []).find(x => x.org_id === orgId)
      setOrgName(o?.name || '')
      setOrgLocation(o?.location || '')
    }).catch(() => { })
    return () => { cancelled = true }
  }, [orgId])

  async function loadAgentConfig() {
    if (!orgId) {
      setAgentError('Organization ID is required to load the calling agent.')
      setAgentName('')
      setAgentId('')
      setDynamicVariables({})
      return
    }

    setLoadingAgent(true)
    setAgentError('')
    try {
      const context = await getOrganizationAgentContext(orgId)
      const data = context.agent
      const placeholders = data?.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {}
      setAgentId(context.agentId || '')
      setAgentName(data?.name || '')
      setDynamicVariables(toDynamicVariableState(placeholders))
    } catch (e) {
      setAgentError(e.message || 'Failed to load assigned agent.')
      setAgentName('')
      setAgentId('')
      setDynamicVariables({})
    } finally {
      setLoadingAgent(false)
    }
  }

  useEffect(() => {
    loadAgentConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const queryArgs = useMemo(() => ({
    orgId: orgId || undefined,
    status: statusFilter || undefined,
    limit: 20,
  }), [orgId, statusFilter])

  async function load() {
    setLoading(true)
    try {
      const data = await listContacts(queryArgs)
      setContacts(data.items ?? [])
      setNextCursor(data.next_cursor ?? null)
      setSelected(new Set())
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

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId, statusFilter])

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

  const visibleIds = filtered.map(c => c.contact_id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))
  const callDisabled = selected.size === 0 || loadingAgent || !!agentError || !agentId

  /**
   * Build the dynamic_variables map sent for a single contact.
   * Combines:
   *   - agent-config org constants (branches_offered, gpa_thresholds, scholarship_score,
   *     campus_facilities, housing_policy, extracurricular_activities, etc.)
   *   - org meta (organization_name, organization_location, org_id)
   *   - per-candidate fields (contact_full_name, contact_email, contact_phone_number,
   *     contact_city, contact_state, contact_twelfth_score, contact_twelfth_board, contact_id)
   */
  function buildVariablesFor(contact) {
    return {
      ...dynamicVariables,
      organization_name: orgName || '',
      organization_location: orgLocation || '',
      org_id: orgId || '',
      contact_id: contact.contact_id || '',
      contact_full_name: contact.full_name || '',
      contact_email: contact.email || '',
      contact_phone_number: contact.full_phone || '',
      contact_city: contact.city || '',
      contact_state: contact.state || '',
      contact_twelfth_score: contact.twelfth_score == null ? '' : String(contact.twelfth_score),
      contact_twelfth_board: contact.twelfth_board || '',
    }
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleAllVisible() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id))
      } else {
        visibleIds.forEach(id => next.add(id))
      }
      return next
    })
  }
  function clearSelection() { setSelected(new Set()) }

  async function handleConfirmCall() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (!agentId) {
      showToast('Configured agent ID is missing.', 'error')
      return
    }
    if (agentError) {
      showToast(agentError, 'error')
      return
    }

    const byId = new Map(contacts.map(c => [c.contact_id, c]))
    const targets = ids
      .map(id => byId.get(id))
      .filter(Boolean)

    setCalling(true)
    try {
      // Fan out one call per contact so each gets its own merged dynamic_variables.
      const settled = await Promise.allSettled(
        targets.map(contact =>
          bulkCallContacts([contact.contact_id], {
            orgId: isSuper ? orgId : undefined,
            agentId,
            dynamicVariables: buildVariablesFor(contact),
          }),
        ),
      )

      // Flatten the per-contact responses back into the existing results shape.
      const flatResults = []
      let succeeded = 0
      let failed = 0
      settled.forEach((s, idx) => {
        const contact = targets[idx]
        if (s.status === 'fulfilled') {
          const inner = Array.isArray(s.value?.results) && s.value.results.length > 0
            ? s.value.results[0]
            : { contact_id: contact.contact_id, success: true, message: 'Call placed.' }
          flatResults.push(inner)
          if (inner.success) succeeded += 1
          else failed += 1
        } else {
          flatResults.push({
            contact_id: contact.contact_id,
            success: false,
            message: s.reason?.message || 'Call failed.',
          })
          failed += 1
        }
      })

      setResults({ results: flatResults, total: targets.length, succeeded, failed })
      setConfirmOpen(false)
      showToast(
        `${succeeded} placed${failed ? `, ${failed} failed` : ''}`,
        failed > 0 && succeeded === 0 ? 'error' : 'success',
      )
    } catch (e) {
      showToast(e.message || 'Bulk call failed.', 'error')
    } finally {
      setCalling(false)
    }
  }

  // Map results back to contact info for display
  const resultRows = useMemo(() => {
    if (!results) return []
    const byId = new Map(contacts.map(c => [c.contact_id, c]))
    return results.results.map(r => ({ ...r, contact: byId.get(r.contact_id) }))
  }, [results, contacts])

  /* ── export helpers ── */
  function toggleExportCol(key) {
    setExportCols(prev => prev.map(c => c.key === key ? { ...c, checked: !c.checked } : c))
  }
  function selectAllExportCols() {
    setExportCols(prev => prev.map(c => ({ ...c, checked: true })))
  }
  function deselectAllExportCols() {
    setExportCols(prev => prev.map(c => ({ ...c, checked: false })))
  }
  function handleExport() {
    const activeCols = exportCols.filter(c => c.checked)
    if (activeCols.length === 0) return
    const rows = filtered.map(contact => {
      const row = {}
      activeCols.forEach(col => { row[col.label] = col.extract(contact) })
      return row
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    /* auto-size columns */
    ws['!cols'] = activeCols.map(col => ({ wch: Math.max(col.label.length + 2, 18) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
    XLSX.writeFile(wb, `contacts_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setExportOpen(false)
  }

  return (
    <div
      className="app-page-bg min-h-full px-8 py-7"
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
                <ArrowLeft size={12} /> All organizations
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isSuper && orgName ? <>Organization · <span className="font-semibold text-gray-700">{orgName}</span></> : 'Trigger AI calls for selected contacts'}
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
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setExportOpen(true)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={14} />
              Export
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              disabled={callDisabled}
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            >
              <PhoneCall size={14} />
              Call selected
              {selected.size > 0 && (
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold tabular-nums">{selected.size}</span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Agent strip - one line summary, no manual variable editing */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
              <Bot size={14} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-gray-900">
                {loadingAgent ? 'Loading agent…' : agentError ? 'Agent unavailable' : agentName || 'Calling agent'}
              </p>
              <p className="truncate font-mono text-[11px] text-gray-400">
                {agentError ? agentError : (agentId || 'Agent ID missing')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Variable size={12} className="text-indigo-500" />
            <span>Variables will be filled per candidate at call time</span>
            <button
              onClick={loadAgentConfig}
              className="ml-1 rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:bg-gray-50"
              title="Refresh agent"
            >
              <RefreshCw size={12} className={loadingAgent ? 'animate-spin' : ''} />
            </button>
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
              <button onClick={() => setSearch('')} className="text-gray-300 transition hover:text-gray-500"><X size={13} /></button>
            )}
          </div>
          <span className="text-xs font-medium text-gray-400">{filtered.length} shown</span>
        </div>

        {/* Selection bar */}
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2.5 text-sm"
          >
            <span className="font-semibold text-indigo-900">
              {selected.size} selected
            </span>
            <button onClick={clearSelection} className="text-xs font-semibold text-indigo-600 hover:underline">Clear</button>
          </motion.div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
          {loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-gray-100">
                <PhoneCall size={20} className="text-gray-300" />
              </div>
              <p className="text-base font-semibold text-gray-800">
                {search ? 'No contacts match your search' : 'No new contacts to call'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {search
                  ? 'Try clearing your search.'
                  : 'Add a contact to start calling. Only contacts with status "new" can be called.'}
              </p>
              {!search && (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const params = new URLSearchParams({ create: '1' })
                    if (isSuper && orgId) params.set('org', orgId)
                    navigate(`/app/contacts?${params.toString()}`)
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                >
                  <UserPlus size={14} />
                  Add a contact
                </motion.button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    <th className="w-10 px-5 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => {
                    const p = palette(c.full_name || c.email || '', theme)
                    const initials = (c.full_name || c.email || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
                    const isSel = selected.has(c.contact_id)
                    return (
                      <tr
                        key={c.contact_id}
                        onClick={() => toggleOne(c.contact_id)}
                        className={`cursor-pointer transition ${isSel ? 'bg-indigo-50/40' : 'hover:bg-gray-50/70'}`}
                      >
                        <td className="px-5 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleOne(c.contact_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: p.bg, color: p.fg }}>
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
                        <td className="px-5 py-3.5"><StatusPill status={c.status} /></td>
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
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingMore ? <RefreshCw size={13} className="animate-spin" /> : <ChevronDown size={13} />}
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <Modal
        open={confirmOpen} onClose={() => !calling && setConfirmOpen(false)}
        title="Trigger calls?" icon={PhoneCall}
        iconBg="#ECFDF5" iconFg="#059669"
      >
        <div className="space-y-4">
          <div className="rounded-md bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <p className="font-semibold">{selected.size} contact{selected.size === 1 ? '' : 's'} will be called.</p>
            <p className="mt-1 text-xs text-emerald-800/80">
              The AI agent will dial each number in parallel. You'll see per-contact results below.
            </p>
            <p className="mt-2 text-xs text-emerald-800/80">
              Each call carries that contact's personalized variables (name, phone, location, score, board, plus your org-level config).
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setConfirmOpen(false)} disabled={calling}
              className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <motion.button
              onClick={handleConfirmCall} disabled={calling || callDisabled}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            >
              {calling ? <RefreshCw size={13} className="animate-spin" /> : <PhoneCall size={14} />}
              {calling ? 'Placing calls…' : 'Place calls'}
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* Results modal */}
      <Modal
        open={!!results} onClose={() => setResults(null)}
        title="Call results" subtitle={results ? `${results.succeeded}/${results.total} succeeded` : undefined}
        icon={PhoneCall} max="max-w-2xl"
        iconBg={results?.failed > 0 && results?.succeeded === 0 ? '#FEF2F2' : '#ECFDF5'}
        iconFg={results?.failed > 0 && results?.succeeded === 0 ? '#DC2626' : '#059669'}
      >
        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <ResultStat label="Total" value={results.total} dot="#6366F1" />
              <ResultStat label="Succeeded" value={results.succeeded} dot="#10B981" />
              <ResultStat label="Failed" value={results.failed} dot="#EF4444" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    <tr>
                      <th className="px-4 py-2.5">Contact</th>
                      <th className="px-4 py-2.5">Call status</th>
                      <th className="px-4 py-2.5">Duration</th>
                      <th className="px-4 py-2.5">Triggered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {resultRows.map((r) => (
                      <tr key={r.contact_id}>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-gray-900">
                            {r.contact?.full_name || <span className="font-mono text-xs text-gray-500">{r.contact_id}</span>}
                          </p>
                          {r.contact?.full_phone && (
                            <p className="font-mono text-[10px] text-gray-400">{r.contact.full_phone}</p>
                          )}
                        </td>
                        {r.success && r.plivo_call_id ? (
                          <CallStatusCells
                            plivoCallId={r.plivo_call_id}
                            triggeredAt={r.triggered_at}
                          />
                        ) : (
                          <>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                <X size={10} /> {r.message || 'Failed'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">-</td>
                          </>
                        )}
                        <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500">{fmtTime(r.triggered_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setResults(null)}
                className="rounded-2xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Export columns modal */}
      <Modal
        open={exportOpen} onClose={() => setExportOpen(false)}
        title="Export to Excel" subtitle={`${filtered.length} contacts will be exported`}
        icon={Download}
        iconBg="#EEF2FF" iconFg="#4F46E5"
      >
        <div className="space-y-5">
          {/* Select / Deselect all */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Choose columns</p>
            <div className="flex items-center gap-3">
              <button onClick={selectAllExportCols} className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800">Select all</button>
              <span className="text-gray-200">|</span>
              <button onClick={deselectAllExportCols} className="text-xs font-semibold text-gray-400 transition hover:text-gray-600">Clear</button>
            </div>
          </div>

          {/* Column checkboxes */}
          <div className="grid grid-cols-2 gap-2">
            {exportCols.map(col => (
              <label
                key={col.key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${col.checked
                    ? 'border-indigo-200 bg-indigo-50/60 text-indigo-900 shadow-sm'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={col.checked}
                  onChange={() => toggleExportCol(col.key)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">{col.label}</span>
              </label>
            ))}
          </div>

          {/* Counter + Action */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
            <p className="text-xs text-gray-500">
              <span className="font-bold text-gray-800">{exportCols.filter(c => c.checked).length}</span> of {exportCols.length} columns selected
            </p>
            <p className="text-xs text-gray-400">{filtered.length} rows</p>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => setExportOpen(false)}
              className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <motion.button
              onClick={handleExport}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              disabled={exportCols.filter(c => c.checked).length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #4338CA)' }}
            >
              <Download size={14} />
              Download .xlsx
            </motion.button>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} />
    </div>
  )
}

/* ─────── live-status polling cell ─────── */

const CALL_STATUS_META = {
  queued: { label: 'Queued', bg: '#EEF2FF', fg: '#4338CA', dot: '#6366F1', pulse: true },
  ringing: { label: 'Ringing', bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B', pulse: true },
  live: { label: 'Live', bg: '#DCFCE7', fg: '#15803D', dot: '#22C55E', pulse: true },
  transferred: { label: 'Transferred', bg: '#ECFDF5', fg: '#065F46', dot: '#10B981' },
  ended: { label: 'Ended', bg: '#F3F4F6', fg: '#374151', dot: '#9CA3AF' },
  busy: { label: 'Busy', bg: '#FEE2E2', fg: '#991B1B', dot: '#EF4444' },
  no_answer: { label: 'No answer', bg: '#FEE2E2', fg: '#991B1B', dot: '#EF4444' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', fg: '#991B1B', dot: '#EF4444' },
  failed: { label: 'Failed', bg: '#FEE2E2', fg: '#991B1B', dot: '#EF4444' },
}

const TERMINAL_STATUSES = new Set(['ended', 'busy', 'no_answer', 'cancelled', 'failed', 'transferred'])

function fmtDuration(s) {
  if (s == null || isNaN(s) || s < 0) return '-'
  const sec = Math.floor(s)
  const mm = Math.floor(sec / 60).toString().padStart(2, '0')
  const ss = (sec % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

function CallStatusCells({ plivoCallId, triggeredAt }) {
  const [status, setStatus] = useState('queued')
  const [serverDuration, setServerDuration] = useState(null)
  const [tick, setTick] = useState(0) // forces re-render for client-side ticker
  const [err, setErr] = useState('')
  const liveStartRef = useRef(null)
  const finalDurationRef = useRef(null)
  const stoppedRef = useRef(false)

  // Poll status
  useEffect(() => {
    let cancelled = false
    let timer

    async function poll() {
      try {
        const data = await getCallStatus(plivoCallId)
        if (cancelled) return
        const s = (data?.status || '').toLowerCase()
        if (s) setStatus(s)
        if (typeof data?.duration === 'number') setServerDuration(data.duration)
        if (s === 'live' && !liveStartRef.current) liveStartRef.current = Date.now()

        if (TERMINAL_STATUSES.has(s)) {
          // Freeze final duration: prefer server-reported, else compute from live start
          finalDurationRef.current = typeof data?.duration === 'number'
            ? data.duration
            : liveStartRef.current ? (Date.now() - liveStartRef.current) / 1000 : null
          stoppedRef.current = true
          return
        }
      } catch (e) {
        if (cancelled) return
        setErr(e.message || 'Status check failed.')
      }
      timer = setTimeout(poll, 3000)
    }

    poll()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [plivoCallId])

  // Tick locally for live duration display
  useEffect(() => {
    if (stoppedRef.current) return
    if (status !== 'live') return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const meta = CALL_STATUS_META[status] || CALL_STATUS_META.queued

  let durationDisplay = '-'
  if (finalDurationRef.current != null) {
    durationDisplay = fmtDuration(finalDurationRef.current)
  } else if (status === 'live') {
    const elapsed = liveStartRef.current
      ? (Date.now() - liveStartRef.current) / 1000
      : (triggeredAt ? (Date.now() - new Date(triggeredAt).getTime()) / 1000 : 0)
    durationDisplay = fmtDuration(elapsed)
  } else if (serverDuration != null) {
    durationDisplay = fmtDuration(serverDuration)
  }

  // Suppress unused tick warning
  void tick

  return (
    <>
      <td className="px-4 py-2.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: meta.bg, color: meta.fg }}
          title={err || undefined}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${meta.pulse ? 'animate-pulse' : ''}`}
            style={{ background: meta.dot }}
          />
          {meta.label}
        </span>
      </td>
      <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-gray-700">
        {durationDisplay}
      </td>
    </>
  )
}

function ResultStat({ label, value, dot }) {
  return (
    <div className="rounded-md bg-white p-3 ring-1 ring-gray-100">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-gray-900">{value ?? 0}</p>
    </div>
  )
}

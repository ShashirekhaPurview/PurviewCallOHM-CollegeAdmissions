import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive, BarChart3, Building2, Check, CircleAlert, Copy, ListChecks,
  Loader2, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, X,
} from 'lucide-react'
import {
  activateOrganization, createOrganization, deactivateOrganization, deleteOrganization,
  listOrganizations, updateOrganization,
} from '../../api/orgs/orgService'
import { getCurrentUser } from '../../api/auth/authService'
import {
  duplicateMasterAgentForOrg,
  finalizeOrganizationAgent,
} from '../../api/agents/orgScopedAgentService'
import { renameOrgAgentAssignment, removeOrgAgentAssignment, getOrgAgentAssignment } from '../../api/orgs/orgAgentAssignmentStore'
import { deleteAgent } from '../../api/agents/agentConsoleService'

/* ───────────── helpers ───────────── */

function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

const PALETTE = [
  { from: '#6366F1', to: '#8B5CF6', bg: '#EEF2FF', fg: '#4338CA' },
  { from: '#10B981', to: '#059669', bg: '#ECFDF5', fg: '#065F46' },
  { from: '#F59E0B', to: '#EF4444', bg: '#FFFBEB', fg: '#92400E' },
  { from: '#EC4899', to: '#8B5CF6', bg: '#FDF2F8', fg: '#9D174D' },
  { from: '#06B6D4', to: '#3B82F6', bg: '#ECFEFF', fg: '#155E75' },
  { from: '#F97316', to: '#EF4444', bg: '#FFF7ED', fg: '#9A3412' },
  { from: '#8B5CF6', to: '#EC4899', bg: '#F5F3FF', fg: '#5B21B6' },
]

function palette(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function fmtDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d) ? v : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

/* ───────────── shared UI ───────────── */

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
            className={`relative w-full ${max} overflow-hidden rounded-lg shadow-2xl`}
            style={{ background: 'var(--surface)', outline: '1px solid var(--hair)' }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: iconBg }}>
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

function Field({ id, label, value, onChange, placeholder, error, autoFocus }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <input
        id={id} type="text" value={value} onChange={onChange}
        placeholder={placeholder} autoFocus={autoFocus}
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
      />
      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

/* ───────────── 3D charts ───────────── */

function Bar3D({ value, max, color, light, dark, label }) {
  const maxH = 110
  const h = max > 0 ? Math.max((value / max) * maxH, value > 0 ? 8 : 4) : 4
  const w = 48, depth = 12
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-base font-bold text-gray-900">{value}</span>
      <svg width={w + depth} height={maxH + depth + 4}>
        <g transform={`translate(0, ${maxH - h + depth})`}>
          {/* top face */}
          <polygon points={`0,${depth} ${depth},0 ${w + depth},0 ${w},${depth}`} fill={light} />
          {/* right face */}
          <polygon points={`${w},${depth} ${w + depth},0 ${w + depth},${h} ${w},${h + depth}`} fill={dark} />
          {/* front face */}
          <rect x="0" y={depth} width={w} height={h} fill={color} />
        </g>
      </svg>
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
    </div>
  )
}

function Donut3D({ active, total }) {
  const pct = total > 0 ? (active / total) * 100 : 0
  const size = 150
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="relative" style={{ width: size, height: size + 30 }}>
      {/* depth shadow ring */}
      <svg
        width={size} height={size}
        className="absolute left-0 top-2"
        style={{ filter: 'blur(6px)', opacity: 0.45 }}
      >
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#10B981" strokeWidth={stroke}
        />
      </svg>
      {/* main ring */}
      <svg width={size} height={size} className="absolute left-0 top-0 -rotate-90">
        <defs>
          <linearGradient id="donut-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="donut-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F3F4F6" />
            <stop offset="100%" stopColor="#E5E7EB" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#donut-bg)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="url(#donut-grad)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {/* center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ height: size }}>
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-gray-400">Total</span>
      </div>
    </div>
  )
}

/* ───────────── main page ───────────── */

export default function OrganizationsPage() {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('active') // 'active' | 'archived' | 'analytics'
  const [toast, setToast] = useState(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const INITIAL_ADDRESS = { address1: '', address2: '', city: '', state: '', pincode: '' }
  const [newAddress, setNewAddress] = useState(INITIAL_ADDRESS)
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState({ name: '', address1: '', city: '', state: '', pincode: '', form: '' })
  const [provisioning, setProvisioning] = useState(null) // { orgName, step: 'duplicate'|'create'|'finalize'|'refresh'|'done' }

  const [renameOrg, setRenameOrg] = useState(null)
  const [renameName, setRenameName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameErr, setRenameErr] = useState('')

  const [confirmOrg, setConfirmOrg] = useState(null) // org pending archive
  const [togglingId, setTogglingId] = useState('')
  const [deleteOrg, setDeleteOrg] = useState(null) // org pending permanent delete
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')

  const currentUser = getCurrentUser()
  const canDelete = currentUser?.role === 'super_admin'

  const activeOrgs = orgs.filter(o => o.is_active)
  const archivedOrgs = orgs.filter(o => !o.is_active)

  const visibleList = tab === 'archived' ? archivedOrgs : activeOrgs
  const filtered = visibleList.filter(o =>
    `${o.name} ${o.org_id}`.toLowerCase().includes(search.trim().toLowerCase())
  )

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
  }, [])

  const load = useCallback(async ({ keepToast = false } = {}) => {
    setLoading(true)
    if (!keepToast) setToast(null)
    try {
      const data = await listOrganizations({ limit: 50 })
      setOrgs(data.items ?? [])
    } catch (e) {
      showToast(e.message || 'Failed to load.', 'error')
    } finally { setLoading(false) }
  }, [showToast])

  async function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    const address1 = newAddress.address1.trim()
    const address2 = newAddress.address2.trim()
    const city = newAddress.city.trim()
    const state = newAddress.state.trim()
    const pincode = newAddress.pincode.trim()

    const errs = {
      name: !name ? 'Name is required.' : '',
      address1: !address1 ? 'Address line 1 is required.' : '',
      city: !city ? 'City is required.' : '',
      state: !state ? 'State is required.' : '',
      pincode: !pincode
        ? 'Pincode is required.'
        : !/^\d{6}$/.test(pincode) ? 'Enter a valid 6-digit pincode.' : '',
      form: '',
    }
    if (errs.name || errs.address1 || errs.city || errs.state || errs.pincode) {
      setCreateErr(errs)
      return
    }

    const location = [address1, address2, city, state, pincode].filter(Boolean).join(', ')

    setCreating(true)
    setCreateErr({ name: '', address1: '', city: '', state: '', pincode: '', form: '' })

    // Minimum hold per step so the assembly animation reads as deliberate
    // even when the API responds quickly.
    const STEP_HOLD_MS = 1100
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const holdAtLeast = async (work) => {
      const startedAt = Date.now()
      const result = await work
      const elapsed = Date.now() - startedAt
      if (elapsed < STEP_HOLD_MS) await sleep(STEP_HOLD_MS - elapsed)
      return result
    }

    setProvisioning({ orgName: name, step: 'duplicate' })
    try {
      const { agent_id, master_agent } = await holdAtLeast(duplicateMasterAgentForOrg())

      setProvisioning({ orgName: name, step: 'create' })
      const created = await holdAtLeast(createOrganization({ name, location, agent_id }))
      setCreateOpen(false)
      setNewName('')
      setNewAddress(INITIAL_ADDRESS)

      setProvisioning({ orgName: created.name, step: 'finalize' })
      let agentErr = null
      try {
        await holdAtLeast(finalizeOrganizationAgent(created, { agent_id, master_agent }))
      } catch (agentError) {
        agentErr = agentError
        await sleep(STEP_HOLD_MS)
      }

      setProvisioning({ orgName: created.name, step: 'refresh' })
      await holdAtLeast(load({ keepToast: true }))

      setProvisioning({ orgName: created.name, step: 'done' })
      if (agentErr) {
        showToast(`"${created.name}" created, but agent setup failed: ${agentErr.message || 'Unknown error'}`, 'error')
      } else {
        showToast(`"${created.name}" created with a dedicated admissions agent`)
      }
      // Linger a beat on the done state so the user can see the knowledge-base bind in
      setTimeout(() => setProvisioning(null), 2200)
    } catch (e) {
      setCreateErr(prev => ({ ...prev, form: e.message || 'Could not create.' }))
      setProvisioning(null)
    }
    finally { setCreating(false) }
  }

  async function performToggle(org) {
    setTogglingId(org.org_id)
    try {
      const updated = org.is_active
        ? await deactivateOrganization(org.org_id)
        : await activateOrganization(org.org_id)
      setOrgs(prev => prev.map(o => o.org_id === org.org_id ? { ...o, is_active: updated.is_active } : o))
      showToast(updated.is_active ? `"${org.name}" restored` : `"${org.name}" archived`)
    } catch (e) {
      showToast(e.message || 'Failed.', 'error')
    } finally {
      setTogglingId('')
      setConfirmOrg(null)
    }
  }

  async function handleRename(e) {
    e.preventDefault()
    if (!renameName.trim()) { setRenameErr('Name is required.'); return }
    setRenaming(true); setRenameErr('')
    try {
      const updated = await updateOrganization(renameOrg.org_id, { name: renameName.trim() })
      renameOrgAgentAssignment(renameOrg.org_id, updated.name)
      setOrgs(prev => prev.map(o => o.org_id === renameOrg.org_id ? { ...o, ...updated } : o))
      showToast(`Renamed to "${updated.name}"`)
      setRenameOrg(null); setRenameName('')
    } catch (e) { setRenameErr(e.message || 'Could not rename.') }
    finally { setRenaming(false) }
  }

  function openDelete(org) {
    setDeleteOrg(org)
    setDeleteConfirm('')
    setDeleteErr('')
  }

  function closeDelete() {
    if (deleting) return
    setDeleteOrg(null)
    setDeleteConfirm('')
    setDeleteErr('')
  }

  async function handleDelete(e) {
    e?.preventDefault?.()
    if (!deleteOrg) return
    if (deleteConfirm.trim().toLowerCase() !== deleteOrg.name.trim().toLowerCase()) {
      setDeleteErr('Type the organization name exactly to confirm.')
      return
    }
    setDeleting(true); setDeleteErr('')
    try {
      // Resolve the agent_id linked to this org BEFORE we drop the org row.
      // Prefer the value from the org list; fall back to the local assignment store.
      const linkedAgentId =
        deleteOrg.agent_id ||
        getOrgAgentAssignment(deleteOrg.org_id)?.agent_id ||
        ''

      const res = await deleteOrganization(deleteOrg.org_id)
      setOrgs(prev => prev.filter(o => o.org_id !== deleteOrg.org_id))

      // Cascade: remove the org's dedicated ElevenLabs agent.
      let agentDeleted = false
      let agentDeleteErr = ''
      if (linkedAgentId) {
        try {
          await deleteAgent(linkedAgentId)
          agentDeleted = true
        } catch (err) {
          agentDeleteErr = err?.message || 'agent deletion failed'
        }
      }
      removeOrgAgentAssignment(deleteOrg.org_id)

      const removed = res?.deleted || {}
      const parts = ['users', 'contacts', 'conversations']
        .map(k => removed[k] ? `${removed[k]} ${k}` : null)
        .filter(Boolean)
      if (agentDeleted) parts.push('1 agent')
      const summary = parts.join(', ')

      if (agentDeleteErr) {
        showToast(
          `"${deleteOrg.name}" deleted${summary ? ` (${summary})` : ''}, but ${agentDeleteErr}`,
          'error',
        )
      } else {
        showToast(summary
          ? `"${deleteOrg.name}" deleted (${summary})`
          : `"${deleteOrg.name}" deleted`)
      }
      setDeleteOrg(null); setDeleteConfirm('')
    } catch (e) {
      setDeleteErr(e.message || 'Could not delete.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const id = requestAnimationFrame(() => load())
    return () => cancelAnimationFrame(id)
  }, [load])

  /* analytics derived */
  const total = orgs.length
  const max = Math.max(activeOrgs.length, archivedOrgs.length, 1)

  return (
    <div
      className="app-page-bg min-h-full px-8 py-7"
    >
      <div className="mx-auto max-w-6xl">

        {/* ── Tab bar ── */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-gray-200 pb-0">
          <div className="flex items-end gap-1.5 px-2">
            <Tab id="active" current={tab} onClick={setTab} icon={ListChecks} label="Active Organizations" count={activeOrgs.length} colorFrom="#10B981" colorTo="#059669" />
            <Tab id="archived" current={tab} onClick={setTab} icon={Archive} label="Archived Organizations" count={archivedOrgs.length} colorFrom="#F87171" colorTo="#DC2626" />
            <Tab id="analytics" current={tab} onClick={setTab} icon={BarChart3} label="Analytics" colorFrom="#8B5CF6" colorTo="#6D28D9" />
          </div>
          <div className="flex items-center gap-2.5 pb-2">
            <button
              onClick={() => load()}
              className="rounded-md border border-gray-200 bg-white p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => {
                setCreateOpen(true)
                setNewName('')
                setNewAddress(INITIAL_ADDRESS)
                setCreateErr({ name: '', address1: '', city: '', state: '', pincode: '', form: '' })
              }}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              <Plus size={15} />
              New Organization
            </motion.button>
          </div>
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          {tab === 'analytics' ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {/* Stat cards */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="TOTAL" dot="#6366F1" value={total} note="all organizations" />
                <StatCard label="ACTIVE" dot="#10B981" value={activeOrgs.length} note={total > 0 ? `${Math.round(activeOrgs.length / total * 100)}% of total` : '0% of total'} />
                <StatCard label="ARCHIVED" dot="#F87171" value={archivedOrgs.length} note={total > 0 ? `${Math.round(archivedOrgs.length / total * 100)}% of total` : '0% of total'} />
                <StatCard label="THIS MONTH" dot="#F59E0B" value={orgs.filter(o => isThisMonth(o.created_at)).length} note="newly added" />
              </div>

              {/* Charts */}
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="Distribution" subtitle="By status">
                  <div className="flex h-44 items-end justify-around pt-3">
                    <Bar3D value={activeOrgs.length} max={max} color="#10B981" light="#6EE7B7" dark="#047857" label="Active" />
                    <Bar3D value={archivedOrgs.length} max={max} color="#F87171" light="#FCA5A5" dark="#B91C1C" label="Archived" />
                  </div>
                </ChartCard>

                <ChartCard title="Composition" subtitle="Active vs archived">
                  <div className="flex h-44 items-center justify-center">
                    <Donut3D active={activeOrgs.length} total={total} />
                  </div>
                  <div className="flex items-center justify-center gap-6 text-xs">
                    <Legend dot="#10B981" label="Active" value={activeOrgs.length} />
                    <Legend dot="#E5E7EB" label="Archived" value={archivedOrgs.length} />
                  </div>
                </ChartCard>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {/* Search row */}
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 sm:max-w-xs">
                  <Search size={14} className="shrink-0 text-gray-300" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={`Search ${tab} organizations…`}
                    className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-300"
                  />
                  <AnimatePresence>
                    {search && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setSearch('')}
                        className="text-gray-300 transition hover:text-gray-500"
                      >
                        <X size={13} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-xs font-medium text-gray-400">
                  {filtered.length} {tab === 'archived' ? 'archived' : 'active'}
                </span>
              </div>

              {/* Cards */}
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-56 animate-pulse rounded-lg bg-white shadow-sm ring-1 ring-gray-100" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  archived={tab === 'archived'}
                  search={search}
                  onCreate={() => {
                    setCreateOpen(true)
                    setNewName('')
                    setNewLocation('')
                    setCreateErr({ name: '', location: '', form: '' })
                  }}
                />
              ) : (
                <motion.div
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  initial="hidden" animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                >
                  {filtered.map(org => (
                    <OrgCard
                      key={org.org_id}
                      org={org}
                      isToggling={togglingId === org.org_id}
                      canDelete={canDelete}
                      onSelect={() => navigate(`/app/organizations/${org.org_id}`)}
                      onRename={() => { setRenameOrg(org); setRenameName(org.name); setRenameErr('') }}
                      onArchive={() => setConfirmOrg(org)}
                      onRestore={() => performToggle(org)}
                      onDelete={() => openDelete(org)}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Create modal ── */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setNewName('')
          setNewAddress(INITIAL_ADDRESS)
          setCreateErr({ name: '', address1: '', city: '', state: '', pincode: '', form: '' })
        }}
        title="New Organization"
        icon={Building2}
        max="max-w-2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field
            id="orgName" label="Organization name" value={newName}
            onChange={e => setNewName(e.target.value)} placeholder="e.g. Acme University"
            autoFocus error={createErr.name}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              id="orgAddress1" label="Address line 1" value={newAddress.address1}
              onChange={e => setNewAddress(a => ({ ...a, address1: e.target.value }))}
              placeholder="Street, building, area"
              error={createErr.address1}
            />
            <Field
              id="orgAddress2" label="Address line 2 (optional)" value={newAddress.address2}
              onChange={e => setNewAddress(a => ({ ...a, address2: e.target.value }))}
              placeholder="Landmark, suite, floor"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_140px]">
            <Field
              id="orgCity" label="City" value={newAddress.city}
              onChange={e => setNewAddress(a => ({ ...a, city: e.target.value }))}
              placeholder="Bengaluru"
              error={createErr.city}
            />
            <Field
              id="orgState" label="State" value={newAddress.state}
              onChange={e => setNewAddress(a => ({ ...a, state: e.target.value }))}
              placeholder="Karnataka"
              error={createErr.state}
            />
            <Field
              id="orgPincode" label="Pincode" value={newAddress.pincode}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                setNewAddress(a => ({ ...a, pincode: v }))
              }}
              placeholder="560001"
              error={createErr.pincode}
            />
          </div>
          {createErr.form && <p className="text-xs font-medium text-red-500">{createErr.form}</p>}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false)
                setNewName('')
                setNewAddress(INITIAL_ADDRESS)
                setCreateErr({ name: '', address1: '', city: '', state: '', pincode: '', form: '' })
              }}
              className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
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

      {/* ── Rename modal ── */}
      <Modal
        open={!!renameOrg} onClose={() => { setRenameOrg(null); setRenameName(''); setRenameErr('') }}
        title="Rename Organization" subtitle={renameOrg?.org_id} icon={Pencil}
      >
        <form onSubmit={handleRename} className="space-y-5">
          <Field
            id="renameName" label="New name" value={renameName}
            onChange={e => setRenameName(e.target.value)} placeholder="Organization name"
            autoFocus error={renameErr}
          />
          <div className="flex gap-2.5">
            <button type="button" onClick={() => { setRenameOrg(null); setRenameName(''); setRenameErr('') }}
              className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
              Cancel
            </button>
            <motion.button
              type="submit" disabled={renaming}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {renaming ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
              {renaming ? 'Saving…' : 'Save changes'}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* ── Archive confirm modal ── */}
      <Modal
        open={!!confirmOrg} onClose={() => setConfirmOrg(null)}
        title="Archive Organization" icon={CircleAlert}
        iconBg="#FEF3C7" iconFg="#B45309"
      >
        {confirmOrg && (
          <div className="space-y-5">
            <div className="rounded-md bg-amber-50 px-4 py-3.5 text-sm text-amber-900 ring-1 ring-amber-100">
              <p className="font-semibold">"{confirmOrg.name}" will be moved to Archive.</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/80">
                Users in this organization won't be able to sign in. You can restore the
                organization any time from the <strong>Archived</strong> tab.
              </p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmOrg(null)}
                className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
                Cancel
              </button>
              <motion.button
                onClick={() => performToggle(confirmOrg)}
                disabled={togglingId === confirmOrg.org_id}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
              >
                {togglingId === confirmOrg.org_id
                  ? <RefreshCw size={13} className="animate-spin" />
                  : <Archive size={14} />}
                {togglingId === confirmOrg.org_id ? 'Archiving…' : 'Archive'}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete confirm modal (super-admin only) ── */}
      <Modal
        open={!!deleteOrg}
        onClose={closeDelete}
        title="Delete Organization"
        subtitle={deleteOrg?.org_id}
        icon={Trash2}
        iconBg="#FEF2F2"
        iconFg="#B91C1C"
      >
        {deleteOrg && (
          <form onSubmit={handleDelete} className="space-y-4">
            <div className="rounded-md bg-red-50 px-4 py-3.5 text-sm text-red-900 ring-1 ring-red-100">
              <p className="font-semibold">This action is permanent.</p>
              <p className="mt-1 text-xs leading-relaxed text-red-800/85">
                Deleting <span className="font-semibold">"{deleteOrg.name}"</span> will remove its
                users, contacts, conversations, and refresh tokens. This cannot be undone.
              </p>
            </div>
            <div>
              <label htmlFor="deleteConfirm" className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Type <span className="font-mono normal-case text-gray-700">{deleteOrg.name}</span> to confirm
              </label>
              <input
                id="deleteConfirm"
                type="text"
                autoFocus
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteOrg.name}
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
              {deleteErr && <p className="mt-2 text-xs font-medium text-red-500">{deleteErr}</p>}
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={deleting || deleteConfirm.trim().toLowerCase() !== deleteOrg.name.trim().toLowerCase()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : 'Delete forever'}
              </motion.button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Provisioning overlay ── */}
      <ProvisioningOverlay state={provisioning} />

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed top-8 right-8 z-50"
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
    </div>
  )
}

/* ───────────── small components ───────────── */

function Tab({ id, current, onClick, icon: Icon, label, count, colorFrom, colorTo }) {
  const active = current === id
  return (
    <button
      onClick={() => onClick(id)}
      className={`relative flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${!active && 'hover:bg-gray-100'}`}
      style={{
        color: active ? '#FFFFFF' : '#6B7280',
        background: active ? `linear-gradient(135deg, ${colorFrom}, ${colorTo})` : 'var(--bg-2)',
        borderRadius: '14px 14px 0 0',
        borderTop: '1px solid #E5E7EB',
        borderLeft: '1px solid #E5E7EB',
        borderRight: '1px solid #E5E7EB',
        marginBottom: active ? '-2px' : '0', // overlap the bottom border
        paddingBottom: active ? '12px' : '10px',
        boxShadow: active ? '0 -4px 12px rgba(0,0,0,0.06)' : 'inset 0 -2px 4px rgba(0,0,0,0.02)',
        zIndex: active ? 10 : 1
      }}
    >
      <span className="relative flex items-center gap-2" style={{ opacity: active ? 1 : 0.85 }}>
        <Icon size={16} className={active ? 'text-white' : 'text-gray-400'} />
        {label}
        {typeof count === 'number' && (
          <span
            className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
            style={{
              background: active ? 'rgba(255,255,255,0.25)' : '#E5E7EB',
              color: active ? '#FFFFFF' : '#4B5563',
            }}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  )
}

function StatCard({ label, dot, value, note }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-400">{note}</p>
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-1">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="text-[11px] text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function Legend({ dot, label, value }) {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
      <span className="font-medium">{label}</span>
      <span className="font-bold text-gray-900">{value}</span>
    </div>
  )
}

function OrgCard({ org, isToggling, canDelete, onSelect, onRename, onArchive, onRestore, onDelete }) {
  const c = palette(org.name)
  const [copied, setCopied] = useState(false)

  async function handleCopy(e) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(org.org_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const shortId = org.org_id.slice(0, 8)

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      onClick={onSelect}
      className="relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-lg hover:ring-gray-200 cursor-pointer"
    >
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to})` }} />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg shadow-sm"
            style={{ background: c.bg, color: c.fg }}
          >
            <Building2 size={24} className="stroke-[2]" />
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${org.is_active
              ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
              : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${org.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`}
              style={org.is_active ? { boxShadow: '0 0 0 3px rgba(34,197,94,0.18)' } : {}}
            />
            {org.is_active ? 'Active' : 'Archived'}
          </span>
        </div>

        <div className="mt-4">
          <h3 className="truncate text-base font-bold leading-tight text-gray-900">{org.name}</h3>
          <button
            onClick={handleCopy}
            title={copied ? 'Copied!' : `Copy ${org.org_id}`}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 font-mono text-[10px] text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <span>{shortId}…</span>
            {copied
              ? <Check size={11} className="text-emerald-500" />
              : <Copy size={10} />}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-400">Created {fmtDate(org.created_at)}</p>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          {org.is_active ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onRename(e); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                <Pencil size={12} /> Rename
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(e); }}
                disabled={isToggling}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-rose-100 bg-rose-50 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                {isToggling ? <RefreshCw size={11} className="animate-spin" /> : <Archive size={12} />}
                {isToggling ? '…' : 'Archive'}
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onRestore(e); }}
              disabled={isToggling}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              {isToggling ? <RefreshCw size={11} className="animate-spin" /> : <RotateCcw size={12} />}
              {isToggling ? '…' : 'Restore'}
            </button>
          )}
          {canDelete ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(e); }}
              disabled={isToggling}
              title="Delete permanently"
              className="flex items-center justify-center rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState({ archived, search, onCreate }) {
  if (search) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
          <Search size={20} className="text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700">No results for "{search}"</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-gray-100">
        {archived ? <Archive size={22} className="text-gray-300" /> : <Building2 size={22} className="text-gray-300" />}
      </div>
      <p className="text-base font-semibold text-gray-800">
        {archived ? 'No archived organizations' : 'No active organizations yet'}
      </p>
      <p className="mt-1.5 text-sm text-gray-400">
        {archived ? 'Archived organizations will appear here' : 'Create your first organization to get started'}
      </p>
      {!archived && (
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
          onClick={onCreate}
          className="mt-6 flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
        >
          <Plus size={15} /> New Organization
        </motion.button>
      )}
    </div>
  )
}

function ProvisioningOverlay({ state }) {
  const STEPS = [
    { id: 'duplicate', label: 'Drafting the first message' },
    { id: 'create', label: 'Writing the agent instructions' },
    { id: 'finalize', label: 'Choosing the LLM' },
    { id: 'refresh', label: 'Tuning the voice' },
  ]
  const order = ['duplicate', 'create', 'finalize', 'refresh', 'done']
  const currentIdx = state ? order.indexOf(state.step) : -1
  const isDone = state?.step === 'done'
  const progress = state ? Math.min(100, ((currentIdx + 1) / order.length) * 100) : 0
  const currentStep = STEPS[Math.min(currentIdx, STEPS.length - 1)] || STEPS[0]
  const orgName = state?.orgName || 'Organization'

  // 2x2 grid of modules - each card snaps into its slot when its step lands.
  // Order: First message → Prompt → LLM → Voice. Knowledge base attaches at the end.
  const STAGE_W = 300
  const STAGE_H = 240
  const CARD_W = 122
  const CARD_H = 72
  const COL_GAP = 16
  const ROW_GAP = 18
  const gridStartX = (STAGE_W - (CARD_W * 2 + COL_GAP)) / 2
  const gridStartY = 8

  const MODULES = [
    {
      id: 'message',
      stepIdx: 0,
      label: ['First', 'Message'],
      tone: { from: '#0EA5E9', to: '#38BDF8' },
      slotX: gridStartX,
      slotY: gridStartY,
      from: { x: -260, y: -140, rotate: -22 },
    },
    {
      id: 'instructions',
      stepIdx: 1,
      label: ['Agent', 'Instructions'],
      tone: { from: '#6366F1', to: '#8B5CF6' },
      slotX: gridStartX + CARD_W + COL_GAP,
      slotY: gridStartY,
      from: { x: 260, y: -140, rotate: 22 },
    },
    {
      id: 'llm',
      stepIdx: 2,
      label: ['LLM'],
      tone: { from: '#A855F7', to: '#D946EF' },
      slotX: gridStartX,
      slotY: gridStartY + CARD_H + ROW_GAP,
      from: { x: -260, y: 160, rotate: 18 },
    },
    {
      id: 'voice',
      stepIdx: 3,
      label: ['Voice'],
      tone: { from: '#EC4899', to: '#F472B6' },
      slotX: gridStartX + CARD_W + COL_GAP,
      slotY: gridStartY + CARD_H + ROW_GAP,
      from: { x: 260, y: 160, rotate: -18 },
    },
  ]

  // Knowledge base sits below the grid and "binds" the agent at the end
  const KB_W = 180
  const KB_H = 38
  const kbX = (STAGE_W - KB_W) / 2
  const kbY = gridStartY + CARD_H * 2 + ROW_GAP + 14

  // Floating sparkles in the backdrop
  const sparkles = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 3,
    size: 1 + Math.random() * 2,
  }))

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          {/* Cosmic backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 60% at 50% 35%, rgba(139,92,246,0.30), transparent 65%),' +
                ' radial-gradient(ellipse at center, rgba(67,56,202,0.55), rgba(8,12,28,0.92) 70%)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
          />

          {/* Twinkling stars */}
          <div className="absolute inset-0 overflow-hidden">
            {sparkles.map((s) => (
              <motion.span
                key={s.id}
                className="absolute rounded-full bg-white"
                style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
                animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.6, 1.2, 0.6] }}
                transition={{ duration: 2.4 + Math.random() * 2, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
              />
            ))}
          </div>

          {/* Card */}
          <motion.div
            initial={{ y: 24, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative w-full max-w-md overflow-hidden rounded-lg shadow-[0_30px_80px_-20px_rgba(79,70,229,0.45)] ring-1 ring-white/10"
            style={{
              background:
                'linear-gradient(160deg, #1E1B4B 0%, #312E81 35%, #4338CA 70%, #6D28D9 100%)',
            }}
          >
            {/* Card grain + glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 0.7px, transparent 0.7px)',
                backgroundSize: '20px 20px',
              }}
            />
            <motion.div
              className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.55), transparent 65%)', filter: 'blur(20px)' }}
              animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.40), transparent 65%)', filter: 'blur(24px)' }}
              animate={{ x: [0, -15, 0], y: [0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative flex flex-col items-center px-7 pt-9 pb-7">
              {/* Eyebrow */}
              <motion.p
                key={isDone ? 'done-eyebrow' : 'live-eyebrow'}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-purple-200/80"
              >
                {isDone ? 'Welcome aboard' : `Provisioning · ${orgName}`}
              </motion.p>
              <h2 className="mt-1.5 max-w-[22ch] text-center text-[22px] font-bold leading-tight tracking-tight text-white">
                {isDone ? `${orgName} is ready to call` : `Customizing an agent for ${orgName}`}
              </h2>

              {/* Assembly stage - modules snap into a 2x2 grid */}
              <div className="relative my-6" style={{ width: STAGE_W, height: STAGE_H }}>
                {/* Workbench grid pattern */}
                <div
                  className="absolute inset-0 rounded-md"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 24px),' +
                      ' repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 24px)',
                    border: '1px dashed rgba(255,255,255,0.12)',
                  }}
                />

                {/* Slot ghost outlines */}
                {MODULES.map((m) => (
                  <div
                    key={`slot-${m.id}`}
                    className="absolute rounded-md border border-dashed border-white/15"
                    style={{ left: m.slotX, top: m.slotY, width: CARD_W, height: CARD_H }}
                  />
                ))}

                {/* Connection lines between landed cards */}
                {currentIdx >= 1 && (
                  <svg className="pointer-events-none absolute inset-0" width={STAGE_W} height={STAGE_H}>
                    {/* Card-to-card connections - appear once 2+ are placed */}
                    {[
                      { from: 0, to: 1 },
                      { from: 0, to: 2 },
                      { from: 1, to: 3 },
                      { from: 2, to: 3 },
                    ]
                      .filter((l) => currentIdx >= l.from && currentIdx >= l.to)
                      .map((l, idx) => {
                        const a = MODULES[l.from]
                        const b = MODULES[l.to]
                        return (
                          <motion.line
                            key={`line-${idx}`}
                            x1={a.slotX + CARD_W / 2}
                            y1={a.slotY + CARD_H / 2}
                            x2={b.slotX + CARD_W / 2}
                            y2={b.slotY + CARD_H / 2}
                            stroke={isDone ? 'rgba(110,231,183,0.65)' : 'rgba(196,181,253,0.55)'}
                            strokeWidth={1.2}
                            strokeDasharray="3 4"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
                          />
                        )
                      })}

                    {/* Knowledge-base bindings - draw from KB up to each module on done */}
                    {isDone && MODULES.map((m, idx) => {
                      const x1 = kbX + KB_W / 2
                      const y1 = kbY + KB_H / 2
                      const x2 = m.slotX + CARD_W / 2
                      const y2 = m.slotY + CARD_H / 2
                      return (
                        <motion.line
                          key={`kb-line-${m.id}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="rgba(110,231,183,0.85)"
                          strokeWidth={1.4}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 + idx * 0.12 }}
                        />
                      )
                    })}
                  </svg>
                )}

                {/* Module cards */}
                {MODULES.map((m) => {
                  const placed = currentIdx >= m.stepIdx
                  return (
                    <motion.div
                      key={m.id}
                      className="absolute overflow-hidden rounded-md bg-white shadow-lg"
                      style={{
                        width: CARD_W,
                        height: CARD_H,
                        left: m.slotX,
                        top: m.slotY,
                        transformOrigin: 'center',
                      }}
                      initial={{
                        x: m.from.x,
                        y: m.from.y,
                        rotate: m.from.rotate,
                        opacity: 0,
                        scale: 0.8,
                      }}
                      animate={
                        isDone
                          ? { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, boxShadow: '0 0 22px rgba(52,211,153,0.55)' }
                          : placed
                            ? { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }
                            : { x: m.from.x, y: m.from.y, rotate: m.from.rotate, opacity: 0.55, scale: 0.8 }
                      }
                      transition={{
                        type: 'spring',
                        stiffness: 110,
                        damping: 16,
                        mass: 1.1,
                        delay: placed ? 0.3 : 0,
                      }}
                    >
                      {/* Top accent bar */}
                      <div
                        className="h-1.5 w-full"
                        style={{ background: `linear-gradient(90deg, ${m.tone.from}, ${m.tone.to})` }}
                      />
                      <div className="flex h-[calc(100%-6px)] flex-col justify-center px-3 py-2">
                        <div className="text-[11px] font-bold uppercase leading-tight tracking-wider text-gray-800">
                          {m.label.map((line) => (
                            <div key={line} className="truncate">{line}</div>
                          ))}
                        </div>
                        <div className="mt-1.5 space-y-1">
                          <div className="h-1 w-full rounded-full bg-gray-200" />
                          <div className="h-1 w-2/3 rounded-full bg-gray-100" />
                        </div>
                      </div>

                      {/* Land flash - pulse outline when card just settled */}
                      {placed && !isDone && (
                        <motion.span
                          key={`flash-${m.id}-${currentIdx}`}
                          className="pointer-events-none absolute inset-0 rounded-md ring-2"
                          style={{ borderColor: m.tone.from }}
                          initial={{ opacity: 0.85, scale: 1 }}
                          animate={{ opacity: 0, scale: 1.18 }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      )}
                    </motion.div>
                  )
                })}

                {/* Floating "incoming" hint trail */}
                {!isDone && currentIdx < MODULES.length && (() => {
                  const next = MODULES[Math.max(0, currentIdx + 1)]
                  if (!next) return null
                  return (
                    <motion.div
                      key={`trail-${next.id}`}
                      className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white"
                      style={{
                        left: next.slotX + CARD_W / 2 - 3,
                        top: next.slotY + CARD_H / 2 - 3,
                        boxShadow: '0 0 14px rgba(255,255,255,0.95)',
                      }}
                      animate={{
                        x: [next.from.x, 0],
                        y: [next.from.y, 0],
                        opacity: [0, 0.9, 0],
                      }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )
                })()}

                {/* Knowledge base - appears at the end and binds the agent together */}
                {isDone && (
                  <motion.div
                    className="pointer-events-none absolute overflow-hidden rounded-md"
                    style={{
                      left: kbX,
                      top: kbY,
                      width: KB_W,
                      height: KB_H,
                      background: 'linear-gradient(135deg, #047857, #10B981)',
                      boxShadow: '0 8px 28px rgba(16,185,129,0.55), 0 0 0 1px rgba(110,231,183,0.6) inset',
                    }}
                    initial={{ y: 60, opacity: 0, scale: 0.7 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.15 }}
                  >
                    <div className="flex h-full items-center justify-center gap-2 px-3">
                      <motion.span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-200"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white">
                        Knowledge linked
                      </span>
                    </div>
                    {/* sweeping shimmer */}
                    <motion.span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                      }}
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.6 }}
                    />
                  </motion.div>
                )}
              </div>

              {/* Active step text - animated swap */}
              <div className="relative h-6 w-full overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={state.step}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -14, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="absolute inset-0 text-center text-[14px] font-semibold text-purple-100"
                  >
                    {isDone ? 'All set - taking you in…' : currentStep.label}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Step dots */}
              <div className="mt-5 flex items-center gap-2">
                {STEPS.map((s, idx) => {
                  const dotState = isDone || idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'pending'
                  return (
                    <motion.span
                      key={s.id}
                      className={cn(
                        'h-1.5 rounded-full transition',
                        dotState === 'done' ? 'bg-emerald-300/90' : dotState === 'active' ? 'bg-white' : 'bg-white/25',
                      )}
                      animate={dotState === 'active' ? { width: 28 } : { width: 8 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    />
                  )
                })}
              </div>

              {/* Progress label */}
              <p className="mt-4 text-[10.5px] font-mono uppercase tracking-[0.22em] text-purple-200/65">
                {Math.round(progress)}% · {state?.orgName || 'Organization'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function isThisMonth(value) {
  if (!value) return false
  const d = new Date(value)
  if (isNaN(d)) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

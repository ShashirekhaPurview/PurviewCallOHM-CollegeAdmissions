import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive, BarChart3, Building2, Check, CircleAlert, Copy, ListChecks,
  Pencil, Plus, RefreshCw, RotateCcw, Search, X,
} from 'lucide-react'
import {
  activateOrganization, createOrganization, deactivateOrganization,
  listOrganizations, updateOrganization,
} from '../../api/orgs/orgService'

/* ───────────── helpers ───────────── */

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
            className={`relative w-full ${max} overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/6`}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: iconBg }}>
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

function Field({ id, label, value, onChange, placeholder, error, autoFocus }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <input
        id={id} type="text" value={value} onChange={onChange}
        placeholder={placeholder} autoFocus={autoFocus}
        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
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

  const [renameOrg, setRenameOrg] = useState(null)
  const [renameName, setRenameName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameErr, setRenameErr] = useState('')

  const [confirmOrg, setConfirmOrg] = useState(null) // org pending archive
  const [togglingId, setTogglingId] = useState('')

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
        : !/^\d{4,10}$/.test(pincode) ? 'Enter a valid pincode.' : '',
      form: '',
    }
    if (errs.name || errs.address1 || errs.city || errs.state || errs.pincode) {
      setCreateErr(errs)
      return
    }

    const location = [address1, address2, city, state, pincode].filter(Boolean).join(', ')

    setCreating(true)
    setCreateErr({ name: '', address1: '', city: '', state: '', pincode: '', form: '' })
    try {
      const created = await createOrganization({ name, location })
      setCreateOpen(false)
      setNewName('')
      setNewAddress(INITIAL_ADDRESS)
      showToast(`"${created.name}" created`)
      await load({ keepToast: true })
    } catch (e) {
      setCreateErr(prev => ({ ...prev, form: e.message || 'Could not create.' }))
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
      setOrgs(prev => prev.map(o => o.org_id === renameOrg.org_id ? { ...o, ...updated } : o))
      showToast(`Renamed to "${updated.name}"`)
      setRenameOrg(null); setRenameName('')
    } catch (e) { setRenameErr(e.message || 'Could not rename.') }
    finally { setRenaming(false) }
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
      className="min-h-full px-8 py-7"
      style={{
        background: 'radial-gradient(ellipse 90% 40% at 60% -10%, rgba(99,102,241,0.07) 0%, transparent 70%), #F9FAFB',
      }}
    >
      <div className="mx-auto max-w-6xl">

        {/* ── Tab bar ── */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-gray-200 pb-0">
          <div className="flex items-end gap-1.5 px-2">
            <Tab id="active" current={tab} onClick={setTab} icon={ListChecks} label="Active" count={activeOrgs.length} colorFrom="#10B981" colorTo="#059669" />
            <Tab id="archived" current={tab} onClick={setTab} icon={Archive} label="Archived" count={archivedOrgs.length} colorFrom="#F87171" colorTo="#DC2626" />
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
                      onSelect={() => navigate(`/app/organizations/${org.org_id}`)}
                      onRename={() => { setRenameOrg(org); setRenameName(org.name); setRenameErr('') }}
                      onArchive={() => setConfirmOrg(org)}
                      onRestore={() => performToggle(org)}
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
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field
            id="orgName" label="Organization name" value={newName}
            onChange={e => setNewName(e.target.value)} placeholder="e.g. Acme University"
            autoFocus error={createErr.name}
          />
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
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <Field
            id="orgPincode" label="Pincode" value={newAddress.pincode}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
              setNewAddress(a => ({ ...a, pincode: v }))
            }}
            placeholder="560001"
            error={createErr.pincode}
          />
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
              className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
              Cancel
            </button>
            <motion.button
              type="submit" disabled={creating}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
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
              className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
              Cancel
            </button>
            <motion.button
              type="submit" disabled={renaming}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
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
                className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
                Cancel
              </button>
              <motion.button
                onClick={() => performToggle(confirmOrg)}
                disabled={togglingId === confirmOrg.org_id}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
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

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed top-8 right-8 z-50"
          >
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl ring-1 ${toast.type === 'error' ? 'bg-white text-red-600 ring-red-200' : 'bg-gray-950 text-white ring-gray-800'
              }`}
              style={toast.type !== 'error' ? { boxShadow: '0 8px 32px rgba(0,0,0,0.28)' } : {}}
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
        background: active ? `linear-gradient(135deg, ${colorFrom}, ${colorTo})` : '#F9FAFB',
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
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
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

function OrgCard({ org, isToggling, onSelect, onRename, onArchive, onRestore }) {
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

        {/* Actions - always visible */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRename(e); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <Pencil size={12} /> Rename
          </button>
          {org.is_active ? (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(e); }}
              disabled={isToggling}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-rose-100 bg-rose-50 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {isToggling ? <RefreshCw size={11} className="animate-spin" /> : <Archive size={12} />}
              {isToggling ? '…' : 'Archive'}
            </button>
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
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState({ archived, search, onCreate }) {
  if (search) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <Search size={20} className="text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700">No results for "{search}"</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-gray-100">
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
          className="mt-6 flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
        >
          <Plus size={15} /> New Organization
        </motion.button>
      )}
    </div>
  )
}

function isThisMonth(value) {
  if (!value) return false
  const d = new Date(value)
  if (isNaN(d)) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

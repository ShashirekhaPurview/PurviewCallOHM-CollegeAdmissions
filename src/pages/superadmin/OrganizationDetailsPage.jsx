import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive, BarChart3, Building2, Check, ChevronDown, CircleAlert, Copy, Crown, Eye, EyeOff, KeyRound, Mail,
  Plus, RefreshCw, RotateCcw, Search, Shield, User as UserIcon, UserPlus, Users as UsersIcon, X, Settings, ChevronLeft, Pencil
} from 'lucide-react'
import {
  inviteUser, listOrgUsers, resetUserPassword, setUserActive,
} from '../../api/users/userService'
import { getOrganization, updateOrganization, deactivateOrganization, activateOrganization } from '../../api/orgs/orgService'
import { getCurrentUser } from '../../api/auth/authService'
import { renameOrgAgentAssignment } from '../../api/orgs/orgAgentAssignmentStore'

/* ───────── helpers ───────── */

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8,         msg: 'at least 8 characters' },
  { test: (p) => /[A-Z]/.test(p),       msg: 'an uppercase letter' },
  { test: (p) => /[a-z]/.test(p),       msg: 'a lowercase letter' },
  { test: (p) => /\d/.test(p),          msg: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), msg: 'a special character' },
]

function validatePassword(pwd) {
  const failed = PASSWORD_RULES.filter(r => !r.test(pwd || '')).map(r => r.msg)
  if (failed.length === 0) return ''
  return `Password must contain ${failed.join(', ')}.`
}

function PasswordChecklist({ value }) {
  if (!value) return null
  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value)
        return (
          <li key={r.msg} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
            {ok ? <Check size={11} /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />}
            <span className={ok ? 'font-semibold' : ''}>{r.msg}</span>
          </li>
        )
      })}
    </ul>
  )
}


const ROLE_META = {
  super_admin: { label: 'Super Admin', icon: Crown, bg: '#FFFBEB', fg: '#B45309', dot: '#F59E0B' },
  org_admin: { label: 'Org Admin', icon: Shield, bg: '#EEF2FF', fg: '#4338CA', dot: '#6366F1' },
  org_user: { label: 'Org User', icon: UserIcon, bg: '#F0FDF4', fg: '#166534', dot: '#22C55E' },
}

const PALETTE = [
  { bg: '#EEF2FF', fg: '#4338CA' },
  { bg: '#ECFDF5', fg: '#065F46' },
  { bg: '#FFFBEB', fg: '#92400E' },
  { bg: '#FDF2F8', fg: '#9D174D' },
  { bg: '#ECFEFF', fg: '#155E75' },
  { bg: '#FFF7ED', fg: '#9A3412' },
  { bg: '#F5F3FF', fg: '#5B21B6' },
]

function avatarColor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function fmtDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d) ? v : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

function isThisMonth(value) {
  if (!value) return false
  const d = new Date(value)
  if (isNaN(d)) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/* ───────── 3D charts ───────── */

function Bar3D({ value, max, color, light, dark, label }) {
  const maxH = 110
  const h = max > 0 ? Math.max((value / max) * maxH, value > 0 ? 8 : 4) : 4
  const w = 48, depth = 12
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-base font-bold text-gray-900">{value}</span>
      <svg width={w + depth} height={maxH + depth + 4}>
        <g transform={`translate(0, ${maxH - h + depth})`}>
          <polygon points={`0,${depth} ${depth},0 ${w + depth},0 ${w},${depth}`} fill={light} />
          <polygon points={`${w},${depth} ${w + depth},0 ${w + depth},${h} ${w},${h + depth}`} fill={dark} />
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
      <svg width={size} height={size} className="absolute left-0 top-2" style={{ filter: 'blur(6px)', opacity: 0.45 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#10B981" strokeWidth={stroke} />
      </svg>
      <svg width={size} height={size} className="absolute left-0 top-0 -rotate-90">
        <defs>
          <linearGradient id="org-donut-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="org-donut-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F3F4F6" />
            <stop offset="100%" stopColor="#E5E7EB" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#org-donut-bg)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="url(#org-donut-grad)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ height: size }}>
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-gray-400">Total</span>
      </div>
    </div>
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

/* ───────── shared UI ───────── */

function Modal({ open, onClose, title, subtitle, icon: Icon, iconBg = '#EEF2FF', iconFg = '#4F46E5', children }) {
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
            className="relative w-full max-w-md rounded-xl shadow-2xl"
            style={{ background: 'var(--surface)', outline: '1px solid var(--hair)' }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: iconBg }}>
                  <Icon size={17} style={{ color: iconFg }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  {subtitle && <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>}
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

function Field({ id, label, type = 'text', value, onChange, placeholder, error, autoFocus, leading }) {
  const isPassword = type === 'password'
  const [reveal, setReveal] = useState(false)
  const inputType = isPassword ? (reveal ? 'text' : 'password') : type

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">{leading}</span>
        )}
        <input
          id={id} type={inputType} value={value} onChange={onChange}
          placeholder={placeholder} autoFocus={autoFocus}
          className={`w-full rounded-md border border-gray-200 bg-gray-50 ${leading ? 'pl-10' : 'pl-4'} ${isPassword ? 'pr-11' : 'pr-4'} py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal(r => !r)}
            tabIndex={-1}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            title={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

function Select({ id, label, value, onChange, options, error }) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find(o => o.value === value) || options[0]

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <button
        type="button" id={id} onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-md border border-gray-100 bg-white shadow-xl ring-1 ring-black/5"
            >
              <div className="max-h-60 overflow-y-auto p-1">
                {options.map((o) => {
                  const isSelected = o.value === value
                  return (
                    <button
                      key={o.value} type="button"
                      onClick={() => { onChange({ target: { value: o.value } }); setOpen(false) }}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition ${isSelected ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span>{o.label}</span>
                      {isSelected && <Check size={14} className="text-indigo-600" />}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

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

function UserCard({ user, isToggling, onReset, onArchive, onRestore }) {
  const c = avatarColor(user.email)
  const role = ROLE_META[user.role] || ROLE_META.org_user
  const RoleIcon = role.icon
  const [copied, setCopied] = useState(false)

  async function copyId(e) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(user.user_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { }
  }

  const localPart = user.email.split('@')[0]
  const domainPart = user.email.includes('@') ? '@' + user.email.split('@')[1] : ''

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-lg hover:ring-gray-200"
    >
      <div className="h-1 w-full" style={{ background: role.dot }} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ background: c.bg, color: c.fg }}
          >
            <UserIcon size={24} className="stroke-[2]" />
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.is_active
                ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`}
              style={user.is_active ? { boxShadow: '0 0 0 3px rgba(34,197,94,0.18)' } : {}}
            />
            {user.is_active ? 'Active' : 'Archived'}
          </span>
        </div>

        <div className="mt-4 min-w-0">
          <h3 className="truncate text-sm font-bold text-gray-900" title={user.email}>
            <span>{localPart}</span>
            <span className="font-medium text-gray-400">{domainPart}</span>
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="truncate font-mono uppercase tracking-wider">{user.user_id}</span>
            <button
              onClick={copyId}
              title={copied ? 'Copied!' : 'Copy ID'}
              className="shrink-0 rounded p-0.5 transition hover:bg-gray-100 hover:text-gray-600"
            >
              {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={10} />}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: role.bg, color: role.fg }}
            >
              <RoleIcon size={11} />
              {role.label}
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-2 border-t border-gray-50 pt-4">
          <button
            onClick={onReset}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <KeyRound size={12} /> Reset
          </button>
          {user.is_active ? (
            <button
              onClick={onArchive}
              disabled={isToggling}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-rose-100 bg-rose-50 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {isToggling ? <RefreshCw size={11} className="animate-spin" /> : <Archive size={12} />}
              {isToggling ? '…' : 'Archive'}
            </button>
          ) : (
            <button
              onClick={onRestore}
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

/* ───────── main page ───────── */

export default function OrganizationDetailsPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()

  const [org, setOrg] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active') // active | archived | analytics
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  // settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // invite state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invForm, setInvForm] = useState({ email: '', password: '', role: 'org_user' })
  const [inviteErr, setInviteErr] = useState('')
  const [inviting, setInviting] = useState(false)

  // reset password state
  const [resetUser, setResetUser] = useState(null)
  const [newPwd, setNewPwd] = useState('')
  const [resetErr, setResetErr] = useState('')
  const [resetting, setResetting] = useState(false)

  // archive confirm
  const [confirmUser, setConfirmUser] = useState(null)
  const [togglingId, setTogglingId] = useState('')

  // org settings
  const [renameName, setRenameName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [orgToggling, setOrgToggling] = useState(false)
  const [copiedOrg, setCopiedOrg] = useState(false)

  async function copyOrgId() {
    if (!org) return
    try {
      await navigator.clipboard.writeText(org.org_id)
      setCopiedOrg(true)
      setTimeout(() => setCopiedOrg(false), 1500)
    } catch { }
  }

  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type }) }, [])

  async function load({ keepToast = false } = {}) {
    setLoading(true)
    if (!keepToast) setToast(null)
    try {
      const [o, u] = await Promise.all([
        getOrganization(orgId),
        listOrgUsers(orgId, { limit: 100 }),
      ])
      setOrg(o)
      setRenameName(o.name)
      setUsers(u.items ?? [])
    } catch (e) {
      showToast(e.message || 'Failed to load details.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!invForm.email.trim()) { setInviteErr('Email is required.'); return }
    if (!invForm.password.trim()) { setInviteErr('Password is required.'); return }
    const pwdErr = validatePassword(invForm.password)
    if (pwdErr) { setInviteErr(pwdErr); return }
    setInviting(true); setInviteErr('')
    try {
      const created = await inviteUser(orgId, {
        email: invForm.email.trim(),
        password: invForm.password,
        role: invForm.role,
      })
      setInviteOpen(false)
      setInvForm({ email: '', password: '', role: 'org_user' })
      showToast(`Added "${created.email}"`)
      await load({ keepToast: true })
    } catch (e) {
      setInviteErr(e.message || 'Could not invite user.')
    } finally { setInviting(false) }
  }

  async function performUserToggle(user) {
    setTogglingId(user.user_id)
    try {
      const updated = await setUserActive(orgId, user.user_id, !user.is_active)
      setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_active: updated.is_active } : u))
      showToast(updated.is_active ? `"${user.email}" restored` : `"${user.email}" archived`)
    } catch (e) {
      showToast(e.message || 'Failed.', 'error')
    } finally {
      setTogglingId('')
      setConfirmUser(null)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!newPwd.trim()) { setResetErr('Password is required.'); return }
    const pwdErr = validatePassword(newPwd)
    if (pwdErr) { setResetErr(pwdErr); return }
    setResetting(true); setResetErr('')
    try {
      await resetUserPassword(orgId, resetUser.user_id, newPwd)
      showToast(`Password reset for "${resetUser.email}"`)
      setResetUser(null); setNewPwd('')
    } catch (e) {
      setResetErr(e.message || 'Could not reset password.')
    } finally { setResetting(false) }
  }

  async function handleRename(e) {
    e.preventDefault()
    if (!renameName.trim()) return
    setRenaming(true)
    try {
      const updated = await updateOrganization(orgId, { name: renameName.trim() })
      renameOrgAgentAssignment(orgId, updated.name)
      setOrg(updated)
      showToast(`Renamed to "${updated.name}"`)
    } catch (e) {
      showToast('Could not rename.', 'error')
    } finally { setRenaming(false) }
  }

  async function performOrgToggle() {
    setOrgToggling(true)
    try {
      const updated = org.is_active
        ? await deactivateOrganization(orgId)
        : await activateOrganization(orgId)
      setOrg(updated)
      showToast(updated.is_active ? 'Organization restored' : 'Organization archived')
    } catch (e) {
      showToast('Failed to change status.', 'error')
    } finally { setOrgToggling(false) }
  }

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    load()
  }, [orgId])

  /* derived */
  const counts = {
    all: users.length,
    org_admin: users.filter(u => u.role === 'org_admin').length,
    org_user: users.filter(u => u.role === 'org_user').length,
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.trim().toLowerCase())
  )
  const filteredActive = filtered.filter(u => u.is_active)
  const filteredArchived = filtered.filter(u => !u.is_active)


  const inviteRoleOptions = [
    { value: 'org_user', label: 'Org User' },
    { value: 'org_admin', label: 'Org Admin' }
  ]

  return (
    <div
      className="app-page-bg min-h-full px-8 py-7"
    >
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/app/organizations" className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 hover:text-gray-800">
              <ChevronLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{org?.name || 'Loading...'}</h1>
                {org && (
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
                )}
                {org && (
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    title="Organization Settings"
                  >
                    <Settings size={16} />
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-gray-400">
                <span>ID: {org?.org_id}</span>
                {org && (
                  <button
                    onClick={copyOrgId}
                    title={copiedOrg ? 'Copied!' : 'Copy ID'}
                    className="shrink-0 rounded p-0.5 transition hover:bg-gray-100 hover:text-gray-600"
                  >
                    {copiedOrg ? <Check size={11} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-gray-200 pb-0">
          <div className="flex items-end gap-1.5 px-2">
            <Tab id="active" current={tab} onClick={setTab} icon={UsersIcon} label="Active Users" count={users.filter(u => u.is_active).length} colorFrom="#0EA5E9" colorTo="#0284C7" />
            <Tab id="archived" current={tab} onClick={setTab} icon={Archive} label="Archived Users" count={users.filter(u => !u.is_active).length} colorFrom="#9CA3AF" colorTo="#6B7280" />
            <Tab id="analytics" current={tab} onClick={setTab} icon={BarChart3} label="Analytics" colorFrom="#8B5CF6" colorTo="#6D28D9" />
          </div>
          <div className="flex items-center gap-2.5 pb-2">
            <button
              onClick={() => load()}
              className="rounded-md border border-gray-200 bg-white p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            {tab === 'active' && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setInviteOpen(true)
                  setInvForm({ email: '', password: '', role: 'org_user' })
                  setInviteErr('')
                }}
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
              >
                <UserPlus size={15} />
                New User
              </motion.button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'analytics' ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {/* Stat cards */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="TOTAL USERS" dot="#6366F1" value={users.length} note="in this organization" />
                <StatCard
                  label="ACTIVE" dot="#10B981"
                  value={users.filter(u => u.is_active).length}
                  note={users.length > 0 ? `${Math.round(users.filter(u => u.is_active).length / users.length * 100)}% of total` : '0% of total'}
                />
                <StatCard
                  label="ARCHIVED" dot="#F87171"
                  value={users.filter(u => !u.is_active).length}
                  note={users.length > 0 ? `${Math.round(users.filter(u => !u.is_active).length / users.length * 100)}% of total` : '0% of total'}
                />
                <StatCard
                  label="THIS MONTH" dot="#F59E0B"
                  value={users.filter(u => isThisMonth(u.created_at)).length}
                  note="newly added"
                />
              </div>

              {/* Charts */}
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="By Role" subtitle="User distribution">
                  <div className="flex h-44 items-end justify-around pt-3">
                    <Bar3D value={counts.org_admin} max={Math.max(counts.org_admin, counts.org_user, 1)} color="#6366F1" light="#A5B4FC" dark="#4338CA" label="Org Admin" />
                    <Bar3D value={counts.org_user} max={Math.max(counts.org_admin, counts.org_user, 1)} color="#10B981" light="#6EE7B7" dark="#047857" label="Org User" />
                  </div>
                </ChartCard>

                <ChartCard title="Account Status" subtitle="Active vs archived">
                  <div className="flex h-44 items-center justify-center">
                    <Donut3D active={users.filter(u => u.is_active).length} total={users.length} />
                  </div>
                  <div className="flex items-center justify-center gap-6 text-xs">
                    <Legend dot="#10B981" label="Active" value={users.filter(u => u.is_active).length} />
                    <Legend dot="#E5E7EB" label="Archived" value={users.filter(u => !u.is_active).length} />
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
              {/* Search */}
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 sm:max-w-sm">
                  <Search size={14} className="shrink-0 text-gray-300" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by email…"
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
                  {tab === 'active' ? filteredActive.length : filteredArchived.length} users
                </span>
              </div>

              {/* Cards */}
              {(() => {
                const list = tab === 'active' ? filteredActive : filteredArchived
                const emptyMsg = tab === 'active'
                  ? (search ? `No active matches for "${search}"` : 'No active users in this organization')
                  : (search ? `No archived matches for "${search}"` : 'No archived users in this organization')

                if (loading) return (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-44 animate-pulse rounded-lg bg-white shadow-sm ring-1 ring-gray-100" />
                    ))}
                  </div>
                )

                if (list.length === 0) return (
                  <div className="flex flex-col items-center rounded-lg bg-white py-20 text-center shadow-sm ring-1 ring-gray-100">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gray-50">
                      {tab === 'active' ? <UsersIcon size={22} className="text-gray-300" /> : <Archive size={22} className="text-gray-300" />}
                    </div>
                    <p className="text-sm font-semibold text-gray-700">{emptyMsg}</p>
                  </div>
                )

                return (
                  <motion.div
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    initial="hidden" animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.04 } } }}
                  >
                    {list.map(user => (
                      <UserCard
                        key={user.user_id}
                        user={user}
                        isToggling={togglingId === user.user_id}
                        onReset={() => { setResetUser(user); setNewPwd(''); setResetErr('') }}
                        onArchive={() => setConfirmUser(user)}
                        onRestore={() => performUserToggle(user)}
                      />
                    ))}
                  </motion.div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="New User" icon={UserPlus}>
        <form onSubmit={handleInvite} className="space-y-4">
          <Field
            id="invEmail" label="Email" type="email"
            value={invForm.email}
            onChange={e => setInvForm(f => ({ ...f, email: e.target.value }))}
            placeholder="user@company.com"
            leading={<Mail size={14} />}
            autoFocus
          />
          <div>
            <Field
              id="invPwd" label="Password" type="password"
              value={invForm.password}
              onChange={e => setInvForm(f => ({ ...f, password: e.target.value }))}
              placeholder="At least 8 characters"
              leading={<KeyRound size={14} />}
            />
            <PasswordChecklist value={invForm.password} />
          </div>
          <Select
            id="invRole" label="Role"
            value={invForm.role}
            onChange={e => setInvForm(f => ({ ...f, role: e.target.value }))}
            options={inviteRoleOptions}
          />
          {inviteErr && <p className="text-xs font-medium text-red-500">{inviteErr}</p>}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={() => setInviteOpen(false)}
              className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
              Cancel
            </button>
            <motion.button
              type="submit" disabled={inviting}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
            >
              {inviting ? <RefreshCw size={13} className="animate-spin" /> : <UserPlus size={14} />}
              {inviting ? 'Creating…' : 'Create user'}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={!!resetUser} onClose={() => { setResetUser(null); setNewPwd(''); setResetErr('') }}
        title="Reset Password" subtitle={resetUser?.email}
        icon={KeyRound} iconBg="#FFFBEB" iconFg="#B45309"
      >
        <form onSubmit={handleReset} className="space-y-4">
          <div className="rounded-md bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-100">
            All active sessions for this user will be revoked. They'll need to sign in again with the new password.
          </div>
          <div>
            <Field
              id="newPwd" label="New password" type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="At least 8 characters"
              leading={<KeyRound size={14} />}
              autoFocus
              error={resetErr}
            />
            <PasswordChecklist value={newPwd} />
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => { setResetUser(null); setNewPwd(''); setResetErr('') }}
              className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
              Cancel
            </button>
            <motion.button
              type="submit" disabled={resetting}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
            >
              {resetting ? <RefreshCw size={13} className="animate-spin" /> : <KeyRound size={14} />}
              {resetting ? 'Resetting…' : 'Reset password'}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* Archive confirm */}
      <Modal
        open={!!confirmUser} onClose={() => setConfirmUser(null)}
        title="Archive User" icon={CircleAlert}
        iconBg="#FEF3C7" iconFg="#B45309"
      >
        {confirmUser && (
          <div className="space-y-5">
            <div className="rounded-md bg-amber-50 px-4 py-3.5 text-sm text-amber-900 ring-1 ring-amber-100">
              <p className="font-semibold">"{confirmUser.email}" will be archived.</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/80">
                All active sessions will be revoked. You can restore the user any time.
              </p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmUser(null)}
                className="flex-1 rounded-md border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50">
                Cancel
              </button>
              <motion.button
                onClick={() => performUserToggle(confirmUser)}
                disabled={togglingId === confirmUser.user_id}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
              >
                {togglingId === confirmUser.user_id ? <RefreshCw size={13} className="animate-spin" /> : <Archive size={14} />}
                {togglingId === confirmUser.user_id ? 'Archiving…' : 'Archive'}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {/* Organization Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Organization Settings" icon={Settings} iconBg="#FFFBEB" iconFg="#B45309">
        <div className="space-y-6">
          <form onSubmit={handleRename} className="space-y-4">
            <Field
              id="orgName" label="Organization name" value={renameName}
              onChange={e => setRenameName(e.target.value)} placeholder="e.g. Acme University"
            />
            <button
              type="submit" disabled={renaming || !renameName || renameName === org?.name}
              className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {renaming ? 'Saving...' : 'Save changes'}
            </button>
          </form>

          <div className="rounded-md border border-red-100 bg-red-50 p-5">
            <h3 className="text-sm font-bold text-red-900">Danger Zone</h3>
            <p className="mt-1 text-xs text-red-700/80">
              {org?.is_active
                ? "Archiving this organization prevents all its users from logging in."
                : "Restoring this organization allows its users to log in again."}
            </p>
            <button
              onClick={performOrgToggle}
              disabled={orgToggling}
              className="mt-4 w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{
                background: org?.is_active
                  ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                  : 'linear-gradient(135deg, #10B981, #059669)'
              }}
            >
              {orgToggling ? 'Processing...' : org?.is_active ? 'Archive Organization' : 'Restore Organization'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
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

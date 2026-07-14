import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserCog, Target, Phone, BarChart3, CalendarCheck,
  LogOut, Menu, X, Building2, Sparkles, MessageSquare, User, ChevronLeft, CircleAlert, RefreshCw, Bot,
  Sun, Moon,
} from 'lucide-react'
import { logout, getCurrentUser } from '../api/auth/authService'
import { useTheme } from '../hooks/useTheme'


function getNav(role) {
  if (role === 'super_admin') {
    return [
      { label: 'Analytics', icon: BarChart3, href: '/app/analytics' },
      { label: 'Organizations', icon: Building2, href: '/app/organizations' },
      { label: 'Contacts', icon: Users, href: '/app/contacts' },
      { label: 'Agent', icon: Bot, href: '/app/agents' },
      { label: 'Calls', icon: Phone, href: '/app/calls' },
      { label: 'Conversations', icon: MessageSquare, href: '/app/conversations' },
    ]
  }

  const base = [
    { label: 'Analytics', icon: BarChart3, href: '/app/analytics' },
    { label: 'Contacts', icon: Users, href: '/app/contacts' },
    { label: 'Agent', icon: Bot, href: '/app/agents' },
    { label: 'Calls', icon: Phone, href: '/app/calls' },
    { label: 'Conversations', icon: MessageSquare, href: '/app/conversations' },
  ]
  if (role === 'org_admin') {
    base.splice(1, 0, { label: 'Users', icon: UserCog, href: '/app/users' })
  }
  return base
}

function NavItem({ icon: Icon, label, href, collapsed, onClick }) {
  const location = useLocation()
  const active = location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <Link
      to={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 px-5 py-3 transition-all ${
        active
          ? 'bg-indigo-50/60 text-indigo-700 border-r-4 border-indigo-600'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-r-4 border-transparent'
      }`}
    >
      <Icon size={18} className={`relative shrink-0 ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
      {!collapsed && <span className={`relative text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>}
    </Link>
  )
}

function LogoutConfirmModal({ open, onClose, onConfirm, busy }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] bg-slate-950/35 backdrop-blur-sm"
            onClick={() => !busy && onClose()}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <CircleAlert size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Are you sure you want to end this session?</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="shrink-0 rounded-md border border-gray-200 bg-gray-50 p-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close logout dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5">
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="flex-1 rounded-md border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="button"
                    onClick={onConfirm}
                    disabled={busy}
                    whileHover={busy ? undefined : { scale: 1.01 }}
                    whileTap={busy ? undefined : { scale: 0.98 }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: '#DC2626' }}
                  >
                    {busy ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
                    {busy ? 'Logging out…' : 'Log out'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

function Sidebar({ collapsed, setCollapsed, onClose, mobile, role, onRequestLogout }) {
  const navItems = getNav(role)
  const me = getCurrentUser()
  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'org_admin' ? 'Org Admin' : 'Org User'
  const isCollapsed = collapsed && !mobile

  return (
    <aside
      className="flex h-full flex-col"
      style={{
        background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--hair)',
        width: mobile ? 264 : (collapsed ? 72 : 248),
        transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Logo / header */}
      <div
        className="flex shrink-0 items-center"
        style={{ borderBottom: '1px solid var(--hair)', minHeight: 64, padding: '0 16px' }}
      >
        {collapsed && !mobile ? (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto flex items-center justify-center transition-opacity hover:opacity-90"
            title="Expand sidebar"
          >
            <img src="/callohm-logo.png" alt="CallOHM" className="h-8 object-contain" />
          </button>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-center">
              <img src="/callohm-logo.png" alt="CallOHM" className="h-8 object-contain" />
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-base font-bold leading-none text-indigo-600">CallOHM</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Admissions
              </p>
            </div>
            {mobile ? (
              <button onClick={onClose}
                className="rounded-md p-1.5 transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                className="rounded-md p-1.5 transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                title="Collapse sidebar"
              >
                <ChevronLeft size={15} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-col gap-0.5">
          {navItems.map(item => (
            <NavItem key={item.href} {...item} collapsed={isCollapsed} onClick={mobile ? onClose : undefined} />
          ))}
        </div>
      </nav>

      <div className="shrink-0 p-3" style={{ borderTop: '1px solid var(--hair)' }}>
        {!isCollapsed && (
          <div className="mb-3 rounded-2xl px-3 py-2.5"
            style={{ border: '1px solid var(--hair)', background: 'color-mix(in srgb, var(--surface) 70%, transparent)' }}
          >
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {me?.email?.split('@')[0] || 'User'}
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{roleLabel}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onRequestLogout}
          title={isCollapsed ? 'Log out' : undefined}
          className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 ${
            isCollapsed ? 'justify-center' : 'gap-2.5'
          }`}
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>

    </aside>
  )
}

function TopBar({ onMenuClick, role, onRequestLogout, theme, toggleTheme }) {
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const me = getCurrentUser()

  const allNav = getNav(role)
  const current = allNav.find(
    (item) => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  )

  return (
    <header
      className="flex shrink-0 items-center gap-4 px-6"
      style={{ height: 64, background: 'var(--surface)', borderBottom: '1px solid var(--hair)' }}
    >
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 transition-colors text-gray-600 hover:bg-gray-100 lg:hidden"
      >
        <Menu size={18} />
      </button>

      {current && (
        <div className="flex items-center gap-2.5">
          <current.icon size={18} className="text-indigo-500 shrink-0" />
          <span className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{current.label}</span>
        </div>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
        style={{ color: 'var(--ink-3)' }}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100"
        >
          <User size={18} />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg shadow-xl z-50 overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--hair)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--hair)' }}>
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {me?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{me?.email || 'user@example.com'}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setProfileOpen(false); onRequestLogout(); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

export default function AppLayout({ children, role }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [theme, toggleTheme] = useTheme()

  function openLogoutConfirm() {
    if (!loggingOut) setLogoutConfirmOpen(true)
  }

  function closeLogoutConfirm() {
    if (!loggingOut) setLogoutConfirmOpen(false)
  }

  async function handleConfirmLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    await logout().catch(() => {})
    setLogoutConfirmOpen(false)
    setMobileOpen(false)
    setLoggingOut(false)
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="hidden h-full shrink-0 flex-col lg:flex" style={{ transition: 'width 0.25s', width: collapsed ? 72 : 248 }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} role={role} onRequestLogout={openLogoutConfirm} />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex flex-col lg:hidden"
            >
              <Sidebar
                collapsed={false}
                setCollapsed={setCollapsed}
                mobile
                onClose={() => setMobileOpen(false)}
                role={role}
                onRequestLogout={openLogoutConfirm}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} role={role} onRequestLogout={openLogoutConfirm} theme={theme} toggleTheme={toggleTheme} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <LogoutConfirmModal
        open={logoutConfirmOpen}
        onClose={closeLogoutConfirm}
        onConfirm={handleConfirmLogout}
        busy={loggingOut}
      />
    </div>
  )
}

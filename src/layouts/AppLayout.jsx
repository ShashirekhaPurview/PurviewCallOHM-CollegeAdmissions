import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserCog, Target, Phone, BarChart3, CalendarCheck,
  LogOut, Menu, X, Building2, Sparkles, MessageSquare, User, ChevronLeft,
} from 'lucide-react'
import { logout, getCurrentUser } from '../api/auth/authService'

/* sidebar light palette */
const D = {
  bg: '#FFFFFF',
  bgSoft: '#F9FAFB',
  border: '#F3F4F6',
  text: '#111827',
  textDim: '#6B7280',
  textMuted: '#9CA3AF',
  hover: '#F3F4F6',
  activeText: '#4F46E5',
}

/* light app palette (used in topbar + main) */
const C = {
  brand: '#6366F1',
  brandDim: '#4F46E5',
  base: '#F9FAFB',
  surface: '#FFFFFF',
  elevated: '#F3F4F6',
  subtle: '#E5E7EB',
  ink: '#111827',
  ink2: '#4B5563',
  ink3: '#9CA3AF',
}

function getNav(role) {
  if (role === 'super_admin') {
    return [
      { label: 'Organizations', icon: Building2, href: '/app/organizations' },
      { label: 'Contacts', icon: Users, href: '/app/contacts' },
      { label: 'Calls', icon: Phone, href: '/app/calls' },
      { label: 'Conversations', icon: MessageSquare, href: '/app/conversations' },
      { label: 'Analytics', icon: BarChart3, href: '/app/analytics' },
    ]
  }

  const base = [
    { label: 'Contacts', icon: Users, href: '/app/contacts' },
    { label: 'Calls', icon: Phone, href: '/app/calls' },
    { label: 'Conversations', icon: MessageSquare, href: '/app/conversations' },
    { label: 'Analytics', icon: BarChart3, href: '/app/analytics' },
  ]
  if (role === 'org_admin') {
    base.unshift({ label: 'Users', icon: UserCog, href: '/app/users' })
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

function Sidebar({ collapsed, setCollapsed, onClose, mobile, role }) {
  const navItems = getNav(role)
  const me = getCurrentUser()
  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'org_admin' ? 'Org Admin' : 'Org User'

  return (
    <aside
      className="flex h-full flex-col border-r border-gray-200/50"
      style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        width: mobile ? 264 : (collapsed ? 72 : 248),
        transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Logo / header */}
      <div
        className="flex shrink-0 items-center"
        style={{ borderBottom: `1px solid ${D.border}`, minHeight: 64, padding: '0 16px' }}
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
              <p className="text-base font-bold leading-none" style={{ color: D.activeText }}>CallOHM</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: D.textMuted }}>
                Admissions
              </p>
            </div>
            {mobile ? (
              <button onClick={onClose} className="rounded-md p-1.5 transition-colors"
                style={{ color: D.textDim }}
                onMouseEnter={e => { e.currentTarget.style.background = D.hover; e.currentTarget.style.color = D.text }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.textDim }}
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                className="rounded-md p-1.5 transition-colors"
                style={{ color: D.textDim }}
                onMouseEnter={e => { e.currentTarget.style.background = D.hover; e.currentTarget.style.color = D.text }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.textDim }}
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
            <NavItem key={item.href} {...item} collapsed={collapsed && !mobile} onClick={mobile ? onClose : undefined} />
          ))}
        </div>
      </nav>

    </aside>
  )
}

function TopBar({ onMenuClick, role }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const me = getCurrentUser()

  const allNav = getNav(role)
  const current = allNav.find(
    (item) => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  )

  async function handleLogout() {
    await logout().catch(() => {})
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="flex shrink-0 items-center gap-4 px-6"
      style={{ height: 64, background: C.surface, borderBottom: `1px solid ${C.subtle}` }}
    >
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 transition-colors lg:hidden"
        style={{ color: C.ink2 }}
        onMouseEnter={e => e.currentTarget.style.background = C.elevated}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Menu size={18} />
      </button>

      {current && (
        <div className="flex items-center gap-2.5">
          <current.icon size={18} style={{ color: C.brand, flexShrink: 0 }} />
          <span className="text-base font-semibold" style={{ color: C.ink }}>{current.label}</span>
        </div>
      )}

      <div className="flex-1" />

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
                className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {me?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="truncate text-xs text-gray-500">{me?.email || 'user@example.com'}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
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
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: C.base }}>
      {/* Desktop sidebar */}
      <div className="hidden h-full shrink-0 flex-col lg:flex" style={{ transition: 'width 0.25s', width: collapsed ? 72 : 248 }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} role={role} />
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
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} role={role} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

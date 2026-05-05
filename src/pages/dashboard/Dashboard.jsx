import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone, CheckCircle2, Target, CalendarCheck,
  ArrowUpRight, ArrowRight, TrendingUp, TrendingDown,
} from 'lucide-react'
import { getCurrentUser } from '../../api/auth/authService'

const C = {
  brand: '#6366F1',
  brandDim: '#4F46E5',
  brandLight: '#EEF2FF',
  base: '#F9FAFB',
  surface: '#FFFFFF',
  subtle: '#E5E7EB',
  hair: '#F3F4F6',
  ink: '#111827',
  ink2: '#4B5563',
  ink3: '#9CA3AF',
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
})

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function displayName(me) {
  if (!me) return 'there'
  if (me.email) return me.email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  return 'there'
}

/* ── high-level KPI ── */
const KPIS = [
  { icon: Phone, label: 'Calls today', value: '147', delta: 12, iconBg: '#EEF2FF', iconColor: '#6366F1' },
  { icon: CheckCircle2, label: 'Answered rate', value: '63%', delta: 4, iconBg: '#DCFCE7', iconColor: '#16A34A' },
  { icon: Target, label: 'Interested', value: '34', delta: 18, iconBg: '#FEF3C7', iconColor: '#D97706' },
  { icon: CalendarCheck, label: 'Follow-ups due', value: '12', delta: -8, iconBg: '#FEE2E2', iconColor: '#DC2626' },
]

function KpiCard({ icon: Icon, label, value, delta, iconBg, iconColor, delay }) {
  const positive = delta >= 0
  return (
    <motion.div
      {...fadeUp(delay)}
      className="rounded-xl p-5"
      style={{ background: C.surface, border: `1px solid ${C.subtle}`, boxShadow: '0 1px 3px rgba(17,24,39,0.04)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: iconBg }}>
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: positive ? '#DCFCE7' : '#FEE2E2', color: positive ? '#16A34A' : '#DC2626' }}
        >
          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {positive ? '+' : ''}{delta}%
        </span>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight tabular-nums" style={{ color: C.ink }}>{value}</p>
      <p className="mt-1 text-xs" style={{ color: C.ink3 }}>{label}</p>
    </motion.div>
  )
}

/* ── pipeline at a glance ── */
const PIPELINE = [
  { key: 'new', label: 'New', count: 412, color: '#6366F1' },
  { key: 'contacted', label: 'Contacted', count: 287, color: '#06B6D4' },
  { key: 'interested', label: 'Interested', count: 134, color: '#F59E0B' },
  { key: 'applied', label: 'Applied', count: 62, color: '#8B5CF6' },
  { key: 'enrolled', label: 'Enrolled', count: 24, color: '#10B981' },
]

function PipelineGlance({ delay }) {
  const max = Math.max(...PIPELINE.map(p => p.count), 1)
  const total = PIPELINE.reduce((s, p) => s + p.count, 0)
  const conversion = Math.round((PIPELINE[PIPELINE.length - 1].count / PIPELINE[0].count) * 100)

  return (
    <motion.div
      {...fadeUp(delay)}
      className="rounded-xl p-6"
      style={{ background: C.surface, border: `1px solid ${C.subtle}`, boxShadow: '0 1px 3px rgba(17,24,39,0.04)' }}
    >
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold" style={{ color: C.ink }}>Pipeline at a glance</h2>
          <p className="mt-0.5 text-xs" style={{ color: C.ink3 }}>
            {total.toLocaleString()} active leads · {conversion}% new → enrolled
          </p>
        </div>
        <Link
          to="/app/analytics"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition hover:bg-gray-100"
          style={{ color: C.brand }}
        >
          Analytics <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="space-y-3">
        {PIPELINE.map((p, i) => {
          const pct = (p.count / max) * 100
          return (
            <div key={p.key}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  <span className="font-medium" style={{ color: C.ink2 }}>{p.label}</span>
                </div>
                <span className="font-bold tabular-nums" style={{ color: C.ink }}>{p.count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: C.hair }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: p.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: delay + 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ── today's focus ── */
const FOCUS = [
  {
    label: 'Follow-ups due today',
    value: '12',
    note: '4 overdue · need attention',
    href: '/app/contacts',
    accent: '#DC2626',
    bg: '#FEE2E2',
  },
  {
    label: 'Interested awaiting call',
    value: '34',
    note: 'Best time: 10am – 12pm',
    href: '/app/calls',
    accent: '#D97706',
    bg: '#FEF3C7',
  },
  {
    label: 'New contacts this week',
    value: '+86',
    note: '23 from web form',
    href: '/app/contacts',
    accent: '#6366F1',
    bg: '#EEF2FF',
  },
]

function FocusCard({ label, value, note, href, accent, bg, delay }) {
  return (
    <motion.div {...fadeUp(delay)}>
      <Link
        to={href}
        className="group flex items-center justify-between rounded-xl p-5 transition hover:-translate-y-0.5"
        style={{ background: C.surface, border: `1px solid ${C.subtle}`, boxShadow: '0 1px 3px rgba(17,24,39,0.04)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold tabular-nums"
            style={{ background: bg, color: accent }}
          >
            {value}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{label}</p>
            <p className="text-xs" style={{ color: C.ink3 }}>{note}</p>
          </div>
        </div>
        <ArrowRight size={15} className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
      </Link>
    </motion.div>
  )
}

/* ── dashboard ── */
export default function Dashboard() {
  const me = getCurrentUser()
  const name = displayName(me)

  return (
    <div className="mx-auto max-w-screen-xl space-y-7 p-6 lg:p-8">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.ink }}>
            {timeGreeting()}, {name}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: C.ink3 }}>
            Engineering admissions snapshot - head to Analytics for the full picture.
          </p>
        </div>
        <Link
          to="/app/analytics"
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition hover:-translate-y-px"
          style={{
            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
            color: '#FFF',
            boxShadow: '0 4px 14px rgba(99,102,241,0.28)',
          }}
        >
          Open analytics <ArrowRight size={14} />
        </Link>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 0.05} />)}
      </div>

      {/* Pipeline + Focus */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <PipelineGlance delay={0.2} />
        <div className="space-y-4">
          <h2 className="px-1 text-sm font-bold" style={{ color: C.ink }}>Today's focus</h2>
          <div className="space-y-3">
            {FOCUS.map((f, i) => <FocusCard key={f.label} {...f} delay={0.25 + i * 0.05} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

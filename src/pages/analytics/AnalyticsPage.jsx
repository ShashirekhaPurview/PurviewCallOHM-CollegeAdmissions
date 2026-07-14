import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowDown,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Gauge,
  Phone,
  PhoneForwarded,
  Smile,
  User as UserIcon,
  XCircle,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Filter,
  HeartPulse,
  Info,
  Languages,
  ListChecks,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getConversation, getConversationAudio, listConversations } from '../../api/analytics/analyticsService'
import { getCurrentUser } from '../../api/auth/authService'
import { useTheme } from '../../hooks/useTheme'
import { listOrganizations } from '../../api/orgs/orgService'
import { getContact } from '../../api/contacts/contactService'

const OUTCOME_META = {
  SUCCESS: { label: 'Success', tone: 'green' },
  PARTIAL: { label: 'Partial', tone: 'amber' },
  FAILURE: { label: 'Failure', tone: 'red' },
}

const MOOD_META = {
  POSITIVE: { label: 'Positive', tone: 'green' },
  NEUTRAL: { label: 'Neutral', tone: 'slate' },
  CONFUSED: { label: 'Confused', tone: 'amber' },
  FRUSTRATED: { label: 'Frustrated', tone: 'red' },
  AGGRESSIVE: { label: 'Aggressive', tone: 'red' },
}

const PRIORITY_META = {
  LOW: { label: 'Low', tone: 'slate' },
  MEDIUM: { label: 'Medium', tone: 'blue' },
  HIGH: { label: 'High', tone: 'amber' },
  URGENT: { label: 'Urgent', tone: 'red' },
}

const STATUS_META = {
  complete: { label: 'Complete', tone: 'green' },
  processing: { label: 'Processing', tone: 'blue' },
  failed: { label: 'Failed', tone: 'red' },
}

const OUTCOME_OPTIONS = ['SUCCESS', 'PARTIAL', 'FAILURE']
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUS_OPTIONS = ['complete', 'processing', 'failed']

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(value) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  const totalSeconds = Math.max(0, Math.round(Number(value)))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getScoreValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function scoreTextClass(score) {
  if (score == null) return 'text-slate-400'
  if (score >= 8) return 'text-emerald-700'
  if (score >= 6) return 'text-sky-700'
  if (score >= 4) return 'text-amber-700'
  return 'text-rose-700'
}

function scoreBarClass(score) {
  if (score == null) return 'bg-slate-300'
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 6) return 'bg-sky-500'
  if (score >= 4) return 'bg-amber-500'
  return 'bg-rose-500'
}

function detailTitle(data, summary) {
  return data?.analysis?.call_summary_title
    || data?._enrichment?.call_overview?.call_summary_title
    || summary?.contact_name
    || 'Conversation review'
}

function Surface({ className = '', children, tint = 'white' }) {
  const bg = tint === 'soft'
    ? 'bg-[#f1f4fb]'
    : 'bg-white'

  return (
    <div className={`rounded-md ${bg} shadow-[0_16px_40px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  )
}

function Pill({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-rose-50 text-rose-700',
    blue: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  )
}

function MetaPill({ meta, fallback = '-' }) {
  if (!meta) return <span className="text-xs text-slate-400">{fallback}</span>
  return <Pill tone={meta.tone}>{meta.label}</Pill>
}

function SelectField({ value, onChange, placeholder, options }) {
  return (
    <div className="relative min-w-[150px]">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-md bg-white/90 px-4 pr-10 text-sm text-slate-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none transition focus:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

function InlineMetric({ label, value, icon: Icon, tone }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function ArticleSection({ title, icon: Icon, children }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon size={15} className="text-slate-400" />}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function GaugeRow({ label, score }) {
  const value = getScoreValue(score)
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / 10) * 100))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`text-xs font-semibold ${scoreTextClass(value)}`}>
          {value == null ? '-' : value.toFixed(1)}/10
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div className={`h-full rounded-full ${scoreBarClass(value)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SignalBadge({ label, value, good = false, bad = false }) {
  if (value == null) return null
  const positive = (good && value) || (bad && !value)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${positive
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-rose-50 text-rose-700'
      }`}
    >
      {value ? <Check size={11} /> : <X size={11} />}
      {label}
    </span>
  )
}

function ScoreRing({ score, size = 96 }) {
  const [theme] = useTheme()
  const value = getScoreValue(score)
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / 10) * 100))
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const color = value == null ? '#cbd5e1'
    : value >= 8 ? '#10b981'
      : value >= 6 ? '#0ea5e9'
        : value >= 4 ? '#f59e0b'
          : '#f43f5e'
  const trackColor = theme === 'dark' ? '#1E3128' : '#e2e8f0'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-900">
          {value == null ? '-' : value.toFixed(1)}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">/10</span>
      </div>
    </div>
  )
}

function HeroStat({ icon: Icon, label, value, accent = 'indigo' }) {
  const [theme] = useTheme()
  const light = {
    indigo:  { bg: 'rgba(238,242,255,1)',   ring: 'ring-indigo-100',  icon: 'text-indigo-600' },
    sky:     { bg: 'rgba(236,254,255,1)',   ring: 'ring-sky-100',     icon: 'text-sky-600' },
    emerald: { bg: 'rgba(236,253,245,1)',   ring: 'ring-emerald-100', icon: 'text-emerald-600' },
    amber:   { bg: 'rgba(255,251,235,1)',   ring: 'ring-amber-100',   icon: 'text-amber-600' },
    violet:  { bg: 'rgba(245,243,255,1)',   ring: 'ring-violet-100',  icon: 'text-violet-600' },
    rose:    { bg: 'rgba(255,241,242,1)',   ring: 'ring-rose-100',    icon: 'text-rose-600' },
  }
  const dark = {
    indigo:  { bg: 'rgba(99,102,241,0.10)',  ring: 'ring-indigo-100',  icon: 'text-indigo-400' },
    sky:     { bg: 'rgba(56,189,248,0.10)',  ring: 'ring-sky-100',     icon: 'text-sky-400' },
    emerald: { bg: 'rgba(52,211,153,0.10)',  ring: 'ring-emerald-100', icon: 'text-emerald-400' },
    amber:   { bg: 'rgba(245,158,11,0.10)',  ring: 'ring-amber-100',   icon: 'text-amber-400' },
    violet:  { bg: 'rgba(167,139,250,0.10)', ring: 'ring-violet-100',  icon: 'text-violet-400' },
    rose:    { bg: 'rgba(251,113,133,0.10)', ring: 'ring-rose-100',    icon: 'text-rose-400' },
  }
  const t = (theme === 'dark' ? dark : light)[accent] || (theme === 'dark' ? dark : light).indigo
  return (
    <div
      className={`flex items-center gap-3 rounded-md p-4 ring-1 ${t.ring}`}
      style={{ background: t.bg }}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm ${t.icon}`}
        style={{ background: theme === 'dark' ? 'rgba(0,0,0,0.25)' : '#ffffff' }}
      >
        {Icon && <Icon size={18} />}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{value || '-'}</p>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, accent = 'indigo' }) {
  const tones = {
    indigo:  { ring: 'ring-indigo-100',  iconBg: 'bg-indigo-50',  iconText: 'text-indigo-600',  glow: 'from-indigo-50/70' },
    emerald: { ring: 'ring-emerald-100', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', glow: 'from-emerald-50/70' },
    amber:   { ring: 'ring-amber-100',   iconBg: 'bg-amber-50',   iconText: 'text-amber-600',   glow: 'from-amber-50/70' },
    sky:     { ring: 'ring-sky-100',     iconBg: 'bg-sky-50',     iconText: 'text-sky-600',     glow: 'from-sky-50/70' },
    rose:    { ring: 'ring-rose-100',    iconBg: 'bg-rose-50',    iconText: 'text-rose-600',    glow: 'from-rose-50/70' },
    violet:  { ring: 'ring-violet-100',  iconBg: 'bg-violet-50',  iconText: 'text-violet-600',  glow: 'from-violet-50/70' },
  }
  const t = tones[accent] || tones.indigo
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ${t.ring}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${t.glow} to-transparent`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold leading-none tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-2 text-[11px] font-medium text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.iconBg} ${t.iconText}`}>
          {Icon && <Icon size={18} />}
        </div>
      </div>
    </div>
  )
}

function OutcomeDonut({ counts, total }) {
  const segments = [
    { key: 'SUCCESS', label: 'Success', value: counts.SUCCESS || 0, color: '#10b981' },
    { key: 'PARTIAL', label: 'Partial', value: counts.PARTIAL || 0, color: '#f59e0b' },
    { key: 'FAILURE', label: 'Failure', value: counts.FAILURE || 0, color: '#f43f5e' },
    { key: 'NONE',    label: 'Untagged', value: counts.NONE || 0, color: '#cbd5e1' },
  ].filter((s) => s.value > 0)

  const size = 150
  const stroke = 20
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const denom = total || 1
  let offset = 0

  const successPct = total ? Math.round(((counts.SUCCESS || 0) / total) * 100) : 0

  const [hovered, setHovered] = useState(null)
  const hoveredSeg = segments.find((s) => s.key === hovered)
  const hoveredPct = hoveredSeg && total ? Math.round((hoveredSeg.value / total) * 100) : 0

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 overflow-visible">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#f1f5f9" strokeWidth={stroke} fill="none" />
          {segments.map((s) => {
            const len = (s.value / denom) * c
            const dasharray = `${len} ${c - len}`
            const dashoffset = -offset
            offset += len
            const segPct = total ? Math.round((s.value / total) * 100) : 0
            const isHovered = hovered === s.key
            return (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={isHovered ? stroke + 3 : stroke}
                strokeLinecap="butt"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                fill="none"
                style={{ cursor: 'pointer', transition: 'stroke-width 120ms ease' }}
                onMouseEnter={() => setHovered(s.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${s.label}: ${s.value} call${s.value === 1 ? '' : 's'} (${segPct}%)`}</title>
              </circle>
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hoveredSeg ? (
            <>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: hoveredSeg.color }}>{hoveredSeg.label}</span>
              <span className="text-2xl font-bold text-slate-900">{hoveredPct}%</span>
              <span className="text-[10px] font-medium text-slate-400">{hoveredSeg.value} of {total}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Success</span>
              <span className="text-2xl font-bold text-slate-900">{successPct}%</span>
              <span className="text-[10px] font-medium text-slate-400">of {total}</span>
            </>
          )}
        </div>
      </div>
      <div className="w-full space-y-1.5">
        {segments.length === 0 ? (
          <p className="text-xs text-slate-400">No outcomes captured yet.</p>
        ) : (
          segments.map((s) => {
            const pct = total ? Math.round((s.value / total) * 100) : 0
            const isHovered = hovered === s.key
            return (
              <div
                key={s.key}
                className={`relative flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 transition ${isHovered ? 'bg-slate-50' : ''}`}
                onMouseEnter={() => setHovered(s.key)}
                onMouseLeave={() => setHovered(null)}
              >
                {isHovered && (
                  <div
                    className="pointer-events-none absolute left-2 z-20 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg"
                    style={{ bottom: 'calc(100% + 6px)' }}
                  >
                    <span style={{ color: s.color }}>{s.label}</span>
                    <span className="ml-1.5 text-slate-200">· {s.value} call{s.value === 1 ? '' : 's'}</span>
                    <span className="ml-1.5 text-slate-400">({pct}%)</span>
                  </div>
                )}
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-xs font-medium text-slate-600">{s.label}</span>
                <span className="text-xs font-semibold text-slate-900">{s.value}</span>
                <span className="w-9 text-right text-[10px] font-semibold text-slate-400">{pct}%</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const SCORE_BUCKET_NAMES = ['Poor', 'Fair', 'OK', 'Good', 'Great']

function ScoreHistogram({ buckets }) {
  const [hovered, setHovered] = useState(null)
  const max = Math.max(2, ...buckets.map((b) => b.count))
  const totalScored = buckets.reduce((sum, b) => sum + b.count, 0)
  const hoveredBucket = hovered != null ? buckets[hovered] : null
  const hoveredName = hovered != null ? SCORE_BUCKET_NAMES[hovered] : null
  const hoveredPct = hoveredBucket && totalScored ? Math.round((hoveredBucket.count / totalScored) * 100) : 0

  const yAxisTicks = [max, Math.round(max / 2), 0]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Calls by score (out of 10)
        </p>
        <p className="text-[10px] font-medium text-slate-400">{totalScored} scored</p>
      </div>

      <div className="relative flex gap-3">
        <div className="flex h-32 flex-col justify-between text-right text-[9px] font-semibold text-slate-300">
          {yAxisTicks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>

        <div className="relative flex-1">
          <div
            className="absolute inset-x-0 top-0 h-32"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, transparent calc(50% - 1px), #f1f5f9 calc(50% - 1px), #f1f5f9 50%, transparent 50%)',
            }}
          />
          <div className="relative flex h-32 items-end gap-2">
            {buckets.map((b, i) => {
              const pct = (b.count / max) * 100
              const isHovered = hovered === i
              return (
                <div
                  key={b.label}
                  className="relative flex h-full flex-1 cursor-pointer flex-col items-center"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  title={`${SCORE_BUCKET_NAMES[i]} (score ${b.label}): ${b.count} call${b.count === 1 ? '' : 's'}`}
                >
                  {isHovered && (
                    <div
                      className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg ${
                        i === 0 ? 'left-0' : i === buckets.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                      }`}
                      style={{ bottom: 'calc(100% + 6px)' }}
                    >
                      <span style={{ color: b.color }}>{SCORE_BUCKET_NAMES[i]}</span>
                      <span className="ml-1.5 text-slate-300">score {b.label}</span>
                      <span className="ml-1.5 text-slate-200">· {b.count} call{b.count === 1 ? '' : 's'}</span>
                      <span className="ml-1.5 text-slate-400">({hoveredPct}%)</span>
                    </div>
                  )}
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="relative w-full rounded-t-md transition-all"
                      style={{
                        height: `${pct}%`,
                        minHeight: b.count > 0 ? '6px' : '0',
                        background: `linear-gradient(180deg, ${b.color}, ${b.color}cc)`,
                        filter: isHovered ? 'brightness(1.08)' : 'none',
                        transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                        transformOrigin: 'bottom',
                        boxShadow: isHovered ? `0 0 0 2px ${b.color}33` : 'none',
                      }}
                    >
                      {b.count > 0 && (
                        <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-bold text-white drop-shadow">
                          {b.count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-2 pl-6">
        {buckets.map((b, i) => (
          <div
            key={`l-${b.label}`}
            className={`flex flex-1 flex-col items-center transition ${hovered === i ? 'opacity-100' : 'opacity-90'}`}
          >
            <span className={`text-[10px] font-semibold ${hovered === i ? 'text-slate-900' : 'text-slate-600'}`}>
              {SCORE_BUCKET_NAMES[i]}
            </span>
            <span className={`text-[9px] font-medium ${hovered === i ? 'text-slate-500' : 'text-slate-400'}`}>
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MoodBars({ entries, total }) {
  const [hovered, setHovered] = useState(null)
  if (!entries.length) return <p className="text-xs text-slate-400">No mood data yet.</p>
  const max = Math.max(1, ...entries.map((e) => e.count))
  return (
    <div className="space-y-3">
      {entries.map((e) => {
        const pct = (e.count / max) * 100
        const sharePct = total ? Math.round((e.count / total) * 100) : 0
        const isHovered = hovered === e.mood
        return (
          <div
            key={e.mood}
            className={`relative cursor-pointer rounded-md px-2 py-1 transition ${isHovered ? 'bg-slate-50' : ''}`}
            onMouseEnter={() => setHovered(e.mood)}
            onMouseLeave={() => setHovered(null)}
          >
            {isHovered && (
              <div
                className="pointer-events-none absolute left-2 z-20 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg"
                style={{ bottom: 'calc(100% + 6px)' }}
              >
                <span style={{ color: e.color }}>{e.label}</span>
                <span className="ml-1.5 text-slate-200">· {e.count} call{e.count === 1 ? '' : 's'}</span>
                <span className="ml-1.5 text-slate-400">({sharePct}%)</span>
              </div>
            )}
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className={`font-semibold transition ${isHovered ? 'text-slate-900' : 'text-slate-700'}`}>{e.label}</span>
              <span className={`font-medium transition ${isHovered ? 'text-slate-700' : 'text-slate-400'}`}>{e.count} · {sharePct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: e.color,
                  filter: isHovered ? 'brightness(1.1)' : 'none',
                  boxShadow: isHovered ? `0 0 0 2px ${e.color}33` : 'none',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VolumeSparkline({ points }) {
  if (!points.length) return null
  const max = Math.max(1, ...points.map((p) => p.count))
  const peak = points.reduce((acc, p) => (p.count > acc.count ? p : acc), points[0])
  return (
    <div>
      <div className="flex h-28 items-end gap-1.5">
        {points.map((p, idx) => {
          const pct = (p.count / max) * 100
          const isPeak = p.date === peak.date && p.count > 0
          return (
            <div key={`${p.date}-${idx}`} className="group relative flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md transition-all ${isPeak ? 'bg-indigo-500' : 'bg-indigo-200 group-hover:bg-indigo-300'}`}
                  style={{ height: `${pct}%`, minHeight: p.count > 0 ? '4px' : '0' }}
                  title={`${p.label}: ${p.count}`}
                />
              </div>
              <span className="text-[9px] font-medium text-slate-400">{p.short}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Peak: <span className="font-semibold text-slate-800">{peak.label}</span> with {peak.count} call{peak.count === 1 ? '' : 's'}
      </p>
    </div>
  )
}

function ChartCard({ title, subtitle, icon: Icon, children, action }) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><Icon size={14} /></span>}
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function IconMetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-100">
        {Icon && <Icon size={13} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value || '-'}</p>
      </div>
    </div>
  )
}

function SignalCheck({ label, value, good = false, bad = false }) {
  if (value == null) return null
  const positive = (good && value) || (bad && !value)
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ${positive
        ? 'bg-emerald-50/60 text-emerald-700 ring-emerald-100'
        : 'bg-rose-50/60 text-rose-700 ring-rose-100'
      }`}>
      {positive
        ? <CheckCircle2 size={14} className="shrink-0" />
        : <XCircle size={14} className="shrink-0" />}
      <span className="truncate text-xs font-semibold">{label}</span>
    </div>
  )
}

function ActionItemCard({ task, owner, due }) {
  return (
    <div className="group relative overflow-hidden rounded-md bg-white p-4 ring-1 ring-slate-100 transition hover:ring-indigo-200">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-400" />
      <div className="flex items-start gap-3 pl-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <CheckCircle2 size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{task || 'Action item'}</p>
          {(owner || due) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {owner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
                  <UserIcon size={10} /> {owner}
                </span>
              )}
              {due && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                  <Clock size={10} /> {String(due).replace(/_/g, ' ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TranscriptBubble({ turn }) {
  const isAgent = turn.role === 'agent'
  return (
    <div className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isAgent
          ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
          : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700'
        }`}>
        {isAgent ? <Bot size={16} /> : <UserIcon size={16} />}
      </span>
      <div className={`max-w-[75%] ${isAgent ? '' : 'text-right'}`}>
        <div className={`mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 ${isAgent ? '' : 'justify-end'
          }`}>
          <span>{turn.role || 'Unknown'}</span>
          {turn.time_in_call_secs != null && <span>{formatDuration(turn.time_in_call_secs)}</span>}
          {turn.interrupted && <span className="text-amber-600">Interrupted</span>}
        </div>
        <div className={`inline-block rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ring-1 ${isAgent
            ? 'rounded-tl-sm bg-indigo-50 text-slate-800 ring-indigo-100'
            : 'rounded-tr-sm bg-white text-slate-800 ring-slate-100'
          }`}>
          {turn.message}
        </div>
      </div>
    </div>
  )
}

function PlayingAudio({ src, bars }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  return (
    <div className="mt-5 space-y-4">
      <div className="flex h-20 items-end gap-[3px]">
        {bars.map((height, index) => (
          <div
            key={index}
            className={`flex-1 rounded-full bg-gradient-to-t transition-all duration-300 ${playing
                ? 'from-indigo-500 via-sky-500 to-violet-300 audio-bar'
                : 'from-slate-300 via-slate-200 to-slate-100'
              }`}
            style={
              playing
                ? {
                  height: `${height}%`,
                  animationDelay: `${(index % 12) * 80}ms`,
                }
                : { height: `${height}%` }
            }
          />
        ))}
      </div>
      <audio
        ref={audioRef}
        src={src}
        controls
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="w-full"
      />
    </div>
  )
}

function OrgPicker({ value, onChange, orgs, loading }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onClick(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const selected = orgs.find((org) => org.org_id === value)
  const filtered = query
    ? orgs.filter((org) => (org.name || org.org_id).toLowerCase().includes(query.toLowerCase()))
    : orgs

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`group flex h-11 min-w-[220px] items-center gap-2 rounded-md border bg-white px-3 text-left text-xs font-semibold shadow-sm transition ${open
            ? 'border-indigo-300 ring-2 ring-indigo-100'
            : 'border-slate-200 hover:border-slate-300'
          }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
          <Building2 size={14} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Organization
          </span>
          <span className="truncate text-sm font-semibold text-slate-800">
            {loading
              ? 'Loading…'
              : selected
                ? (selected.name || selected.org_id)
                : (orgs.length ? 'Select organization' : 'No organizations')}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition ${open ? 'rotate-180 text-indigo-500' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[300px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.12)]">
          <div className="border-b border-slate-100 p-2">
            <div className="flex h-9 items-center gap-2 rounded-md bg-slate-50 px-3">
              <Search size={14} className="text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search organizations"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {loading ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                No organizations match
              </div>
            ) : (
              filtered.map((org) => {
                const active = org.org_id === value
                return (
                  <button
                    key={org.org_id}
                    type="button"
                    onClick={() => {
                      onChange(org.org_id)
                      setOpen(false)
                      setQuery('')
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${active ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                      }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${active
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                      }`}>
                      {(org.name || org.org_id).slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate text-sm font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'
                        }`}>
                        {org.name || org.org_id}
                      </span>
                      <span className="truncate font-mono text-[10px] text-slate-400">
                        {org.org_id}
                      </span>
                    </span>
                    {active && <Check size={14} className="text-indigo-500" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SentimentChart({ points }) {
  const [theme] = useTheme()
  const width = 720
  const height = 240
  const padX = 40
  const padTop = 24
  const padBottom = 48

  const data = points.map((p, i) => {
    const v = getScoreValue(p.score)
    return {
      score: v == null ? 0 : v,
      hasScore: v != null,
      mood: p.mood || 'Unknown',
      label: p.quartile || `Q${i + 1}`,
    }
  })

  const n = data.length
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const xAt = (i) => padX + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const yAt = (s) => padTop + innerH - (s / 10) * innerH

  const coords = data.map((d, i) => ({ x: xAt(i), y: yAt(d.score), ...d }))

  // Smooth Catmull-Rom -> Bezier path
  const linePath = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    const prev = arr[i - 1]
    const cpx = (prev.x + pt.x) / 2
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${pt.y}, ${pt.x} ${pt.y}`
  }, '')

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padTop + innerH} L ${coords[0].x} ${padTop + innerH} Z`

  const moodColor = (mood) => {
    const m = (mood || '').toUpperCase()
    if (m === 'POSITIVE') return '#10b981'
    if (m === 'NEGATIVE') return '#f43f5e'
    if (m === 'NEUTRAL') return '#6366f1'
    return '#94a3b8'
  }

  return (
    <div
      className="overflow-hidden rounded-md p-4 ring-1 ring-slate-100"
      style={{ background: theme === 'dark' ? 'var(--surface)' : undefined }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sentArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sentLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>

        {[0, 2.5, 5, 7.5, 10].map((g) => (
          <line
            key={g}
            x1={padX}
            x2={width - padX}
            y1={yAt(g)}
            y2={yAt(g)}
            stroke="#e2e8f0"
            strokeDasharray="3 4"
            strokeWidth="1"
          />
        ))}

        <path d={areaPath} fill="url(#sentArea)" />
        <path d={linePath} fill="none" stroke="url(#sentLine)" strokeWidth="2.5" strokeLinecap="round" />

        {coords.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="9" fill={moodColor(pt.mood)} fillOpacity="0.18" />
            <circle cx={pt.x} cy={pt.y} r="4.5" fill="#fff" stroke={moodColor(pt.mood)} strokeWidth="2.5" />
            <text
              x={pt.x}
              y={pt.y - 14}
              textAnchor="middle"
              className="fill-slate-700"
              fontSize="11"
              fontWeight="600"
            >
              {pt.hasScore ? pt.score.toFixed(1) : '-'}
            </text>
            <text
              x={pt.x}
              y={height - padBottom + 18}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="10"
              fontWeight="700"
              letterSpacing="1.5"
            >
              {pt.label.toUpperCase()}
            </text>
            <text
              x={pt.x}
              y={height - padBottom + 32}
              textAnchor="middle"
              fill={moodColor(pt.mood)}
              fontSize="10"
              fontWeight="600"
            >
              {pt.mood}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="h-[680px] animate-pulse rounded-md bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]" />
      <div className="h-[520px] animate-pulse rounded-md bg-[#f1f4fb]" />
    </div>
  )
}

function ConversationDetail({ conversationId, summary, orgId, fallbackOrgIds = [], onBack }) {
  const [theme] = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioError, setAudioError] = useState('')
  const [callProfile, setCallProfile] = useState(null)

  useEffect(() => {
    const main = document.querySelector('main')
    if (main) main.scrollTop = 0
    window.scrollTo({ top: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
  }, [conversationId])

  useEffect(() => {
    let cancelled = false
    let createdUrl = ''
    setAudioUrl('')
    setAudioError('')

    if (data?.has_audio) {
      getConversationAudio(conversationId)
        .then((blob) => {
          if (cancelled) return
          createdUrl = URL.createObjectURL(blob)
          setAudioUrl(createdUrl)
        })
        .catch((err) => {
          if (!cancelled) setAudioError(err.message || 'Audio unavailable')
        })
    }

    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [conversationId, data?.has_audio])

  useEffect(() => {
    let cancelled = false

    const candidates = []
    if (orgId) candidates.push(orgId)
    for (const id of fallbackOrgIds) {
      if (id && !candidates.includes(id)) candidates.push(id)
    }

    if (candidates.length === 0) {
      setLoading(true)
      setError('')
      return () => { cancelled = true }
    }

    async function fetchConversation() {
      setLoading(true)
      setError('')

      let lastErr = null
      for (const candidateOrgId of candidates) {
        try {
          const response = await getConversation(conversationId, { orgId: candidateOrgId })
          if (cancelled) return
          setData(response)
          setLoading(false)
          return
        } catch (err) {
          lastErr = err
          if (err?.status !== 403 && err?.status !== 404) break
        }
      }

      if (!cancelled) {
        setError(lastErr?.message || 'Failed to load conversation details.')
        setLoading(false)
      }
    }

    fetchConversation()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, orgId, fallbackOrgIds.join(',')])

  useEffect(() => {
    let cancelled = false
    const contactId = data?.contact_id || summary?.contact_id
    if (!contactId) { setCallProfile(null); return }
    getContact(contactId)
      .then((c) => { if (!cancelled) setCallProfile(c?.call_profile || null) })
      .catch(() => { if (!cancelled) setCallProfile(null) })
    return () => { cancelled = true }
  }, [data?.contact_id, summary?.contact_id])

  const enrichment = data?._enrichment || {}
  const overview = enrichment.call_overview || {}
  const scores = enrichment.scores || {}
  const outcome = enrichment.business_outcome || {}
  const performance = enrichment.agent_performance || {}
  const profiling = enrichment.user_profiling || {}
  const actions = enrichment.post_call_actions || {}
  const dynamics = enrichment.conversation_dynamics || {}
  const sentiment = enrichment.sentiment_over_time || []
  const transcript = data?.transcript || []
  const metadata = data?.metadata || {}
  const phone = metadata.phone_call || data?.phone_call || {}

  const durationValue = metadata.call_duration_secs ?? data?.call_duration_secs ?? summary?.call_duration_secs
  const summaryText = overview.call_summary || data?.analysis?.transcript_summary || summary?.call_summary || 'Summary not available.'
  const moodValue = profiling.dominant_mood || summary?.dominant_mood
  const priorityValue = actions.priority_level || summary?.priority_level
  const processedAt = data?.processed_at || summary?.processed_at
  const language = overview.language_detected || summary?.language_detected
  const callDate = metadata.start_time_unix_secs ? metadata.start_time_unix_secs * 1000 : processedAt

  const waveformBars = useMemo(
    () => Array.from({ length: 80 }, (_, index) => {
      const seed = (conversationId.length * 11) + (index * 13)
      return Math.round(18 + (Math.abs(Math.sin(seed)) * 58))
    }),
    [conversationId],
  )

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(conversationId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            Back to conversations
          </button>
          <h1 className="mt-4 max-w-3xl text-2xl font-bold tracking-tight text-gray-900">
            {detailTitle(data, summary)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="font-mono text-xs">{conversationId}</span>
            <button
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:text-slate-900"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy ID'}
            </button>
          </div>
        </div>

        <Link
          to="/app/analytics"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-slate-900"
        >
          <Sparkles size={14} />
          Open analytics
        </Link>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <Surface className="p-5 text-sm text-rose-700" tint="soft">
          {error}
        </Surface>
      ) : (
        <div className="space-y-6">
          <Surface className="overflow-hidden">
            <div
              className="relative overflow-hidden px-8 py-8"
              style={{
                background: theme === 'dark'
                  ? 'radial-gradient(circle at top right, rgba(79,70,229,0.12) 0%, rgba(99,102,241,0.05) 40%, var(--bg) 72%)'
                  : 'linear-gradient(135deg,#ffffff 0%,#f7f8fc 58%,#edf1ff 100%)',
              }}
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
              <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-violet-200/20 blur-3xl" />

              <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div>
                  <p className="max-w-2xl text-[15px] leading-7 text-slate-700">{summaryText}</p>
                </div>

                <div className="flex justify-center lg:justify-end">
                  <div
                    className="flex flex-col items-center gap-2 rounded-lg px-6 py-4 ring-1 ring-slate-100"
                    style={{ background: theme === 'dark' ? 'var(--surface)' : 'rgba(255,255,255,0.80)' }}
                  >
                    <ScoreRing score={scores.overall_call_score ?? summary?.overall_call_score} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Overall</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <HeroStat icon={Clock} label="Duration" value={formatDuration(durationValue)} accent="indigo" />
                <HeroStat icon={Smile} label="Mood" value={MOOD_META[moodValue]?.label || moodValue || '-'} accent="emerald" />
                <HeroStat icon={Languages} label="Language" value={language ? String(language).toUpperCase() : '-'} accent="sky" />
                <HeroStat
                  icon={phone.direction === 'outbound' ? ArrowUp : phone.direction === 'inbound' ? ArrowDown : Phone}
                  label="Caller"
                  value={phone.external_number || data?.user_id || '-'}
                  accent="violet"
                />
              </div>

              <div
                className="relative mt-6 rounded-lg p-5 ring-1 ring-slate-100"
                style={{
                  background: theme === 'dark' ? 'var(--surface)' : 'rgba(255,255,255,0.85)',
                  backdropFilter: theme === 'dark' ? 'none' : 'blur(12px)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                      <PhoneCall size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Call recording</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {data?.has_audio
                          ? (audioUrl ? 'Press play to listen' : audioError || 'Loading audio…')
                          : 'No audio captured for this conversation.'}
                      </p>
                    </div>
                  </div>
                  {!data?.has_audio && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                      Audio unavailable
                    </span>
                  )}
                </div>

                {data?.has_audio ? (
                  audioUrl ? (
                    <PlayingAudio src={audioUrl} bars={waveformBars} />
                  ) : audioError ? (
                    <p className="mt-5 text-xs text-rose-600">{audioError}</p>
                  ) : (
                    <div className="mt-5 flex h-20 items-end gap-[3px]">
                      {waveformBars.map((height, index) => (
                        <div
                          key={`${conversationId}-${index}`}
                          className="flex-1 animate-pulse rounded-full bg-gradient-to-t from-indigo-200 via-sky-200 to-violet-100"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="mt-5 flex h-20 items-end gap-[3px]">
                    {waveformBars.map((height, index) => (
                      <div
                        key={`${conversationId}-${index}`}
                        className="flex-1 rounded-full bg-gradient-to-t from-slate-200 via-slate-200 to-slate-100"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-8">
              <div className="flex flex-wrap gap-5 border-b border-slate-100">
                {[
                  { id: 'overview', label: 'Overview', icon: TrendingUp },
                  { id: 'callprofile', label: 'Call profile', icon: Sparkles },
                  { id: 'transcript', label: `Transcript (${transcript.length})`, icon: MessageSquare },
                  { id: 'metadata', label: 'Call metadata', icon: Info },
                  { id: 'profile', label: 'User profile', icon: UserCheck },
                  { id: 'postcall', label: `Post-call actions (${actions.action_items?.length || 0})`, icon: HeartPulse },
                ].map((tab) => {
                  const active = tab.id === activeTab
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-1 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${active
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                      {Icon && <Icon size={11} />}
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-10 px-8 py-8">
              {activeTab === 'overview' && (
                <>
                  {sentiment.length > 0 && (
                    <ArticleSection title="Sentiment over time" icon={TrendingUp}>
                      <SentimentChart points={sentiment} />
                    </ArticleSection>
                  )}

                  {Object.keys(outcome).length > 0 && (
                    <ArticleSection title="Business outcome" icon={ListChecks}>
                      <div className="flex flex-wrap items-center gap-2">
                        <MetaPill meta={OUTCOME_META[outcome.status]} />
                        {outcome.barrier_to_success && <Pill tone="amber">Barrier: {outcome.barrier_to_success}</Pill>}
                      </div>
                      {outcome.reason && (
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">{outcome.reason}</p>
                      )}
                    </ArticleSection>
                  )}

                  {(Object.keys(scores).length > 0 || Object.keys(performance).length > 0) && (
                    <ArticleSection title="Scorecard & agent performance" icon={Shield}>
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-md bg-slate-50 px-5 py-5">
                          <p className="text-sm font-semibold text-slate-900">Scorecard</p>
                          <div className="mt-5 space-y-4">
                            <GaugeRow label="Overall score" score={scores.overall_call_score ?? summary?.overall_call_score} />
                            <GaugeRow label="Agent score" score={scores.agent_score} />
                            <GaugeRow label="User score" score={scores.user_score} />
                          </div>
                          {scores.score_rationale && (
                            <p className="mt-4 text-xs leading-6 text-slate-500">{scores.score_rationale}</p>
                          )}
                        </div>

                        <div className="rounded-md bg-slate-50 px-5 py-5">
                          <p className="text-sm font-semibold text-slate-900">Agent performance</p>
                          <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <GaugeRow label="Prompt compliance" score={performance.prompt_compliance_score} />
                            <GaugeRow label="Empathy" score={performance.empathy_score} />
                            <GaugeRow label="Listening" score={performance.listening_score} />
                            <GaugeRow label="Clarity" score={performance.clarity_score} />
                          </div>
                          <div className="mt-5 flex flex-wrap gap-2">
                            <SignalBadge label="Disclaimer read" value={performance.disclaimer_read} good />
                            <SignalBadge label="Identity verified" value={performance.identity_verification} good />
                            <SignalBadge label="Hallucination" value={performance.hallucination_detected} bad />
                            <SignalBadge label="Forced interruption" value={performance.forced_interruption} bad />
                            <SignalBadge label="Infinite loop" value={performance.infinite_loop} bad />
                          </div>
                        </div>
                      </div>
                    </ArticleSection>
                  )}

                  {Object.keys(dynamics).length > 0 && (
                    <ArticleSection title="Conversation dynamics" icon={Activity}>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {[
                          { label: 'Total turns', value: dynamics.total_turns ?? '-', accent: 'indigo', icon: MessageSquare },
                          { label: 'Interrupted', value: dynamics.interrupted_turns ?? 0, accent: 'amber', icon: Activity },
                          { label: 'Avg LLM TTFB', value: dynamics.avg_llm_ttfb_ms == null ? '-' : `${Math.round(dynamics.avg_llm_ttfb_ms)} ms`, accent: 'violet', icon: Gauge },
                          { label: 'Avg TTS TTFB', value: dynamics.avg_tts_ttfb_ms == null ? '-' : `${Math.round(dynamics.avg_tts_ttfb_ms)} ms`, accent: 'sky', icon: Gauge },
                          { label: 'Avg ASR latency', value: dynamics.avg_asr_latency_ms == null ? '-' : `${Math.round(dynamics.avg_asr_latency_ms)} ms`, accent: 'emerald', icon: Gauge },
                        ].map((tile) => (
                          <HeroStat key={tile.label} {...tile} />
                        ))}
                      </div>
                    </ArticleSection>
                  )}
                </>
              )}

              {activeTab === 'transcript' && (
                <ArticleSection title={`Transcript (${transcript.length} turns)`} icon={MessageSquare}>
                  {transcript.length === 0 ? (
                    <p className="text-sm text-slate-500">No transcript was attached to this conversation.</p>
                  ) : (
                    <div
                      className="space-y-4 rounded-lg p-5 ring-1 ring-slate-100"
                      style={{ background: theme === 'dark' ? 'var(--surface)' : undefined }}
                    >
                      {transcript
                        .filter((turn) => turn.message && String(turn.message).trim())
                        .map((turn, index) => (
                          <TranscriptBubble key={`${turn.role || 'turn'}-${index}`} turn={turn} />
                        ))}
                    </div>
                  )}
                </ArticleSection>
              )}

              {activeTab === 'metadata' && (
                <ArticleSection title="Call metadata" icon={Info}>
                  <div
                    className="grid gap-4 rounded-lg p-6 ring-1 ring-slate-100 sm:grid-cols-2"
                    style={{ background: theme === 'dark' ? 'var(--surface)' : undefined }}
                  >
                    <IconMetaRow icon={Calendar} label="Call date" value={formatDate(callDate)} />
                    <IconMetaRow icon={Clock} label="Processed" value={formatDateTime(processedAt)} />
                    <IconMetaRow icon={Activity} label="Duration" value={formatDuration(durationValue)} />
                    <IconMetaRow
                      icon={phone.direction === 'outbound' ? ArrowUp : phone.direction === 'inbound' ? ArrowDown : Phone}
                      label="Direction"
                      value={phone.direction ? phone.direction.charAt(0).toUpperCase() + phone.direction.slice(1) : '-'}
                    />
                    <IconMetaRow icon={Phone} label="External number" value={phone.external_number} />
                    <IconMetaRow icon={Bot} label="Agent number" value={phone.agent_number || phone.to} />
                    <IconMetaRow icon={Languages} label="Language" value={language ? String(language).toUpperCase() : null} />
                  </div>
                </ArticleSection>
              )}

              {activeTab === 'profile' && (
                <ArticleSection title="User profile" icon={UserCheck}>
                  <div className="space-y-4">
                    <div
                      className="flex items-center justify-between rounded-lg bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 px-6 py-5 ring-1 ring-violet-100"
                      style={{ background: theme === 'dark' ? 'rgba(99,102,241,0.1)' : undefined }}
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Dominant mood</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {MOOD_META[moodValue]?.label || moodValue || 'Unknown'}
                        </p>
                      </div>
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                        <Smile size={26} className="text-violet-500" />
                      </span>
                    </div>

                    {profiling.skepticism_level && (
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                        <span className="text-xs font-semibold text-slate-500">Skepticism</span>
                        <span className="text-sm font-bold text-slate-800">{profiling.skepticism_level}</span>
                      </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-3">
                      <SignalCheck label="Not confused" value={profiling.confusion_detected} bad />
                      <SignalCheck label="Calm tone" value={profiling.aggression_detected} bad />
                      <SignalCheck label="No escalation" value={profiling.escalation_requested} bad />
                    </div>

                    {profiling.objections_raised?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Objections raised</p>
                        <ul className="mt-2 space-y-1.5">
                          {profiling.objections_raised.map((item, index) => (
                            <li key={`${item}-${index}`} className="rounded-md bg-rose-50/70 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </ArticleSection>
              )}

              {activeTab === 'callprofile' && (
                <ArticleSection title="Call profile" icon={Sparkles}>
                  {!callProfile ? (
                    <p className="text-sm text-slate-500">No call profile captured for this contact.</p>
                  ) : (
                    <div
                      className="space-y-4 rounded-lg p-6 ring-1 ring-slate-100"
                      style={{ background: theme === 'dark' ? 'var(--surface)' : undefined }}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Interested</span>
                        <span className="font-semibold text-slate-900">{callProfile.interested ? 'Yes' : 'No'}</span>
                      </div>
                      {callProfile.lost_reason && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Lost reason</span>
                          <span className="font-semibold text-slate-900">{callProfile.lost_reason}</span>
                        </div>
                      )}
                      {callProfile.interested_programs?.length > 0 && (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Programs interested</p>
                          <div className="flex flex-wrap gap-1.5">
                            {callProfile.interested_programs.map((p) => (
                              <span key={p} className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{p}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {callProfile.exam_scores?.length > 0 && (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Exam scores</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {callProfile.exam_scores.map((e, idx) => (
                              <div key={idx} className="rounded-md bg-slate-50 p-3 text-xs ring-1 ring-slate-100">
                                <p className="mb-2 font-semibold text-slate-800">{e.exam}</p>
                                <div className="flex gap-4 text-slate-500">
                                  <div>Score: <span className="font-semibold text-slate-700">{e.score}</span></div>
                                  <div>Rank: <span className="font-semibold text-slate-700">{e.rank}</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ArticleSection>
              )}

              {activeTab === 'postcall' && (
                <ArticleSection title="Post-call actions" icon={HeartPulse}>
                  <div className="space-y-6">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <SignalCheck label="Callback requested" value={actions.callback_requested} good />
                      <SignalCheck label="Transfer attempted" value={actions.transfer_attempted} good />
                      <SignalCheck label="Transfer succeeded" value={actions.transfer_succeeded} good />
                    </div>

                    {actions.callback_time_utc && (
                      <div
                        className="rounded-lg bg-gradient-to-br from-amber-50 to-white px-5 py-4 ring-1 ring-amber-100"
                        style={{ background: theme === 'dark' ? 'rgba(245,158,11,0.08)' : undefined }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">Callback Requested At</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{formatDateTime(actions.callback_time_utc)}</p>
                      </div>
                    )}

                    {actions.unresolved_issues?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Unresolved issues</p>
                        <ul className="mt-2 space-y-1.5">
                          {actions.unresolved_issues.map((item, index) => (
                            <li key={`${item}-${index}`} className="rounded-md bg-rose-50/70 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Action items ({actions.action_items?.length || 0})
                      </p>
                      {!actions.action_items?.length ? (
                        <p className="mt-2 text-sm text-slate-500">No action items captured for this conversation.</p>
                      ) : (
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          {actions.action_items.map((item, index) => {
                            const task = typeof item === 'string' ? item : item.task
                            const owner = typeof item === 'string' ? '' : item.owner
                            const due = typeof item === 'string' ? '' : item.due
                            return (
                              <ActionItemCard
                                key={`${task || 'task'}-${index}`}
                                task={task}
                                owner={owner}
                                due={due}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </ArticleSection>
              )}
            </div>
          </Surface>
        </div>
      )}
    </div>
  )
}

/* ─────────── conversation export columns ─────────── */

function fmtIST(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(d)
}

const CONV_EXPORT_COLUMNS = [
  { key: 'contact_name',       label: 'Candidate',           checked: true,  extract: (c) => c.contact_name || '-' },
  { key: 'contact_email',      label: 'Email',               checked: true,  extract: (c) => c.contact_email || '-' },
  { key: 'contact_phone_number', label: 'Phone',             checked: true,  extract: (c) => c.contact_phone_number || '-' },
  { key: 'contact_id',         label: 'Contact ID',          checked: false, extract: (c) => c.contact_id || '-' },
  { key: 'status',             label: 'Status',              checked: true,  extract: (c) => (c.status || '-').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()) },
  { key: 'business_outcome',   label: 'Outcome',             checked: true,  extract: (c) => c.business_outcome || '-' },
  { key: 'dominant_mood',      label: 'Mood',                checked: true,  extract: (c) => c.dominant_mood || '-' },
  { key: 'overall_call_score', label: 'Score',               checked: true,  extract: (c) => c.overall_call_score ?? '-' },
  { key: 'call_duration_secs', label: 'Duration (sec)',       checked: true,  extract: (c) => c.call_duration_secs ?? '-' },
  { key: 'call_summary',       label: 'Call Summary',        checked: false, extract: (c) => c.call_summary || '-' },
  { key: 'processed_at',       label: 'Processed At',        checked: true,  extract: (c) => formatDateTime(c.processed_at) },
  { key: 'callback_requested', label: 'Callback Requested',  checked: false, extract: (c) => c.callback_requested ? 'Yes' : 'No' },
  { key: 'callback_time_utc',  label: 'Callback Time (IST)', checked: false, extract: (c) => fmtIST(c.callback_time_utc) },
]

export default function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState('')

  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  /* ── export state ── */
  const [exportOpen, setExportOpen] = useState(false)
  const [exportCols, setExportCols] = useState(() => CONV_EXPORT_COLUMNS.map((c) => ({ ...c })))

  const currentUser = useMemo(() => getCurrentUser(), [])
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const [orgFilter, setOrgFilter] = useState('')
  const [orgs, setOrgs] = useState([])

  useEffect(() => {
    if (!isSuperAdmin) return
    let cancelled = false
    listOrganizations({ limit: 100 })
      .then((res) => {
        if (cancelled) return
        const list = res.items ?? []
        setOrgs(list)
        setOrgFilter((current) => current || list[0]?.org_id || '')
      })
      .catch(() => { if (!cancelled) setOrgs([]) })
    return () => { cancelled = true }
  }, [isSuperAdmin])

  const effectiveOrgId = isSuperAdmin ? (orgFilter || undefined) : (currentUser?.org_id || undefined)

  const selectedConversationId = searchParams.get('conversation')

  const queryArgs = useMemo(() => ({
    businessOutcome: outcomeFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    search: searchTerm || undefined,
    orgId: effectiveOrgId,
    limit: 20,
  }), [
    fromDate,
    outcomeFilter,
    searchTerm,
    toDate,
    effectiveOrgId,
  ])

  const load = useCallback(async () => {
    if (isSuperAdmin && !effectiveOrgId) {
      setItems([])
      setNextCursor(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await listConversations(queryArgs)
      setItems(response.items ?? [])
      setNextCursor(response.next_cursor ?? null)
    } catch (err) {
      setError(err.message || 'Failed to load conversations.')
      setItems([])
      setNextCursor(null)
    } finally {
      setLoading(false)
    }
  }, [queryArgs, isSuperAdmin, effectiveOrgId])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const response = await listConversations({ ...queryArgs, startAfter: nextCursor })
      setItems((current) => [...current, ...(response.items ?? [])])
      setNextCursor(response.next_cursor ?? null)
    } catch (err) {
      setError(err.message || 'Failed to load more conversations.')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    async function fetchList() {
      await load()
    }

    fetchList()
  }, [load])

  const selectedSummary = useMemo(() => {
    if (!selectedConversationId) return null
    return items.find((item) => item.conversation_id === selectedConversationId) || {
      conversation_id: selectedConversationId,
    }
  }, [items, selectedConversationId])

  const stats = useMemo(() => {
    const total = items.length
    const success = items.filter((item) => item.business_outcome === 'SUCCESS').length
    const highPriority = items.filter((item) => item.priority_level === 'HIGH' || item.priority_level === 'URGENT').length
    const callbacks = items.filter((item) => item.callback_requested).length
    const scores = items.map((item) => getScoreValue(item.overall_call_score)).filter((value) => value != null)
    const averageScore = scores.length
      ? (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1)
      : '-'
    const averageDuration = total
      ? Math.round(items.reduce((sum, item) => sum + (item.call_duration_secs || 0), 0) / total)
      : null

    const outcomeCounts = { SUCCESS: 0, PARTIAL: 0, FAILURE: 0, NONE: 0 }
    for (const item of items) {
      const k = item.business_outcome
      if (k === 'SUCCESS' || k === 'PARTIAL' || k === 'FAILURE') outcomeCounts[k] += 1
      else outcomeCounts.NONE += 1
    }

    const bucketDefs = [
      { label: '0–2', min: 0, max: 2, color: '#f43f5e' },
      { label: '2–4', min: 2, max: 4, color: '#fb7185' },
      { label: '4–6', min: 4, max: 6, color: '#f59e0b' },
      { label: '6–8', min: 6, max: 8, color: '#0ea5e9' },
      { label: '8–10', min: 8, max: 10.0001, color: '#10b981' },
    ]
    const scoreBuckets = bucketDefs.map((b) => ({
      ...b,
      count: scores.filter((s) => s >= b.min && s < b.max).length,
    }))

    const moodColorMap = {
      POSITIVE: '#10b981',
      NEUTRAL: '#94a3b8',
      CONFUSED: '#f59e0b',
      FRUSTRATED: '#f43f5e',
      AGGRESSIVE: '#dc2626',
    }
    const moodCounts = {}
    for (const item of items) {
      const m = item.dominant_mood
      if (!m) continue
      moodCounts[m] = (moodCounts[m] || 0) + 1
    }
    const moodBreakdown = Object.entries(moodCounts)
      .map(([mood, count]) => ({
        mood,
        count,
        label: MOOD_META[mood]?.label || mood,
        color: moodColorMap[mood] || '#94a3b8',
      }))
      .sort((a, b) => b.count - a.count)

    const dayCount = 7
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const series = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (dayCount - 1 - i))
      return {
        key: d.toISOString().slice(0, 10),
        date: d,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        short: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1),
        count: 0,
      }
    })
    const indexByKey = Object.fromEntries(series.map((p, i) => [p.key, i]))
    for (const item of items) {
      if (!item.processed_at) continue
      const d = new Date(item.processed_at)
      if (Number.isNaN(d.getTime())) continue
      const k = d.toISOString().slice(0, 10)
      if (k in indexByKey) series[indexByKey[k]].count += 1
    }

    return {
      total,
      success,
      successRate: total ? Math.round((success / total) * 100) : 0,
      averageScore,
      averageDuration,
      highPriority,
      callbacks,
      outcomeCounts,
      scoreBuckets,
      moodBreakdown,
      daySeries: series,
    }
  }, [items])

  async function handleCopyId(event, conversationId) {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(conversationId)
      setCopiedId(conversationId)
      window.setTimeout(() => setCopiedId(''), 1400)
    } catch {
      setCopiedId('')
    }
  }

  function openConversation(conversationId) {
    setSearchParams({ conversation: conversationId })
  }

  function clearConversation() {
    setSearchParams({})
  }

  function clearFilters() {
    setSearchInput('')
    setSearchTerm('')
    setOutcomeFilter('')
    setFromDate('')
    setToDate('')
  }

  /* ── export helpers ── */
  function toggleExportCol(key) {
    setExportCols((prev) => prev.map((c) => c.key === key ? { ...c, checked: !c.checked } : c))
  }
  function selectAllExportCols() {
    setExportCols((prev) => prev.map((c) => ({ ...c, checked: true })))
  }
  function deselectAllExportCols() {
    setExportCols((prev) => prev.map((c) => ({ ...c, checked: false })))
  }
  function handleExport() {
    const activeCols = exportCols.filter((c) => c.checked)
    if (activeCols.length === 0) return
    const rows = items.map((item) => {
      const row = {}
      activeCols.forEach((col) => { row[col.label] = col.extract(item) })
      return row
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = activeCols.map((col) => ({ wch: Math.max(col.label.length + 2, 18) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Conversations')
    XLSX.writeFile(wb, `conversations_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setExportOpen(false)
  }

  return (
    <div className="min-h-full bg-[#f6f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {selectedSummary ? (
          <ConversationDetail
            key={selectedSummary.conversation_id}
            conversationId={selectedSummary.conversation_id}
            summary={selectedSummary}
            orgId={selectedSummary.org_id || effectiveOrgId}
            fallbackOrgIds={isSuperAdmin ? orgs.map((o) => o.org_id).filter(Boolean) : []}
            onBack={clearConversation}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    setSearchTerm(searchInput.trim())
                  }}
                  className="flex h-11 w-full max-w-md items-center gap-2 rounded-md bg-white px-3 shadow-sm border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100"
                >
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search summaries and conversation text"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('')
                        setSearchTerm('')
                      }}
                      className="text-slate-400 transition hover:text-slate-700"
                    >
                      <X size={14} />
                    </button>
                  )}
                </form>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex h-11 w-11 items-center justify-center rounded-md border shadow-sm transition ${showFilters || outcomeFilter || fromDate || toDate
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  <Filter size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isSuperAdmin && (
                  <OrgPicker
                    value={orgFilter}
                    onChange={setOrgFilter}
                    orgs={orgs}
                    loading={orgs.length === 0}
                  />
                )}
                <Link
                  to="/app/analytics"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm border border-slate-200 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <Sparkles size={14} />
                  Analytics
                </Link>
                <button
                  onClick={load}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm border border-slate-200 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {showFilters && (
              <Surface className="px-6 py-5 sm:px-8">
                <div className="flex flex-wrap gap-3">
                  <SelectField value={outcomeFilter} onChange={setOutcomeFilter} placeholder="All outcomes" options={OUTCOME_OPTIONS} />
                  <div className="min-w-[150px]">
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="min-w-[150px]">
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  {(outcomeFilter || fromDate || toDate) && (
                    <button
                      onClick={clearFilters}
                      className="h-11 rounded-md px-4 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </Surface>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard
                icon={MessageSquare}
                accent="indigo"
                label="Total calls"
                value={stats.total}
                sub={searchTerm ? `Search: "${searchTerm}"` : 'In current view'}
              />
              <KpiCard
                icon={TrendingUp}
                accent="emerald"
                label="Success rate"
                value={`${stats.successRate}%`}
                sub={`${stats.success} of ${stats.total}`}
              />
              <KpiCard
                icon={Sparkles}
                accent="amber"
                label="Average score"
                value={stats.averageScore}
                sub="Out of 10"
              />
              <KpiCard
                icon={Clock}
                accent="sky"
                label="Avg duration"
                value={formatDuration(stats.averageDuration)}
                sub="Per call"
              />
              <KpiCard
                icon={PhoneForwarded}
                accent="rose"
                label="Callbacks"
                value={stats.callbacks}
                sub={`${stats.highPriority} high priority`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard
                title="Outcome breakdown"
                subtitle="How calls are landing"
                icon={ListChecks}
              >
                <OutcomeDonut counts={stats.outcomeCounts} total={stats.total} />
              </ChartCard>

              <ChartCard
                title="Score distribution"
                subtitle="Overall call score buckets"
                icon={Gauge}
              >
                <ScoreHistogram buckets={stats.scoreBuckets} />
              </ChartCard>

              <ChartCard
                title="Caller mood"
                subtitle="Dominant mood across calls"
                icon={Smile}
              >
                <MoodBars entries={stats.moodBreakdown} total={stats.total} />
              </ChartCard>
            </div>

            {error && (
              <Surface className="p-5 text-sm text-rose-700" tint="soft">
                {error}
              </Surface>
            )}

            <Surface className="overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 sm:px-8">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Recent conversations</p>
                  <p className="mt-1 text-xs text-slate-500">Open any row to inspect the complete report, signals, and transcript.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-400">{items.length} visible</span>
                  <button
                    onClick={() => setExportOpen(true)}
                    disabled={items.length === 0}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={14} />
                    Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-6 py-3 sm:px-8">Candidate</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Phone</th>
                      <th className="px-6 py-3">Processed</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Outcome</th>
                      <th className="px-6 py-3">Mood</th>
                      <th className="px-6 py-3">Callback</th>
                      <th className="px-6 py-3">Callback Time</th>
                      <th className="px-6 py-3 text-right sm:px-8">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <tr key={`loading-${index}`}>
                          <td className="px-6 py-5 sm:px-8"><div className="h-4 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-4 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-4 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-4 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-4 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-4 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-6 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-6 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-4 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-4 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5 sm:px-8"><div className="ml-auto h-9 w-24 animate-pulse rounded-full bg-slate-100" /></td>
                        </tr>
                      ))
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-20 text-center sm:px-8">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100">
                            <PhoneCall size={20} className="text-slate-400" />
                          </div>
                          <p className="mt-4 text-base font-semibold text-slate-900">No conversations match this view</p>
                          <p className="mt-1 text-sm text-slate-500">Try widening the date range or clearing filters.</p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const score = getScoreValue(item.overall_call_score)

                        return (
                          <tr
                            key={item.conversation_id}
                            onClick={() => openConversation(item.conversation_id)}
                            className="cursor-pointer transition hover:bg-slate-50/70"
                          >
                            <td className="px-6 py-5 align-top sm:px-8">
                              <div className="max-w-xs">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {item.contact_name || 'Unknown candidate'}
                                </p>
                                {item.contact_id && (
                                  <div className="mt-0.5 flex items-center gap-1.5">
                                    <span className="truncate font-mono text-[11px] text-slate-400" title={item.contact_id}>
                                      {item.contact_id}
                                    </span>
                                    <button
                                      onClick={(event) => handleCopyId(event, item.contact_id)}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                      title="Copy contact ID"
                                    >
                                      {copiedId === item.contact_id
                                        ? <Check size={12} className="text-emerald-600" />
                                        : <Copy size={12} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 align-top text-xs text-slate-500 whitespace-nowrap">
                              {item.contact_email || '-'}
                            </td>
                            <td className="px-6 py-5 align-top font-mono text-xs text-slate-600 whitespace-nowrap">
                              {item.contact_phone_number || '-'}
                            </td>
                            <td className="px-6 py-5 align-top text-xs text-slate-500">
                              {formatDateTime(item.processed_at)}
                            </td>
                            <td className="px-6 py-5 align-top font-mono text-xs text-slate-600">
                              {formatDuration(item.call_duration_secs)}
                            </td>
                            <td className="px-6 py-5 align-top">
                              <span className={`inline-flex items-center gap-1.5 font-semibold ${scoreTextClass(score)}`}>
                                <Star size={12} />
                                {score == null ? '-' : score.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-5 align-top">
                              <MetaPill meta={OUTCOME_META[item.business_outcome]} />
                            </td>
                            <td className="px-6 py-5 align-top">
                              <MetaPill meta={MOOD_META[item.dominant_mood]} />
                            </td>
                            <td className="px-6 py-5 align-top">
                              {item.callback_requested ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                                  <PhoneForwarded size={11} /> Yes
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">No</span>
                              )}
                            </td>
                            <td className="px-6 py-5 align-top text-xs text-slate-500 whitespace-nowrap">
                              {item.callback_time_utc ? fmtIST(item.callback_time_utc) : '-'}
                            </td>
                            <td className="px-6 py-5 text-right align-top sm:px-8">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openConversation(item.conversation_id)
                                }}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                              >
                                View
                                <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {(nextCursor || loadingMore) && !loading && (
                <div className="flex items-center justify-between px-6 py-5 sm:px-8">
                  <span className="text-xs text-slate-500">
                    Showing {items.length} conversation{items.length === 1 ? '' : 's'}
                  </span>
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-60"
                  >
                    {loadingMore ? <RefreshCw size={14} className="animate-spin" /> : null}
                    {loadingMore ? 'Loading' : 'Load more'}
                  </button>
                </div>
              )}
            </Surface>

            {/* Export columns modal */}
            {exportOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                  onClick={() => setExportOpen(false)}
                />
                <div
                  className="relative w-full max-w-xl rounded-2xl bg-white"
                  style={{ boxShadow: '0 25px 60px rgba(15,23,42,0.16), 0 0 0 1px rgba(148,163,184,0.1)' }}
                >
                  {/* Header */}
                  <div
                    className="relative overflow-hidden rounded-t-2xl px-5 pt-5 pb-4"
                    style={{ background: 'linear-gradient(135deg, #f8faff 0%, #eef1ff 50%, #f0f4ff 100%)' }}
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-300/20 blur-2xl" />
                    <div className="pointer-events-none absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-violet-300/15 blur-2xl" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-indigo-100">
                          <Download size={17} className="text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Export to Excel</h3>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            <span className="font-semibold text-indigo-600">{items.length}</span> conversations
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setExportOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-slate-400 shadow-sm ring-1 ring-slate-200/60 transition hover:bg-white hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">Select columns</p>
                      <div className="flex items-center gap-1">
                        <button onClick={selectAllExportCols} className="rounded-md px-2 py-1 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-50">Select all</button>
                        <span className="text-slate-200">·</span>
                        <button onClick={deselectAllExportCols} className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">Clear</button>
                      </div>
                    </div>

                    {/* 3-column grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {exportCols.map((col) => {
                        const active = col.checked
                        return (
                          <label
                            key={col.key}
                            className={`group flex cursor-pointer items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-xs transition-all duration-150 ${
                              active
                                ? 'border-indigo-400/50 bg-gradient-to-r from-indigo-50/80 to-violet-50/40 text-indigo-900'
                                : 'border-transparent bg-slate-50/80 text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
                            }`}
                          >
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all duration-150 ${
                              active
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-slate-300 bg-white group-hover:border-slate-400'
                            }`}>
                              {active && <Check size={10} className="text-white" strokeWidth={3} />}
                            </div>
                            <input type="checkbox" checked={col.checked} onChange={() => toggleExportCol(col.key)} className="sr-only" />
                            <span className="font-semibold truncate">{col.label}</span>
                          </label>
                        )
                      })}
                    </div>

                    {/* Summary */}
                    <div
                      className="flex items-center justify-between rounded-lg px-4 py-2.5"
                      style={{ background: 'linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%)', border: '1px solid rgba(148,163,184,0.12)' }}
                    >
                      <p className="text-[11px] text-slate-500">
                        <span className="text-xs font-bold text-indigo-600">{exportCols.filter((c) => c.checked).length}</span>
                        <span className="text-slate-400"> / {exportCols.length} columns</span>
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">{items.length} rows</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setExportOpen(false)}
                        className="flex-1 rounded-lg border-2 border-slate-200 py-2.5 text-xs font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={exportCols.filter((c) => c.checked).length === 0}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition hover:shadow-indigo-500/30 disabled:opacity-40 disabled:shadow-none"
                        style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)' }}
                      >
                        <Download size={13} />
                        Download .xlsx
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

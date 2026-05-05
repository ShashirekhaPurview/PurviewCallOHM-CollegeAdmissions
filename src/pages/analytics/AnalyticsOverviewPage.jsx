import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { getAgentAnalytics } from '../../api/analytics/analyticsService'
import { getCurrentUser } from '../../api/auth/authService'
import { listOrganizations } from '../../api/orgs/orgService'

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today', title: 'Today', days: 1 },
  { value: '7d', label: 'Past 7 days', title: 'Past 7 days', days: 7 },
  { value: '30d', label: '1 month', title: 'Last 30 days', days: 30 },
  { value: 'all', label: 'All time', title: 'All time', days: null },
  { value: 'custom', label: 'Custom dates', title: 'Custom date range', days: null },
]

const OUTCOME_STYLES = {
  SUCCESS: { label: 'Success', tone: 'green', bar: 'bg-emerald-500' },
  PARTIAL: { label: 'Partial', tone: 'amber', bar: 'bg-amber-500' },
  FAILURE: { label: 'Failure', tone: 'red', bar: 'bg-rose-500' },
}

const PRIORITY_STYLES = {
  LOW: { label: 'Low', tone: 'slate', bar: 'bg-slate-400' },
  MEDIUM: { label: 'Medium', tone: 'blue', bar: 'bg-sky-500' },
  HIGH: { label: 'High', tone: 'amber', bar: 'bg-amber-500' },
  URGENT: { label: 'Urgent', tone: 'red', bar: 'bg-rose-500' },
}

const MOOD_STYLES = {
  POSITIVE: { label: 'Positive', tone: 'green', bar: 'bg-emerald-500' },
  NEUTRAL: { label: 'Neutral', tone: 'slate', bar: 'bg-slate-400' },
  CONFUSED: { label: 'Confused', tone: 'amber', bar: 'bg-amber-500' },
  FRUSTRATED: { label: 'Frustrated', tone: 'red', bar: 'bg-rose-500' },
  AGGRESSIVE: { label: 'Aggressive', tone: 'red', bar: 'bg-rose-500' },
}

const SKEPTICISM_STYLES = {
  LOW: { label: 'Low', tone: 'green', bar: 'bg-emerald-500' },
  MEDIUM: { label: 'Medium', tone: 'amber', bar: 'bg-amber-500' },
  HIGH: { label: 'High', tone: 'red', bar: 'bg-rose-500' },
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

function formatDuration(value) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  const totalSeconds = Math.max(0, Math.round(Number(value)))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

function formatMs(value) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return `${Math.round(Number(value))} ms`
}

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return `${Math.round(Number(value))}%`
}

function getRangeMeta(range) {
  return RANGE_OPTIONS.find((option) => option.value === range) || RANGE_OPTIONS[2]
}

function toDateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function getRangeFilters(range, customRange = {}) {
  const meta = getRangeMeta(range)
  const today = startOfDay(new Date())

  if (range === 'all') {
    return { meta, fromDate: undefined, toDate: undefined }
  }

  if (range === 'custom') {
    const fallbackTo = today
    const fallbackFrom = new Date(today)
    fallbackFrom.setDate(today.getDate() - 29)

    const rawFrom = customRange.fromDate ? startOfDay(new Date(customRange.fromDate)) : fallbackFrom
    const rawTo = customRange.toDate ? startOfDay(new Date(customRange.toDate)) : fallbackTo
    const from = rawFrom.getTime() <= rawTo.getTime() ? rawFrom : rawTo
    const to = rawFrom.getTime() <= rawTo.getTime() ? rawTo : rawFrom

    return {
      meta: { ...meta, title: `${formatDate(from)} - ${formatDate(to)}` },
      fromDate: from.toISOString(),
      toDate: endOfDay(to).toISOString(),
    }
  }

  const to = today
  const from = new Date(to)
  from.setDate(to.getDate() - (meta.days - 1))

  return {
    meta,
    fromDate: from.toISOString(),
    toDate: endOfDay(to).toISOString(),
  }
}

function distributionEntries(dist, styles = {}) {
  if (!dist) return []
  return Object.entries(dist)
    .map(([value, payload]) => ({
      value,
      count: payload?.count ?? 0,
      pct: payload?.pct ?? 0,
      style: styles[value] || { label: value, tone: 'slate', bar: 'bg-slate-400' },
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
}

function Surface({ className = '', children, tint = 'white' }) {
  const bg = tint === 'soft' ? 'bg-[#f1f4fb]' : 'bg-white'
  return (
    <div className={`rounded-xl ${bg} shadow-[0_16px_40px_rgba(15,23,42,0.06)] ${className}`}>
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

function MetricCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function DistributionList({ items, emptyLabel = 'No data available yet.' }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>
  }

  const maxCount = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.value}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Pill tone={item.style?.tone || 'slate'}>
              {item.style?.label || item.value}
            </Pill>
            <span className="text-xs font-semibold text-slate-600">
              {item.count} · {item.pct}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className={`h-full rounded-full ${item.style?.bar || 'bg-slate-400'}`}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DistributionTabs({ tabs }) {
  const [active, setActive] = useState(tabs[0]?.id)
  const current = tabs.find((tab) => tab.id === active) || tabs[0]

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-5 border-b border-slate-100">
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`-mb-px border-b-2 px-1 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                isActive
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-slate-400">{tab.count}</span>
            </button>
          )
        })}
      </div>
      <DistributionList items={current.items} emptyLabel={current.emptyLabel} />
    </div>
  )
}

function GaugeRow({ label, score, max = 10 }) {
  const value = score == null || Number.isNaN(Number(score)) ? null : Number(score)
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  const tone = value == null
    ? 'bg-slate-300'
    : value >= 8 ? 'bg-emerald-500'
    : value >= 6 ? 'bg-sky-500'
    : value >= 4 ? 'bg-amber-500'
    : 'bg-rose-500'
  const text = value == null
    ? 'text-slate-400'
    : value >= 8 ? 'text-emerald-700'
    : value >= 6 ? 'text-sky-700'
    : value >= 4 ? 'text-amber-700'
    : 'text-rose-700'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`text-xs font-semibold ${text}`}>
          {value == null ? '-' : `${value.toFixed(1)} / ${max}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SentimentChart({ points }) {
  if (!points.length) {
    return <p className="text-sm text-slate-500">No sentiment data captured yet.</p>
  }

  const maxScore = 10
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {points.map((point) => {
        const score = Number(point.avg_score) || 0
        const pct = Math.max(0, Math.min(100, (score / maxScore) * 100))
        const topMood = Object.entries(point.mood_distribution || {})
          .sort(([, a], [, b]) => (b?.count ?? 0) - (a?.count ?? 0))[0]
        const moodLabel = topMood ? MOOD_STYLES[topMood[0]]?.label || topMood[0] : 'No data'

        return (
          <div key={point.label} className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {point.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {score ? score.toFixed(1) : '-'}
            </p>
            <p className="mt-1 text-xs text-slate-500">{moodLabel}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-violet-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BooleanRateRow({ label, pct, good = false }) {
  if (pct == null) return null
  const value = Number(pct)
  const positive = good ? value >= 50 : value < 25
  const negative = good ? value < 25 : value >= 50
  const tone = positive ? 'bg-emerald-500' : negative ? 'bg-rose-500' : 'bg-amber-500'
  const text = positive ? 'text-emerald-700' : negative ? 'text-rose-700' : 'text-amber-700'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`text-xs font-semibold ${text}`}>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-64 animate-pulse rounded-[32px] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]" />
      <div className="h-[440px] animate-pulse rounded-[32px] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]" />
      <div className="h-[560px] animate-pulse rounded-[32px] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]" />
    </div>
  )
}

function EmptyState({ onRefresh }) {
  return (
    <Surface className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100">
        <BarChart3 size={20} className="text-slate-400" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">No analytics yet in this range</h2>
      <p className="mt-1 text-sm text-slate-500">Try widening the reporting window or refresh once new conversations are processed.</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onRefresh}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
        >
          Refresh data
        </button>
        <Link
          to="/app/conversations"
          className="rounded-md bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          Open conversations
        </Link>
      </div>
    </Surface>
  )
}

export default function AnalyticsPage() {
  const currentUser = useMemo(() => getCurrentUser(), [])
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const [range, setRange] = useState('30d')
  const [customFromDate, setCustomFromDate] = useState(() => {
    const today = startOfDay(new Date())
    const from = new Date(today)
    from.setDate(today.getDate() - 29)
    return toDateInputValue(from)
  })
  const [customToDate, setCustomToDate] = useState(() => toDateInputValue(startOfDay(new Date())))
  const [orgFilter, setOrgFilter] = useState('') // '' = All orgs (super_admin only)
  const [orgs, setOrgs] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [copiedId, setCopiedId] = useState('')
  const requestIdRef = useRef(0)

  const rangeFilters = useMemo(() => (
    getRangeFilters(range, { fromDate: customFromDate, toDate: customToDate })
  ), [customFromDate, customToDate, range])

  // Load org list for super_admin dropdown
  useEffect(() => {
    if (!isSuperAdmin) return
    let cancelled = false

    async function fetchOrgs() {
      try {
        const response = await listOrganizations({ limit: 100 })
        if (!cancelled) setOrgs(response.items ?? [])
      } catch {
        if (!cancelled) setOrgs([])
      }
    }

    fetchOrgs()
    return () => { cancelled = true }
  }, [isSuperAdmin])

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError('')

    try {
      const { fromDate, toDate } = rangeFilters
      const response = await getAgentAnalytics({
        orgId: isSuperAdmin ? (orgFilter || undefined) : (currentUser?.org_id || undefined),
        fromDate,
        toDate,
      })

      if (requestId !== requestIdRef.current) return
      setReport(response)
      setLastUpdated(new Date())
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err.message || 'Failed to load analytics.')
      setReport(null)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [rangeFilters, isSuperAdmin, orgFilter, currentUser?.org_id])

  useEffect(() => {
    async function fetchAnalytics() {
      await load()
    }

    fetchAnalytics()
  }, [load])

  const analytics = report?.analytics
  const totalConversations = report?.total_conversations ?? 0

  const outcomeDistribution = useMemo(
    () => distributionEntries(analytics?.distributions?.business_outcome, OUTCOME_STYLES),
    [analytics],
  )
  const moodDistribution = useMemo(
    () => distributionEntries(analytics?.distributions?.dominant_mood, MOOD_STYLES),
    [analytics],
  )
  const priorityDistribution = useMemo(
    () => distributionEntries(analytics?.distributions?.priority_level, PRIORITY_STYLES),
    [analytics],
  )
  const skepticismDistribution = useMemo(
    () => distributionEntries(analytics?.distributions?.skepticism_level, SKEPTICISM_STYLES),
    [analytics],
  )
  const languageDistribution = useMemo(
    () => distributionEntries(analytics?.distributions?.language).slice(0, 5),
    [analytics],
  )
  const callEndDistribution = useMemo(
    () => distributionEntries(analytics?.distributions?.call_end_reason),
    [analytics],
  )

  const sentimentPoints = useMemo(() => {
    const sot = analytics?.sentiment_over_time
    if (!sot) return []
    return Object.entries(sot).map(([label, payload]) => ({
      label,
      avg_score: payload?.avg_score,
      mood_distribution: payload?.mood_distribution || {},
    }))
  }, [analytics])

  const successPct = analytics?.distributions?.business_outcome?.SUCCESS?.pct ?? 0
  const avgScore = analytics?.scores?.avg_overall
  const avgDuration = analytics?.latency?.avg_call_duration_secs
  const booleanRates = analytics?.boolean_rates || {}
  const performance = analytics?.agent_performance || {}
  const latency = analytics?.latency || {}

  const actionsTable = report?.post_call_actions_table ?? []
  const actionDeskRows = useMemo(() => actionsTable
    .filter((row) => (
      row.priority_level === 'HIGH'
      || row.priority_level === 'URGENT'
      || (row.unresolved_issues?.length ?? 0) > 0
      || row.callback_requested
    ))
    .slice(0, 5), [actionsTable])

  async function handleCopyId(conversationId) {
    try {
      await navigator.clipboard.writeText(conversationId)
      setCopiedId(conversationId)
      window.setTimeout(() => setCopiedId(''), 1400)
    } catch {
      setCopiedId('')
    }
  }

  const orgLabel = isSuperAdmin
    ? (orgFilter ? (orgs.find((o) => o.org_id === orgFilter)?.name || orgFilter) : 'All organizations')
    : null

  return (
    <div className="min-h-full bg-[#f6f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <div className="relative min-w-[200px]">
                <select
                  value={orgFilter}
                  onChange={(event) => setOrgFilter(event.target.value)}
                  className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All organizations</option>
                  {orgs.map((org) => (
                    <option key={org.org_id} value={org.org_id}>{org.name}</option>
                  ))}
                </select>
                <Building2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            )}

            <div className="relative min-w-[170px]">
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/app/conversations"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <MessageSquare size={14} />
              Conversations
            </Link>
            <button
              onClick={load}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {range === 'custom' && (
          <Surface className="px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[170px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  From
                </label>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(event) => setCustomFromDate(event.target.value)}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="min-w-[170px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  To
                </label>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(event) => setCustomToDate(event.target.value)}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </Surface>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Pill tone="slate">{rangeFilters.meta.title}</Pill>
          {orgLabel && <Pill tone="violet">{orgLabel}</Pill>}
          {lastUpdated && <Pill tone="slate">Updated {formatDateTime(lastUpdated)}</Pill>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Conversations" value={totalConversations} icon={MessageSquare} tone="bg-indigo-50 text-indigo-600" />
          <MetricCard label="Success rate" value={formatPct(successPct)} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
          <MetricCard label="Average score" value={avgScore == null ? '-' : Number(avgScore).toFixed(1)} icon={Sparkles} tone="bg-amber-50 text-amber-600" />
          <MetricCard label="Average duration" value={formatDuration(avgDuration)} icon={Clock} tone="bg-sky-50 text-sky-600" />
        </div>

        {error && (
          <Surface className="p-5 text-sm text-rose-700" tint="soft">
            {error}
          </Surface>
        )}

        {loading ? (
          <LoadingState />
        ) : !report || totalConversations === 0 ? (
          <EmptyState onRefresh={load} />
        ) : (
          <>
            <Surface className="p-8">
              <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_340px]">
                <div>
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-slate-900">Sentiment over time</p>
                    <p className="mt-1 text-sm text-slate-500">Quartile-by-quartile sentiment scoring across the call lifecycle.</p>
                  </div>
                  <SentimentChart points={sentimentPoints} />

                  <div className="mt-10">
                    <p className="text-sm font-semibold text-slate-900">Agent performance</p>
                    <p className="mt-1 text-sm text-slate-500">Aggregate agent quality scores out of 10.</p>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <GaugeRow label="Compliance" score={performance.avg_compliance} />
                      <GaugeRow label="Empathy" score={performance.avg_empathy} />
                      <GaugeRow label="Listening" score={performance.avg_listening} />
                      <GaugeRow label="Clarity" score={performance.avg_clarity} />
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] bg-[#f7f8fc] px-6 py-6">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-900">Scorecard</p>
                    <p className="mt-1 text-sm text-slate-500">Aggregate scores for the selected window.</p>
                  </div>

                  <div className="space-y-4">
                    <GaugeRow label="Overall score" score={analytics?.scores?.avg_overall} />
                    <GaugeRow label="Agent score" score={analytics?.scores?.avg_agent} />
                    <GaugeRow label="User score" score={analytics?.scores?.avg_user} />
                  </div>

                  <div className="mt-8">
                    <p className="text-sm font-semibold text-slate-900">Latency</p>
                    <p className="mt-1 text-sm text-slate-500">Average response timing across the conversations.</p>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">LLM TTFB</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{formatMs(latency.avg_llm_ttfb_ms)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">TTS TTFB</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{formatMs(latency.avg_tts_ttfb_ms)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">ASR latency</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{formatMs(latency.avg_asr_latency_ms)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Avg duration</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{formatDuration(latency.avg_call_duration_secs)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </Surface>

            <Surface className="p-8">
              <div className="flex flex-col gap-10 xl:flex-row">
                <div className="min-w-0 xl:flex-1">
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-slate-900">Patterns</p>
                    <p className="mt-1 text-sm text-slate-500">Browse the current range by outcome, mood, priority, or skepticism.</p>
                  </div>

                  <DistributionTabs
                    tabs={[
                      { id: 'outcome', label: 'Outcomes', count: outcomeDistribution.length, items: outcomeDistribution },
                      { id: 'mood', label: 'Mood', count: moodDistribution.length, items: moodDistribution, emptyLabel: 'No mood signals captured yet.' },
                      { id: 'priority', label: 'Priority', count: priorityDistribution.length, items: priorityDistribution, emptyLabel: 'No priority data available yet.' },
                      { id: 'skepticism', label: 'Skepticism', count: skepticismDistribution.length, items: skepticismDistribution, emptyLabel: 'No skepticism signals yet.' },
                      { id: 'callend', label: 'Call end', count: callEndDistribution.length, items: callEndDistribution, emptyLabel: 'No call-end reasons yet.' },
                    ]}
                  />
                </div>

                <div className="xl:w-[320px]">
                  <div className="rounded-[28px] bg-[#f7f8fc] px-6 py-6">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Language coverage</p>
                      <p className="mt-1 text-sm text-slate-500">Top detected languages in this range.</p>
                    </div>
                    <div className="mt-5">
                      <DistributionList items={languageDistribution} emptyLabel="Language tags have not been captured yet." />
                    </div>

                    <div className="mt-8">
                      <p className="text-sm font-semibold text-slate-900">Behaviour signals</p>
                      <p className="mt-1 text-sm text-slate-500">How often agent or call signals are firing.</p>
                    </div>
                    <div className="mt-5 space-y-4">
                      <BooleanRateRow label="Identity check" pct={booleanRates.identity_check_rate_pct} good />
                      <BooleanRateRow label="Disclaimer read" pct={booleanRates.disclaimer_read_rate_pct} good />
                      <BooleanRateRow label="Callback requested" pct={booleanRates.callback_request_rate_pct} good />
                      <BooleanRateRow label="Hallucination" pct={booleanRates.hallucination_rate_pct} />
                      <BooleanRateRow label="Forced interruption" pct={booleanRates.forced_interruption_rate_pct} />
                      <BooleanRateRow label="Infinite loop" pct={booleanRates.infinite_loop_rate_pct} />
                      <BooleanRateRow label="Escalation" pct={booleanRates.escalation_rate_pct} />
                      <BooleanRateRow label="Transfer attempted" pct={booleanRates.transfer_attempt_rate_pct} />
                      <BooleanRateRow label="Transfer succeeded" pct={booleanRates.transfer_success_rate_pct} good />
                    </div>
                  </div>
                </div>
              </div>
            </Surface>

            <Surface className="overflow-hidden">
              <div className="px-6 py-8 sm:px-8">
                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Executive action desk</p>
                    <p className="mt-1 text-sm text-slate-500">Calls flagged for follow-up, callback or with unresolved issues.</p>
                  </div>
                  <Link
                    to="/app/conversations"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
                  >
                    Open conversations
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {actionDeskRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No action-heavy calls were identified in this range.</p>
                ) : (
                  <div className="space-y-4">
                    {actionDeskRows.map((row) => (
                      <div key={row.conversation_id} className="rounded-[24px] bg-[#f7f8fc] px-5 py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <Pill tone={PRIORITY_STYLES[row.priority_level]?.tone || 'slate'}>
                                {PRIORITY_STYLES[row.priority_level]?.label || row.priority_level || 'Review'}
                              </Pill>
                              {row.callback_requested && <Pill tone="blue">Callback requested</Pill>}
                              {row.transfer_attempted && (
                                <Pill tone={row.transfer_succeeded ? 'green' : 'amber'}>
                                  {row.transfer_succeeded ? 'Transferred' : 'Transfer attempted'}
                                </Pill>
                              )}
                            </div>
                            {row.action_items?.length > 0 && (
                              <ul className="mt-3 space-y-1 text-sm leading-7 text-slate-700">
                                {row.action_items.map((item, index) => {
                                  const task = typeof item === 'string' ? item : item.task
                                  return (
                                    <li key={`${row.conversation_id}-${index}`} className="list-inside list-disc">
                                      {task}
                                    </li>
                                  )
                                })}
                              </ul>
                            )}
                            {row.unresolved_issues?.length > 0 && (
                              <p className="mt-2 text-xs text-rose-600">
                                Unresolved: {row.unresolved_issues.join(', ')}
                              </p>
                            )}
                            {row.callback_time_utc && (
                              <p className="mt-2 text-xs text-slate-500">
                                Callback at <span className="font-semibold text-slate-700">{formatDateTime(row.callback_time_utc)}</span>
                              </p>
                            )}
                          </div>

                          <Link
                            to={`/app/conversations?conversation=${row.conversation_id}`}
                            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            Review call
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 px-6 py-8 sm:px-8">
                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Post-call actions</p>
                    <p className="mt-1 text-sm text-slate-500">Operator-facing follow-up tasks for each processed call.</p>
                  </div>
                  <Link
                    to="/app/conversations"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
                  >
                    View all
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Processed</th>
                        <th className="px-4 py-3">Conversation ID</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Callback</th>
                        <th className="px-4 py-3">Transfer</th>
                        <th className="px-4 py-3">Action items</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {actionsTable.slice(0, 12).map((row) => (
                        <tr key={row.conversation_id} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-4 text-xs text-slate-500">
                            {formatDateTime(row.processed_at)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="max-w-[180px] truncate font-mono text-[11px] text-slate-500">
                                {row.conversation_id}
                              </span>
                              <button
                                onClick={() => handleCopyId(row.conversation_id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:text-slate-700"
                                title="Copy conversation ID"
                              >
                                {copiedId === row.conversation_id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Pill tone={PRIORITY_STYLES[row.priority_level]?.tone || 'slate'}>
                              {PRIORITY_STYLES[row.priority_level]?.label || row.priority_level || '-'}
                            </Pill>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-600">
                            {row.callback_requested
                              ? (row.callback_time_utc ? formatDateTime(row.callback_time_utc) : 'Yes')
                              : '-'}
                          </td>
                          <td className="px-4 py-4">
                            {row.transfer_attempted ? (
                              <Pill tone={row.transfer_succeeded ? 'green' : 'amber'}>
                                {row.transfer_succeeded ? 'Succeeded' : 'Attempted'}
                              </Pill>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-600">
                            {row.action_items?.length || 0}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Link
                              to={`/app/conversations?conversation=${row.conversation_id}`}
                              className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                            >
                              Review
                              <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {actionsTable.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                            No post-call actions in this range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Surface>
          </>
        )}
      </div>
    </div>
  )
}

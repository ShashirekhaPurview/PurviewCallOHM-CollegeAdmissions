import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
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
import { getConversation, listConversations } from '../../api/analytics/analyticsService'

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
    || summary?.agent_name
    || 'Conversation review'
}

function Surface({ className = '', children, tint = 'white' }) {
  const bg = tint === 'soft'
    ? 'bg-[#f1f4fb]'
    : 'bg-white'

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

function SideSection({ title, icon: Icon, children }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon size={15} className="text-slate-500" />}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
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

function MetaRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs font-medium text-slate-700">{value || '-'}</span>
    </div>
  )
}

function SignalBadge({ label, value, good = false, bad = false }) {
  if (value == null) return null
  const positive = (good && value) || (bad && !value)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
      positive
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-rose-50 text-rose-700'
    }`}
    >
      {value ? <Check size={11} /> : <X size={11} />}
      {label}
    </span>
  )
}

function SentimentChart({ points }) {
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
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-100">
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
      <div className="h-[680px] animate-pulse rounded-xl bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]" />
      <div className="h-[520px] animate-pulse rounded-xl bg-[#f1f4fb]" />
    </div>
  )
}

function ConversationDetail({ conversationId, summary, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchConversation() {
      setLoading(true)
      setError('')

      try {
        const response = await getConversation(conversationId)
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load conversation details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchConversation()

    return () => {
      cancelled = true
    }
  }, [conversationId])

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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Surface className="overflow-hidden">
            <div className="bg-[linear-gradient(135deg,#ffffff_0%,#f7f8fc_58%,#edf1ff_100%)] px-8 py-8">
              <p className="max-w-3xl text-base leading-8 text-slate-700">{summaryText}</p>

              <div className="mt-6 rounded-xl bg-white/80 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Call recording overview</p>
                    <p className="mt-1 text-xs text-slate-500">Playback styling is preserved here, but this workspace still does not expose the recording stream.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    Audio unavailable
                  </span>
                </div>

                <div className="mt-5 flex h-20 items-end gap-[3px]">
                  {waveformBars.map((height, index) => (
                    <div
                      key={`${conversationId}-${index}`}
                      className="flex-1 rounded-full bg-gradient-to-t from-indigo-500 via-sky-500 to-violet-300"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {language && <Pill tone="blue"><Languages size={11} /> {String(language).toUpperCase()}</Pill>}
                  {durationValue != null && <Pill tone="slate"><Clock size={11} /> {formatDuration(durationValue)}</Pill>}
                  {processedAt && <Pill tone="slate">{formatDateTime(processedAt)}</Pill>}
                  {phone.external_number && (
                    <Pill tone="slate">
                      {phone.direction === 'outbound' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {phone.external_number}
                    </Pill>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8">
              <div className="flex flex-wrap gap-5 border-b border-slate-100">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'transcript', label: `Transcript (${transcript.length})` },
                ].map((tab) => {
                  const active = tab.id === activeTab
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`-mb-px border-b-2 px-1 py-4 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                        active
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-10 px-8 py-8">
              {activeTab === 'overview' ? (
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
                        <div className="rounded-xl bg-slate-50 px-5 py-5">
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

                        <div className="rounded-xl bg-slate-50 px-5 py-5">
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
                      <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Total turns</dt>
                          <dd className="mt-2 text-sm font-semibold text-slate-900">{dynamics.total_turns ?? '-'}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Interrupted turns</dt>
                          <dd className="mt-2 text-sm font-semibold text-slate-900">{dynamics.interrupted_turns ?? 0}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Avg LLM TTFB</dt>
                          <dd className="mt-2 text-sm font-semibold text-slate-900">{dynamics.avg_llm_ttfb_ms == null ? '-' : `${Math.round(dynamics.avg_llm_ttfb_ms)} ms`}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Avg TTS TTFB</dt>
                          <dd className="mt-2 text-sm font-semibold text-slate-900">{dynamics.avg_tts_ttfb_ms == null ? '-' : `${Math.round(dynamics.avg_tts_ttfb_ms)} ms`}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Avg ASR latency</dt>
                          <dd className="mt-2 text-sm font-semibold text-slate-900">{dynamics.avg_asr_latency_ms == null ? '-' : `${Math.round(dynamics.avg_asr_latency_ms)} ms`}</dd>
                        </div>
                      </dl>
                    </ArticleSection>
                  )}
                </>
              ) : (
                <ArticleSection title={`Transcript (${transcript.length} turns)`} icon={MessageSquare}>
                  {transcript.length === 0 ? (
                    <p className="text-sm text-slate-500">No transcript was attached to this conversation.</p>
                  ) : (
                    <div className="space-y-5">
                      {transcript.map((turn, index) => (
                        <div key={`${turn.role || 'turn'}-${index}`} className="pl-5">
                          <div className={`relative before:absolute before:left-[-20px] before:top-1 before:h-full before:w-[2px] before:rounded-full ${
                            turn.role === 'agent'
                              ? 'before:bg-indigo-200'
                              : 'before:bg-slate-200'
                          }`}
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              <span>{turn.role || 'Unknown'}</span>
                              {turn.time_in_call_secs != null && <span>{formatDuration(turn.time_in_call_secs)}</span>}
                              {turn.interrupted && <span className="text-amber-700">Interrupted</span>}
                            </div>
                            <p className="max-w-3xl text-sm leading-7 text-slate-700">
                              {turn.message || <span className="italic text-slate-400">(no message captured)</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ArticleSection>
              )}
            </div>
          </Surface>

          <Surface className="p-6" tint="soft">
            <div className="space-y-8">
              <SideSection title="Metadata" icon={Info}>
                <div className="space-y-3">
                  <MetaRow label="Processed" value={formatDateTime(processedAt)} />
                  <MetaRow label="Call date" value={formatDate(callDate)} />
                  <MetaRow label="Duration" value={formatDuration(durationValue)} />
                  <MetaRow label="Direction" value={phone.direction || '-'} />
                  <MetaRow label="External number" value={phone.external_number || '-'} />
                  <MetaRow label="Agent number" value={phone.agent_number || phone.to || '-'} />
                  <MetaRow label="Language" value={language || '-'} />
                  <MetaRow label="Status" value={STATUS_META[data?.status || summary?.status]?.label || data?.status || summary?.status || '-'} />
                </div>
              </SideSection>

              <SideSection title="User profile" icon={UserCheck}>
                <div className="flex flex-wrap gap-2">
                  <MetaPill meta={MOOD_META[moodValue]} />
                  {profiling.skepticism_level && <Pill tone="slate">Skepticism: {profiling.skepticism_level}</Pill>}
                  <SignalBadge label="Confused" value={profiling.confusion_detected} bad />
                  <SignalBadge label="Aggressive" value={profiling.aggression_detected} bad />
                  <SignalBadge label="Escalation requested" value={profiling.escalation_requested} bad />
                </div>
                {profiling.objections_raised?.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {profiling.objections_raised.map((item, index) => (
                      <li key={`${item}-${index}`} className="list-inside list-disc">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </SideSection>

              <SideSection title="Post-call actions" icon={HeartPulse}>
                <div className="flex flex-wrap gap-2">
                  <SignalBadge label="Callback requested" value={actions.callback_requested} good />
                  <SignalBadge label="Transfer attempted" value={actions.transfer_attempted} good />
                  <SignalBadge label="Transfer succeeded" value={actions.transfer_succeeded} good />
                </div>
                {actions.callback_time_utc && (
                  <p className="mt-4 text-xs text-slate-500">
                    Callback time: <span className="font-semibold text-slate-700">{formatDateTime(actions.callback_time_utc)}</span>
                  </p>
                )}
                {actions.unresolved_issues?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Unresolved issues</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {actions.unresolved_issues.map((item, index) => (
                        <li key={`${item}-${index}`} className="list-inside list-disc">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {actions.action_items?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Action items</p>
                    <div className="mt-3 space-y-3">
                      {actions.action_items.map((item, index) => {
                        const task = typeof item === 'string' ? item : item.task
                        const owner = typeof item === 'string' ? '' : item.owner
                        const due = typeof item === 'string' ? '' : item.due

                        return (
                          <div key={`${task || 'task'}-${index}`}>
                            <p className="text-sm font-medium text-slate-700">{task || 'Action item'}</p>
                            {(owner || due) && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {owner && <Pill tone="blue">{owner}</Pill>}
                                {due && <Pill tone="slate">{String(due).replace(/_/g, ' ')}</Pill>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </SideSection>
            </div>
          </Surface>
        </div>
      )}
    </div>
  )
}

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

  const selectedConversationId = searchParams.get('conversation')

  const queryArgs = useMemo(() => ({
    businessOutcome: outcomeFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    search: searchTerm || undefined,
    limit: 20,
  }), [
    fromDate,
    fromDate,
    outcomeFilter,
    searchTerm,
    toDate,
  ])

  const load = useCallback(async () => {
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
  }, [queryArgs])

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
    const scores = items.map((item) => getScoreValue(item.overall_call_score)).filter((value) => value != null)
    const averageScore = scores.length
      ? (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1)
      : '-'
    const averageDuration = total
      ? Math.round(items.reduce((sum, item) => sum + (item.call_duration_secs || 0), 0) / total)
      : null

    return {
      total,
      successRate: total ? Math.round((success / total) * 100) : 0,
      averageScore,
      averageDuration,
      highPriority,
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

  return (
    <div className="min-h-full bg-[#f6f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {selectedSummary ? (
          <ConversationDetail
            key={selectedSummary.conversation_id}
            conversationId={selectedSummary.conversation_id}
            summary={selectedSummary}
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
                  className={`flex h-11 w-11 items-center justify-center rounded-md border shadow-sm transition ${
                    showFilters || outcomeFilter || fromDate || toDate
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Filter size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Success rate</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stats.successRate}%</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Average score</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stats.averageScore}</p>
                </div>
              </div>

              <div className="relative flex items-center gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Average duration</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{formatDuration(stats.averageDuration)}</p>
                </div>
                {searchTerm && (
                  <div className="absolute top-4 right-4">
                    <Pill tone="slate">Search: {searchTerm}</Pill>
                  </div>
                )}
              </div>
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
                <span className="text-xs font-medium text-slate-400">{items.length} visible</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-6 py-3 sm:px-8">Agent</th>
                      <th className="px-6 py-3">Conversation ID</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Processed</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Outcome</th>
                      <th className="px-6 py-3">Mood</th>
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
                          <td className="px-6 py-5"><div className="h-6 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5"><div className="h-6 animate-pulse rounded-full bg-slate-100" /></td>
                          <td className="px-6 py-5 sm:px-8"><div className="ml-auto h-9 w-24 animate-pulse rounded-full bg-slate-100" /></td>
                        </tr>
                      ))
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center sm:px-8">
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
                                <p className="truncate text-sm font-medium text-slate-800">
                                  {item.agent_name || item.organization_name || 'Unknown agent'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-5 align-top">
                              <div className="flex items-center gap-2">
                                <span className="max-w-[170px] truncate font-mono text-[11px] text-slate-500">
                                  {item.conversation_id}
                                </span>
                                <button
                                  onClick={(event) => handleCopyId(event, item.conversation_id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:text-slate-700"
                                  title="Copy conversation ID"
                                >
                                  {copiedId === item.conversation_id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-5 align-top font-mono text-xs text-slate-600">
                              {formatDuration(item.call_duration_secs)}
                            </td>
                            <td className="px-6 py-5 align-top text-xs text-slate-500">
                              {formatDateTime(item.processed_at)}
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
          </>
        )}
      </div>
    </div>
  )
}

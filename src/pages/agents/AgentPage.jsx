import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, BookOpen, Bot, Check, ChevronDown, Edit3, File, FileText, Link2,
  Loader2, Maximize2, Mic2, Pause, Play, RefreshCw, Save, Search, Settings2, Sparkles, Upload, Variable, X,
} from 'lucide-react'
import {
  createKnowledgeBaseFromFile,
  createKnowledgeBaseFromText,
  deleteKnowledgeBaseDocument,
  getKnowledgeBaseDocumentContent,
  getModels,
  getVoice,
  listKnowledgeBaseDocuments,
  listVoices,
  updateAgent,
} from '../../api/agents/agentConsoleService'
import { getCurrentUserAgentContext } from '../../api/agents/orgScopedAgentService'
import AgentPreviewModal from './AgentPreviewModal'

const VISIBLE_DYNAMIC_VARIABLES = [
  'branches_offered',
  'gpa_thresholds',
  'scholarship_score',
  'campus_facilities',
  'housing_policy',
  'extracurricular_activities',
]

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'hi', name: 'Hindi' },
  { id: 'es', name: 'Spanish' },
  { id: 'fr', name: 'French' },
  { id: 'de', name: 'German' },
  { id: 'ja', name: 'Japanese' },
  { id: 'zh', name: 'Chinese' },
  { id: 'pt', name: 'Portuguese' },
  { id: 'it', name: 'Italian' },
  { id: 'ko', name: 'Korean' },
  { id: 'te', name: 'Telugu' },
]

const LLM_DISPLAY_NAMES = {
  'gpt-4o-mini': 'PURLLM-4o-Mini',
  'gpt-4o': 'PURLLM-4o',
  'gpt-4.1': 'PURLLM-4.1',
  'gpt-4.1-mini': 'PURLLM-4.1-Mini',
  'gpt-5-mini': 'PURLLM-5-Mini',
  'gemini-1.5-pro': 'PURLLM-Pro-1.5',
  'gemini-1.5-flash': 'PURLLM-Flash-1.5',
  'gemini-2.0-flash': 'PURLLM-Flash-2.0',
  'gemini-2.0-flash-lite': 'PURLLM-Flash-2.0-Lite',
  'gemini-2.5-flash': 'PURLLM-Flash-2.5',
  'gemini-2.5-pro': 'PURLLM-Pro-2.5',
  'gemini-3-pro-preview': 'PURLLM-Pro-3-Preview',
  'gemini-3-flash-preview': 'PURLLM-Flash-3-Preview',
  'gemini-3.1-flash-lite-preview': 'PURLLM-Flash-3.1-Lite-Preview',
  'claude-3-7-sonnet': 'PURLLM-Sonnet-3.7',
  'claude-3-5-sonnet': 'PURLLM-Sonnet-3.5',
}

const AVAILABLE_LLMS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-5-mini',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'claude-3-7-sonnet',
  'claude-3-5-sonnet',
]

const TTS_MODEL_DISPLAY_NAMES = {
  eleven_flash_v2_5: 'PUR-Flash',
  eleven_turbo_v2_5: 'PUR-Turbo',
  eleven_multilingual_v2: 'PUR-Multilingual',
  eleven_v3_conversational: 'PUR-V3-Conversational',
}

const FIXED_TTS_MODEL_ID = import.meta.env.VITE_ELEVENLABS_TTS_MODEL || 'eleven_v3_conversational'

function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

function getLlmLabel(id) {
  return LLM_DISPLAY_NAMES[id] || id
}

function getTtsModelLabel(id) {
  return TTS_MODEL_DISPLAY_NAMES[id] || id
}

function extractVariables(promptText, firstMessageText) {
  const combined = `${promptText || ''} ${firstMessageText || ''}`
  const regex = /\{\{([^}]+)\}\}/g
  const values = []
  let match
  while ((match = regex.exec(combined)) !== null) {
    const variable = match[1].trim()
    if (variable && !values.includes(variable)) values.push(variable)
  }
  return values.sort()
}

function buildFormFromAgent(agent) {
  const conversation = agent?.conversation_config || {}
  const agentConfig = conversation?.agent || {}
  const prompt = agentConfig?.prompt || {}
  const tts = conversation?.tts || {}

  return {
    name: agent?.name || '',
    first_message: agentConfig?.first_message || '',
    language: agentConfig?.language || 'en',
    prompt: {
      prompt: prompt?.prompt || '',
      llm: prompt?.llm || 'gpt-4o',
      temperature: Number(prompt?.temperature ?? 0.5),
      knowledge_base: Array.isArray(prompt?.knowledge_base) ? prompt.knowledge_base : [],
    },
    dynamic_variables: agentConfig?.dynamic_variables?.dynamic_variable_placeholders || {},
    tts: {
      voice_id: tts?.voice_id || '',
      model_id: FIXED_TTS_MODEL_ID,
    },
  }
}

function serializeFormState(form) {
  return JSON.stringify(form)
}

function FieldLabel({ children }) {
  return <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-500">{children}</label>
}

function SectionCard({ icon: Icon, title, description, actions, children, className = '', bodyClassName = '' }) {
  return (
    <section className={cn('rounded-md border border-gray-200 bg-white', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <div className="flex h-7 w-7 items-center justify-center rounded text-indigo-600">
              <Icon size={15} />
            </div>
          ) : null}
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight text-gray-900">{title}</h2>
            {description && <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-500">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className={cn('px-5 py-5', bodyClassName)}>{children}</div>
    </section>
  )
}

function Modal({ open, onClose, title, subtitle, icon: Icon, children, max = 'max-w-4xl' }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[6px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className={cn('relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl shadow-2xl', max)}
            style={{ background: 'var(--surface)', outline: '1px solid var(--hair)' }}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-100 px-5 py-3.5">
              <div className="flex items-center gap-3">
                {Icon ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon size={15} />
                  </div>
                ) : null}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                  {subtitle ? <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Combobox({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  icon: Icon,
  emptyLabel = 'No matches',
  panelClassName,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selected = useMemo(() => options.find((opt) => opt.id === value) || null, [options, value])

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((opt) =>
      String(opt.label || '').toLowerCase().includes(q) ||
      String(opt.id || '').toLowerCase().includes(q),
    )
  }, [options, query, searchable])

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open && searchable) {
      const id = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(id)
    }
    if (!open) setQuery('')
  }, [open, searchable])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-md border bg-white px-3 py-2.5 text-left transition',
          open ? 'border-gray-400' : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <Icon size={14} className="shrink-0 text-gray-400" />
          ) : null}
          <span className="truncate text-[13px] text-gray-900">
            {selected ? selected.label : <span className="text-gray-300">{placeholder}</span>}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-gray-400 transition', open ? 'rotate-180' : '')}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black/5',
              panelClassName,
            )}
          >
            {searchable ? (
              <div className="border-b border-gray-100 p-2">
                <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                  <Search size={13} className="text-gray-400" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400">{emptyLabel}</div>
              ) : (
                filtered.map((opt) => {
                  const active = opt.id === value
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition',
                        active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{opt.label}</p>
                        {opt.hint ? (
                          <p className="mt-0.5 truncate text-[11px] text-gray-400">{opt.hint}</p>
                        ) : null}
                      </div>
                      {active ? <Check size={14} className="shrink-0 text-indigo-600" /> : null}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function VoiceSelectorModal({ open, currentVoiceId, onClose, onSelect }) {
  const [activeTab, setActiveTab] = useState('saved')
  const [search, setSearch] = useState('')
  const [voices, setVoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState(null)
  const audioRef = useRef(null)
  const [playingId, setPlayingId] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await listVoices({ voiceType: activeTab, search })
        if (!cancelled) setVoices(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setVoices([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, activeTab, search])

  useEffect(() => {
    if (!open) {
      if (audioRef.current) audioRef.current.pause()
      setPlayingId('')
      setSelectedVoice(null)
      setSearch('')
    }
  }, [open])

  const tabs = [
    { id: 'saved', label: 'Saved' },
    { id: 'personal', label: 'Personal' },
    { id: 'default', label: 'Built-in' },
    { id: 'explore', label: 'Explore' },
  ]

  function togglePreview(voice) {
    if (!voice?.preview_url) return
    if (!audioRef.current) audioRef.current = new Audio()
    if (playingId === voice.voice_id) {
      audioRef.current.pause()
      setPlayingId('')
      return
    }
    audioRef.current.pause()
    audioRef.current.src = voice.preview_url
    audioRef.current.play().catch(() => { })
    audioRef.current.onended = () => setPlayingId('')
    setPlayingId(voice.voice_id)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Voice"
      subtitle="Choose a voice and preview it before applying"
      icon={Mic2}
      max="max-w-3xl"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voices..."
              className="w-full bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 size={20} className="mr-2 animate-spin" /> Loading voices...
            </div>
          ) : voices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-300">
                <Mic2 size={22} />
              </div>
              <p className="mt-4 text-base font-semibold text-gray-700">No voices found</p>
              <p className="mt-1 text-sm text-gray-400">Try a different search or voice tab.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {voices.map((voice) => {
                const selected = selectedVoice?.voice_id === voice.voice_id
                const active = currentVoiceId === voice.voice_id
                return (
                  <button
                    key={voice.voice_id}
                    type="button"
                    onClick={() => setSelectedVoice(voice)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition',
                      selected ? 'border-indigo-300 bg-indigo-50/70' : 'border-gray-200 bg-white hover:bg-gray-50',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-semibold text-gray-900">{voice.name}</p>
                        {active ? (
                          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-gray-400">
                        {voice.category || voice.description || voice.labels?.accent || voice.voice_id}
                      </p>
                    </div>
                    <span className="group/preview relative">
                      <button
                        type="button"
                        aria-label={playingId === voice.voice_id ? 'Stop preview' : 'Play preview'}
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePreview(voice)
                        }}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full border transition',
                          playingId === voice.voice_id
                            ? 'border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-500'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600',
                        )}
                      >
                        {playingId === voice.voice_id ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                      </button>
                      <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition group-hover/preview:opacity-100">
                        {playingId === voice.voice_id ? 'Stop preview' : 'Preview voice'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            disabled={!selectedVoice}
            onClick={() => {
              if (!selectedVoice) return
              onSelect(selectedVoice)
              onClose()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={15} /> {selectedVoice ? `Use ${selectedVoice.name}` : 'Use this voice'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function EditPromptModal({ open, value, onChange, onClose, llm }) {
  const [draft, setDraft] = useState(value || '')

  useEffect(() => {
    if (open) setDraft(value || '')
  }, [open, value])

  const charCount = draft.length
  const lineCount = draft ? draft.split('\n').length : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit System Prompt"
      subtitle={llm ? `LLM: ${llm}` : undefined}
      icon={Sparkles}
      max="max-w-5xl"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-2.5 text-[11px] text-gray-500">
          <span className="font-mono">{lineCount} lines · {charCount} characters</span>
          <span className="hidden sm:block">
            Use <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-indigo-600 ring-1 ring-gray-200">{'{{variable_name}}'}</code> for dynamic values
          </span>
        </div>
        <div className="min-h-0 flex-1 p-4">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="h-[60vh] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400"
            placeholder="You are {{agent_name}}, an admissions voice assistant..."
          />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onChange(draft); onClose() }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-purple-500"
          >
            <Check size={14} />
            Apply changes
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AddTextModal({ open, onClose, onSubmit, busy }) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) return
    setName('')
    setText('')
  }, [open])

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Add Text Document"
      subtitle="Create a knowledge-base document from plain text"
      icon={FileText}
      max="max-w-2xl"
    >
      <div className="space-y-5 px-6 py-6">
        <div>
          <FieldLabel>Document Name</FieldLabel>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Admissions Overview"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400"
          />
        </div>
        <div>
          <FieldLabel>Content</FieldLabel>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the content you want the agent to reference..."
            className="min-h-[220px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => onSubmit(text, name)}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? 'Creating...' : 'Create document'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmVariant = 'danger', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[4px]" onClick={onCancel} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--surface)', outline: '1px solid var(--hair)' }}
      >
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold text-white transition',
              confirmVariant === 'danger'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-indigo-600 hover:bg-indigo-500',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function KnowledgeBaseManager({ linkedDocs, onChange }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [creatingText, setCreatingText] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const fileRef = useRef(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const items = await listKnowledgeBaseDocuments({ page_size: 100 })
      setDocuments(items)
    } catch {
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  async function selectDoc(doc) {
    setSelectedDoc(doc)
    setDetail(null)
    setLoadingDetail(true)
    try {
      const content = await getKnowledgeBaseDocumentContent(doc.id)
      setDetail(content)
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  function isLinked(docId) {
    return linkedDocs.some((doc) => doc.id === docId)
  }

  function toggleLink(doc) {
    if (isLinked(doc.id)) {
      onChange(linkedDocs.filter((entry) => entry.id !== doc.id))
      return
    }
    onChange([
      ...linkedDocs,
      { id: doc.id, name: doc.name || doc.id, type: doc.type || 'file', usage_mode: 'auto' },
    ])
  }

  function setUsageMode(docId, usageMode) {
    onChange(linkedDocs.map((doc) => (doc.id === docId ? { ...doc, usage_mode: usageMode } : doc)))
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const created = await createKnowledgeBaseFromFile(file, { name: file.name })
      await loadDocuments()
      if (created?.id) {
        onChange([
          ...linkedDocs,
          { id: created.id, name: created.name || file.name, type: 'file', usage_mode: 'auto' },
        ])
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleTextCreate(text, name) {
    setCreatingText(true)
    try {
      const created = await createKnowledgeBaseFromText(text, { name })
      await loadDocuments()
      if (created?.id) {
        onChange([
          ...linkedDocs,
          { id: created.id, name: created.name || name || 'Text Document', type: 'text', usage_mode: 'auto' },
        ])
      }
      setShowTextModal(false)
    } finally {
      setCreatingText(false)
    }
  }

  async function handleDeleteSelected() {
    if (!selectedDoc) return
    setDeleteError('')
    setConfirmDialog({
      title: 'Delete document?',
      message: `"${selectedDoc.name || selectedDoc.id}" will be permanently deleted and unlinked from all agents.`,
      confirmLabel: 'Delete',
      onConfirm: () => executeDelete(false),
    })
  }

  async function executeDelete(force) {
    setConfirmDialog(null)
    try {
      await deleteKnowledgeBaseDocument(selectedDoc.id, force ? { force: true } : undefined)
      onChange(linkedDocs.filter((entry) => entry.id !== selectedDoc.id))
      setSelectedDoc(null)
      setDetail(null)
      await loadDocuments()
    } catch (err) {
      const status = err?.status
      const message = String(err?.message || '')
      const isInUse = status === 409 || /409|conflict|in.?use|referenc/i.test(message)
      if (isInUse) {
        setConfirmDialog({
          title: 'Document is in use',
          message: 'This document is linked to one or more agents in your workspace. Force-delete it everywhere? This will unlink it from those agents too.',
          confirmLabel: 'Force delete',
          onConfirm: () => executeDelete(true),
        })
      } else {
        setDeleteError(message || 'Failed to delete the document.')
      }
    }
  }

  return (
    <>
      <SectionCard
        icon={BookOpen}
        title="Knowledge Base"
        description="Link, create, and manage the documents this agent can reference."
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDocuments}
              className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf,.docx,.csv,.json,.md"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => setShowTextModal(true)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <FileText size={14} className="mr-2 inline" />
              From text
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="mr-2 inline animate-spin" /> : <Upload size={14} className="mr-2 inline" />}
              {uploading ? 'Uploading' : 'Upload file'}
            </button>
          </div>
        )}
      >
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            {linkedDocs.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {linkedDocs.map((doc) => (
                  <span key={doc.id} className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    <Check size={11} />
                    <span className="max-w-[160px] truncate">{doc.name}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">{doc.usage_mode || 'auto'}</span>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="grid grid-cols-[1fr_110px_100px] gap-3 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                <span>Document</span>
                <span>Created</span>
                <span className="text-center">Link</span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-14 text-sm text-gray-500">
                  <Loader2 size={18} className="mr-2 animate-spin" /> Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-300">
                    <BookOpen size={22} />
                  </div>
                  <p className="mt-4 text-base font-semibold text-gray-700">No documents yet</p>
                  <p className="mt-1 text-sm text-gray-400">Upload a file or add text to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {documents.map((doc) => {
                    const linked = isLinked(doc.id)
                    const active = selectedDoc?.id === doc.id
                    const linkedEntry = linkedDocs.find((entry) => entry.id === doc.id)
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => selectDoc(doc)}
                        className={cn(
                          'grid w-full grid-cols-[1fr_110px_100px] items-center gap-3 px-4 py-3 text-left transition',
                          active ? 'bg-indigo-50/70' : 'bg-white hover:bg-gray-50',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-xl',
                              linked ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500',
                            )}>
                              <File size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">{doc.name || doc.id}</p>
                              <p className="truncate text-xs text-gray-400">
                                {(doc.type || 'file').toUpperCase()}
                                {linkedEntry?.usage_mode ? ` • ${linkedEntry.usage_mode}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {doc.metadata?.created_at_unix_secs
                            ? new Date(doc.metadata.created_at_unix_secs * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '-'}
                        </span>
                        <span className="flex justify-center">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                            linked ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-500',
                          )}>
                            {linked ? 'Linked' : 'Available'}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-5">
            {!selectedDoc ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-gray-300 shadow-sm ring-1 ring-gray-100">
                  <Link2 size={20} />
                </div>
                <p className="mt-4 text-base font-semibold text-gray-700">Select a document</p>
                <p className="mt-1 text-sm text-gray-400">Preview it and link it to this agent from here.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedDoc.name || selectedDoc.id}</p>
                      <p className="mt-1 text-xs text-gray-400">{selectedDoc.type || 'file'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleLink(selectedDoc)}
                      className={cn(
                        'rounded-xl px-3 py-2 text-xs font-semibold transition',
                        isLinked(selectedDoc.id)
                          ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500',
                      )}
                    >
                      {isLinked(selectedDoc.id) ? 'Unlink' : 'Link to agent'}
                    </button>
                  </div>

                  {isLinked(selectedDoc.id) ? (
                    <div className="mt-4">
                      <FieldLabel>Usage Mode</FieldLabel>
                      <div className="flex gap-2">
                        {['auto', 'prompt'].map((mode) => {
                          const active = linkedDocs.find((entry) => entry.id === selectedDoc.id)?.usage_mode === mode
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setUsageMode(selectedDoc.id, mode)}
                              className={cn(
                                'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition',
                                active
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                              )}
                            >
                              {mode}
                            </button>
                          )
                        })}
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        {linkedDocs.find((entry) => entry.id === selectedDoc.id)?.usage_mode === 'prompt'
                          ? 'Injected directly into the system prompt.'
                          : 'Fetched dynamically by the agent at runtime.'}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Preview</p>
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                      <Loader2 size={16} className="mr-2 animate-spin" /> Loading content...
                    </div>
                  ) : detail ? (
                    <pre className="mt-3 max-h-[240px] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-600">
                      {typeof detail === 'string' ? detail.slice(0, 1600) : JSON.stringify(detail, null, 2).slice(0, 1600)}
                    </pre>
                  ) : (
                    <p className="mt-3 text-sm text-gray-400">Preview is not available for this document.</p>
                  )}
                </div>

                {deleteError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-xs font-medium text-red-700">
                    {deleteError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Delete document
                </button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <AddTextModal
        open={showTextModal}
        onClose={() => setShowTextModal(false)}
        onSubmit={handleTextCreate}
        busy={creatingText}
      />

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    </>
  )
}

export default function AgentPage() {
  const [agentId, setAgentId] = useState('')
  const [agentScope, setAgentScope] = useState('master')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('agent')
  const [agentData, setAgentData] = useState(null)
  const [form, setForm] = useState(null)
  const [initialSnapshot, setInitialSnapshot] = useState('')
  const [voiceName, setVoiceName] = useState('')
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [availableLanguages, setAvailableLanguages] = useState(LANGUAGES)

  const loadAgent = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    if (!silent) setSuccess('')
    try {
      const context = await getCurrentUserAgentContext()
      const data = context.agent
      const nextForm = buildFormFromAgent(data)
      setAgentId(context.agentId || '')
      setAgentScope(context.scope || 'master')
      setAgentData(data)
      setForm(nextForm)
      setInitialSnapshot(serializeFormState(nextForm))

      if (nextForm.tts.voice_id) {
        const voice = await getVoice(nextForm.tts.voice_id).catch(() => null)
        setVoiceName(voice?.name || '')
      } else {
        setVoiceName('')
      }
      if (silent) setSuccess('Refreshed')
    } catch (err) {
      setError(err.message || 'Failed to load assigned agent.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAgent()
  }, [loadAgent])

  useEffect(() => {
    let cancelled = false

      ; (async () => {
        try {
          const modelsResponse = await getModels()
          const allModels = Array.isArray(modelsResponse) ? modelsResponse : []
          const searchId = FIXED_TTS_MODEL_ID === 'eleven_v3_conversational' ? 'eleven_v3' : FIXED_TTS_MODEL_ID
          const modelData = allModels.find((model) => model.model_id === searchId)
          const langs = Array.isArray(modelData?.languages) && modelData.languages.length > 0
            ? modelData.languages.map((language) => ({
              id: language.language_id || language.id,
              name: language.name,
            }))
            : LANGUAGES

          if (!cancelled) setAvailableLanguages(langs)
        } catch {
          if (!cancelled) setAvailableLanguages(LANGUAGES)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!success) return
    const id = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(id)
  }, [success])

  const variableNames = useMemo(() => {
    if (!form) return []
    const detected = new Set([
      ...extractVariables(form.prompt.prompt, form.first_message),
      ...Object.keys(form.dynamic_variables || {}),
    ])
    return VISIBLE_DYNAMIC_VARIABLES.filter((name) => detected.has(name))
  }, [form])

  const missingVariables = useMemo(() => {
    if (!form) return []
    return variableNames.filter((name) => !String(form.dynamic_variables?.[name] || '').trim())
  }, [form, variableNames])

  const llmOptions = useMemo(() => {
    const current = form?.prompt?.llm
    return Array.from(new Set([...AVAILABLE_LLMS, ...(current ? [current] : [])]))
  }, [form])

  const languageOptions = useMemo(() => {
    const current = form?.language
    const base = [...availableLanguages]
    if (current && !base.some((language) => language.id === current)) {
      base.push({ id: current, name: current.toUpperCase() })
    }
    return base
  }, [availableLanguages, form])

  const hasChanges = form ? serializeFormState(form) !== initialSnapshot : false

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updatePromptField(key, value) {
    setForm((prev) => ({ ...prev, prompt: { ...prev.prompt, [key]: value } }))
  }

  function updateTtsField(key, value) {
    setForm((prev) => ({ ...prev, tts: { ...prev.tts, [key]: value } }))
  }


  async function handleSave() {
    if (!agentData || !form) return
    if (missingVariables.length > 0) {
      setError(`Please fill these dynamic variables before saving: ${missingVariables.join(', ')}`)
      setSuccess('')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const mergedConversationConfig = {
        ...agentData.conversation_config,
        agent: {
          ...(agentData.conversation_config?.agent || {}),
          first_message: form.first_message,
          language: form.language,
          dynamic_variables: {
            dynamic_variable_placeholders: form.dynamic_variables || {},
          },
          prompt: {
            ...(agentData.conversation_config?.agent?.prompt || {}),
            prompt: form.prompt.prompt,
            llm: form.prompt.llm,
            temperature: Number(form.prompt.temperature),
            knowledge_base: form.prompt.knowledge_base || [],
          },
        },
        tts: {
          ...(agentData.conversation_config?.tts || {}),
          voice_id: form.tts.voice_id,
          model_id: FIXED_TTS_MODEL_ID,
        },
      }

      const payload = {
        name: form.name,
        tags: agentData.tags,
        conversation_config: mergedConversationConfig,
        platform_settings: agentData.platform_settings,
      }

      await updateAgent(agentId, payload)
      setAgentData((prev) => ({ ...(prev || {}), ...payload, conversation_config: mergedConversationConfig }))
      setInitialSnapshot(serializeFormState(form))
      setSuccess('Agent updated successfully.')
    } catch (err) {
      setError(err.message || 'Failed to save agent changes.')
    } finally {
      setSaving(false)
    }
  }

  const pageBg = { background: 'var(--bg)' }

  if (loading) {
    return (
      <div className="min-h-full px-8 py-7" style={pageBg}>
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-20 shadow-sm">
          <Loader2 size={20} className="mr-3 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-gray-600">Loading assigned agent...</span>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-full px-8 py-7" style={pageBg}>
        <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-white px-6 py-12 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertCircle size={18} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Agent unavailable</h1>
              <p className="mt-1 text-sm text-gray-500">{error || 'The assigned agent could not be loaded.'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filledVars = variableNames.length - missingVariables.length
  const tabs = [
    { id: 'agent', label: 'Agent', icon: Bot },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  ]

  return (
    <div className="min-h-full px-6 py-7 pb-28" style={pageBg}>
      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-900 text-white">
              <Bot size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[17px] font-semibold tracking-tight text-gray-900">
                  {form.name || 'Assigned Agent'}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                  {agentScope === 'master' ? 'Master' : 'Org'}
                </span>
                {form.language ? (
                  <span className="inline-flex items-center rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    {form.language}
                  </span>
                ) : null}
              </div>
              {agentId ? (
                <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">{agentId}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!agentId}
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={13} className="text-indigo-600" />
              Preview
            </button>
            <button
              type="button"
              disabled={refreshing}
              onClick={async () => {
                if (hasChanges && !window.confirm('You have unsaved changes. Refresh and discard them?')) return
                setRefreshing(true)
                try {
                  await loadAgent({ silent: true })
                } finally {
                  setRefreshing(false)
                }
              }}
              title="Refresh from server"
              className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-60"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Saving' : hasChanges ? 'Save changes' : 'Saved'}
            </button>
          </div>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50/60 px-3.5 py-2.5 text-[13px] text-red-700"
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </motion.div>
          ) : null}
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-[13px] text-emerald-700"
            >
              <Check size={14} className="mt-0.5 shrink-0" />
              {success}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Tabs */}
        <div className="mt-5 mb-5 flex items-center gap-6 border-b border-gray-200">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2 px-1 pb-3 text-[13px] font-medium transition',
                  active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800',
                )}
              >
                <tab.icon size={14} className={active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                {tab.label}
                {active ? (
                  <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-gray-900" />
                ) : null}
              </button>
            )
          })}
        </div>

        {activeTab === 'agent' ? (
          <div className="space-y-5">
            {/* Core Identity (full width) */}
            <SectionCard
              icon={Settings2}
              title="Core Identity"
              description="Title, language, voice and the agent's opening line."
            >
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <FieldLabel>Agent Title</FieldLabel>
                  <input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400"
                    placeholder="Admissions Assistant"
                  />
                </div>
                <div>
                  <FieldLabel>Language</FieldLabel>
                  <Combobox
                    searchable
                    value={form.language}
                    onChange={(id) => updateField('language', id)}
                    placeholder="Select language"
                    emptyLabel="No language matches"
                    options={languageOptions.map((language) => ({
                      id: language.id,
                      label: language.name,
                    }))}
                  />
                </div>
                <div>
                  <FieldLabel>Voice</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setShowVoiceSelector(true)}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-left transition hover:border-gray-300"
                  >
                    <span className="truncate text-[13px] font-medium text-gray-900">
                      {voiceName || form.tts.voice_id || 'Choose voice'}
                    </span>
                    <ChevronDown size={14} className="shrink-0 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <FieldLabel>First Message</FieldLabel>
                <textarea
                  value={form.first_message}
                  onChange={(e) => updateField('first_message', e.target.value)}
                  className="min-h-[88px] w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400"
                  placeholder="Hello, I’m calling from the admissions office..."
                />
              </div>
            </SectionCard>

            {/* Two-column: prompt (wide) + dynamic variables (sticky narrow) */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch">
              {/* System Prompt - read-only preview + Edit modal */}
              <SectionCard
                icon={Sparkles}
                title="System Prompt"
                description="The instruction set used by the agent during the call."
                className=""
                bodyClassName=""
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>LLM</FieldLabel>
                    <select
                      value={form.prompt.llm}
                      onChange={(e) => updatePromptField('llm', e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-900 outline-none transition focus:border-gray-400"
                    >
                      {llmOptions.map((option) => (
                        <option key={option} value={option}>{getLlmLabel(option)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Temperature</FieldLabel>
                    <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={form.prompt.temperature}
                        onChange={(e) => updatePromptField('temperature', Number(e.target.value))}
                        className="flex-1 accent-gray-900"
                      />
                      <span className="font-mono text-[12px] tabular-nums text-gray-700">
                        {form.prompt.temperature.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <FieldLabel>Prompt</FieldLabel>
                    <button
                      type="button"
                      onClick={() => setShowPromptEditor(true)}
                      className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      <Edit3 size={12} />
                      Edit
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptEditor(true)}
                    className="block h-[560px] w-full rounded-md border border-gray-200 bg-gray-50/50 text-left transition hover:border-gray-300 hover:bg-white"
                    title="Click to edit in a wider editor"
                  >
                    <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words p-3.5 font-mono text-[12px] leading-relaxed text-gray-700">
                      {form.prompt.prompt || 'No prompt set yet - click to start writing.'}
                    </pre>
                  </button>
                </div>
              </SectionCard>

              {/* Dynamic Variables panel */}
              <section className="flex h-full flex-col rounded-md border border-gray-200 bg-white">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Variable size={14} className="text-indigo-600" />
                    <h2 className="text-[13px] font-semibold tracking-tight text-gray-900">Variables</h2>
                  </div>
                  {variableNames.length > 0 ? (
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums',
                      missingVariables.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', missingVariables.length > 0 ? 'bg-amber-500' : 'bg-emerald-500')} />
                      {filledVars}/{variableNames.length}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  {variableNames.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50/60 px-4 py-8 text-center">
                      <div>
                        <p className="text-[12px] font-medium text-gray-700">No variables detected</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          Add <code className="rounded bg-gray-100 px-1 font-mono text-[11px] text-indigo-700">{'{{name}}'}</code> in the prompt.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {missingVariables.length > 0 ? (
                        <div className="mb-3 flex shrink-0 items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11.5px] text-amber-800">
                          <AlertCircle size={12} className="mt-0.5 shrink-0" />
                          <span>
                            <span className="font-semibold">{missingVariables.length} missing.</span>{' '}
                            Required to save.
                          </span>
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col justify-between gap-3">
                        {variableNames.map((name) => {
                          const value = form.dynamic_variables?.[name] || ''
                          const filled = Boolean(value.trim())
                          return (
                            <div key={name}>
                              <div className="mb-1 flex items-center gap-1.5">
                                <span className={cn('h-1.5 w-1.5 rounded-full', filled ? 'bg-emerald-500' : 'bg-amber-500')} />
                                <span className="font-mono text-[11px] font-medium text-gray-600">{name}</span>
                              </div>
                              <textarea
                                rows={3}
                                value={value}
                                onChange={(e) => setForm((prev) => ({
                                  ...prev,
                                  dynamic_variables: {
                                    ...prev.dynamic_variables,
                                    [name]: e.target.value,
                                  },
                                }))}
                                className={cn(
                                  'w-full resize-none rounded-md border bg-white px-3 py-2.5 text-[13px] leading-relaxed text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400',
                                  filled ? 'border-gray-200' : 'border-amber-200 bg-amber-50/30',
                                )}
                                placeholder={`Value for ${name}`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === 'knowledge' ? (
          <KnowledgeBaseManager
            linkedDocs={form.prompt.knowledge_base || []}
            onChange={(docs) => updatePromptField('knowledge_base', docs)}
          />
        ) : null}
      </div>

      <AnimatePresence>
        {hasChanges && !saving ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3.5 py-2.5 shadow-lg ring-1 ring-black/5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <p className="text-[12.5px] font-medium text-gray-700">Unsaved changes</p>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                <Save size={12} />
                Save now
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <EditPromptModal
        open={showPromptEditor}
        value={form.prompt.prompt}
        onChange={(next) => updatePromptField('prompt', next)}
        onClose={() => setShowPromptEditor(false)}
        llm={getLlmLabel(form.prompt.llm)}
      />

      <VoiceSelectorModal
        open={showVoiceSelector}
        currentVoiceId={form.tts.voice_id}
        onClose={() => setShowVoiceSelector(false)}
        onSelect={(voice) => {
          setVoiceName(voice.name || '')
          setForm((prev) => ({
            ...prev,
            tts: {
              ...prev.tts,
              voice_id: voice.voice_id,
            },
          }))
        }}
      />

      <AgentPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        agentId={agentId}
        agentName={form.name}
        promptText={form.prompt.prompt}
        firstMessage={form.first_message}
        initialDynamicVariables={form.dynamic_variables || {}}
        hasUnsavedChanges={hasChanges}
      />
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, BookOpen, Bot, Check, ChevronDown, File, FileText, Link2,
  Loader2, Mic2, Pause, Play, RefreshCw, Save, Search, Settings2, Sparkles, Upload, Variable, X,
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

function SectionCard({ icon: Icon, title, description, actions, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className="px-6 py-6">{children}</div>
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
            className={cn('relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5', max)}
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
          'group flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-left transition',
          open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-300',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
              <Icon size={14} />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {selected ? selected.label : <span className="text-gray-400 font-normal">{placeholder}</span>}
            </p>
            {selected?.hint ? (
              <p className="mt-0.5 truncate text-[11px] text-gray-400">{selected.hint}</p>
            ) : null}
          </div>
        </div>
        <ChevronDown
          size={15}
          className={cn('shrink-0 text-gray-400 transition', open ? 'rotate-180 text-indigo-500' : '')}
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
    audioRef.current.play().catch(() => {})
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

function KnowledgeBaseManager({ linkedDocs, onChange }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [creatingText, setCreatingText] = useState(false)
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
    try {
      await deleteKnowledgeBaseDocument(selectedDoc.id)
    } catch (err) {
      const status = err?.status
      const message = String(err?.message || '')
      const isInUse = status === 409 || /409|conflict|in.?use|referenc/i.test(message)
      if (!isInUse) {
        alert(message || 'Failed to delete the document.')
        return
      }
      const confirmed = window.confirm(
        'This document is linked to one or more agents in your workspace. Force-delete it everywhere? This will unlink it from those agents too.',
      )
      if (!confirmed) return
      try {
        await deleteKnowledgeBaseDocument(selectedDoc.id, { force: true })
      } catch (forceErr) {
        alert(forceErr?.message || 'Force delete failed.')
        return
      }
    }
    onChange(linkedDocs.filter((entry) => entry.id !== selectedDoc.id))
    setSelectedDoc(null)
    setDetail(null)
    await loadDocuments()
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
    </>
  )
}

export default function AgentPage() {
  const [agentId, setAgentId] = useState('')
  const [agentScope, setAgentScope] = useState('master')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('agent')
  const [agentData, setAgentData] = useState(null)
  const [form, setForm] = useState(null)
  const [initialSnapshot, setInitialSnapshot] = useState('')
  const [voiceName, setVoiceName] = useState('')
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
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

    ;(async () => {
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
    return Array.from(new Set([
      ...extractVariables(form.prompt.prompt, form.first_message),
      ...Object.keys(form.dynamic_variables || {}),
    ])).sort()
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

  const pageBg = { background: 'radial-gradient(ellipse 90% 40% at 60% -10%, rgba(99,102,241,0.10) 0%, transparent 70%), radial-gradient(ellipse 70% 30% at 10% 110%, rgba(168,85,247,0.06) 0%, transparent 70%), #F8FAFC' }

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

  const knowledgeCount = form.prompt.knowledge_base?.length || 0
  const filledVars = variableNames.length - missingVariables.length
  const tabs = [
    { id: 'agent', label: 'Agent', icon: Bot },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  ]

  const stats = [
    { label: 'Language Model', value: getLlmLabel(form.prompt.llm), icon: Sparkles, tone: 'indigo' },
    { label: 'Voice', value: voiceName || (form.tts.voice_id ? 'Custom' : 'Not selected'), icon: Mic2, tone: 'purple' },
    { label: 'Knowledge Docs', value: `${knowledgeCount} linked`, icon: BookOpen, tone: 'emerald' },
    {
      label: 'Variables',
      value: variableNames.length === 0 ? 'None' : `${filledVars}/${variableNames.length} filled`,
      icon: Variable,
      tone: missingVariables.length > 0 ? 'amber' : 'emerald',
    },
  ]

  const toneStyles = {
    indigo: { bg: 'bg-indigo-50', fg: 'text-indigo-600', ring: 'ring-indigo-100' },
    purple: { bg: 'bg-purple-50', fg: 'text-purple-600', ring: 'ring-purple-100' },
    emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', fg: 'text-amber-600', ring: 'ring-amber-100' },
  }

  return (
    <div className="min-h-full px-6 py-6 pb-28" style={pageBg}>
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-lg shadow-lg shadow-indigo-500/15">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 45%, #8B5CF6 100%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 15% 90%, rgba(255,255,255,0.18), transparent 40%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          <div className="relative px-7 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
                  <Bot size={28} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/25 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      {agentScope === 'master' ? 'Master Configuration' : 'Org Configuration'}
                    </span>
                    {form.language ? (
                      <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white ring-1 ring-white/25 backdrop-blur">
                        {form.language}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {form.name || 'Assigned Agent'}
                  </h1>
                  <p className="mt-1.5 max-w-xl text-sm text-indigo-100/90">
                    Configure how your admissions agent speaks, thinks and references your knowledge base.
                  </p>
                  {agentId ? (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-black/15 px-2.5 py-1 font-mono text-[11px] text-indigo-100 ring-1 ring-white/10">
                      <span className="opacity-60">ID</span>
                      {agentId}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (hasChanges && !window.confirm('You have unsaved changes. Refresh and discard them?')) return
                    loadAgent({ silent: true })
                  }}
                  title="Refresh from server"
                  className="rounded-lg bg-white/15 p-2.5 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-md shadow-indigo-900/20 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving...' : hasChanges ? 'Save changes' : 'All saved'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 -mt-6 grid gap-3 px-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const tone = toneStyles[stat.tone]
            return (
              <div
                key={stat.label}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm ring-1',
                  tone.ring,
                )}
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone.bg, tone.fg)}>
                  <stat.icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700 shadow-sm"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </motion.div>
          ) : null}
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700 shadow-sm"
            >
              <Check size={15} className="mt-0.5 shrink-0" />
              {success}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Tabs */}
        <div className="mt-7 mb-6">
          <div className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:w-auto">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'group relative flex flex-1 items-center gap-2.5 rounded-lg px-4 py-2.5 text-left transition sm:flex-none',
                    active
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  <tab.icon size={15} className={active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                  <p className="text-sm font-semibold leading-tight">{tab.label}</p>
                </button>
              )
            })}
          </div>
        </div>

        {activeTab === 'agent' ? (
          <div className="space-y-6">
            <SectionCard
              icon={Settings2}
              title="Core Identity"
              description="Basic identity, greeting, and conversation language for the configured agent."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel>Agent Name</FieldLabel>
                  <input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400"
                    placeholder="Admissions Assistant"
                  />
                </div>
                <div>
                  <FieldLabel>Language</FieldLabel>
                  <Combobox
                    icon={Variable}
                    searchable
                    value={form.language}
                    onChange={(id) => updateField('language', id)}
                    placeholder="Select language"
                    emptyLabel="No language matches"
                    options={languageOptions.map((language) => ({
                      id: language.id,
                      label: language.name,
                      hint: language.id,
                    }))}
                  />
                </div>
              </div>
              <div className="mt-5">
                <FieldLabel>Voice</FieldLabel>
                <button
                  type="button"
                  onClick={() => setShowVoiceSelector(true)}
                  className="group flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                      <Mic2 size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {voiceName || form.tts.voice_id || 'No voice selected'}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">
                        {form.tts.voice_id ? form.tts.voice_id : 'Click to choose a voice'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={16} className="shrink-0 text-gray-400 transition group-hover:text-indigo-500" />
                </button>
              </div>

              <div className="mt-5">
                <FieldLabel>First Message</FieldLabel>
                <textarea
                  value={form.first_message}
                  onChange={(e) => updateField('first_message', e.target.value)}
                  className="min-h-[120px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400"
                  placeholder="Hello, I’m calling from the admissions office..."
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={Sparkles}
              title="System Prompt"
              description={`The main instruction set used by the agent during the call. Current LLM: ${getLlmLabel(form.prompt.llm)}.`}
            >
              <div className="grid gap-5 md:grid-cols-[1fr_180px_180px]">
                <div>
                  <FieldLabel>Choose LLM</FieldLabel>
                  <select
                    value={form.prompt.llm}
                    onChange={(e) => updatePromptField('llm', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-400"
                  >
                    {llmOptions.map((option) => (
                      <option key={option} value={option}>{getLlmLabel(option)}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-400">{form.prompt.llm}</p>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Temperature</FieldLabel>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={form.prompt.temperature}
                    onChange={(e) => updatePromptField('temperature', Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">Focused</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-700">
                      {form.prompt.temperature.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-gray-400">Creative</span>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <FieldLabel>Prompt</FieldLabel>
                <textarea
                  value={form.prompt.prompt}
                  onChange={(e) => updatePromptField('prompt', e.target.value)}
                  className="min-h-[280px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400"
                  placeholder="You are {{agent_name}}, an admissions voice assistant..."
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={Variable}
              title="Dynamic Variables"
              description="Variables detected from the prompt and first message. Values are passed to the calling flow."
              actions={variableNames.length > 0 ? (
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                  missingVariables.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', missingVariables.length > 0 ? 'bg-amber-500' : 'bg-emerald-500')} />
                  {filledVars}/{variableNames.length} filled
                </span>
              ) : null}
            >
              {variableNames.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-white px-5 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white text-gray-300 shadow-sm ring-1 ring-gray-100">
                    <Variable size={20} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-700">No dynamic variables detected</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Use placeholders like <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] text-indigo-700">{'{{student_name}}'}</code> in the prompt or first message.
                  </p>
                </div>
              ) : (
                <>
                  {missingVariables.length > 0 ? (
                    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/40 px-4 py-3 text-sm text-amber-800">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Some variables are missing values</p>
                        <p className="mt-0.5 text-xs text-amber-700/90">
                          {missingVariables.join(', ')}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    {variableNames.map((name) => {
                      const value = form.dynamic_variables?.[name] || ''
                      const filled = Boolean(value.trim())
                      return (
                        <div key={name} className="group">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-gray-700">
                              <span className={cn('h-1.5 w-1.5 rounded-full', filled ? 'bg-emerald-500' : 'bg-amber-500')} />
                              {`{{${name}}}`}
                            </span>
                            {filled ? <Check size={12} className="text-emerald-500" /> : null}
                          </div>
                          <input
                            value={value}
                            onChange={(e) => setForm((prev) => ({
                              ...prev,
                              dynamic_variables: {
                                ...prev.dynamic_variables,
                                [name]: e.target.value,
                              },
                            }))}
                            className={cn(
                              'w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400',
                              filled ? 'border-gray-200' : 'border-amber-200 bg-amber-50/30',
                            )}
                            placeholder={`Enter value for ${name}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </SectionCard>
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
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-2xl shadow-indigo-500/10 ring-1 ring-black/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertCircle size={15} />
              </span>
              <div className="pr-2">
                <p className="text-sm font-semibold text-gray-900">You have unsaved changes</p>
                <p className="text-xs text-gray-500">Save to apply them to your agent.</p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
              >
                <Save size={14} />
                Save now
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
    </div>
  )
}

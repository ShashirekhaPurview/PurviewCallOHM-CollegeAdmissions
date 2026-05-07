import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useConversation } from '@elevenlabs/react'
import {
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Variable,
  X,
} from 'lucide-react'
import { getSignedUrl } from '../../api/agents/agentConsoleService'

function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

function extractVariables(promptText, firstMessageText, existingValues = {}) {
  const combined = `${promptText || ''} ${firstMessageText || ''}`
  const regex = /\{\{([^}]+)\}\}/g
  const values = new Set(Object.keys(existingValues || {}))
  let match

  while ((match = regex.exec(combined)) !== null) {
    const variable = match[1]?.trim()
    if (variable) values.add(variable)
  }

  return Array.from(values).sort((a, b) => a.localeCompare(b))
}

function hexToRgb(hex) {
  const normalized = String(hex || '#4f46e5').replace('#', '')
  const expanded = normalized.length === 3
    ? normalized.split('').map((value) => value + value).join('')
    : normalized
  const parsed = Number.parseInt(expanded, 16)
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  }
}

function DottedSphere({ color, sphereMode, getInputFreq, getOutputFreq }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ color, sphereMode, getInputFreq, getOutputFreq })

  useEffect(() => {
    stateRef.current = { color, sphereMode, getInputFreq, getOutputFreq }
  }, [color, sphereMode, getInputFreq, getOutputFreq])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const context = canvas.getContext('2d')
    if (!context) return undefined

    let dpr = 1
    let frame = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      canvas.width = Math.floor(parent.clientWidth * dpr)
      canvas.height = Math.floor(parent.clientHeight * dpr)
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const totalDots = 860
    const phi = Math.PI * (3 - Math.sqrt(5))
    const dots = Array.from({ length: totalDots }, (_, index) => {
      const y = 1 - (index / (totalDots - 1)) * 2
      const radius = Math.sqrt(1 - y * y)
      const theta = phi * index
      return {
        x: Math.cos(theta) * radius,
        y,
        z: Math.sin(theta) * radius,
        theta,
      }
    })

    const lerp = (from, to, amount) => from + (to - from) * amount
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3)

    const getBandEnergy = (data) => {
      if (!data?.length) return 0
      const from = 4
      const to = Math.min(data.length, 96)
      if (to <= from) return 0

      let sumSquares = 0
      let count = 0

      for (let index = from; index < to; index += 1) {
        const value = data[index] / 255
        sumSquares += value * value
        count += 1
      }

      return Math.pow(Math.sqrt(sumSquares / Math.max(1, count)), 0.7)
    }

    let currentColor = hexToRgb(color)
    let energySlow = 0.028
    let pulse = 0.975
    let modeIntensity = 0
    let talkIntensity = 0
    let rotationSpeed = 0.06
    let inputFast = 0
    let outputFast = 0
    let noiseFloor = 0.06
    let voiceActivity = 0
    let speakingHold = 0
    let time = 0
    let lastTimestamp = performance.now()

    const render = () => {
      const now = performance.now()
      const delta = Math.min(0.033, Math.max(0.008, (now - lastTimestamp) / 1000))
      lastTimestamp = now

      const {
        color: activeColor,
        sphereMode: activeMode,
        getInputFreq: getInputFrequency,
        getOutputFreq: getOutputFrequency,
      } = stateRef.current

      const targetColor = hexToRgb(activeColor)
      currentColor = {
        r: lerp(currentColor.r, targetColor.r, 0.015),
        g: lerp(currentColor.g, targetColor.g, 0.015),
        b: lerp(currentColor.b, targetColor.b, 0.015),
      }

      let rawInput = 0
      let rawOutput = 0
      try {
        rawInput = getBandEnergy(getInputFrequency?.())
      } catch {
        rawInput = 0
      }
      try {
        rawOutput = getBandEnergy(getOutputFrequency?.())
      } catch {
        rawOutput = 0
      }

      inputFast = lerp(inputFast, rawInput, rawInput > inputFast ? 0.18 : 0.07)
      outputFast = lerp(outputFast, rawOutput, rawOutput > outputFast ? 0.2 : 0.08)

      if (activeMode === 'listening') {
        noiseFloor = lerp(noiseFloor, inputFast, 0.01)
      }

      const threshold = Math.min(0.38, noiseFloor + 0.1)
      voiceActivity = inputFast > threshold
        ? Math.min(voiceActivity + 1, 16)
        : Math.max(voiceActivity - 2, 0)

      const gatedInput = voiceActivity >= 10 ? inputFast : 0

      if (activeMode === 'speaking') speakingHold = 10
      else speakingHold = Math.max(0, speakingHold - 1)

      const speakingStable = activeMode === 'speaking' || speakingHold > 0

      modeIntensity = lerp(modeIntensity, activeMode === 'idle' ? 0 : 1, 0.06)
      talkIntensity = lerp(talkIntensity, speakingStable ? 1 : 0, 0.08)

      const audioEnergy = speakingStable ? outputFast : gatedInput
      const idleEnergy = 0.028 + Math.sin(time * 0.6) * 0.006
      energySlow = lerp(energySlow, lerp(idleEnergy, Math.max(audioEnergy, 0.05), modeIntensity), 0.08)
      pulse = lerp(pulse, 0.975 + energySlow * 0.09, 0.05)
      rotationSpeed = lerp(rotationSpeed, lerp(0.06, 0.1, modeIntensity), 0.04)

      const width = (canvas.width / dpr) || canvas.clientWidth
      const height = (canvas.height / dpr) || canvas.clientHeight
      context.clearRect(0, 0, width, height)

      const centerX = width / 2
      const centerY = height * 0.55
      const baseRadius = Math.min(width, height) * 0.34 * (0.25 + easeOutCubic(Math.min(1, time / 2)) * 0.75)
      const radius = baseRadius * lerp(1, 1.07, talkIntensity * modeIntensity) * pulse
      const rotateY = time * rotationSpeed
      const rotateX = time * 0.022
      const wavePhase = time * 0.55
      const waveAmount = Math.min(0.03, lerp(0.012, 0.026, modeIntensity) + energySlow * 0.018)

      const dimFactor = lerp(1, 0.55, talkIntensity * modeIntensity)
      const baseRed = currentColor.r * dimFactor
      const baseGreen = currentColor.g * dimFactor
      const baseBlue = currentColor.b * dimFactor

      dots.forEach((dot, index) => {
        const radialScale =
          1 +
          Math.sin(wavePhase + dot.theta * 1.25) * waveAmount +
          Math.sin(wavePhase * 0.7 + dot.y * 4.2) * waveAmount * 0.7

        let x = dot.x * radialScale
        let y = dot.y * radialScale
        let z = dot.z * radialScale

        let nextY = y * Math.cos(rotateX) - z * Math.sin(rotateX)
        let nextZ = y * Math.sin(rotateX) + z * Math.cos(rotateX)
        y = nextY
        z = nextZ

        let nextX = x * Math.cos(rotateY) - z * Math.sin(rotateY)
        nextZ = x * Math.sin(rotateY) + z * Math.cos(rotateY)
        x = nextX
        z = nextZ

        const cameraZ = Math.max(radius * 4, 300)
        const worldZ = z * radius
        if (worldZ < -cameraZ + 1) return

        const scale = cameraZ / (cameraZ + worldZ)
        const pointX = centerX + x * radius * scale
        const pointY = centerY + y * radius * scale
        const alpha = Math.max(0.15, (-z + 1) / 2.2)
        const variance = (index % 4) * 8

        context.fillStyle = `rgba(${Math.round(Math.min(255, baseRed + variance * 0.3))}, ${Math.round(Math.min(255, baseGreen - variance * 0.1))}, ${Math.round(Math.min(255, baseBlue + variance * 0.2))}, ${alpha})`
        context.beginPath()
        context.arc(pointX, pointY, scale * 1.75, 0, Math.PI * 2)
        context.fill()
      })

      time += delta
      frame = window.requestAnimationFrame(render)
    }

    frame = window.requestAnimationFrame(render)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
}

export default function AgentPreviewModal({
  open,
  onClose,
  agentId,
  agentName,
  promptText,
  firstMessage,
  initialDynamicVariables,
  hasUnsavedChanges = false,
}) {
  const [dynamicVariables, setDynamicVariables] = useState(initialDynamicVariables || {})
  const [errorMessage, setErrorMessage] = useState('')
  const [transcript, setTranscript] = useState([])
  const [isMuted, setIsMuted] = useState(false)
  const [activePanel, setActivePanel] = useState('variables')
  const transcriptEndRef = useRef(null)
  const conversationRef = useRef(null)

  const variableNames = useMemo(
    () => extractVariables(promptText, firstMessage, initialDynamicVariables),
    [firstMessage, initialDynamicVariables, promptText],
  )

  useEffect(() => {
    if (!open) return
    setDynamicVariables(initialDynamicVariables || {})
    setErrorMessage('')
    setTranscript([])
    setIsMuted(false)
    setActivePanel('variables')
  }, [initialDynamicVariables, open])

  const missingVariables = useMemo(
    () => variableNames.filter((name) => !String(dynamicVariables?.[name] || '').trim()),
    [dynamicVariables, variableNames],
  )
  const filledVariables = variableNames.length - missingVariables.length

  const voiceConversation = useConversation({
    micMuted: isMuted,
    onConnect: () => setErrorMessage(''),
    onDisconnect: () => setIsMuted(false),
    onMessage: (message) => {
      if (!message?.message) return
      setTranscript((current) => [
        ...current,
        {
          role: message.source === 'user' ? 'user' : 'agent',
          text: message.message,
        },
      ])
    },
    onError: (error) => {
      setErrorMessage(typeof error === 'string' ? error : error?.message || 'Preview connection failed.')
    },
  })

  const isConnected = voiceConversation.status === 'connected'
  const isConnecting = voiceConversation.status === 'connecting'
  const sphereMode = isConnected ? (voiceConversation.isSpeaking ? 'speaking' : 'listening') : 'idle'
  const canStart = Boolean(agentId) && missingVariables.length === 0

  useEffect(() => {
    conversationRef.current = voiceConversation
  }, [voiceConversation])

  useEffect(() => () => {
    const activeConversation = conversationRef.current
    if (activeConversation?.status === 'connected') {
      activeConversation.endSession().catch(() => { })
    }
  }, [])

  useEffect(() => {
    if (!open && voiceConversation.status === 'connected') {
      voiceConversation.endSession().catch(() => { })
    }
  }, [open, voiceConversation])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    if (transcript.length > 0) {
      setActivePanel('transcript')
    }
  }, [transcript.length])

  const getInputFreq = useCallback(() => voiceConversation.getInputByteFrequencyData?.(), [voiceConversation])
  const getOutputFreq = useCallback(() => voiceConversation.getOutputByteFrequencyData?.(), [voiceConversation])

  async function handleTogglePreview() {
    if (isConnected) {
      await voiceConversation.endSession()
      return
    }

    try {
      setErrorMessage('')
      setTranscript([])

      if (!window.isSecureContext) {
        throw new Error('Preview requires HTTPS or localhost.')
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not available in this browser.')
      }

      const signedUrlResponse = await getSignedUrl(agentId)
      if (!signedUrlResponse?.signed_url) {
        throw new Error('Failed to create signed preview session.')
      }

      const values = variableNames.length > 0 ? dynamicVariables : undefined
      await voiceConversation.startSession({
        signedUrl: signedUrlResponse.signed_url,
        ...(values ? { dynamicVariables: values } : {}),
      })
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to start preview.')
    }
  }

  const latestAgentMessage = [...transcript].reverse().find((entry) => entry.role === 'agent')
  const latestUserMessage = [...transcript].reverse().find((entry) => entry.role === 'user')
  const recentTranscript = transcript.slice(-6)

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[6px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative z-10 flex h-[min(92vh,760px)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-slate-50/90 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    <span className={cn('h-1.5 w-1.5 rounded-full', isConnected ? 'bg-emerald-500' : isConnecting ? 'bg-blue-500 animate-pulse' : 'bg-slate-400')} />
                    {isConnected ? (voiceConversation.isSpeaking ? 'Speaking' : 'Listening') : isConnecting ? 'Connecting' : 'Ready'}
                  </span>
                  {hasUnsavedChanges ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      <AlertCircle size={11} />
                      Preview uses last saved agent
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 truncate text-lg font-semibold text-gray-900">
                  {agentName || 'Agent Preview'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Update runtime dynamic variables and test the live voice preview.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative flex min-h-[320px] flex-col overflow-hidden border-b border-gray-100 bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#eef2ff_35%,#f8fafc_72%)] lg:border-b-0 lg:border-r">
                <div className="relative min-h-0 flex-[0.78]">
                  <DottedSphere
                    color="#4f46e5"
                    sphereMode={sphereMode}
                    getInputFreq={getInputFreq}
                    getOutputFreq={getOutputFreq}
                  />

                  {errorMessage ? (
                    <div className="absolute left-1/2 top-4 z-10 w-[min(90%,480px)] -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                      {errorMessage}
                    </div>
                  ) : null}

                  {isConnected && (latestAgentMessage || latestUserMessage) ? (
                    <div className="absolute bottom-4 left-4 z-10 max-w-[min(92%,320px)] space-y-2">
                      {latestAgentMessage ? (
                        <div className="rounded-2xl border border-indigo-100 bg-white/85 px-3.5 py-3 shadow-lg backdrop-blur">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Agent</p>
                          <p className="mt-1 text-sm leading-relaxed text-gray-800">{latestAgentMessage.text}</p>
                        </div>
                      ) : null}
                      {latestUserMessage ? (
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-600/10 px-3.5 py-3 shadow-lg backdrop-blur">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">You</p>
                          <p className="mt-1 text-sm leading-relaxed text-gray-800">{latestUserMessage.text}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-center gap-3 border-t border-white/30 bg-white/55 px-4 py-2.5 backdrop-blur">
                  {isConnecting ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                      <Loader2 size={16} className="animate-spin" />
                      Connecting preview...
                    </div>
                  ) : null}

                  {isConnected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsMuted((current) => !current)}
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition hover:-translate-y-0.5',
                          isMuted
                            ? 'border-slate-500 bg-slate-500 text-white'
                            : 'border-indigo-200 bg-white text-indigo-600',
                        )}
                      >
                        {isMuted ? <MicOff size={17} /> : <Mic size={17} />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTogglePreview}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-600"
                      >
                        <PhoneOff size={17} />
                      </button>
                    </>
                  ) : null}

                  {!isConnected && !isConnecting ? (
                    <button
                      type="button"
                      onClick={handleTogglePreview}
                      disabled={!canStart}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Phone size={15} />
                      Start Preview
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-white">
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    {[
                      { id: 'variables', label: 'Dynamic Variables', icon: Variable },
                      { id: 'transcript', label: 'Transcript', icon: Phone },
                    ].map((panel) => (
                      <button
                        key={panel.id}
                        type="button"
                        onClick={() => setActivePanel(panel.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition',
                          activePanel === panel.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800',
                        )}
                      >
                        <panel.icon size={13} />
                        {panel.label}
                        <span
                          className={cn(
                            'ml-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                            activePanel === panel.id
                              ? 'bg-white/20 text-white'
                              : 'bg-white text-gray-500 ring-1 ring-gray-200',
                          )}
                        >
                          {panel.id === 'variables' ? variableNames.length : transcript.length}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-3 text-xs">
                    <span className="font-medium text-gray-500">
                      {activePanel === 'variables'
                        ? `${filledVariables}/${variableNames.length} variables filled`
                        : transcript.length > 0
                          ? `${transcript.length} messages captured`
                          : 'Conversation not started yet'}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold',
                      isConnected
                        ? 'bg-emerald-50 text-emerald-700'
                        : isConnecting
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600',
                    )}>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isConnected ? 'bg-emerald-500' : isConnecting ? 'bg-blue-500' : 'bg-gray-400',
                      )}
                      />
                      {isConnected ? 'Live' : isConnecting ? 'Connecting' : 'Idle'}
                    </span>
                  </div>

                  {activePanel === 'variables' ? (
                    <div className="space-y-3 pt-4">
                      {variableNames.length === 0 ? (
                        <div className="py-10 text-sm text-gray-500">
                          No dynamic variables were detected for this agent.
                        </div>
                      ) : (
                        variableNames.map((name) => {
                          const value = dynamicVariables?.[name] || ''
                          const filled = Boolean(String(value).trim())
                          return (
                            <div key={name}>
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <label className="font-mono text-xs font-semibold text-gray-700">{`{{${name}}}`}</label>
                                <span
                                  className={cn(
                                    'inline-flex h-2 w-2 rounded-full',
                                    filled ? 'bg-emerald-500' : 'bg-amber-500',
                                  )}
                                />
                              </div>
                              <input
                                value={value}
                                onChange={(event) => setDynamicVariables((current) => ({
                                  ...current,
                                  [name]: event.target.value,
                                }))}
                                placeholder={`Enter value for ${name}`}
                                className={cn(
                                  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-indigo-400',
                                  filled ? 'border-gray-200' : 'border-amber-200 bg-amber-50/30',
                                )}
                              />
                            </div>
                          )
                        })
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 pt-4">
                      {recentTranscript.map((entry, index) => (
                        <div
                          key={`${entry.role}-recent-${index}`}
                          className={cn(
                            'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                            entry.role === 'agent'
                              ? 'border border-indigo-100 bg-indigo-50/70 text-gray-800'
                              : 'border border-gray-200 bg-white text-gray-700',
                          )}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {entry.role === 'agent' ? 'Agent' : 'You'}
                          </p>
                          <p className="mt-1">{entry.text}</p>
                        </div>
                      ))}
                      <div ref={transcriptEndRef} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}

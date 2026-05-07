const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const STATIC_KEY = import.meta.env.VITE_STATIC_KEY_ADMISSIONS
const CONFIGURED_AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID_CONTACTS

const ROOT_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '')
const REDIRECT_BASE_URL = `${ROOT_BASE_URL}/redirect`

function requireStaticKey() {
  if (!STATIC_KEY) throw new Error('VITE_STATIC_KEY_ADMISSIONS is not set in .env')
  return STATIC_KEY
}

function getHeaders(extra = {}) {
  return {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'xi-api-key': requireStaticKey(),
    ...extra,
  }
}

async function request(path, options = {}) {
  const { method = 'GET', body, formData, signal } = options
  const headers = getHeaders()

  let finalBody
  if (formData) {
    finalBody = formData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    finalBody = JSON.stringify(body)
  }

  const response = await fetch(`${REDIRECT_BASE_URL}${path}`, {
    method,
    headers,
    body: finalBody,
    signal,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    const message =
      data?.detail?.message ||
      data?.detail ||
      data?.message ||
      data?.error ||
      `Request failed (${response.status})`
    const error = new Error(typeof message === 'string' ? message : JSON.stringify(message))
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

function enforceAgentDefaults(payload = {}) {
  const conversationConfig = payload?.conversation_config
  const promptConfig = conversationConfig?.agent?.prompt
  const ttsConfig = conversationConfig?.tts
  const platformSettings = payload?.platform_settings || {}
  const overrides = platformSettings?.overrides || {}
  const conversationConfigOverride = overrides?.conversation_config_override || {}
  const agentOverride = conversationConfigOverride?.agent || {}
  const promptOverride = agentOverride?.prompt || {}
  let resolvedModelId = ttsConfig?.model_id

  if (resolvedModelId) {
    const englishCompatModelMap = {
      eleven_turbo_v2_5: 'eleven_turbo_v2',
      eleven_flash_v2_5: 'eleven_flash_v2',
    }
    resolvedModelId = englishCompatModelMap[resolvedModelId] || resolvedModelId
  }

  return {
    ...payload,
    ...(conversationConfig ? {
      conversation_config: {
        ...conversationConfig,
        asr: {
          ...(conversationConfig.asr || {}),
          user_input_audio_format: 'ulaw_8000',
        },
        agent: {
          ...(conversationConfig.agent || {}),
          ...(promptConfig ? {
            prompt: {
              ...promptConfig,
              ...(promptConfig.tool_ids && promptConfig.tools ? { tools: undefined } : {}),
            },
          } : {}),
        },
        tts: {
          ...(conversationConfig.tts || {}),
          ...(resolvedModelId ? { model_id: resolvedModelId } : {}),
          agent_output_audio_format: 'ulaw_8000',
        },
      },
    } : {}),
    platform_settings: {
      ...platformSettings,
      overrides: {
        ...overrides,
        conversation_config_override: {
          ...conversationConfigOverride,
          agent: {
            ...agentOverride,
            prompt: {
              ...promptOverride,
              prompt: true,
            },
          },
        },
      },
    },
  }
}

export function getConfiguredAgentId() {
  return CONFIGURED_AGENT_ID || ''
}

export async function getConfiguredAgent() {
  if (!CONFIGURED_AGENT_ID) throw new Error('Missing VITE_ELEVENLABS_AGENT_ID_CONTACTS in .env')
  return getAgent(CONFIGURED_AGENT_ID)
}

export async function createAgent(payload) {
  return request('/v1/convai/agents/create', {
    method: 'POST',
    body: enforceAgentDefaults(payload),
  })
}

export async function duplicateAgent(agentId, options = {}) {
  return request(`/v1/convai/agents/${agentId}/duplicate`, {
    method: 'POST',
    body: options,
  })
}

export async function getAgent(agentId) {
  return request(`/v1/convai/agents/${agentId}`)
}

export async function updateAgent(agentId, payload) {
  return request(`/v1/convai/agents/${agentId}`, {
    method: 'PATCH',
    body: enforceAgentDefaults(payload),
  })
}

export async function getVoice(voiceId) {
  return request(`/v1/voices/${voiceId}`)
}

export async function listAgents(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  const queryString = query.toString()
  return request(`/v1/convai/agents${queryString ? `?${queryString}` : ''}`)
}

export async function listAllAgents(params = {}) {
  const allAgents = []
  let cursor = params.cursor || null

  while (true) {
    const page = await listAgents({
      ...params,
      page_size: params.page_size ?? 100,
      ...(cursor ? { cursor } : {}),
    })

    const agents = Array.isArray(page?.agents) ? page.agents : []
    allAgents.push(...agents)

    cursor = page?.next_cursor || null
    if (!cursor) break
  }

  return {
    agents: allAgents,
    next_cursor: null,
    has_more: false,
  }
}

export async function getModels() {
  return request('/v1/models')
}

export async function getVoiceSettings(voiceId) {
  return request(`/v1/voices/${voiceId}/settings`)
}

export async function getDefaultVoiceSettings() {
  return request('/v1/voices/settings/default')
}

export async function listVoices({ voiceType = 'saved', search = '', pageSize = 50 } = {}) {
  if (voiceType === 'explore') {
    const q = new URLSearchParams()
    q.set('page_size', String(pageSize))
    if (search) q.set('search', search)
    const data = await request(`/v1/shared-voices?${q.toString()}`)
    return data?.voices || []
  }

  const q = new URLSearchParams()
  q.set('voice_type', voiceType)
  q.set('include_total_count', 'true')
  q.set('page_size', String(pageSize))
  if (search) q.set('search', search)

  const data = await request(`/v2/voices?${q.toString()}`)
  return data?.voices || []
}

export async function listKnowledgeBaseDocuments(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value))
  })
  const query = q.toString() ? `?${q.toString()}` : ''
  const data = await request(`/v1/convai/knowledge-base${query}`)
  return data?.documents || []
}

export async function getKnowledgeBaseDocumentContent(documentId) {
  return request(`/v1/convai/knowledge-base/${documentId}/content`)
}

export async function createKnowledgeBaseFromFile(file, extra = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (extra.name) formData.append('name', extra.name)
  if (extra.parent_folder_id) formData.append('parent_folder_id', extra.parent_folder_id)

  return request('/v1/convai/knowledge-base/file', {
    method: 'POST',
    formData,
  })
}

export async function createKnowledgeBaseFromText(text, extra = {}) {
  const body = { text }
  if (extra.name) body.name = extra.name
  if (extra.parent_folder_id) body.parent_folder_id = extra.parent_folder_id

  return request('/v1/convai/knowledge-base/text', {
    method: 'POST',
    body,
  })
}

export async function deleteKnowledgeBaseDocument(documentId, { force = false } = {}) {
  const query = force ? '?force=true' : ''
  return request(`/v1/convai/knowledge-base/${documentId}${query}`, {
    method: 'DELETE',
  })
}

export default {
  getConfiguredAgentId,
  getConfiguredAgent,
  createAgent,
  duplicateAgent,
  getAgent,
  updateAgent,
  listAgents,
  listAllAgents,
  getModels,
  getVoice,
  getVoiceSettings,
  getDefaultVoiceSettings,
  listVoices,
  listKnowledgeBaseDocuments,
  getKnowledgeBaseDocumentContent,
  createKnowledgeBaseFromFile,
  createKnowledgeBaseFromText,
  deleteKnowledgeBaseDocument,
}

import { api } from '../client'
import { getSession } from '../auth/authService'

function withAuth(options = {}) {
  const session = getSession()
  if (!session?.accessToken) throw new Error('You need to sign in again.')
  return { token: session.accessToken, ...options }
}

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID_CONTACTS

/**
 * GET /analytics/reports/conversations
 * Cursor-paginated. Always scoped to the contacts agent via VITE_ELEVENLABS_AGENT_ID_CONTACTS.
 */
export function listConversations({
  limit = 20, startAfter, status, businessOutcome, priorityLevel,
  language, fromDate, toDate, minScore, maxScore, search, orgId,
} = {}) {
  const q = new URLSearchParams({ limit: String(limit) })
  if (AGENT_ID) q.set('agent_id', AGENT_ID)
  if (orgId) q.set('org_id', orgId)
  if (startAfter) q.set('start_after', startAfter)
  if (status) q.set('status', status)
  if (businessOutcome) q.set('business_outcome', businessOutcome)
  if (priorityLevel) q.set('priority_level', priorityLevel)
  if (language) q.set('language', language)
  if (fromDate) q.set('from_date', fromDate)
  if (toDate) q.set('to_date', toDate)
  if (minScore != null && minScore !== '') q.set('min_score', String(minScore))
  if (maxScore != null && maxScore !== '') q.set('max_score', String(maxScore))
  if (search) q.set('search', search)
  return api.get(`/analytics/reports/conversations?${q.toString()}`, withAuth())
}

/** GET /analytics/reports/conversations/:conversation_id (super_admin must pass orgId) */
export function getConversation(conversationId, { orgId } = {}) {
  const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : ''
  return api.get(`/analytics/reports/conversations/${conversationId}${qs}`, withAuth())
}

/**
 * Fetch the call recording for a conversation as a Blob.
 * The audio endpoint lives outside /api/v1 and uses the static xi-api-key.
 */
export async function getConversationAudio(conversationId) {
  const base = import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v\d+\/?$/, '')
  const key = import.meta.env.VITE_STATIC_KEY_ADMISSIONS
  const res = await fetch(`${base}/redirect/v1/convai/conversations/${conversationId}/audio`, {
    headers: {
      'xi-api-key': key,
      'ngrok-skip-browser-warning': 'true',
    },
  })
  if (!res.ok) throw new Error(`Audio request failed (${res.status})`)
  return res.blob()
}

/**
 * GET /analytics/reports/analytics/agents/:agent_id
 * Aggregated analytics for the contacts agent.
 * - super_admin may pass orgId to scope (or omit for "all")
 * - org_admin's org_id is enforced by the backend from the JWT
 */
export function getAgentAnalytics({ orgId, fromDate, toDate, agentId } = {}) {
  const id = agentId || AGENT_ID
  if (!id) throw new Error('Missing agent id (VITE_ELEVENLABS_AGENT_ID_CONTACTS).')
  const q = new URLSearchParams()
  if (orgId) q.set('org_id', orgId)
  if (fromDate) q.set('from_date', fromDate)
  if (toDate) q.set('to_date', toDate)
  const qs = q.toString()
  return api.get(`/analytics/reports/analytics/agents/${id}${qs ? `?${qs}` : ''}`, withAuth())
}

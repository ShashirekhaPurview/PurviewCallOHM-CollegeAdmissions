import { api } from '../client'
import { getSession } from '../auth/authService'

function withAuth(options = {}) {
  const session = getSession()
  if (!session?.accessToken) throw new Error('You need to sign in again.')
  return { token: session.accessToken, ...options }
}

/**
 * POST /agents/contacts/bulk-call
 * Triggers calls for the given contact_ids.
 * Returns { results: [{ contact_id, success, message, triggered_at, plivo_call_id }], total, succeeded, failed }
 */
export function bulkCallContacts(contactIds, options = {}) {
  const normalized = typeof options === 'string' ? { orgId: options } : options
  const body = { contact_ids: contactIds }
  if (normalized.orgId) body.org_id = normalized.orgId
  if (normalized.agentId) body.agent_id = normalized.agentId
  if (normalized.dynamicVariables && Object.keys(normalized.dynamicVariables).length > 0) {
    body.dynamic_variables = normalized.dynamicVariables
  }
  return api.post('/agents/contacts/bulk-call', body, withAuth())
}

/**
 * GET /plivo/call/:plivo_call_id/status
 * Returns live status (queued/ringing/live/transferred/ended/busy/no_answer/cancelled/failed)
 * plus duration when available.
 * Uses the static xi-api-key header.
 */
export function getCallStatus(plivoCallId) {
  const key = import.meta.env.VITE_STATIC_KEY_ADMISSIONS
  if (!key) throw new Error('VITE_STATIC_KEY_ADMISSIONS is not set in .env')
  return api.get(`/plivo/call/${plivoCallId}/status`, {
    headers: { 'xi-api-key': key },
  })
}

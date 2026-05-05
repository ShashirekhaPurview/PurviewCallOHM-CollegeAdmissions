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
export function bulkCallContacts(contactIds) {
  return api.post('/agents/contacts/bulk-call', { contact_ids: contactIds }, withAuth())
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

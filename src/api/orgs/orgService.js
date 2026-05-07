import { api } from '../client'
import { getSession } from '../auth/authService'

function withAuth(options = {}) {
  const session = getSession()
  if (!session?.accessToken) throw new Error('You need to sign in again.')
  return { token: session.accessToken, ...options }
}

/**
 * GET /orgs?limit=&start_after=
 * Returns { items, limit, next_cursor }
 * Pass next_cursor as start_after to fetch the next page; null means last page.
 */
export function listOrganizations({ limit = 20, startAfter } = {}) {
  const query = new URLSearchParams({ limit: String(limit) })
  if (startAfter) query.set('start_after', startAfter)
  return api.get(`/orgs?${query.toString()}`, withAuth())
}

/** GET /orgs/:org_id */
export function getOrganization(orgId) {
  return api.get(`/orgs/${orgId}`, withAuth())
}

/** POST /orgs - payload: { name, location, agent_id } */
export function createOrganization(payload) {
  return api.post('/orgs', payload, withAuth())
}

/** PATCH /orgs/:org_id - payload: { name } */
export function updateOrganization(orgId, payload) {
  return api.patch(`/orgs/${orgId}`, payload, withAuth())
}

/** POST /orgs/:org_id/activate → { org_id, is_active: true } */
export function activateOrganization(orgId) {
  return api.post(`/orgs/${orgId}/activate`, null, withAuth())
}

/** POST /orgs/:org_id/deactivate → { org_id, is_active: false } */
export function deactivateOrganization(orgId) {
  return api.post(`/orgs/${orgId}/deactivate`, null, withAuth())
}

/**
 * DELETE /orgs/:org_id - permanently deletes an organization and its data.
 * Returns { org_id, deleted: { refresh_tokens, users, contacts, conversations, organizations } }
 * Super-admin only.
 */
export function deleteOrganization(orgId) {
  return api.del(`/orgs/${orgId}`, withAuth())
}

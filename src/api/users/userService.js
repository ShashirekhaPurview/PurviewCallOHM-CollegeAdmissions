import { api } from '../client'
import { getSession } from '../auth/authService'

function withAuth(options = {}) {
  const session = getSession()
  if (!session?.accessToken) throw new Error('You need to sign in again.')
  return { token: session.accessToken, ...options }
}

function buildQuery({ limit = 20, startAfter, role } = {}) {
  const q = new URLSearchParams({ limit: String(limit) })
  if (startAfter) q.set('start_after', startAfter)
  if (role) q.set('role', role)
  return q.toString()
}

/**
 * GET /users - super_admin only. List all users across orgs.
 * Filter by role: super_admin | org_admin | org_user
 */
export function listAllUsers(opts) {
  return api.get(`/users?${buildQuery(opts)}`, withAuth())
}

/** GET /orgs/:org_id/users - list users in an org */
export function listOrgUsers(orgId, opts) {
  return api.get(`/orgs/${orgId}/users?${buildQuery(opts)}`, withAuth())
}

/** GET /orgs/:org_id/users/:user_id */
export function getUser(orgId, userId) {
  return api.get(`/orgs/${orgId}/users/${userId}`, withAuth())
}

/**
 * POST /orgs/:org_id/users - invite a user.
 * payload: { email, password, role: 'org_admin' | 'org_user' }
 */
export function inviteUser(orgId, payload) {
  return api.post(`/orgs/${orgId}/users`, payload, withAuth())
}

/**
 * PATCH /orgs/:org_id/users/:user_id - activate/deactivate.
 * payload: { is_active: boolean }
 */
export function setUserActive(orgId, userId, isActive) {
  return api.patch(`/orgs/${orgId}/users/${userId}`, { is_active: isActive }, withAuth())
}

/**
 * POST /orgs/:org_id/users/:user_id/reset-password - admin-initiated reset.
 * payload: { new_password }
 * Returns 204 (no content).
 */
export function resetUserPassword(orgId, userId, newPassword) {
  return api.post(
    `/orgs/${orgId}/users/${userId}/reset-password`,
    { new_password: newPassword },
    withAuth()
  )
}

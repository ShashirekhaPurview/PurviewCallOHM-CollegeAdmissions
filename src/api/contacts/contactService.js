import { api } from '../client'
import { getSession } from '../auth/authService'

function withAuth(options = {}) {
  const session = getSession()
  if (!session?.accessToken) throw new Error('You need to sign in again.')
  return { token: session.accessToken, ...options }
}

/**
 * GET /contacts - cursor-paginated list.
 * super_admin must pass orgId. org_admin sees all org contacts. org_user sees own.
 */
export function listContacts({ orgId, status, source, limit = 20, startAfter } = {}) {
  const q = new URLSearchParams({ limit: String(limit) })
  if (orgId) q.set('org_id', orgId)
  if (status) q.set('status', status)
  if (source) q.set('source', source)
  if (startAfter) q.set('start_after', startAfter)
  return api.get(`/contacts?${q.toString()}`, withAuth())
}

/** GET /contacts/:contact_id */
export function getContact(contactId) {
  return api.get(`/contacts/${contactId}`, withAuth())
}

/**
 * POST /contacts
 * super_admin must include org_id. source defaults to 'manual', status to 'new'.
 */
export function createContact(payload) {
  return api.post('/contacts', payload, withAuth())
}

/** DELETE /contacts/:contact_id */
export function deleteContact(contactId) {
  return api.del(`/contacts/${contactId}`, withAuth())
}

/** GET /contacts/import/template - returns a CSV blob. */
export function downloadImportTemplate() {
  return api.getBlob('/contacts/import/template', withAuth({
    headers: { Accept: 'text/csv' },
  }))
}

/**
 * POST /contacts/import - multipart upload.
 * super_admin must pass orgId. Returns { total_rows, created, skipped, errors }.
 */
export function importContacts({ orgId, file }) {
  const fd = new FormData()
  fd.append('file', file)
  const path = orgId
    ? `/contacts/import?org_id=${encodeURIComponent(orgId)}`
    : '/contacts/import'
  return api.postForm(path, fd, withAuth())
}

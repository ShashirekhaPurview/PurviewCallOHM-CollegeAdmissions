import seedData from '../../data/orgAgentAssignments.json'

const STORAGE_KEY = 'callohm_org_agent_assignments_v1'

function normalizeItems(items = {}) {
  return Object.fromEntries(
    Object.entries(items || {})
      .filter(([orgId]) => Boolean(orgId))
      .map(([orgId, value]) => [
        orgId,
        {
          org_id: orgId,
          org_name: value?.org_name || '',
          agent_id: value?.agent_id || '',
          source_agent_id: value?.source_agent_id || '',
          created_at: value?.created_at || new Date().toISOString(),
          updated_at: value?.updated_at || new Date().toISOString(),
        },
      ]),
  )
}

function defaultStore() {
  return {
    version: seedData?.version || 1,
    items: normalizeItems(seedData?.items || {}),
  }
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = defaultStore()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }

    const parsed = JSON.parse(raw)
    return {
      version: parsed?.version || 1,
      items: normalizeItems(parsed?.items || {}),
    }
  } catch {
    const initial = defaultStore()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  return store
}

export function getOrgAgentAssignment(orgId) {
  if (!orgId) return null
  return readStore().items[orgId] || null
}

export function upsertOrgAgentAssignment(entry) {
  if (!entry?.org_id) throw new Error('org_id is required for an agent assignment')

  const store = readStore()
  const existing = store.items[entry.org_id]
  const now = new Date().toISOString()
  const nextEntry = {
    org_id: entry.org_id,
    org_name: entry.org_name || existing?.org_name || '',
    agent_id: entry.agent_id || existing?.agent_id || '',
    source_agent_id: entry.source_agent_id || existing?.source_agent_id || '',
    created_at: existing?.created_at || entry.created_at || now,
    updated_at: now,
  }

  return writeStore({
    ...store,
    items: {
      ...store.items,
      [entry.org_id]: nextEntry,
    },
  }).items[entry.org_id]
}

export function renameOrgAgentAssignment(orgId, orgName) {
  if (!orgId) return null
  const existing = getOrgAgentAssignment(orgId)
  if (!existing) return null
  return upsertOrgAgentAssignment({
    ...existing,
    org_name: orgName || existing.org_name,
  })
}

export function listOrgAgentAssignments() {
  return Object.values(readStore().items)
}

export function removeOrgAgentAssignment(orgId) {
  if (!orgId) return false
  const store = readStore()
  if (!store.items[orgId]) return false
  delete store.items[orgId]
  writeStore(store)
  return true
}

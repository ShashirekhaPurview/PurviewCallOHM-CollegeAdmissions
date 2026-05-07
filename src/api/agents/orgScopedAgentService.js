import { getCurrentUser } from '../auth/authService'
import { getOrganization } from '../orgs/orgService'
import {
  duplicateAgent,
  getAgent,
  getConfiguredAgent,
  getConfiguredAgentId,
  listAllAgents,
  updateAgent,
} from './agentConsoleService'
import {
  getOrgAgentAssignment,
  upsertOrgAgentAssignment,
} from '../orgs/orgAgentAssignmentStore'

const ORG_AGENT_SCOPE_TAG = 'callohm_agent_scope:organization'

function getAgentIdValue(agent) {
  return agent?.agent_id || agent?.agentId || agent?.duplicated_agent_id || agent?.duplicate_agent_id || agent?.id || ''
}

export function buildOrganizationAgentName(orgName) {
  return `${orgName || 'Organization'} admissions agent`
}

export function buildOrganizationAgentTag(orgId) {
  return `callohm_org_id:${orgId}`
}

function mergeTags(existingTags = [], orgId) {
  return Array.from(new Set([
    ...(Array.isArray(existingTags) ? existingTags : []),
    ORG_AGENT_SCOPE_TAG,
    buildOrganizationAgentTag(orgId),
  ].filter(Boolean)))
}

async function findTaggedOrganizationAgent(orgId) {
  const tag = buildOrganizationAgentTag(orgId)
  const data = await listAllAgents({ archived: false, page_size: 100 })
  const agents = data?.agents || []
  return agents.find((agent) => Array.isArray(agent?.tags) && agent.tags.includes(tag)) || null
}

function buildAgentIdentityUpdate(masterAgent, org) {
  return {
    name: buildOrganizationAgentName(org?.name),
    tags: mergeTags(masterAgent?.tags, org?.org_id),
  }
}

/**
 * Duplicates the master agent without an org context. Returned `agent_id`
 * is meant to be sent in the create-organization payload; the caller must
 * follow up with `finalizeOrganizationAgent` once the org_id is known.
 */
export async function duplicateMasterAgentForOrg() {
  const masterAgent = await getConfiguredAgent()
  const duplicatedAgent = await duplicateAgent(getConfiguredAgentId())
  const duplicatedAgentId = getAgentIdValue(duplicatedAgent)

  if (!duplicatedAgentId) {
    throw new Error('Agent duplicate succeeded but returned no agent id')
  }

  return { agent_id: duplicatedAgentId, master_agent: masterAgent }
}

/**
 * After an organization has been created with the duplicated agent_id,
 * tag/rename the duplicated agent and persist the local assignment.
 */
export async function finalizeOrganizationAgent(org, { agent_id, master_agent } = {}) {
  if (!org?.org_id) throw new Error('Organization ID is required to finalize the agent')
  if (!agent_id) throw new Error('agent_id is required to finalize the organization agent')

  const masterAgent = master_agent || await getConfiguredAgent()
  await updateAgent(agent_id, buildAgentIdentityUpdate(masterAgent, org))

  return upsertOrgAgentAssignment({
    org_id: org.org_id,
    org_name: org?.name || '',
    agent_id,
    source_agent_id: getConfiguredAgentId(),
  })
}

export async function provisionOrganizationAgent(org) {
  if (!org?.org_id) throw new Error('Organization ID is required to provision an agent')

  const existingAssignment = getOrgAgentAssignment(org.org_id)
  if (existingAssignment?.agent_id) {
    return existingAssignment
  }

  const taggedAgent = await findTaggedOrganizationAgent(org.org_id)
  if (taggedAgent) {
    return upsertOrgAgentAssignment({
      org_id: org.org_id,
      org_name: org?.name || '',
      agent_id: getAgentIdValue(taggedAgent),
      source_agent_id: getConfiguredAgentId(),
    })
  }

  const masterAgent = await getConfiguredAgent()
  const duplicatedAgent = await duplicateAgent(getConfiguredAgentId())
  const duplicatedAgentId = getAgentIdValue(duplicatedAgent)

  if (!duplicatedAgentId) {
    throw new Error('Agent duplicate succeeded but returned no agent id')
  }

  await updateAgent(duplicatedAgentId, buildAgentIdentityUpdate(masterAgent, org))

  return upsertOrgAgentAssignment({
    org_id: org.org_id,
    org_name: org?.name || '',
    agent_id: duplicatedAgentId,
    source_agent_id: getConfiguredAgentId(),
  })
}

export async function getOrganizationAgentContext(orgOrId) {
  const orgId = typeof orgOrId === 'string' ? orgOrId : orgOrId?.org_id
  if (!orgId) throw new Error('Organization ID is required')

  const localAssignment = getOrgAgentAssignment(orgId)
  if (localAssignment?.agent_id) {
    try {
      const agent = await getAgent(localAssignment.agent_id)
      return {
        scope: 'organization',
        agentId: localAssignment.agent_id,
        assignment: localAssignment,
        agent,
      }
    } catch {
      // Fall through to tag search / provisioning.
    }
  }

  const taggedAgent = await findTaggedOrganizationAgent(orgId)
  if (taggedAgent) {
    const assignment = upsertOrgAgentAssignment({
      org_id: orgId,
      org_name: typeof orgOrId === 'string' ? '' : (orgOrId?.name || ''),
      agent_id: getAgentIdValue(taggedAgent),
      source_agent_id: getConfiguredAgentId(),
    })
    return {
      scope: 'organization',
      agentId: assignment.agent_id,
      assignment,
      agent: taggedAgent,
    }
  }

  const org = typeof orgOrId === 'string' ? await getOrganization(orgOrId) : orgOrId
  const assignment = await provisionOrganizationAgent(org)
  const agent = await getAgent(assignment.agent_id)

  return {
    scope: 'organization',
    agentId: assignment.agent_id,
    assignment,
    agent,
  }
}

export async function getCurrentUserAgentContext() {
  const user = getCurrentUser()
  if (!user?.org_id || user.role === 'super_admin') {
    const agentId = getConfiguredAgentId()
    if (!agentId) throw new Error('Missing VITE_ELEVENLABS_AGENT_ID_CONTACTS in .env')
    return {
      scope: 'master',
      agentId,
      assignment: null,
      agent: await getConfiguredAgent(),
    }
  }

  return getOrganizationAgentContext(user.org_id)
}

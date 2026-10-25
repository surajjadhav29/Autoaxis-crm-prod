import api from '../lib/api';

function isRetryable(err) {
  if (!err.response) return true;
  const status = err.response.status;
  return status === 502 || status === 503 || status === 504;
}

/** Extract MH## office code for matching (e.g. MH12, MH-12, PUNE (MH12)). */
export function rtoMatchKey(name) {
  const s = String(name || '')
    .trim()
    .toUpperCase();
  const m = s.match(/MH[-\s]?(\d{2})/);
  if (m) return `MH${m[1]}`;
  const head = s.split(/[\s-]+/)[0];
  return head || '';
}

export function fieldAgentRtoLabel(agent) {
  if (!agent) return '';
  return String(agent.rtoName || agent.district || '').trim();
}

/** Read-only label for file list / cards (name + last 4 of mobile when available). */
export function fieldAgentDisplayForFile(file) {
  const name = String(file?.fieldAgentName || '').trim();
  if (!name) return '—';
  const digits = String(file?.fieldAgentMobile || '').replace(/\D/g, '');
  if (digits.length >= 4) {
    return `${name} - ${digits.slice(-4)}`;
  }
  return name;
}

export function fieldAgentOptionLabel(agent) {
  const rto = fieldAgentRtoLabel(agent);
  const mobile = String(agent.mobile || '').trim();
  const description = String(agent.description || '').trim();
  const parts = [agent.name];
  if (mobile) parts.push(mobile);
  if (description) parts.push(description);
  if (rto) parts.push(rto);
  return parts.join(' · ');
}

export const MAX_FIELD_AGENTS_PER_RTO = 2;

/** Group flat agent docs into one office row per RTO (Agent 1 / Agent 2). */
export function groupFieldAgentsByRto(agents) {
  if (!Array.isArray(agents) || !agents.length) return [];
  const map = new Map();
  for (const agent of agents) {
    const key = rtoMatchKey(fieldAgentRtoLabel(agent)) || agent.id;
    if (!map.has(key)) {
      map.set(key, {
        id: agent.id,
        rtoName: fieldAgentRtoLabel(agent),
        address: String(agent.address || '').trim(),
        agents: [],
      });
    }
    const office = map.get(key);
    office.agents.push(agent);
    if (!office.address && agent.address) {
      office.address = String(agent.address).trim();
    }
  }
  const offices = [...map.values()];
  for (const office of offices) {
    office.agents.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' });
    });
    office.id = office.agents[0]?.id || office.id;
  }
  offices.sort((a, b) =>
    String(a.rtoName || '').localeCompare(String(b.rtoName || ''), 'en', { sensitivity: 'base' })
  );
  return offices;
}

/** All agents for this RTO code (name A→Z / created order). */
export function listFieldAgentsForRto(agents, rtoName, { excludeId, activeOnly = false } = {}) {
  const key = rtoMatchKey(rtoName);
  if (!key || !Array.isArray(agents)) return [];
  const matches = agents.filter((a) => {
    if (excludeId && a.id === excludeId) return false;
    if (activeOnly && a.isActive === false) return false;
    return rtoMatchKey(fieldAgentRtoLabel(a)) === key;
  });
  matches.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' });
  });
  return matches;
}

export function findFieldAgentForRto(agents, rtoName, { excludeId } = {}) {
  return listFieldAgentsForRto(agents, rtoName, { excludeId })[0] || null;
}

export function countFieldAgentsForRto(agents, rtoName, { excludeId } = {}) {
  return listFieldAgentsForRto(agents, rtoName, { excludeId }).length;
}

export function pickFieldAgentForRto(agents, rtoName) {
  return listFieldAgentsForRto(agents, rtoName, { activeOnly: true })[0] || null;
}

export async function fetchFieldAgents({ activeOnly = false, search = '' } = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const params = {};
      if (activeOnly) params.activeOnly = '1';
      if (search && String(search).trim()) params.search = String(search).trim();
      const { data } = await api.get('/field-agents', { params });
      return data.fieldAgents || [];
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === 2) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function createFieldAgentOffice({ rtoName, address, agent1, agent2 }) {
  const body = {
    rtoName,
    address,
    agent1,
  };
  if (agent2?.name) body.agent2 = agent2;
  const { data } = await api.post('/field-agents', body);
  return data.office || data;
}

export async function updateFieldAgentOffice({ rtoName, address, agent1, agent2, agentIds }) {
  const body = {
    rtoName,
    address,
    agent1,
    agentIds,
  };
  if (agent2?.name) body.agent2 = agent2;
  else body.agent2 = null;
  const { data } = await api.put('/field-agents/office', body);
  return data.office || data;
}

export async function deleteFieldAgentOffice({ rtoName, agentIds }) {
  const { data } = await api.delete('/field-agents/office', {
    data: { rtoName, agentIds },
  });
  return data;
}

/** @deprecated Prefer createFieldAgentOffice */
export async function createFieldAgent({ name, mobile, rtoName, address }) {
  const { data } = await api.post('/field-agents', { name, mobile, rtoName, address });
  return data.fieldAgent || data.office?.agents?.[0];
}

export async function updateFieldAgent(id, fields) {
  const { data } = await api.put(`/field-agents/${id}`, fields);
  return data.fieldAgent;
}

export async function deleteFieldAgent(id) {
  const { data } = await api.delete(`/field-agents/${id}`);
  return data;
}

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
  const parts = [agent.name];
  if (mobile) parts.push(mobile);
  if (rto) parts.push(rto);
  return parts.join(' · ');
}

/** Agent already registered for this RTO code (any label spelling of MH12, etc.). */
export function findFieldAgentForRto(agents, rtoName, { excludeId } = {}) {
  const key = rtoMatchKey(rtoName);
  if (!key || !Array.isArray(agents)) return null;
  return (
    agents.find((a) => {
      if (excludeId && a.id === excludeId) return false;
      return rtoMatchKey(fieldAgentRtoLabel(a)) === key;
    }) || null
  );
}

/** First active agent for this RTO (name A→Z when several match). */
export function pickFieldAgentForRto(agents, rtoName) {
  const key = rtoMatchKey(rtoName);
  if (!key || !Array.isArray(agents)) return null;
  const matches = agents.filter((a) => {
    if (a.isActive === false) return false;
    return rtoMatchKey(fieldAgentRtoLabel(a)) === key;
  });
  if (!matches.length) return null;
  matches.sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' })
  );
  return matches[0];
}

export async function fetchFieldAgents({ activeOnly = false } = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const params = activeOnly ? { activeOnly: '1' } : undefined;
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

export async function createFieldAgent({ name, mobile, rtoName, address }) {
  const { data } = await api.post('/field-agents', { name, mobile, rtoName, address });
  return data.fieldAgent;
}

export async function updateFieldAgent(id, fields) {
  const { data } = await api.put(`/field-agents/${id}`, fields);
  return data.fieldAgent;
}

export async function deleteFieldAgent(id) {
  const { data } = await api.delete(`/field-agents/${id}`);
  return data;
}

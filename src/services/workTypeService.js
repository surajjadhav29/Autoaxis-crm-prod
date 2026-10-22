import api from '../lib/api';

function isRetryable(err) {
  if (!err.response) return true; // network / backend restarting
  const status = err.response.status;
  return status === 502 || status === 503 || status === 504;
}

/** GET /work-types with a short retry — covers BE nodemon restarts & Mongo blips. */
export async function fetchWorkTypes() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data } = await api.get('/work-types');
      return data.workTypes || [];
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === 2) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * @param {{ name: string, documents?: string[] }} fields
 */
export async function createWorkType({ name, documents = [] }) {
  const { data } = await api.post('/work-types', { name, documents });
  return data.workType;
}

export async function updateWorkType(id, { name, documents }) {
  const { data } = await api.put(`/work-types/${id}`, { name, documents });
  return data.workType;
}

export async function deleteWorkType(id) {
  const { data } = await api.delete(`/work-types/${id}`);
  return data;
}

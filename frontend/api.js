const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listApps: () => request('/api/apps'),
  getApp: (id) => request(`/api/apps/${id}`),
  createApp: (definition) => request('/api/apps', { method: 'POST', body: JSON.stringify(definition) }),
  listRecords: (appId) => request(`/api/apps/${appId}/records`),
  createRecord: (appId, data) => request(`/api/apps/${appId}/records`, { method: 'POST', body: JSON.stringify({ data }) }),
  updateRecord: (appId, recordId, data) => request(`/api/apps/${appId}/records/${recordId}`, { method: 'PUT', body: JSON.stringify({ data }) }),
  deleteRecord: (appId, recordId) => request(`/api/apps/${appId}/records/${recordId}`, { method: 'DELETE' }),
};

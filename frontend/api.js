import { getToken } from './auth-client.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export class AuthError extends Error {}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || `${res.status} ${res.statusText}`;
    if (res.status === 401) throw new AuthError(message);
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listApps: () => request('/api/apps'),
  getApp: (id) => request(`/api/apps/${id}`),
  createApp: (definition) => request('/api/apps', { method: 'POST', body: JSON.stringify(definition) }),
  deleteApp: (id) => request(`/api/apps/${id}`, { method: 'DELETE' }),
  listRecords: (appId) => request(`/api/apps/${appId}/records`),
  createRecord: (appId, data) => request(`/api/apps/${appId}/records`, { method: 'POST', body: JSON.stringify({ data }) }),
  updateRecord: (appId, recordId, data) => request(`/api/apps/${appId}/records/${recordId}`, { method: 'PUT', body: JSON.stringify({ data }) }),
  deleteRecord: (appId, recordId) => request(`/api/apps/${appId}/records/${recordId}`, { method: 'DELETE' }),
  requestUpload: (filename, contentType) =>
    request('/api/uploads', { method: 'POST', body: JSON.stringify({ filename, contentType }) }),
  listAccess: (appId) => request(`/api/apps/${appId}/access`),
  grantAccess: (appId, email, relation) =>
    request(`/api/apps/${appId}/access`, { method: 'POST', body: JSON.stringify({ email, relation }) }),
  revokeAccess: (appId, userId) => request(`/api/apps/${appId}/access/${userId}`, { method: 'DELETE' }),
  listAuditLog: () => request('/api/audit-log'),
};

export async function uploadFile(file, onProgress) {
  const { uploadUrl, publicUrl } = await api.requestUpload(file.name, file.type);
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`上傳失敗（${xhr.status}）`)));
    xhr.onerror = () => reject(new Error('上傳失敗（網路錯誤）'));
    xhr.send(file);
  });
  return publicUrl;
}

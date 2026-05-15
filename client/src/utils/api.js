const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function headers() {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  signup: (body) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  verifyEmail: (body) => apiFetch('/auth/verify', { method: 'POST', body: JSON.stringify(body) }),
  resendCode: (username) => apiFetch('/auth/resend-code', { method: 'POST', body: JSON.stringify({ username }) }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/profile/me'),
  getPublicProfile: (username) => apiFetch(`/profile/${username}`),
  updateProfile: (body) => apiFetch('/profile', { method: 'PUT', body: JSON.stringify(body) }),
  getDesign: () => apiFetch('/design'),
  updateDesign: (body) => apiFetch('/design', { method: 'PUT', body: JSON.stringify(body) }),
  addLink: (body) => apiFetch('/links', { method: 'POST', body: JSON.stringify(body) }),
  updateLink: (id, body) => apiFetch(`/links/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLink: (id) => apiFetch(`/links/${id}`, { method: 'DELETE' }),
  reorderLinks: (order) => apiFetch('/links/reorder', { method: 'PUT', body: JSON.stringify({ order }) }),
  admin: {
    stats: () => apiFetch('/admin/stats'),
    users: () => apiFetch('/admin/users'),
    user: (id) => apiFetch(`/admin/users/${id}`),
    updateProfile: (id, body) => apiFetch(`/admin/users/${id}/profile`, { method: 'PUT', body: JSON.stringify(body) }),
    resetPassword: (id, password) => apiFetch(`/admin/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
    toggleAdmin: (id) => apiFetch(`/admin/users/${id}/admin`, { method: 'PUT' }),
    deleteUser: (id) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
    keys: () => apiFetch('/admin/keys'),
    genKey: (note, duration_days) => apiFetch('/admin/keys', { method: 'POST', body: JSON.stringify({ note, duration_days }) }),
    updateKey: (id, duration_days) => apiFetch(`/admin/keys/${id}`, { method: 'PUT', body: JSON.stringify({ duration_days }) }),
    deleteKey: (id) => apiFetch(`/admin/keys/${id}`, { method: 'DELETE' }),
    updateUserExpiry: (id, key_expires_at) => apiFetch(`/admin/users/${id}/expiry`, { method: 'PUT', body: JSON.stringify({ key_expires_at }) }),
  },
};

import api from '../lib/api';
import { SYSTEM_ACCOUNT_EMAIL } from '../lib/constants';

function normalizeUser(user) {
  return {
    id: String(user.id || user._id || ''),
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt || null,
  };
}

export async function fetchAllUsers() {
  const { data } = await api.get('/users');
  return (data.users || [])
    .map(normalizeUser)
    .filter((u) => u.email !== SYSTEM_ACCOUNT_EMAIL);
}

export async function createUser({ fullName, email, role, password }) {
  const { data } = await api.post('/users', { fullName, email, role, password });
  return normalizeUser(data.user);
}

/**
 * @param {string} userId
 * @param {{ fullName: string, email?: string, role: string, password?: string }} fields
 */
export async function updateUser(userId, { fullName, email, role, password }) {
  const payload = { fullName, role };
  if (email) payload.email = email;
  if (password) payload.password = password;
  const { data } = await api.put(`/users/${userId}`, payload);
  return normalizeUser(data.user);
}

export async function deleteUser(userId) {
  const { data } = await api.delete(`/users/${userId}`);
  return data;
}

export async function fetchUserAssignedFileCount(userId) {
  const { data } = await api.get(`/users/${userId}/file-count`);
  return Number(data.count) || 0;
}

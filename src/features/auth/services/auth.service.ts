import api from '@/lib/api';
import type { User } from '@/types/user.types';
import type { AuthSession, LoginCredentials } from '../types/auth.types';
import { clearSession, persistSession, readStoredSession } from './session.service';

interface ApiLoginResponse {
  token: string;
  user: User;
}

interface ApiMeResponse {
  user: User;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error ===
      'string'
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const { username, password } = credentials;

  try {
    const { data } = await api.post<ApiLoginResponse>('/auth/login', {
      username,
      password,
    });
    const session: AuthSession = { token: data.token, user: data.user };
    persistSession(session);
    return session;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Invalid username or password.'));
  }
}

export async function restoreSession(): Promise<AuthSession | null> {
  const stored = readStoredSession();
  if (!stored) return null;

  try {
    const { data } = await api.get<ApiMeResponse>('/auth/me');
    const session: AuthSession = { token: stored.token, user: data.user };
    persistSession(session);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function logout(): void {
  clearSession();
}

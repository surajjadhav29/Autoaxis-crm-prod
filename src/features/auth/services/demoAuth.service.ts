import type { AuthSession } from '../types/auth.types';
import type { User } from '@/types/user.types';
import { isDemoToken } from '@/lib/demoUsers';

export function isDemoSession(token: string | null): boolean {
  return isDemoToken(token);
}

export function readStoredSession(): AuthSession | null {
  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');
  if (!token || !rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as User;
    return { token, user };
  } catch {
    return null;
  }
}

export function persistSession(session: AuthSession): void {
  localStorage.setItem('token', session.token);
  localStorage.setItem('user', JSON.stringify(session.user));
}

export function clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

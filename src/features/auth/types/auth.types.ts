import type { User } from '@/types/user.types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  /** Set on each successful sign-in (not on session restore) to drive post-login UI. */
  loginSessionKey: number | null;
}

export const AUTH_STORAGE_KEYS = {
  token: 'token',
  user: 'user',
} as const;

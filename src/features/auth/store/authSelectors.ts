import type { RootState } from '@/app/store';

export const selectAuth = (state: RootState) => state.auth;

export const selectUser = (state: RootState) => state.auth.user;

export const selectAuthToken = (state: RootState) => state.auth.token;

export const selectAuthLoading = (state: RootState) => state.auth.loading;

export const selectAuthInitialized = (state: RootState) => state.auth.initialized;

export const selectAuthError = (state: RootState) => state.auth.error;

export const selectIsAdmin = (state: RootState) => state.auth.user?.role === 'superadmin';

export const selectLoginSessionKey = (state: RootState) => state.auth.loginSessionKey;

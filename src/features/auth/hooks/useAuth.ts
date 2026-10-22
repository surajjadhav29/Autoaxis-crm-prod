import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import type { User } from '@/types/user.types';
import { loginUser, logoutUser } from '../store/authSlice';
import {
  selectAuthError,
  selectAuthLoading,
  selectIsAdmin,
  selectUser,
} from '../store/authSelectors';

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isAdmin = useAppSelector(selectIsAdmin);

  const login = useCallback(
    async (username: string, password: string): Promise<User> => {
      const session = await dispatch(loginUser({ username, password })).unwrap();
      return session.user;
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch(logoutUser());
  }, [dispatch]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin,
  };
}

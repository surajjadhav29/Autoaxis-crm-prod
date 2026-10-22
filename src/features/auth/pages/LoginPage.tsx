import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { clearAuthError } from '../store/authSlice';
import { selectAuthError, selectAuthLoading } from '../store/authSelectors';
import { useAuth } from '../hooks/useAuth';
import { LoginBrandingPanel } from '../components/LoginBrandingPanel';
import { LoginForm } from '../components/LoginForm';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { login } = useAuth();
  const reduxError = useAppSelector(selectAuthError);
  const reduxLoading = useAppSelector(selectAuthLoading);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setLocalError(null);
    dispatch(clearAuthError());
    setSubmitting(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setLocalError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const error = localError ?? reduxError;
  const loading = submitting || reduxLoading;

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <LoginBrandingPanel />
      <main className="relative flex min-h-screen items-center justify-center p-4 sm:px-10 sm:py-12 lg:px-16 xl:px-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#dbdfe5] to-transparent lg:hidden" />
        <LoginForm onSubmit={handleLogin} error={error} loading={loading} />
      </main>
    </div>
  );
}

import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectAuthInitialized, selectUser } from '../store/authSelectors';

export default function ProtectedRoute() {
  const user = useAppSelector(selectUser);
  const initialized = useAppSelector(selectAuthInitialized);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-axis-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-axis-border border-t-axis-red" />
          <p className="text-sm tracking-widest text-axis-muted uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

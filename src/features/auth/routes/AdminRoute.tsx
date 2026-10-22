import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectIsAdmin } from '../store/authSelectors';

export default function AdminRoute() {
  const isAdmin = useAppSelector(selectIsAdmin);
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

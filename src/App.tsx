import { Navigate, Route, Routes } from 'react-router-dom';
import AppProviders from '@/app/providers/AppProviders';
import {
  AdminRoute,
  LoginRedirect,
  ProtectedRoute,
} from '@/features/auth';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardPage from '@/pages/DashboardPage';
import UsersPage from '@/pages/UsersPage';
import WorkTypesPage from '@/pages/WorkTypesPage';
import FieldAgentsPage from '@/pages/FieldAgentsPage';
import NewEntryPage from '@/pages/NewEntryPage';
import EditFilePage from '@/pages/EditFilePage';
import FilesPage from '@/pages/FilesPage';
import DealerRegistryPage from '@/pages/DealerRegistryPage';
import DealerBillingStudioPage from '@/pages/DealerBillingStudioPage';

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/login" element={<LoginRedirect />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/files/new" element={<NewEntryPage />} />
            <Route path="/files/:id/edit" element={<EditFilePage />} />
            <Route path="/admin/work-types" element={<WorkTypesPage />} />
            <Route path="/admin/field-agents" element={<FieldAgentsPage />} />
            <Route path="/dealers" element={<DealerRegistryPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/users/create" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/billing" element={<DealerBillingStudioPage />} />
            </Route>
            <Route path="/admin/whatsapp" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppProviders>
  );
}

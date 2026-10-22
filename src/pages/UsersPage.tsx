import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { UserPlus, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import {
  fetchAllUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchUserAssignedFileCount,
} from '../services/userService';
import { SYSTEM_ACCOUNT_EMAIL } from '../lib/constants';
import { useToast } from '../hooks/useToast';
import StaffTable from '../components/StaffTable';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import { getApiError } from '../lib/apiError';
import type { User, UserRole } from '@/types/user.types';

interface UserForm {
  fullName: string;
  email: string;
  role: UserRole | string;
  password: string;
}

const MAX_USERS = 6;
const FORM_ANIM_MS = 320;

const emptyForm = {
  fullName: '',
  email: '',
  role: 'staff',
  password: '',
};

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'superadmin', label: 'Super Admin' },
];

const inputClass =
  'w-full min-h-11 min-w-0 rounded-[10px] border border-[#d8dde5] bg-white px-3.5 py-2.5 text-sm text-[#1e242c] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_3px_rgba(26,115,232,0.14)]';

const selectClass = `${inputClass} cursor-pointer appearance-none bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-10`;
const selectChevron =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23667488' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")]";

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-[#1a73e8] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-55 min-w-[140px]';

const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[#dbdfe5] bg-white px-5 py-2.5 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] min-w-[140px]';

function userToForm(user: User): UserForm {
  return {
    fullName: user.fullName || '',
    email: user.email || '',
    role: user.role || 'staff',
    password: '',
  };
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [checkingAssignments, setCheckingAssignments] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);
  const { toast, showToast, clearToast } = useToast();

  const visibleUsers = users.filter((u) => u.email !== SYSTEM_ACCOUNT_EMAIL);
  const atUserLimit = visibleUsers.length >= MAX_USERS;
  const isEditing = formMode === 'edit';
  const canCreateMore = !atUserLimit;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      setUsers(allUsers);
      setError('');
    } catch {
      setUsers([]);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openForm = useCallback(() => {
    setFormMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFormVisible(true));
    });
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    window.setTimeout(() => {
      setFormMounted(false);
      setFormMode('create');
      setEditingUserId(null);
      setForm(emptyForm);
      setFormError('');
      setFormSuccess(false);
    }, FORM_ANIM_MS);
  }, []);

  const openCreateForm = () => {
    if (!canCreateMore) return;
    setFormMode('create');
    setEditingUserId(null);
    setForm(emptyForm);
    setFormError('');
    setFormSuccess(false);
    openForm();
  };

  const openEditForm = (user: User) => {
    setFormMode('edit');
    setEditingUserId(user.id);
    setForm(userToForm(user));
    setFormError('');
    setFormSuccess(false);
    openForm();
  };

  const handleCreateToggle = () => {
    if (formMounted && formMode === 'create') {
      closeForm();
      return;
    }
    if (formMounted) {
      closeForm();
      window.setTimeout(openCreateForm, FORM_ANIM_MS);
      return;
    }
    openCreateForm();
  };

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
    setFormSuccess(false);
  };

  const validatePasswords = () => {
    if (isEditing && !form.password) return true;

    if (!isEditing && form.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return false;
    }

    if (isEditing && form.password && form.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!validatePasswords()) return;

    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        role: form.role,
        password: form.password || undefined,
      };

      if (isEditing && editingUserId) {
        await updateUser(editingUserId, payload);
      } else {
        if (!form.password) {
          setFormError('Password is required.');
          return;
        }
        await createUser({ ...payload, email: form.email.trim() });
      }

      setFormSuccess(true);
      setForm(emptyForm);
      await loadUsers();
      showToast(
        isEditing ? 'User updated successfully' : 'User created successfully',
      );

      window.setTimeout(() => {
        setFormSuccess(false);
        closeForm();
      }, 1500);
    } catch (err) {
      setFormError(
        getApiError(err, isEditing ? 'Failed to update user.' : 'Failed to create user.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (target: User) => {
    setDeleteError('');
    setAssignedCount(0);
    setDeleteTarget(target);
    setCheckingAssignments(true);
    try {
      const count = await fetchUserAssignedFileCount(target.id);
      setAssignedCount(count);
      if (count > 0) {
        setDeleteError(
          `This user has ${count} file${count === 1 ? '' : 's'} assigned. Please reassign ${
            count === 1 ? 'it' : 'them'
          } to another user (in File Records) before deleting this user.`,
        );
      }
    } catch {
      // If the check fails, allow the attempt; the backend still blocks deletion.
      setAssignedCount(0);
    } finally {
      setCheckingAssignments(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError('');
    setAssignedCount(0);
    setCheckingAssignments(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || checkingAssignments || assignedCount > 0) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      setAssignedCount(0);
      await loadUsers();
      showToast('User deleted successfully');
    } catch (err) {
      setDeleteError(getApiError(err, 'Failed to delete user.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="crm-page crm-form-page crm-page--users">
      <div className="crm-form-page-head">
        <div className="crm-form-page-title-row crm-page-head-row">
          <div className="crm-page-head">
            <h1 className="crm-title">All Users</h1>
          </div>
          <button
            type="button"
            onClick={handleCreateToggle}
            disabled={!formMounted && !canCreateMore}
            className="crm-btn crm-btn--primary shrink-0 disabled:cursor-not-allowed disabled:opacity-55"
            title={
              !canCreateMore ? `Maximum ${MAX_USERS} users allowed` : undefined
            }
          >
            {formMounted && formMode === 'create' ? (
              <X size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {formMounted && formMode === 'create' ? 'Close' : 'Create User'}
          </button>
        </div>
      </div>

      <div className="crm-users-body">

      {formMounted && (
        <div
          className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            formVisible
              ? 'pointer-events-auto mb-5 grid-rows-[1fr] opacity-100 translate-y-0'
              : 'pointer-events-none mb-0 grid-rows-[0fr] opacity-0 -translate-y-2.5'
          }`}
          role="region"
          aria-label={
            isEditing ? 'Edit staff user form' : 'Create staff user form'
          }
        >
          <div className="min-h-0 overflow-hidden">
            <div className="w-full max-w-full overflow-hidden rounded-lg border border-[#dbdfe5] bg-white">
              {formSuccess ? (
                <div className="flex items-center gap-2.5 px-5 py-6 text-sm text-[#1d7f50] md:px-6">
                  <CheckCircle size={20} className="shrink-0 text-green-500" />
                  {isEditing
                    ? 'User updated successfully!'
                    : 'User created successfully!'}
                </div>
              ) : (
                <form
                  key={isEditing ? `edit-${editingUserId}` : 'create'}
                  onSubmit={handleSubmit}
                  className="p-5 md:p-6"
                  autoComplete="off"
                >
                  <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-[#3d4654]">
                        Full Name *
                      </label>
                      <input
                        name="fullName"
                        className={inputClass}
                        placeholder="Rahul Sharma"
                        value={form.fullName}
                        onChange={handleFormChange}
                        autoComplete="off"
                        autoFocus={isEditing}
                        required
                      />
                    </div>

                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-[#3d4654]">
                        Email ID *
                      </label>
                      <input
                        name="email"
                        type="email"
                        className={`${inputClass} ${
                          isEditing ? 'cursor-not-allowed bg-[#f3f4f6] text-[#667488]' : ''
                        }`}
                        placeholder="rahul@autoaxis.com"
                        value={form.email}
                        onChange={isEditing ? undefined : handleFormChange}
                        readOnly={isEditing}
                        disabled={isEditing}
                        autoComplete="off"
                        required={!isEditing}
                        tabIndex={isEditing ? -1 : 0}
                        title={isEditing ? 'Email cannot be changed' : undefined}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label
                        className="text-[13px] font-medium text-[#3d4654]"
                        htmlFor="user-role"
                      >
                        Role *
                      </label>
                      <select
                        id="user-role"
                        name="role"
                        className={`${selectClass} ${selectChevron}`}
                        value={form.role}
                        onChange={handleFormChange}
                        required
                      >
                        {ROLE_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-[#3d4654]">
                        Password {isEditing ? '(optional)' : '*'}
                      </label>
                      <input
                        name="password"
                        type="password"
                        className={inputClass}
                        placeholder={
                          isEditing
                            ? 'Leave blank to keep unchanged'
                            : 'Minimum 6 characters'
                        }
                        value={form.password}
                        onChange={handleFormChange}
                        required={!isEditing}
                        minLength={isEditing ? undefined : 6}
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="mt-4 break-words rounded-[10px] border border-[#f8e4e4] bg-[#fef7f7] px-4 py-3 text-[13px] text-[#c40020]">
                      {formError}
                    </div>
                  )}

                  <div className="mt-[6px] flex flex-wrap items-center justify-center gap-2.5 pt-[5px]">
                    <button
                      type="submit"
                      disabled={submitting}
                      className={btnPrimary}
                    >
                      {submitting
                        ? isEditing
                          ? 'Saving…'
                          : 'Creating…'
                        : isEditing
                          ? 'Save Changes'
                          : 'Create User'}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className={btnSecondary}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-[10px] border border-[#f8e4e4] bg-[#fef7f7] px-4 py-3 text-[13px] text-[#c40020]">
          {error}
        </div>
      ) : (
        <StaffTable
          users={visibleUsers}
          loading={loading}
          onEdit={openEditForm}
          onDelete={handleDeleteRequest}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={assignedCount > 0 ? 'Cannot delete this user' : 'Delete this user?'}
        description={
          deleteTarget
            ? checkingAssignments
              ? `Checking files assigned to ${deleteTarget.fullName}…`
              : assignedCount > 0
                ? `${deleteTarget.fullName} (${deleteTarget.email}) still has files assigned.`
                : `${deleteTarget.fullName} (${deleteTarget.email}) will be permanently deleted. This cannot be undone.`
            : undefined
        }
        error={deleteError}
        confirmLabel={
          checkingAssignments ? 'Checking…' : deleting ? 'Deleting…' : 'Delete'
        }
        confirmDisabled={checkingAssignments || assignedCount > 0}
        cancelLabel={assignedCount > 0 ? 'Close' : 'Cancel'}
        destructive={assignedCount === 0}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onClose={clearToast}
        />
      )}
      </div>
    </div>
  );
}

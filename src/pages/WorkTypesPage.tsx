import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useIsMobileList } from '../hooks/useIsMobileList';
import { ClipboardList, X, CheckCircle } from 'lucide-react';
import {
  fetchWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType,
} from '../services/workTypeService';
import { WORK_TYPE_DOCUMENTS } from '../lib/workTypeDocuments';
import { useToast } from '../hooks/useToast';
import WorkTypeTable from '../components/WorkTypeTable';
import DocumentChecklist from '../components/form/DocumentChecklist';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import Toast from '../components/Toast';
import { getApiError } from '../lib/apiError';
import type { WorkType } from '@/types/file.types';

interface WorkTypeForm {
  name: string;
  documents: string[];
}

const FORM_ANIM_MS = 320;
const PAGE_SIZE_OPTIONS = [15, 20];

const emptyForm: WorkTypeForm = {
  name: '',
  documents: [],
};

function normalizeNameKey(name: string) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

const inputClass =
  'w-full min-h-11 min-w-0 rounded-[10px] border border-[#d8dde5] bg-white px-3.5 py-2.5 text-sm text-[#1e242c] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_3px_rgba(26,115,232,0.14)]';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-[#1a73e8] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-55 min-w-[140px]';

const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[#dbdfe5] bg-white px-5 py-2.5 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] min-w-[140px]';

export default function WorkTypesPage() {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkTypeForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { toast, showToast, clearToast } = useToast();

  const isEditing = formMode === 'edit';
  const isMobileList = useIsMobileList();

  // Keep any saved docs that are not in the catalog visible when editing,
  // so Select all / Clear all cannot silently drop them.
  const documentOptions = useMemo(() => {
    const extras = form.documents.filter((doc) => !WORK_TYPE_DOCUMENTS.includes(doc));
    return extras.length ? [...WORK_TYPE_DOCUMENTS, ...extras] : WORK_TYPE_DOCUMENTS;
  }, [form.documents]);

  const totalPages = Math.max(1, Math.ceil(workTypes.length / pageSize));
  const pagedWorkTypes = useMemo(() => {
    if (isMobileList) return workTypes.slice(0, page * pageSize);
    const start = (page - 1) * pageSize;
    return workTypes.slice(start, start + pageSize);
  }, [workTypes, page, pageSize, isMobileList]);

  const handleLoadMore = useCallback(() => {
    if (!isMobileList || page >= totalPages) return;
    setPage((current) => (current < totalPages ? current + 1 : current));
  }, [isMobileList, page, totalPages]);

  const loadWorkTypes = async () => {
    setLoading(true);
    try {
      const list = await fetchWorkTypes();
      setWorkTypes(list);
      setError('');
      setPage((prev) => {
        const pages = Math.max(1, Math.ceil(list.length / pageSize));
        return Math.min(prev, pages);
      });
    } catch {
      setWorkTypes([]);
      setError('Failed to load work types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkTypes();
  }, []);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [isMobileList, pageSize]);

  const openForm = useCallback(() => {
    setFormMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFormVisible(true));
    });
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setTimeout(() => {
      setFormMounted(false);
      setFormMode('create');
      setEditingId(null);
      setForm(emptyForm);
      setFormError('');
      setFormSuccess(false);
    }, FORM_ANIM_MS);
  }, []);

  const handleCreateToggle = () => {
    if (formMounted && formMode === 'create') {
      closeForm();
      return;
    }
    setFormMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setFormSuccess(false);
    openForm();
  };

  const handleEdit = (item: WorkType) => {
    setFormMode('edit');
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      documents: Array.isArray(item.documents) ? [...item.documents] : [],
    });
    setFormError('');
    setFormSuccess(false);
    openForm();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const name = form.name.trim();
    if (!name) {
      setFormError('Work type name is required.');
      return;
    }

    const key = normalizeNameKey(name);
    const duplicate = workTypes.find(
      (w) => normalizeNameKey(w.name) === key && (!isEditing || w.id !== editingId)
    );
    if (duplicate) {
      setFormError('This work type already exists (name must be unique).');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await updateWorkType(editingId, {
          name,
          documents: form.documents,
        });
        showToast('Work type updated successfully');
      } else {
        await createWorkType({
          name,
          documents: form.documents,
        });
        showToast('Work type created successfully');
      }
      setFormSuccess(true);
      await loadWorkTypes();
      setTimeout(() => closeForm(), 900);
    } catch (err) {
      setFormError(getApiError(err, 'Failed to save work type.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteWorkType(deleteTarget.id);
      setDeleteTarget(null);
      await loadWorkTypes();
      showToast('Work type deleted successfully');
    } catch (err) {
      setDeleteError(getApiError(err, 'Failed to delete work type.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="crm-page crm-form-page crm-page--worktypes">
      <div className="crm-form-page-head">
        <div className="crm-form-page-title-row crm-page-head-row">
          <div className="crm-page-head">
            <h1 className="crm-title">Work Types</h1>
          </div>
          <button
            type="button"
            onClick={handleCreateToggle}
            className="crm-btn crm-btn--primary"
          >
            {formMounted && formMode === 'create' ? (
              <X size={16} />
            ) : (
              <ClipboardList size={16} />
            )}
            {formMounted && formMode === 'create' ? 'Close' : 'Create Work Type'}
          </button>
        </div>
      </div>

      <div className="crm-worktypes-body">

      {formMounted && (
        <div
          className={`crm-worktypes-form grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            formVisible
              ? 'mb-0 grid-rows-[1fr] opacity-100 translate-y-0'
              : 'mb-0 grid-rows-[0fr] opacity-0 -translate-y-2.5'
          }`}
          role="region"
          aria-label={isEditing ? 'Edit work type form' : 'Create work type form'}
        >
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <div className="w-full max-w-full rounded-lg border border-[#dbdfe5] bg-white">
              {formSuccess ? (
                <div className="flex items-center gap-2.5 px-5 py-6 text-sm text-[#1d7f50] md:px-6">
                  <CheckCircle size={20} className="shrink-0 text-green-500" />
                  {isEditing
                    ? 'Work type updated successfully!'
                    : 'Work type created successfully!'}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <div className="flex flex-col gap-5 p-5 md:p-6">
                    <div className="flex max-w-md flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-[#3d4654]">
                        Work type name *
                      </label>
                      <input
                        name="name"
                        className={inputClass}
                        placeholder="e.g. TO, ONLY HPA"
                        value={form.name}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        required
                      />
                      <p className="m-0 text-[12px] text-[#667488]">
                        Saved in uppercase. “to” and “TO” are treated as the same name.
                      </p>
                    </div>

                    <DocumentChecklist
                      label="Document list"
                      hint="Select the documents required for this work type."
                      options={documentOptions}
                      value={form.documents}
                      onChange={(documents) => setForm((prev) => ({ ...prev, documents }))}
                    />

                    {formError ? (
                      <p className="m-0 text-sm font-medium text-[#dc0024]">{formError}</p>
                    ) : null}
                  </div>

                  <div className="crm-worktypes-form-actions flex flex-wrap gap-3 border-t border-[#eef0f3] bg-white px-5 py-4 md:px-6">
                    <button type="submit" className={btnPrimary} disabled={submitting}>
                      {submitting
                        ? 'Saving…'
                        : isEditing
                          ? 'Update Work Type'
                          : 'Create Work Type'}
                    </button>
                    <button type="button" className={btnSecondary} onClick={closeForm}>
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
        <p className="m-0 rounded-lg border border-[#f5c2c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#dc0024]">
          {error}
        </p>
      ) : null}

      <div className="figma-table-card">
      <WorkTypeTable
        workTypes={pagedWorkTypes}
        loading={loading}
        hasMore={isMobileList && page < totalPages}
        onLoadMore={handleLoadMore}
        onEdit={handleEdit}
        onDelete={(item) => {
          setDeleteError('');
          setDeleteTarget(item);
        }}
      />
        {!loading && workTypes.length > 0 ? (
          <div className="hidden lg:block">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setPage(1);
                setPageSize(size);
              }}
            />
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={
          deleteError && /assigned/i.test(deleteError)
            ? 'Cannot delete this work type'
            : 'Delete work type?'
        }
        description={
          deleteTarget
            ? deleteError && /assigned/i.test(deleteError)
              ? `“${deleteTarget.name}” is assigned to one or more files. Change or remove those files first.`
              : `Delete “${deleteTarget.name}”? This cannot be undone.`
            : ''
        }
        error={deleteError || undefined}
        cancelLabel={deleteError && /assigned/i.test(deleteError) ? 'Close' : 'Cancel'}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmDisabled={Boolean(deleting || (deleteError && /assigned/i.test(deleteError)))}
        hideConfirm={Boolean(deleteError && /assigned/i.test(deleteError))}
        destructive
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
      />

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onClose={clearToast}
        />
      ) : null}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapPinned, X, CheckCircle } from 'lucide-react';
import { useIsMobileList } from '../hooks/useIsMobileList';
import {
  fetchFieldAgents,
  createFieldAgent,
  updateFieldAgent,
  deleteFieldAgent,
  findFieldAgentForRto,
  fieldAgentRtoLabel,
  rtoMatchKey,
} from '../services/fieldAgentService';
import { useToast } from '../hooks/useToast';
import FieldAgentTable from '../components/FieldAgentTable';
import { RtoSelectControl } from '../components/form/RtoSelect';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import Toast from '../components/Toast';
import { getApiError } from '../lib/apiError';
import type { FieldAgent } from '@/types/fieldAgent.types';

interface FieldAgentForm {
  name: string;
  mobile: string;
  rtoName: string;
  address: string;
}

const FORM_ANIM_MS = 320;
const PAGE_SIZE_OPTIONS = [15, 20];

const emptyForm: FieldAgentForm = {
  name: '',
  mobile: '',
  rtoName: '',
  address: '',
};

const inputClass =
  'w-full min-h-11 min-w-0 rounded-[10px] border border-[#d8dde5] bg-white px-3.5 py-2.5 text-sm text-[#1e242c] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_3px_rgba(26,115,232,0.14)]';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-[#1a73e8] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-55 min-w-[140px]';

const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[#dbdfe5] bg-white px-5 py-2.5 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] min-w-[140px]';

export default function FieldAgentsPage() {
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FieldAgentForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FieldAgent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { toast, showToast, clearToast } = useToast();

  const isEditing = formMode === 'edit';
  const isMobileList = useIsMobileList();

  const disabledRtoMatchKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const agent of agents) {
      if (isEditing && agent.id === editingId) continue;
      const key = rtoMatchKey(fieldAgentRtoLabel(agent));
      if (key) keys.add(key);
    }
    return keys;
  }, [agents, isEditing, editingId]);

  const rtoConflict = useMemo(() => {
    if (!form.rtoName.trim()) return null;
    return findFieldAgentForRto(agents, form.rtoName, {
      excludeId: isEditing && editingId ? editingId : undefined,
    });
  }, [agents, form.rtoName, isEditing, editingId]);

  const createBlocked = !isEditing && Boolean(rtoConflict);
  const updateRtoBlocked = isEditing && Boolean(rtoConflict);

  const totalPages = Math.max(1, Math.ceil(agents.length / pageSize));
  const pagedAgents = useMemo(() => {
    if (isMobileList) return agents.slice(0, page * pageSize);
    const start = (page - 1) * pageSize;
    return agents.slice(start, start + pageSize);
  }, [agents, page, pageSize, isMobileList]);

  const handleLoadMore = useCallback(() => {
    if (!isMobileList || page >= totalPages) return;
    setPage((current) => (current < totalPages ? current + 1 : current));
  }, [isMobileList, page, totalPages]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const list = await fetchFieldAgents();
      setAgents(list);
      setError('');
      setPage((prev) => {
        const pages = Math.max(1, Math.ceil(list.length / pageSize));
        return Math.min(prev, pages);
      });
    } catch {
      setAgents([]);
      setError('Failed to load field agents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
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
    window.setTimeout(() => {
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

  const handleEdit = (item: FieldAgent) => {
    setFormMode('edit');
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      mobile: item.mobile || '',
      rtoName: item.rtoName || item.district || '',
      address: item.address || '',
    });
    setFormError('');
    setFormSuccess(false);
    openForm();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');

    const name = form.name.trim();
    const mobile = form.mobile.replace(/\D/g, '').slice(-10);
    const rtoName = form.rtoName.trim();
    const address = form.address.trim();

    if (!name || !rtoName) {
      setFormError('Name and RTO are required.');
      return;
    }
    if (mobile.length !== 10) {
      setFormError('Mobile must be a 10-digit number.');
      return;
    }

    const conflict = findFieldAgentForRto(agents, rtoName, {
      excludeId: isEditing && editingId ? editingId : undefined,
    });
    if (conflict) {
      setFormError(
        `This RTO already has a field agent (${conflict.name}). Edit or remove them first.`
      );
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await updateFieldAgent(editingId, { name, mobile, rtoName, address });
        showToast('Field agent updated');
      } else {
        await createFieldAgent({ name, mobile, rtoName, address });
        showToast('Field agent created');
      }
      setFormSuccess(true);
      await loadAgents();
      window.setTimeout(() => closeForm(), 900);
    } catch (err) {
      setFormError(getApiError(err, 'Failed to save field agent.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteFieldAgent(deleteTarget.id);
      setDeleteTarget(null);
      await loadAgents();
      showToast('Field agent deleted');
    } catch (err) {
      setDeleteError(getApiError(err, 'Failed to delete field agent.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="crm-page crm-form-page crm-page--field-agents">
      <div className="crm-form-page-head">
        <div className="crm-form-page-title-row crm-page-head-row">
          <div className="crm-page-head">
            <h1 className="crm-title">Field Agents</h1>
            <p className="crm-page-subtitle m-0 text-sm text-[#667488]">
              District RTO contacts for file tracking — they do not log into the CRM.
            </p>
          </div>
          <button type="button" onClick={handleCreateToggle} className="crm-btn crm-btn--primary">
            {formMounted && formMode === 'create' ? <X size={16} /> : <MapPinned size={16} />}
            {formMounted && formMode === 'create' ? 'Close' : 'Add Field Agent'}
          </button>
        </div>
      </div>

      <div className="crm-field-agents-body">
        {formMounted && (
          <div
            className={`crm-field-agents-form grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              formVisible
                ? 'mb-0 grid-rows-[1fr] opacity-100 translate-y-0'
                : 'mb-0 grid-rows-[0fr] opacity-0 -translate-y-2.5'
            }`}
            role="region"
            aria-label={isEditing ? 'Edit field agent form' : 'Create field agent form'}
          >
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              <div className="w-full max-w-full rounded-lg border border-[#dbdfe5] bg-white">
                {formSuccess ? (
                  <div className="flex items-center gap-2.5 px-5 py-6 text-sm text-[#1d7f50] md:px-6">
                    <CheckCircle size={20} className="shrink-0 text-green-500" />
                    {isEditing ? 'Field agent updated!' : 'Field agent created!'}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="flex flex-col gap-5 p-5 md:p-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-medium text-[#3d4654]">Name *</label>
                          <input
                            name="name"
                            className={inputClass}
                            placeholder="Agent full name"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-medium text-[#3d4654]">Mobile *</label>
                          <input
                            name="mobile"
                            className={inputClass}
                            placeholder="10-digit mobile"
                            inputMode="numeric"
                            maxLength={10}
                            value={form.mobile}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label className="text-[13px] font-medium text-[#3d4654]">Address</label>
                          <textarea
                            name="address"
                            className={`${inputClass} min-h-[88px] resize-y py-2.5`}
                            placeholder="Office / meeting point (optional)"
                            rows={3}
                            value={form.address}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, address: e.target.value }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-md">
                          <RtoSelectControl
                            label="RTO office *"
                            required
                            value={form.rtoName}
                            onChange={(rtoName) => {
                              setForm((prev) => ({ ...prev, rtoName }));
                              setFormError('');
                            }}
                            placeholder="Select RTO"
                            disabledRtoMatchKeys={disabledRtoMatchKeys}
                            disabledRtoTitle="This RTO already has a field agent"
                          />
                          {rtoConflict ? (
                            <p className="m-0 text-[12px] font-medium text-[#dc0024]">
                              {fieldAgentRtoLabel(rtoConflict)} is already assigned to{' '}
                              <strong>{rtoConflict.name}</strong>. Choose another RTO or edit that
                              agent.
                            </p>
                          ) : (
                            <p className="m-0 text-[12px] text-[#667488]">
                              Each RTO office can have only one field agent. Files auto-map to that
                              agent when you set the same RTO on a file.
                            </p>
                          )}
                        </div>
                      </div>

                      {formError ? (
                        <p className="m-0 text-sm font-medium text-[#dc0024]">{formError}</p>
                      ) : null}
                    </div>

                    <div className="crm-field-agents-form-actions flex flex-wrap gap-3 border-t border-[#eef0f3] bg-white px-5 py-4 md:px-6">
                      <button
                        type="submit"
                        className={btnPrimary}
                        disabled={submitting || createBlocked || updateRtoBlocked}
                      >
                        {submitting ? 'Saving…' : isEditing ? 'Update Agent' : 'Create Agent'}
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
          <FieldAgentTable
            agents={pagedAgents}
            loading={loading}
            hasMore={isMobileList && page < totalPages}
            onLoadMore={handleLoadMore}
            onEdit={handleEdit}
            onDelete={(item) => {
              setDeleteError('');
              setDeleteTarget(item);
            }}
          />
          {!loading && agents.length > 0 ? (
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
          title="Delete field agent?"
          description={
            deleteTarget
              ? `Remove “${deleteTarget.name}”? Files linked to this agent will show as unassigned.`
              : ''
          }
          error={deleteError || undefined}
          cancelLabel="Cancel"
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          confirmDisabled={deleting}
          destructive
          onClose={() => {
            if (deleting) return;
            setDeleteTarget(null);
            setDeleteError('');
          }}
          onConfirm={handleDeleteConfirm}
        />

        {toast ? (
          <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={clearToast} />
        ) : null}
      </div>
    </div>
  );
}

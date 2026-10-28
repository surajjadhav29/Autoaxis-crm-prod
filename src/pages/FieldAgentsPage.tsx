import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapPinned, Search, X, CheckCircle } from 'lucide-react';
import { useIsMobileList } from '../hooks/useIsMobileList';
import {
  fetchFieldAgents,
  createFieldAgentOffice,
  updateFieldAgentOffice,
  deleteFieldAgentOffice,
  groupFieldAgentsByRto,
  rtoMatchKey,
} from '../services/fieldAgentService';
import { useToast } from '../hooks/useToast';
import FieldAgentTable from '../components/FieldAgentTable';
import { RtoSelectControl } from '../components/form/RtoSelect';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import Toast from '../components/Toast';
import { getApiError } from '../lib/apiError';
import type { FieldAgent, FieldAgentOffice } from '@/types/fieldAgent.types';

interface FieldAgentForm {
  name: string;
  mobile: string;
  description: string;
  name2: string;
  mobile2: string;
  description2: string;
  rtoName: string;
}

const FORM_ANIM_MS = 320;
const PAGE_SIZE_OPTIONS = [15, 20];

const emptyForm: FieldAgentForm = {
  name: '',
  mobile: '',
  description: '',
  name2: '',
  mobile2: '',
  description2: '',
  rtoName: '',
};

const inputClass =
  'w-full min-h-11 min-w-0 rounded-[10px] border border-[#d8dde5] bg-white px-3.5 py-2.5 text-sm text-[#1e242c] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_3px_rgba(26,115,232,0.14)]';

const btnPrimary =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-0 bg-[#1a73e8] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-55 min-w-[120px] sm:min-w-[140px] sm:px-5';

const btnSecondary =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dbdfe5] bg-white px-4 py-2.5 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] min-w-[120px] sm:min-w-[140px] sm:px-5';

export default function FieldAgentsPage() {
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingAgentIds, setEditingAgentIds] = useState<string[]>([]);
  const [form, setForm] = useState<FieldAgentForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FieldAgentOffice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { toast, showToast, clearToast } = useToast();

  const isEditing = formMode === 'edit';
  const isMobileList = useIsMobileList();

  const offices = useMemo(() => groupFieldAgentsByRto(agents), [agents]);

  /** RTOs that already have an office entry (disable on create; allow current on edit). */
  const disabledRtoMatchKeys = useMemo(() => {
    const keys = new Set<string>();
    const editingKey =
      isEditing && form.rtoName ? rtoMatchKey(form.rtoName) : '';
    for (const office of offices) {
      const key = rtoMatchKey(office.rtoName);
      if (!key) continue;
      if (editingKey && key === editingKey) continue;
      keys.add(key);
    }
    return keys;
  }, [offices, isEditing, form.rtoName]);

  const rtoTaken =
    !isEditing &&
    Boolean(form.rtoName.trim()) &&
    disabledRtoMatchKeys.has(rtoMatchKey(form.rtoName));

  const totalPages = Math.max(1, Math.ceil(offices.length / pageSize));
  const pagedOffices = useMemo(() => {
    if (isMobileList) return offices.slice(0, page * pageSize);
    const start = (page - 1) * pageSize;
    return offices.slice(start, start + pageSize);
  }, [offices, page, pageSize, isMobileList]);

  const handleLoadMore = useCallback(() => {
    if (!isMobileList || page >= totalPages) return;
    setPage((current) => (current < totalPages ? current + 1 : current));
  }, [isMobileList, page, totalPages]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchFieldAgents({ search: debouncedSearch });
      setAgents(list);
      setError('');
      setPage(1);
    } catch {
      setAgents([]);
      setError('Failed to load field agents.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

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
      setEditingAgentIds([]);
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
    setEditingAgentIds([]);
    setForm(emptyForm);
    setFormError('');
    setFormSuccess(false);
    openForm();
  };

  const handleEdit = (office: FieldAgentOffice) => {
    const a1 = office.agents[0];
    const a2 = office.agents[1];
    setFormMode('edit');
    setEditingAgentIds(office.agents.map((a) => a.id));
    setForm({
      name: a1?.name || '',
      mobile: a1?.mobile || '',
      description: a1?.description || '',
      name2: a2?.name || '',
      mobile2: a2?.mobile || '',
      description2: a2?.description || '',
      rtoName: office.rtoName || '',
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
    const description = form.description.trim();
    const name2 = form.name2.trim();
    const mobile2 = form.mobile2.replace(/\D/g, '').slice(-10);
    const description2 = form.description2.trim();
    const rtoName = form.rtoName.trim();

    if (!name || !rtoName) {
      setFormError('Field Agent 1 name and RTO are required.');
      return;
    }
    if (mobile && mobile.length !== 10) {
      setFormError('Field Agent 1 mobile must be a 10-digit number.');
      return;
    }

    const wantSecond = Boolean(name2 || mobile2 || description2);
    if (wantSecond) {
      if (!name2) {
        setFormError('Field Agent 2 name is required when adding a second agent.');
        return;
      }
      if (mobile2 && mobile2.length !== 10) {
        setFormError('Field Agent 2 mobile must be a 10-digit number.');
        return;
      }
      if (name.toLowerCase() === name2.toLowerCase()) {
        setFormError('Field Agent 1 and Field Agent 2 must have different names.');
        return;
      }
    }

    if (!isEditing && rtoTaken) {
      setFormError('This RTO already has a field-agent entry. Edit that entry instead.');
      return;
    }

    setSubmitting(true);
    try {
      const agent1 = { name, mobile, description };
      const agent2 = wantSecond
        ? { name: name2, mobile: mobile2, description: description2 }
        : undefined;
      if (isEditing) {
        await updateFieldAgentOffice({
          rtoName,
          agent1,
          agent2,
          agentIds: editingAgentIds,
        });
        showToast('Field agent entry updated');
      } else {
        await createFieldAgentOffice({ rtoName, agent1, agent2 });
        showToast(wantSecond ? 'Field agent entry created (2 agents)' : 'Field agent entry created');
      }
      setFormSuccess(true);
      await loadAgents();
      window.setTimeout(() => closeForm(), 900);
    } catch (err) {
      setFormError(getApiError(err, 'Failed to save field agent entry.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteFieldAgentOffice({
        rtoName: deleteTarget.rtoName,
        agentIds: deleteTarget.agents.map((a) => a.id),
      });
      setDeleteTarget(null);
      await loadAgents();
      showToast('Field agent entry deleted');
    } catch (err) {
      setDeleteError(getApiError(err, 'Failed to delete field agent entry.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="crm-page crm-form-page crm-page--field-agents">
      <div className="crm-form-page-head">
        <div className="crm-form-page-title-row crm-page-head-row crm-dealer-registry-toolbar-row">
          <div className="crm-page-head">
            <h1 className="crm-title">Field Agents</h1>
          </div>

          <div className="crm-dealer-registry-search-wrap">
            <div className="crm-search-wrap crm-search-wrap--expand crm-dealer-registry-search-field">
              <Search size={16} className="crm-search-icon" aria-hidden />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by RTO or agent name…"
                className="crm-search crm-dealer-registry-search-input"
                aria-label="Search field agents"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="crm-search-clear"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="crm-dealer-registry-toolbar-actions">
            <button type="button" onClick={handleCreateToggle} className="crm-btn crm-btn--primary">
              {formMounted && formMode === 'create' ? <X size={16} /> : <MapPinned size={16} />}
              {formMounted && formMode === 'create' ? 'Close' : 'Add Field Agent'}
            </button>
          </div>
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
            aria-label={isEditing ? 'Edit field agent entry' : 'Create field agent entry'}
          >
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              <div className="w-full max-w-full rounded-lg border border-[#dbdfe5] bg-white">
                {formSuccess ? (
                  <div className="flex items-center gap-2.5 px-5 py-6 text-sm text-[#1d7f50] md:px-6">
                    <CheckCircle size={20} className="shrink-0 text-green-500" />
                    {isEditing ? 'Field agent entry updated!' : 'Field agent entry created!'}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="flex flex-col gap-5 p-5 md:p-6">
                      <div className="grid gap-4 sm:grid-cols-2">
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
                            disabledRtoTitle="This RTO already has a field-agent entry"
                          />
                          {rtoTaken ? (
                            <p className="m-0 text-[12px] font-medium text-[#dc0024]">
                              This RTO already has an entry. Edit that row instead of creating a new
                              one.
                            </p>
                          ) : (
                            <p className="m-0 text-[12px] text-[#667488]">
                              One table row per RTO. Agent 1 is required; Agent 2 is optional.
                              Mobile and address are optional for both.
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-medium text-[#3d4654]">
                            Field Agent 1 *
                          </label>
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
                          <label className="text-[13px] font-medium text-[#3d4654]">
                            Mobile 1{' '}
                            <span className="font-normal text-[#667488]">(optional)</span>
                          </label>
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
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label className="text-[13px] font-medium text-[#3d4654]">
                            Address 1{' '}
                            <span className="font-normal text-[#667488]">(optional)</span>
                          </label>
                          <textarea
                            name="description"
                            className={`${inputClass} min-h-[72px] resize-y py-2.5`}
                            placeholder="Agent 1 address"
                            rows={2}
                            value={form.description}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, description: e.target.value }))
                            }
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-medium text-[#3d4654]">
                            Field Agent 2{' '}
                            <span className="font-normal text-[#667488]">(optional)</span>
                          </label>
                          <input
                            name="name2"
                            className={inputClass}
                            placeholder="Second agent name"
                            value={form.name2}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, name2: e.target.value }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-medium text-[#3d4654]">
                            Mobile 2{' '}
                            <span className="font-normal text-[#667488]">(optional)</span>
                          </label>
                          <input
                            name="mobile2"
                            className={inputClass}
                            placeholder="10-digit mobile"
                            inputMode="numeric"
                            maxLength={10}
                            value={form.mobile2}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                mobile2: e.target.value.replace(/\D/g, '').slice(0, 10),
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label className="text-[13px] font-medium text-[#3d4654]">
                            Address 2{' '}
                            <span className="font-normal text-[#667488]">(optional)</span>
                          </label>
                          <textarea
                            name="description2"
                            className={`${inputClass} min-h-[72px] resize-y py-2.5`}
                            placeholder="Agent 2 address"
                            rows={2}
                            value={form.description2}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, description2: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      {formError ? (
                        <p className="m-0 text-sm font-medium text-[#dc0024]">{formError}</p>
                      ) : null}
                    </div>

                    <div className="crm-field-agents-form-actions flex flex-nowrap items-center justify-center gap-3 border-t border-[#eef0f3] bg-white px-5 py-4 md:px-6">
                      <button
                        type="submit"
                        className={btnPrimary}
                        disabled={submitting || rtoTaken}
                      >
                        {submitting
                          ? 'Saving…'
                          : isEditing
                            ? 'Update Entry'
                            : 'Create Entry'}
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
            offices={pagedOffices}
            loading={loading}
            hasMore={isMobileList && page < totalPages}
            onLoadMore={handleLoadMore}
            onEdit={handleEdit}
            onDelete={(office) => {
              setDeleteError('');
              setDeleteTarget(office);
            }}
            emptyTitle={debouncedSearch ? 'No matching field agents' : 'No field agents yet'}
            emptyDescription={
              debouncedSearch
                ? 'Try a different RTO code or agent name.'
                : 'Add district RTO contacts here — they are used to track files, not CRM login users.'
            }
          />
          {!loading && offices.length > 0 ? (
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
          title="Delete field agent entry?"
          description={
            deleteTarget
              ? `Remove the ${deleteTarget.rtoName} entry (all agents for this RTO)? Files linked to these agents will show as unassigned.`
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

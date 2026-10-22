import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth';
import {
  createDealerBillingInvoice,
  fetchDealerBillableFileIds,
  fetchDealerBillingFilePage,
  fetchDealerRegistry,
  fetchNextBillingInvoiceNumber,
  resolveDealerBillingFilesForInvoice,
} from '../services/dealerRegistryApi';
import { fetchAllUsers } from '../services/userService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import BillingDealerPickPanel from '../components/dealer-billing/BillingDealerPickPanel';
import BillingFileSelectPanel from '../components/dealer-billing/BillingFileSelectPanel';
import BillingWizardRail from '../components/dealer-billing/BillingWizardRail';
import BillingBillPreviewPanel from '../components/dealer-billing/BillingBillPreviewPanel';
import BillingInvoiceTrackingPanel from '../components/dealer-billing/BillingInvoiceTrackingPanel';
import { downloadDealerBillPdf } from '../lib/dealerBillingPdf';
import { shareDealerBillOnWhatsApp } from '../lib/dealerInvoiceWhatsApp';
import { CrmWhatsAppIcon } from '@/components/icons/CrmIcons';
import { getApiError } from '../lib/apiError';
import {
  billingFiltersToApiPayload,
  BILLING_FILES_PAGE_SIZE_MAX,
} from '../lib/billingFileFilters';
import { isBillableForInvoice } from '../lib/billingFileSelection';
import { billingLineFromFileRecord } from '../lib/fileExpenseSplit';
import type { DealerRegistryRecord } from '@/types/dealer.types';
import type { FileRecord } from '@/types/file.types';
import type { FileFilterDraft } from '@/types/file.types';
import {
  draftToCreateInvoiceBody,
  parseReceivedInput,
  storedInvoiceToDraft,
} from '../lib/billingInvoice';
import type {
  BillingDraft,
  BillingPickFileFilters,
  BillingStudioMode,
  BillingWizardStep,
} from '@/types/dealerBilling.types';
import { EMPTY_BILLING_FILE_FILTERS } from '@/types/dealerBilling.types';
import type { User } from '@/types/user.types';

function formatBillDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function draftFromFileFilter(draft: FileFilterDraft, search = ''): BillingPickFileFilters {
  const hasRange = Boolean(draft.dateFrom || draft.dateTo);
  const userIds =
    draft.userIds?.length ? draft.userIds : draft.userId ? [draft.userId] : [];
  const workTypes =
    draft.workTypes?.length ? draft.workTypes : draft.workType ? [draft.workType] : [];
  return {
    userIds,
    rtoNames: draft.rtoNames || [],
    workTypes,
    dateFrom: draft.dateFrom || '',
    dateTo: draft.dateTo || '',
    datePreset: hasRange ? '' : draft.datePreset || '',
    search,
  };
}

export default function DealerBillingStudioPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';
  const { toast, showToast, clearToast } = useToast();

  const [step, setStep] = useState<BillingWizardStep>(1);
  const [dealers, setDealers] = useState<DealerRegistryRecord[]>([]);
  const [dealersLoading, setDealersLoading] = useState(true);
  const [dealerSearch, setDealerSearch] = useState('');
  const [selectedDealer, setSelectedDealer] = useState<DealerRegistryRecord | null>(null);

  const [dealerFiles, setDealerFiles] = useState<FileRecord[]>([]);
  const [billableTotal, setBillableTotal] = useState(0);
  const [invoiceLineFiles, setInvoiceLineFiles] = useState<FileRecord[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());
  const selectedFileCacheRef = useRef(new Map<string, FileRecord>());
  const selectedFileIdsRef = useRef(selectedFileIds);
  selectedFileIdsRef.current = selectedFileIds;
  const [billNumber, setBillNumber] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [dealerStepLoading, setDealerStepLoading] = useState(false);
  const filesRequestRef = useRef<AbortController | null>(null);
  const activeInvoiceIdRef = useRef<string | null>(null);
  const persistNewInvoiceRef = useRef<Promise<BillingDraft> | null>(null);
  /** One-time “select all” when entering step 2 for a dealer; refetches keep user’s selection. */
  const billingAutoSelectPendingRef = useRef(false);

  const [fileFilters, setFileFilters] = useState<BillingPickFileFilters>(EMPTY_BILLING_FILE_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [studioMode, setStudioMode] = useState<BillingStudioMode>('new');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [receivedInput, setReceivedInput] = useState('0');
  const [trackingRefreshKey, setTrackingRefreshKey] = useState(0);
  const [billingFilesRefreshKey, setBillingFilesRefreshKey] = useState(0);
  const [invoiceGeneratedAt, setInvoiceGeneratedAt] = useState<string | undefined>();
  /** Step 3: one save + PDF download per invoice; no repeat download for the same saved bill. */
  const [invoicePdfDownloaded, setInvoicePdfDownloaded] = useState(false);

  useEffect(() => {
    activeInvoiceIdRef.current = activeInvoiceId;
  }, [activeInvoiceId]);

  useEffect(() => {
    let active = true;
    setDealersLoading(true);
    fetchDealerRegistry()
      .then((list) => {
        if (active) setDealers(list);
      })
      .catch(() => {
        if (active) setDealers([]);
      })
      .finally(() => {
        if (active) setDealersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAllUsers()
      .then((list) => setUsers(list.filter((u) => u.isActive)))
      .catch(() => setUsers([]));
  }, [isAdmin]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setFileFilters((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  const applyBillableSelection = useCallback(
    async (
      dealer: DealerRegistryRecord,
      filters: BillingPickFileFilters,
      signal: AbortSignal
    ) => {
      const filterBody = billingFiltersToApiPayload(filters);
      const ids = await fetchDealerBillableFileIds(dealer.id, { signal, body: filterBody });
      if (signal.aborted) return;
      setSelectedFileIds(new Set(ids));
      if (!ids.length) return;
      const resolved = await resolveDealerBillingFilesForInvoice(dealer.id, ids, {
        signal,
        body: filterBody,
      });
      if (signal.aborted) return;
      for (const file of resolved) {
        selectedFileCacheRef.current.set(file.id, file);
      }
    },
    []
  );

  const loadDealerFiles = useCallback(
    async (dealer: DealerRegistryRecord, filters: BillingPickFileFilters) => {
      filesRequestRef.current?.abort();
      const controller = new AbortController();
      filesRequestRef.current = controller;

      setFilesLoading(true);
      try {
        const merged: FileRecord[] = [];
        const seen = new Set<string>();
        let page = 1;
        let totalPages = 1;
        let billableTotal = 0;

        while (page <= totalPages) {
          const body = billingFiltersToApiPayload(filters, {
            page,
            pageSize: BILLING_FILES_PAGE_SIZE_MAX,
          });
          const result = await fetchDealerBillingFilePage(dealer.id, {
            signal: controller.signal,
            body,
          });
          if (controller.signal.aborted) return;

          totalPages = result.totalPages;
          billableTotal = result.billableTotal;

          for (const file of result.files) {
            if (seen.has(file.id)) continue;
            seen.add(file.id);
            merged.push(file);
            if (selectedFileIdsRef.current.has(file.id)) {
              selectedFileCacheRef.current.set(file.id, file);
            }
          }
          page += 1;
        }

        setDealerFiles(merged);
        setBillableTotal(billableTotal);

        if (billingAutoSelectPendingRef.current && billableTotal > 0) {
          billingAutoSelectPendingRef.current = false;
          await applyBillableSelection(dealer, filters, controller.signal);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setDealerFiles([]);
        setBillableTotal(0);
        showToast(getApiError(err, 'Could not load files for this dealer.'), 'error');
      } finally {
        if (!controller.signal.aborted) {
          setFilesLoading(false);
        }
      }
    },
    [applyBillableSelection, showToast]
  );

  useEffect(() => () => filesRequestRef.current?.abort(), []);

  useEffect(() => {
    if (step !== 2 || !selectedDealer) return;
    void loadDealerFiles(selectedDealer, fileFilters);
  }, [step, selectedDealer, fileFilters, loadDealerFiles, billingFilesRefreshKey]);

  /** After File Records expense/payment edits, reload billable files when user returns to this tab. */
  useEffect(() => {
    if (studioMode !== 'new' || step !== 2 || !selectedDealer) return undefined;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadDealerFiles(selectedDealer, fileFilters);
      }
    };
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [studioMode, step, selectedDealer, fileFilters, loadDealerFiles]);

  const handleDealerSelect = async (dealer: DealerRegistryRecord) => {
    if (dealerStepLoading) return;
    billingAutoSelectPendingRef.current = true;
    selectedFileCacheRef.current.clear();
    setSelectedFileIds(new Set());
    setInvoiceLineFiles([]);
    setSelectedDealer(dealer);
    setFileFilters(EMPTY_BILLING_FILE_FILTERS);
    setSearchInput('');
    setDebouncedSearch('');
    setDealerStepLoading(true);
    try {
      setStep(2);
    } finally {
      setDealerStepLoading(false);
    }
  };

  const handleApplyFilters = (draft: FileFilterDraft) => {
    const next = draftFromFileFilter(draft, debouncedSearch);
    setFileFilters(next);
  };

  const handleClearFilters = () => {
    setFileFilters({ ...EMPTY_BILLING_FILE_FILTERS, search: debouncedSearch });
  };

  const patchFileFilters = (patch: Partial<BillingPickFileFilters>) => {
    setFileFilters((prev) => ({ ...prev, ...patch }));
  };

  const selectedIdsKey = useMemo(
    () => [...selectedFileIds].sort().join('\0'),
    [selectedFileIds]
  );

  /** Step 2: changing checkboxes must invalidate any locked step-3 line list. */
  useEffect(() => {
    if (step !== 2) return;
    setInvoiceLineFiles([]);
    setActiveInvoiceId(null);
    activeInvoiceIdRef.current = null;
    persistNewInvoiceRef.current = null;
    setInvoicePdfDownloaded(false);
    setInvoiceGeneratedAt(undefined);
  }, [selectedIdsKey, step]);

  const clearAllFileSelection = () => {
    setSelectedFileIds(new Set());
    selectedFileCacheRef.current.clear();
  };

  const toggleFile = (fileId: string) => {
    const file = dealerFiles.find((f) => f.id === fileId);
    if (file && !isBillableForInvoice(file)) return;
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
        selectedFileCacheRef.current.delete(fileId);
      } else {
        next.add(fileId);
        if (file) selectedFileCacheRef.current.set(fileId, file);
      }
      return next;
    });
  };

  const toggleAllFiles = (checked: boolean) => {
    if (checked) {
      const billableOnPage = dealerFiles.filter(isBillableForInvoice);
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        for (const f of billableOnPage) {
          next.add(f.id);
          selectedFileCacheRef.current.set(f.id, f);
        }
        return next;
      });
    } else {
      setSelectedFileIds((prev) => {
        const onPage = new Set(dealerFiles.map((f) => f.id));
        const next = new Set([...prev].filter((id) => !onPage.has(id)));
        for (const id of onPage) selectedFileCacheRef.current.delete(id);
        return next;
      });
    }
  };

  const handleSelectAllBillable = () => {
    if (!selectedDealer || filesLoading) return;
    void (async () => {
      setFilesLoading(true);
      try {
        const controller = new AbortController();
        await applyBillableSelection(selectedDealer, fileFilters, controller.signal);
      } catch (err) {
        showToast(getApiError(err, 'Could not select all billable files.'), 'error');
      } finally {
        setFilesLoading(false);
      }
    })();
  };

  const selectedFiles = useMemo(() => {
    if (step === 3 && invoiceLineFiles.length) {
      return invoiceLineFiles;
    }
    return Array.from(selectedFileIds)
      .map((id) => selectedFileCacheRef.current.get(id))
      .filter((f): f is FileRecord => Boolean(f));
  }, [step, invoiceLineFiles, selectedFileIds]);

  const goToPreviewStep = () => {
    if (!selectedDealer || selectedFileIds.size === 0) return;
    setActiveInvoiceId(null);
    activeInvoiceIdRef.current = null;
    persistNewInvoiceRef.current = null;
    setReceivedInput('0');
    setInvoiceGeneratedAt(undefined);
    setInvoicePdfDownloaded(false);
    void (async () => {
      setFilesLoading(true);
      try {
        const ids = Array.from(selectedFileIds);
        const resolved = await resolveDealerBillingFilesForInvoice(
          selectedDealer.id,
          ids,
          { body: billingFiltersToApiPayload(fileFilters) }
        );
        const resolvedBillable = resolved.filter(isBillableForInvoice);
        if (resolvedBillable.length !== ids.length) {
          showToast(
            'Some selected files are no longer billable. Refresh the list and try again.',
            'error'
          );
          return;
        }
        for (const file of resolvedBillable) {
          selectedFileCacheRef.current.set(file.id, file);
        }
        setInvoiceLineFiles(resolvedBillable);
        const nextNo = await fetchNextBillingInvoiceNumber();
        setBillNumber(nextNo);
        setStep(3);
      } catch (err) {
        showToast(getApiError(err, 'Could not load next invoice number.'), 'error');
      } finally {
        setFilesLoading(false);
      }
    })();
  };

  /** First-time generate always ₹0 received; updates only from Invoice history. */
  const newInvoiceReceivedAmount = () =>
    activeInvoiceId ? parseReceivedInput(receivedInput) : 0;

  const billingDraft: BillingDraft | null = useMemo(() => {
    if (!selectedDealer || !selectedFiles.length) return null;
    const receivedAmount = activeInvoiceId ? parseReceivedInput(receivedInput) : 0;
    return {
      dealer: selectedDealer,
      invoiceId: activeInvoiceId ?? undefined,
      billNumber,
      billDate: formatBillDate(),
      generatedAt: invoiceGeneratedAt,
      receivedAmount,
      lines: selectedFiles.map((f) => billingLineFromFileRecord(f)),
    };
  }, [
    selectedDealer,
    selectedFiles,
    billNumber,
    receivedInput,
    activeInvoiceId,
    invoiceGeneratedAt,
  ]);

  const resolveBillingDraft = (): BillingDraft | null => {
    if (!billingDraft) return null;
    return {
      ...billingDraft,
      receivedAmount: newInvoiceReceivedAmount(),
      lines: billingDraft.lines.map((line) => {
        const file = selectedFiles.find((f) => f.id === line.fileId);
        return file ? billingLineFromFileRecord(file) : line;
      }),
    };
  };

  const persistNewInvoiceRecord = async (draft: BillingDraft) => {
    if (!selectedDealer) throw new Error('No dealer selected');
    return createDealerBillingInvoice(
      selectedDealer.id,
      draftToCreateInvoiceBody(draft, 0)
    );
  };

  const finalizeDraftFromServer = async (draft: BillingDraft) => {
    const saved = await persistNewInvoiceRecord(draft);
    setActiveInvoiceId(saved.id);
    activeInvoiceIdRef.current = saved.id;
    setBillNumber(saved.billNumber);
    setReceivedInput(String(saved.receivedAmount ?? 0));
    setInvoiceGeneratedAt(saved.generatedAt);
    setTrackingRefreshKey((k) => k + 1);
    setBillingFilesRefreshKey((k) => k + 1);
    return storedInvoiceToDraft(saved);
  };

  /** One in-flight create per draft — Save PDF and WhatsApp share share the same POST. */
  const ensureNewInvoicePersisted = (draft: BillingDraft): Promise<BillingDraft> => {
    if (activeInvoiceIdRef.current) {
      return Promise.resolve({
        ...draft,
        invoiceId: activeInvoiceIdRef.current,
      });
    }
    if (persistNewInvoiceRef.current) {
      return persistNewInvoiceRef.current;
    }
    const task = finalizeDraftFromServer(draft).finally(() => {
      persistNewInvoiceRef.current = null;
    });
    persistNewInvoiceRef.current = task;
    return task;
  };

  const handleGeneratePdf = async () => {
    const draft = resolveBillingDraft();
    if (!draft || !selectedDealer) return;
    if (!draft.lines.length) {
      showToast('Select at least one file before generating the invoice.', 'error');
      return;
    }
    setGenerating(true);
    try {
      const pdfDraft = activeInvoiceIdRef.current
        ? draft
        : await ensureNewInvoicePersisted(draft);
      await downloadDealerBillPdf(pdfDraft);
      setInvoicePdfDownloaded(true);
      if (!activeInvoiceIdRef.current && pdfDraft.invoiceId) {
        setTrackingRefreshKey((k) => k + 1);
      }
      showToast(
        'Invoice saved and PDF downloaded. Open Invoice history to record payment when the dealer pays.'
      );
    } catch (err) {
      showToast(getApiError(err, 'Could not save invoice or generate PDF'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleShareWhatsApp = async () => {
    const draft = resolveBillingDraft();
    if (!draft || !selectedDealer) return;
    if (!draft.lines.length) {
      showToast('Select at least one file before generating the invoice.', 'error');
      return;
    }
    const hadSavedInvoice = Boolean(activeInvoiceIdRef.current);
    setSharingWhatsApp(true);
    try {
      const pdfDraft = hadSavedInvoice
        ? draft
        : await ensureNewInvoicePersisted(draft);
      const result = await shareDealerBillOnWhatsApp(pdfDraft);
      if (!result.ok) {
        if (result.reason !== 'Share cancelled') {
          showToast(result.reason, 'error');
        }
        return;
      }
      const paidNote = hadSavedInvoice
        ? ''
        : ' Invoice saved — add received amount in Invoice history when the dealer pays.';
      if (result.usedNativeShare) {
        showToast(`Shared via WhatsApp.${paidNote}`);
      } else if (!draft.dealer.phone?.replace(/\D/g, '').slice(-10)) {
        showToast(`PDF downloaded — attach in WhatsApp.${paidNote}`);
      } else {
        showToast(`PDF downloaded — attach in WhatsApp.${paidNote}`);
      }
    } catch (err) {
      showToast(getApiError(err, 'Could not share on WhatsApp or save invoice'), 'error');
    } finally {
      setSharingWhatsApp(false);
    }
  };

  const canNextStep2 = selectedFileIds.size > 0;

  return (
    <div className="crm-page crm-page--billing">
      <header className="crm-billing-hero crm-billing-hero--combined print:hidden">
        <div className="crm-billing-mode-tabs crm-billing-mode-tabs--segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={studioMode === 'new'}
            className={`crm-billing-mode-tab${studioMode === 'new' ? ' crm-billing-mode-tab--active' : ''}`}
            onClick={() => {
              setStudioMode('new');
              if (step === 2 && selectedDealer) {
                setBillingFilesRefreshKey((k) => k + 1);
              }
            }}
          >
            <span className="crm-billing-mode-tab--full">New invoice</span>
            <span className="crm-billing-mode-tab--short">New</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studioMode === 'track'}
            className={`crm-billing-mode-tab${studioMode === 'track' ? ' crm-billing-mode-tab--active' : ''}`}
            onClick={() => {
              setTrackingRefreshKey((k) => k + 1);
              setStudioMode('track');
            }}
          >
            <span className="crm-billing-mode-tab--full">Invoice history</span>
            <span className="crm-billing-mode-tab--short">History</span>
          </button>
        </div>
        {studioMode === 'new' ? (
          <BillingWizardRail step={step} variant="hero" />
        ) : (
          <div className="crm-billing-hero-main" aria-hidden />
        )}
      </header>

      <div className="crm-billing-stage">
        {studioMode === 'track' ? (
          <BillingInvoiceTrackingPanel
            refreshKey={trackingRefreshKey}
            onLoadError={(message) => showToast(message, 'error')}
            onInvoiceUpdated={() => {
              setTrackingRefreshKey((k) => k + 1);
              showToast('Invoice updated');
            }}
          />
        ) : null}

        {studioMode === 'new' && step === 1 ? (
          <BillingDealerPickPanel
            dealers={dealers}
            loading={dealersLoading}
            advancing={dealerStepLoading}
            search={dealerSearch}
            selectedId={selectedDealer?.id ?? null}
            onSearchChange={setDealerSearch}
            onSelect={(dealer) => void handleDealerSelect(dealer)}
          />
        ) : null}

        {studioMode === 'new' && step === 2 && selectedDealer ? (
          <BillingFileSelectPanel
            dealer={selectedDealer}
            files={dealerFiles}
            loading={filesLoading}
            selectedIds={selectedFileIds}
            selectedCount={selectedFileIds.size}
            billableTotal={billableTotal}
            filters={fileFilters}
            filtersOpen={filtersOpen}
            isAdmin={Boolean(isAdmin)}
            users={users}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onOpenFilters={() => setFiltersOpen(true)}
            onCloseFilters={() => setFiltersOpen(false)}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            onPatchFilters={patchFileFilters}
            onClearSearch={() => {
              setSearchInput('');
              setDebouncedSearch('');
            }}
            onToggle={toggleFile}
            onToggleAll={toggleAllFiles}
            onSelectAllBillable={handleSelectAllBillable}
            onClearSelection={clearAllFileSelection}
          />
        ) : null}

        {studioMode === 'new' && step === 3 && billingDraft ? (
          <div className="crm-billing-preview-full print:hidden">
            <BillingBillPreviewPanel draft={billingDraft} />
          </div>
        ) : null}
      </div>

      <div className="crm-billing-footer">
        {studioMode === 'new' && step > 1 ? (
          <button
            type="button"
            className="crm-btn crm-btn--secondary"
            onClick={() => {
              if (step === 2) {
                filesRequestRef.current?.abort();
                billingAutoSelectPendingRef.current = false;
                setDealerFiles([]);
                setBillableTotal(0);
                setSelectedFileIds(new Set());
                selectedFileCacheRef.current.clear();
                setInvoiceLineFiles([]);
                setFilesLoading(false);
                setFiltersOpen(false);
              }
              if (step === 3) {
                setInvoiceLineFiles([]);
              }
              setStep((s) => (s === 3 ? 2 : 1) as BillingWizardStep);
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        ) : (
          <span />
        )}

        {studioMode === 'new' && step === 2 ? (
          <button
            type="button"
            className="crm-btn crm-btn--primary"
            disabled={!canNextStep2}
            onClick={goToPreviewStep}
            title={
              canNextStep2
                ? `${selectedFileIds.size} file(s) will be on this invoice`
                : 'Select at least one billable file'
            }
          >
            Continue ({selectedFileIds.size} file{selectedFileIds.size === 1 ? '' : 's'})
            <ArrowRight size={16} />
          </button>
        ) : null}

        {studioMode === 'new' && step === 3 ? (
          <div className="crm-billing-footer-actions">
            <button
              type="button"
              className="crm-btn crm-btn--whatsapp"
              onClick={() => void handleShareWhatsApp()}
              disabled={sharingWhatsApp || generating || !billingDraft}
            >
              <CrmWhatsAppIcon />
              {sharingWhatsApp ? 'Opening…' : 'Share on WhatsApp'}
            </button>
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              onClick={() => void handleGeneratePdf()}
              disabled={
                generating || sharingWhatsApp || !billingDraft || invoicePdfDownloaded
              }
              title={
                invoicePdfDownloaded
                  ? 'This invoice was already saved and downloaded. Start a new invoice to download again.'
                  : undefined
              }
            >
              {generating
                ? 'Generating…'
                : invoicePdfDownloaded
                  ? 'Invoice downloaded'
                  : 'Save & download invoice (PDF)'}
              {!invoicePdfDownloaded && !generating ? <ArrowRight size={16} /> : null}
            </button>
          </div>
        ) : null}
      </div>

      {toast ? (
        <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={clearToast} />
      ) : null}
    </div>
  );
}

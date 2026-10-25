import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth';
import {
  createDealerBillingInvoice,
  fetchBillingPickDealers,
  fetchDealerBillableFileIds,
  fetchDealerBillingFilePage,
  fetchNextBillingInvoiceNumber,
  resolveDealerBillingFilesForInvoice,
} from '../services/dealerRegistryApi';
import { fetchAllUsers } from '../services/userService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import ExpenseModal from '../components/ExpenseModal';
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
  normalizeBillingDateRange,
  BILLING_FILES_PAGE_SIZE_MAX,
} from '../lib/billingFileFilters';
import { updateFileExpenses } from '../services/fileService';
import { isBillableForInvoice } from '../lib/billingFileSelection';
import { billingLineFromFileRecord } from '../lib/fileExpenseSplit';
import type { DealerRegistryRecord } from '@/types/dealer.types';
import type { FileExpenses, FileFilterDraft, FileRecord } from '@/types/file.types';
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
  const userIds =
    draft.userIds?.length ? draft.userIds : draft.userId ? [draft.userId] : [];
  const workTypes =
    draft.workTypes?.length ? draft.workTypes : draft.workType ? [draft.workType] : [];
  const dates = normalizeBillingDateRange({
    dateFrom: draft.dateFrom,
    dateTo: draft.dateTo,
    datePreset: draft.datePreset,
  });
  return {
    userIds,
    rtoNames: draft.rtoNames || [],
    workTypes,
    statuses: [...(draft.statuses || [])],
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    datePreset: dates.datePreset,
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
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [dealerStepLoading, setDealerStepLoading] = useState(false);
  const filesRequestRef = useRef<AbortController | null>(null);
  const billingAutoSelectPendingRef = useRef(false);
  const activeInvoiceIdRef = useRef<string | null>(null);
  const persistNewInvoiceRef = useRef<Promise<BillingDraft> | null>(null);
  const [invoicePdfDownloaded, setInvoicePdfDownloaded] = useState(false);

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
  /** Bump to reload dealers with something left to invoice (after save / back to step 1). */
  const [dealersRefreshKey, setDealersRefreshKey] = useState(0);
  const [expenseFile, setExpenseFile] = useState<FileRecord | null>(null);
  const [savingExpenses, setSavingExpenses] = useState(false);

  useEffect(() => {
    activeInvoiceIdRef.current = activeInvoiceId;
  }, [activeInvoiceId]);

  useEffect(() => {
    if (studioMode !== 'new' || step !== 1) return undefined;
    let active = true;
    setDealersLoading(true);
    fetchBillingPickDealers()
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
  }, [studioMode, step, dealersRefreshKey]);

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
    [showToast, applyBillableSelection]
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
    selectedFileCacheRef.current.clear();
    setSelectedFileIds(new Set());
    setInvoiceLineFiles([]);
    setSelectedDealer(dealer);
    setFileFilters(EMPTY_BILLING_FILE_FILTERS);
    setSearchInput('');
    setDebouncedSearch('');
    billingAutoSelectPendingRef.current = true;
    setDealerStepLoading(true);
    try {
      setStep(2);
    } finally {
      setDealerStepLoading(false);
    }
  };

  /** Filter change must drop prior ticks — invoice must not keep off-filter selections. */
  const clearBillingFileSelection = () => {
    selectedFileCacheRef.current.clear();
    setSelectedFileIds(new Set());
    setInvoiceLineFiles([]);
  };

  const handleApplyFilters = (draft: FileFilterDraft) => {
    clearBillingFileSelection();
    const next = draftFromFileFilter(draft, debouncedSearch);
    setFileFilters(next);
  };

  const handleClearFilters = () => {
    clearBillingFileSelection();
    setFileFilters({ ...EMPTY_BILLING_FILE_FILTERS, search: debouncedSearch });
  };

  const patchFileFilters = (patch: Partial<BillingPickFileFilters>) => {
    clearBillingFileSelection();
    setFileFilters((prev) => {
      const next = { ...prev, ...patch };
      // Keep date state consistent with Start+End rule (chip clear / partial patches).
      if (
        patch.dateFrom !== undefined ||
        patch.dateTo !== undefined ||
        patch.datePreset !== undefined
      ) {
        const dates = normalizeBillingDateRange(next);
        next.dateFrom = dates.dateFrom;
        next.dateTo = dates.dateTo;
        next.datePreset = dates.datePreset;
      }
      return next;
    });
  };

  const handleAddExpenses = (file: FileRecord) => {
    setExpenseFile(file);
  };

  const handleSaveExpenses = async (expenses: FileExpenses, paymentDone: boolean) => {
    if (!expenseFile) return;
    setSavingExpenses(true);
    try {
      const result = await updateFileExpenses(expenseFile.id, expenses, user, paymentDone);
      const saved =
        result && typeof result === 'object' && 'file' in result
          ? (result.file as FileRecord)
          : null;
      if (saved?.id) {
        setDealerFiles((prev) => prev.map((f) => (f.id === saved.id ? { ...f, ...saved } : f)));
        if (selectedFileCacheRef.current.has(saved.id)) {
          selectedFileCacheRef.current.set(saved.id, {
            ...selectedFileCacheRef.current.get(saved.id)!,
            ...saved,
          });
        }
      }
      setExpenseFile(null);
      setBillingFilesRefreshKey((k) => k + 1);
      showToast('Expenses saved successfully');
    } catch (err) {
      showToast(getApiError(err, 'Failed to save expenses'), 'error');
    } finally {
      setSavingExpenses(false);
    }
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
    setDealersRefreshKey((k) => k + 1);
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

  const invoiceSaved = Boolean(activeInvoiceId);
  const step3Busy = savingInvoice || downloadingPdf || sharingWhatsApp;

  /** Persist invoice only — no PDF. Disables Save once done; enables Download. */
  const handleSaveInvoice = async () => {
    const draft = resolveBillingDraft();
    if (!draft || !selectedDealer || activeInvoiceIdRef.current) return;
    if (!draft.lines.length) {
      showToast('Select at least one file before generating the invoice.', 'error');
      return;
    }
    setSavingInvoice(true);
    try {
      await ensureNewInvoicePersisted(draft);
      showToast(
        'Invoice saved. Download the PDF when ready, or record payment later in Invoice history.'
      );
    } catch (err) {
      showToast(getApiError(err, 'Could not save invoice'), 'error');
    } finally {
      setSavingInvoice(false);
    }
  };

  /** PDF download — only after the invoice is saved. */
  const handleDownloadPdf = async () => {
    const draft = resolveBillingDraft();
    if (!draft || !selectedDealer || !activeInvoiceIdRef.current) return;
    setDownloadingPdf(true);
    try {
      await downloadDealerBillPdf({
        ...draft,
        invoiceId: activeInvoiceIdRef.current,
      });
      showToast('PDF downloaded.');
    } catch (err) {
      showToast(getApiError(err, 'Could not download PDF'), 'error');
    } finally {
      setDownloadingPdf(false);
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
              if (step === 1) {
                setDealersRefreshKey((k) => k + 1);
              } else if (step === 2 && selectedDealer) {
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
            onAddExpenses={handleAddExpenses}
            onClearSelection={clearAllFileSelection}
          />
        ) : null}

        {studioMode === 'new' && step === 3 && billingDraft ? (
          <div className="crm-billing-preview-full print:hidden">
            <BillingBillPreviewPanel draft={billingDraft} />
          </div>
        ) : null}
      </div>

      {studioMode === 'new' ? (
        <div className="crm-billing-footer">
          {step > 1 ? (
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
                  setDealersRefreshKey((k) => k + 1);
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

          {step === 2 ? (
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
              Continue to generate the invoice
              <ArrowRight size={16} />
            </button>
          ) : null}

          {step === 3 ? (
            <div className="crm-billing-footer-actions">
              <button
                type="button"
                className="crm-btn crm-btn--whatsapp"
                onClick={() => void handleShareWhatsApp()}
                disabled={step3Busy || !billingDraft}
              >
                <CrmWhatsAppIcon />
                {sharingWhatsApp ? 'Opening…' : 'Share on WhatsApp'}
              </button>
              <button
                type="button"
                className="crm-btn crm-btn--secondary"
                onClick={() => void handleSaveInvoice()}
                disabled={step3Busy || !billingDraft || invoiceSaved}
                title={
                  invoiceSaved
                    ? 'Invoice already saved. Use Download for the PDF.'
                    : 'Save this invoice to Invoice history'
                }
              >
                {savingInvoice ? 'Saving…' : invoiceSaved ? 'Saved' : 'Save invoice'}
              </button>
              <button
                type="button"
                className="crm-btn crm-btn--primary"
                onClick={() => void handleDownloadPdf()}
                disabled={step3Busy || !billingDraft || !invoiceSaved}
                title={
                  invoiceSaved
                    ? 'Download invoice PDF'
                    : 'Save the invoice first, then download the PDF'
                }
              >
                {downloadingPdf ? 'Downloading…' : 'Download PDF'}
                {!downloadingPdf && invoiceSaved ? <ArrowRight size={16} /> : null}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <ExpenseModal
        file={expenseFile}
        open={!!expenseFile}
        onClose={() => {
          if (savingExpenses) return;
          setExpenseFile(null);
        }}
        onSave={handleSaveExpenses}
        saving={savingExpenses}
      />

      {toast ? (
        <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={clearToast} />
      ) : null}
    </div>
  );
}

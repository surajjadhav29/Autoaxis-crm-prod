import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMobileList } from '../hooks/useIsMobileList';
import { Download, Search, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useFileStats } from '../context/FileStatsContext';
import { requiresNewOwner, hasNewOwnerDetails, FILE_STATUSES } from '../lib/constants';
import FilesFilterDrawer from '../components/files/FilesFilterDrawer';
import FilesBulkBar from '../components/files/FilesBulkBar';
import {
  openFileWhatsApp,
  getWhatsAppBlockReason,
  hasPendingRequiredDocuments,
  hasMissingRequiredDocuments,
  getAllowedStatusValues,
  DOCUMENTS_REQUIRED_MESSAGE,
  DOCUMENTS_REQUIRED_CODE,
  STATUS_TRANSITION_BLOCKED_CODE,
} from '../lib/whatsapp';
import {
  fetchFilesPaginated,
  fetchFilesForExport,
  FILE_EXPORT_MAX_ROWS,
  fetchDealerNames,
  fetchStats,
  updateFileStatus,
  updateFileExpenses,
  updateFile,
  deleteFile,
  bulkUpdateFiles,
  exportExcel,
  EXCEL_OPTIONAL_COLUMNS,
} from '../services/fileService';
import { fetchAllUsers } from '../services/userService';
import { formatCompactCount, formatFullCount } from '../lib/formatNumber';
import { useToast } from '../hooks/useToast';
import FileTable from '../components/FileTable';
import ExpenseModal from '../components/ExpenseModal';
import ConfirmModal from '../components/ConfirmModal';
import FileDetailsModal from '../components/FileDetailsModal';
import ObjectionModal from '../components/ObjectionModal';
import Toast from '../components/Toast';
import Pagination from '../components/Pagination';
import { getApiError, getApiErrorCode } from '../lib/apiError';
import {
  buildFileFilterDrawerAppliedChips,
  fileRecordsDrawerFilterCount,
} from '@/lib/billingFileFilters';
import type { FileExpenses, FileFilterDraft, FileRecord, FileStats } from '@/types/file.types';
import type { User } from '@/types/user.types';

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const TABS = [
  { type: 'all_records', label: 'All Files', countKey: 'totalRecords' },
  { type: 'pending', label: 'Pending', countKey: 'pending' },
  { type: 'in_progress', label: 'In Process', countKey: 'inProcess' },
  { type: 'objection', label: 'Objection', countKey: 'objection' },
  { type: 'hold', label: 'Hold', countKey: 'holdSheet' },
  { type: 'return_paper', label: 'Paper Return', countKey: 'returnPaper' },
  { type: 'completed', label: 'Completed', countKey: 'completed' },
];

export default function FilesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stats, refreshStats } = useFileStats();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'superadmin';
  const tabParam = searchParams.get('tab');
  const view = !tabParam || tabParam === 'all' ? 'all_records' : tabParam;
  // Admin assignee filter is URL-driven (comma-separated) so Dashboard → Files keeps scope.
  const userIdParam = isAdmin ? searchParams.get('userId') || '' : '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenseFile, setExpenseFile] = useState<FileRecord | null>(null);
  const [viewFile, setViewFile] = useState<FileRecord | null>(null);
  const [savingExpenses, setSavingExpenses] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [rtoFilter, setRtoFilter] = useState<string[]>([]);
  const [userIdsFilter, setUserIdsFilter] = useState<string[]>(() =>
    isAdmin ? parseCsvParam(searchParams.get('userId')) : []
  );
  const [workTypesFilter, setWorkTypesFilter] = useState<string[]>([]);
  const [dealerFilter, setDealerFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState('');
  /** `created` = file.date (default); `status` = entered current status (status tabs only). */
  const [dateBasis, setDateBasis] = useState<'created' | 'status'>('created');
  const [dealerOptions, setDealerOptions] = useState<string[]>([]);
  const [filteredStats, setFilteredStats] = useState<FileStats | null>(null);
  const { toast, showToast, showError, clearToast } = useToast();
  const [objectionTarget, setObjectionTarget] = useState<string | null>(null);
  const [objectionDescription, setObjectionDescription] = useState('');
  const [objectionError, setObjectionError] = useState('');
  const [savingObjection, setSavingObjection] = useState(false);
  const isMobileList = useIsMobileList();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const defaultExcelExpenseKeys = useMemo(
    () =>
      EXCEL_OPTIONAL_COLUMNS.filter((col) => isAdmin || !col.adminOnly).map((col) => col.key),
    [isAdmin]
  );

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('crm:filters', { detail: { open: filtersOpen } }));
    return () => {
      window.dispatchEvent(new CustomEvent('crm:filters', { detail: { open: false } }));
    };
  }, [filtersOpen]);

  /** Keep page chrome fixed while the filter panel scrolls on its own. */
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [filtersOpen]);

  const updateSearchParams = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isAdmin) return;
    setUserIdsFilter(parseCsvParam(userIdParam));
  }, [isAdmin, userIdParam]);

  const filterUserId = userIdsFilter.length ? userIdsFilter.join(',') : '';
  const workTypeFilter = workTypesFilter.length ? workTypesFilter.join(',') : '';

  const loadGen = useRef(0);
  const loadMoreLock = useRef(false);
  const loadData = useCallback(async () => {
    if (!user) return;
    const gen = ++loadGen.current;
    const append = isMobileList && page > 1;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setLoadingMore(false);
      loadMoreLock.current = false;
    }
    try {
      if (!append) {
        const [tabStats] = await Promise.all([
          fetchStats(user, {
            filterUserId: isAdmin ? filterUserId || undefined : undefined,
            rtoName: rtoFilter.length ? rtoFilter : undefined,
            workType: workTypeFilter || undefined,
            dealerName: dealerFilter.length ? dealerFilter : undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            datePreset: dateFrom || dateTo ? undefined : datePreset || undefined,
            dateBasis: view !== 'all_records' && dateBasis === 'status' ? 'status' : undefined,
            search: debouncedSearch || undefined,
          }).catch(() => null),
          refreshStats().catch(() => null),
        ]);
        if (gen !== loadGen.current) return;
        if (tabStats) setFilteredStats(tabStats);
      }

      const result = await fetchFilesPaginated({
        user,
        search: debouncedSearch,
        type: view,
        page,
        pageSize,
        rtoName: rtoFilter,
        workType: workTypeFilter,
        dealerName: dealerFilter,
        dateFrom,
        dateTo,
        datePreset: dateFrom || dateTo ? undefined : datePreset || undefined,
        dateBasis: view !== 'all_records' && dateBasis === 'status' ? 'status' : undefined,
        filterUserId: isAdmin ? filterUserId || null : null,
      });
      if (gen !== loadGen.current) return;
      const nextRows = (result.data || []) as FileRecord[];
      setFiles((prev) => {
        if (!append) return nextRows;
        const seen = new Set(prev.map((file) => file.id));
        return [...prev, ...nextRows.filter((file) => !seen.has(file.id))];
      });
      setTotalCount(result.totalCount || 0);
      setTotalPages(result.totalPages || 1);
    } finally {
      if (gen === loadGen.current) {
        setLoading(false);
        setLoadingMore(false);
        loadMoreLock.current = false;
      }
    }
  }, [
    user,
    isAdmin,
    isMobileList,
    debouncedSearch,
    view,
    page,
    pageSize,
    rtoFilter,
    workTypeFilter,
    dealerFilter,
    dateFrom,
    dateTo,
    datePreset,
    dateBasis,
    filterUserId,
    refreshStats,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reloadList = useCallback(() => {
    setPage(1);
    if (page === 1) loadData();
  }, [page, loadData]);

  const handleLoadMore = useCallback(() => {
    if (!isMobileList || loading || loadingMore || loadMoreLock.current || page >= totalPages) {
      return;
    }
    loadMoreLock.current = true;
    setPage((current) => current + 1);
  }, [isMobileList, loading, loadingMore, page, totalPages]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    fetchAllUsers()
      .then((list) => {
        if (active) setUsers(list.filter((u: User) => u.isActive));
      })
      .catch(() => {
        if (active) setUsers([]);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!dealerOptions.length) return;
    setDealerFilter((prev) => {
      if (!prev.length) return prev;
      const next = prev.filter((name) => dealerOptions.includes(name));
      return next.length === prev.length ? prev : next;
    });
  }, [dealerOptions]);

  useEffect(() => {
    setPage(1);
  }, [view, debouncedSearch, pageSize, rtoFilter, workTypesFilter, dealerFilter, dateFrom, dateTo, datePreset, dateBasis, userIdsFilter, isMobileList]);

  useEffect(() => {
    setSelectedIds([]);
    setBulkDeleteOpen(false);
  }, [view, rtoFilter, workTypesFilter, dealerFilter, dateFrom, dateTo, datePreset, dateBasis, userIdsFilter, debouncedSearch]);

  /** All Files always uses Created date — drop Status basis when switching there. */
  useEffect(() => {
    if (view === 'all_records' && dateBasis === 'status') {
      setDateBasis('created');
    }
  }, [view, dateBasis]);

  useEffect(() => {
    if (!isMobileList) {
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    }
  }, [page, isMobileList]);

  // Build the dealer filter dropdown from distinct dealer names (scoped).
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    fetchDealerNames(user, { filterUserId: isAdmin ? filterUserId || undefined : undefined })
      .then((names) => {
        if (active) setDealerOptions(names);
      })
      .catch(() => {
        if (active) setDealerOptions([]);
      });
    return () => {
      active = false;
    };
  }, [user, isAdmin, filterUserId]);

  const setTab = (tab: string) => {
    setPage(1);
    updateSearchParams({ tab });
  };
  const setFilterUserIds = (ids: string[]) => {
    updateSearchParams({ userId: ids.length ? ids.join(',') : '' });
  };

  const applyDrawerFilters = (draft: FileFilterDraft) => {
    setPage(1);
    setRtoFilter(draft.rtoNames || []);
    const workTypes =
      draft.workTypes?.length ? draft.workTypes : draft.workType ? [draft.workType] : [];
    setWorkTypesFilter([...workTypes]);
    setDealerFilter(draft.dealerNames || []);
    // Custom range only when both ends are present (drawer enforces the same).
    const hasRange = Boolean(draft.dateFrom && draft.dateTo);
    setDateFrom(hasRange ? draft.dateFrom || '' : '');
    setDateTo(hasRange ? draft.dateTo || '' : '');
    setDatePreset(hasRange ? '' : draft.datePreset || '');
    setDateBasis(
      view !== 'all_records' && draft.dateBasis === 'status' ? 'status' : 'created'
    );
    if (isAdmin) {
      const userIds =
        draft.userIds?.length ? draft.userIds : draft.userId ? [draft.userId] : [];
      setFilterUserIds(userIds);
    }
  };

  const clearDrawerFilters = () => {
    setPage(1);
    setRtoFilter([]);
    setWorkTypesFilter([]);
    setDealerFilter([]);
    setDateFrom('');
    setDateTo('');
    setDatePreset('');
    setDateBasis('created');
    if (isAdmin) setFilterUserIds([]);
  };

  const clearAllFilters = () => {
    clearDrawerFilters();
    setSearch('');
    setDebouncedSearch('');
    setSearchOpen(false);
  };

  const appliedFilters: FileFilterDraft = {
    userId: '',
    userIds: [...userIdsFilter],
    rtoNames: rtoFilter,
    workType: '',
    workTypes: [...workTypesFilter],
    dealerNames: dealerFilter,
    dateFrom,
    dateTo,
    datePreset,
    dateBasis,
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setDatePreset('');
    setDateBasis('created');
  };

  const patchDrawerFilter = (patch: Partial<FileFilterDraft>) => {
    if (patch.userIds !== undefined && isAdmin) setFilterUserIds(patch.userIds);
    if (patch.rtoNames !== undefined) setRtoFilter(patch.rtoNames);
    if (patch.workTypes !== undefined) setWorkTypesFilter(patch.workTypes);
    if (patch.dealerNames !== undefined) setDealerFilter(patch.dealerNames);
    if (
      patch.dateFrom !== undefined ||
      patch.dateTo !== undefined ||
      patch.datePreset !== undefined ||
      patch.dateBasis !== undefined
    ) {
      setDateFrom(patch.dateFrom ?? '');
      setDateTo(patch.dateTo ?? '');
      setDatePreset(patch.datePreset ?? '');
      if (patch.dateBasis !== undefined) {
        setDateBasis(patch.dateBasis === 'status' ? 'status' : 'created');
      }
    }
  };

  const drawerAppliedChips = buildFileFilterDrawerAppliedChips(
    appliedFilters,
    users,
    isAdmin,
    {
      onRemoveUser: (userId) =>
        patchDrawerFilter({ userIds: userIdsFilter.filter((id) => id !== userId) }),
      onRemoveRto: (name) =>
        patchDrawerFilter({ rtoNames: rtoFilter.filter((item) => item !== name) }),
      onRemoveWorkType: (name) =>
        patchDrawerFilter({ workTypes: workTypesFilter.filter((item) => item !== name) }),
      onRemoveDealer: (name) =>
        patchDrawerFilter({ dealerNames: dealerFilter.filter((item) => item !== name) }),
      onClearDate: clearDateFilter,
    }
  );

  const filterChips = [
    search
      ? { key: 'search', label: `Search: ${search}`, onRemove: () => { setSearch(''); setDebouncedSearch(''); } }
      : null,
    ...drawerAppliedChips,
  ].filter((chip): chip is { key: string; label: string; onRemove: () => void } => Boolean(chip));

  const drawerFilterCount = fileRecordsDrawerFilterCount(appliedFilters, isAdmin);

  const handleStatusChange = async (id: string, status: string) => {
    const target = files.find((f) => f.id === id);

    if (target && status !== target.status) {
      const allowed = getAllowedStatusValues(target);
      if (!allowed.includes(status)) {
        if (
          (target.status === 'on_hold' || target.status === 'paper_return') &&
          status !== 'in_progress'
        ) {
          showError('From Hold or Paper Return you can only move the file to In Process');
          return;
        }
        if (hasMissingRequiredDocuments(target)) {
          showError(DOCUMENTS_REQUIRED_MESSAGE);
          return;
        }
        showError('This status change is not allowed');
        return;
      }
    }

    if (status === 'objection') {
      setObjectionTarget(id);
      setObjectionDescription('');
      setObjectionError('');
      return;
    }
    // Transfer-of-ownership files need new owner name + mobile before going
    // to "In Process". If missing, send the user to the edit form instead.
    if (status === 'in_progress') {
      if (target && requiresNewOwner(target.workType) && !hasNewOwnerDetails(target)) {
        showToast('Add new owner name & mobile to move this file to In Process');
        navigate(`/files/${id}/edit?requireNewOwner=1`);
        return;
      }
    }
    try {
      await updateFileStatus(id, status, user);
      const label = FILE_STATUSES.find((s) => s.value === status)?.label || status;
      showToast(`Status updated to ${label}`);
      reloadList();
    } catch (err) {
      const code = getApiErrorCode(err);
      if (code === DOCUMENTS_REQUIRED_CODE) {
        showError(getApiError(err, DOCUMENTS_REQUIRED_MESSAGE));
        return;
      }
      if (code === STATUS_TRANSITION_BLOCKED_CODE) {
        showError(getApiError(err, 'This status change is not allowed'));
        return;
      }
      if (code === 'NEW_OWNER_REQUIRED') {
        showToast('Add new owner name & mobile to move this file to In Process');
        navigate(`/files/${id}/edit?requireNewOwner=1`);
        return;
      }
      showError(getApiError(err, 'Failed to update status'));
    }
  };

  const closeObjectionModal = () => {
    setObjectionTarget(null);
    setObjectionDescription('');
    setObjectionError('');
  };

  const handleConfirmObjection = async () => {
    if (!objectionTarget) return;
    const target = files.find((f) => f.id === objectionTarget);
    if (target && hasPendingRequiredDocuments(target)) {
      setObjectionError(DOCUMENTS_REQUIRED_MESSAGE);
      return;
    }
    const trimmed = objectionDescription.trim();
    if (!trimmed) {
      setObjectionError('Description is required.');
      return;
    }
    setObjectionError('');
    setSavingObjection(true);
    try {
      await updateFileStatus(objectionTarget, 'objection', user, trimmed);
      closeObjectionModal();
      reloadList();
      showToast('Status updated to Objection');
    } catch (err) {
      if (getApiErrorCode(err) === DOCUMENTS_REQUIRED_CODE) {
        setObjectionError(getApiError(err, DOCUMENTS_REQUIRED_MESSAGE));
        return;
      }
      setObjectionError(getApiError(err, 'Failed to update status.'));
    } finally {
      setSavingObjection(false);
    }
  };

  const handleAssignChange = async (id: string, userId: string) => {
    const current = files.find((f) => f.id === id);
    if (current && current.createdBy === userId) return;
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, createdBy: userId } : f)));
    try {
      await updateFile(id, { createdBy: userId }, user);
      const assignee = users.find((u) => u.id === userId);
      showToast(`File assigned to ${assignee?.fullName || 'user'}`);
    } catch (err) {
      showError(getApiError(err, 'Failed to assign file'));
      reloadList();
    }
  };

  const handleEdit = (file: FileRecord) => navigate(`/files/${file.id}/edit`);

  const handleView = (file: FileRecord) => setViewFile(file);

  const handleAddExpenses = (file: FileRecord) => setExpenseFile(file);

  const handleWhatsApp = (file: FileRecord) => {
    const blockReason = getWhatsAppBlockReason(file);
    if (blockReason) {
      showError(blockReason);
      return;
    }
    const result = openFileWhatsApp(file);
    if (result?.warning) {
      showError(result.warning);
    }
  };

  const handleSaveExpenses = async (expenses: FileExpenses, paymentDone: boolean) => {
    if (!expenseFile) return;
    setSavingExpenses(true);
    try {
      await updateFileExpenses(expenseFile.id, expenses, user, paymentDone);
      setExpenseFile(null);
      reloadList();
      showToast('Expenses saved successfully');
    } catch {
      showError('Failed to save expenses');
    } finally {
      setSavingExpenses(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const ids = files.map((f) => f.id);
    const allOnPage = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allOnPage ? [] : ids);
  };

  const runBulk = async (action: string, payload?: Record<string, unknown>) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const result = await bulkUpdateFiles({ ids: selectedIds, action, payload });
      const skipped = result.failed?.length || 0;
      if (result.updated && skipped) {
        showToast(`${result.updated} updated, ${skipped} skipped`);
      } else if (result.updated) {
        showToast(action === 'delete' ? `${result.updated} file(s) deleted` : `${result.updated} file(s) updated`);
      } else {
        showError(result.failed?.[0]?.error || 'No files were updated');
      }
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      reloadList();
    } catch (err) {
      showError(getApiError(err, 'Bulk action failed'));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDeleteRequest = (file: FileRecord) => {
    setDeleteError('');
    setBulkDeleteOpen(false);
    setDeleteTarget(file);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteFile(deleteTarget.id, user);
      setDeleteTarget(null);
      reloadList();
      showToast('File deleted successfully');
    } catch (err) {
      setDeleteError(getApiError(err, 'Failed to delete file.'));
    } finally {
      setDeleting(false);
    }
  };

  const s = { ...(filteredStats || stats || {}) };
  s.live = (s.pending || 0) + (s.inProcess || 0);

  // Excel = current tab + the same drawer/search filters as the table, every page.
  const handleExport = async (expenseKeys: string[]) => {
    if (!user) return;
    const tabLabel = TABS.find((t) => t.type === view)?.label || 'Files';
    setExporting(true);
    try {
      const exportResult = await fetchFilesForExport(user, {
        type: view,
        search: debouncedSearch,
        rtoName: rtoFilter.length ? rtoFilter : undefined,
        workType: workTypeFilter || undefined,
        dealerName: dealerFilter.length ? dealerFilter : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        datePreset: dateFrom || dateTo ? undefined : datePreset || undefined,
        dateBasis: view !== 'all_records' && dateBasis === 'status' ? 'status' : undefined,
        filterUserId: isAdmin ? filterUserId || undefined : undefined,
      });
      const total = exportResult.total || 0;
      const rows = exportResult.files || [];
      if (!total || !rows.length) {
        showToast('No records match the current filters');
        return;
      }
      if (total > FILE_EXPORT_MAX_ROWS || exportResult.truncated) {
        showError(
          `${total.toLocaleString('en-IN')} records match — export allows at most ${FILE_EXPORT_MAX_ROWS.toLocaleString('en-IN')} at once. Narrow filters (date range, dealer, RTO, work type) and try again.`
        );
        return;
      }
      await exportExcel(rows, { isAdmin, tabLabel, expenseKeys });
      showToast(
        `Exported ${rows.length.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')} matching ${tabLabel} record${total === 1 ? '' : 's'}.`
      );
    } catch {
      showError('Failed to export records');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="crm-page crm-page--files" id="files-print">
      <div className={`crm-files-split${filtersOpen ? ' crm-files-split--open' : ''}`}>
      {filtersOpen ? (
        <button
          type="button"
          className="crm-billing-filter-backdrop print:hidden md:hidden"
          onClick={() => setFiltersOpen(false)}
          aria-label="Close filters"
        />
      ) : null}
      <div className="crm-files-main">
        <div className="crm-page-head-row print:hidden">
          <div className="crm-page-head hidden lg:flex lg:items-center">
            <h1 className="crm-title">Records</h1>
          </div>
          <div className="crm-files-search-center hidden lg:flex">
            <div className="crm-files-search-slot crm-files-search-slot--open">
              <div className="crm-search-wrap crm-search-wrap--expand border border-gray-300 dark:border-gray-600 rounded-md px-2">
                <Search size={16} className="crm-search-icon ml-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="File, vehicle, mobile, chassis, engine…"
                  className="crm-search crm-files-search"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setDebouncedSearch('');
                      setSearchOpen(false);
                    }}
                    className="crm-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="crm-files-head-actions">
            <button
              type="button"
              onClick={() => handleExport(defaultExcelExpenseKeys)}
              disabled={exporting || loading || totalCount === 0}
              className="crm-btn crm-btn--primary crm-btn--export-excel"
              title={totalCount === 0 && !loading ? 'No records match the current filters' : undefined}
            >
              <Download size={16} />
              Excel
            </button>

            <button
              type="button"
              className={`crm-btn crm-btn--filters ${drawerFilterCount || filtersOpen ? 'crm-btn--filters-active' : ''}`}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} strokeWidth={1.75} />
              Filters
              {drawerFilterCount ? <span className="crm-filter-count">{drawerFilterCount}</span> : null}
            </button>

            <div className={`crm-files-search-slot${searchOpen || search ? ' crm-files-search-slot--open' : ''} lg:hidden`}>
              {searchOpen || search ? (
                <div className="crm-search-wrap crm-search-wrap--expand ">
                  <Search size={16} className="crm-search-icon" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="File, vehicle, mobile, chassis, engine…"
                    className="crm-search crm-files-search"
                    autoFocus
                    onBlur={() => {
                      if (!search) setSearchOpen(false);
                    }}
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setDebouncedSearch('');
                        setSearchOpen(false);
                      }}
                      className="crm-search-clear"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className="crm-icon-btn crm-icon-btn--ghost"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search records"
                >
                  <Search size={20} strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        </div>
          <div className="crm-tabs print:hidden">
            {TABS.map(({ type, label, countKey }) => {
              const active = view === type;
              const count = s[countKey] ?? 0;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTab(type)}
                  className={`crm-tab ${active ? 'crm-tab--active' : ''}`}
                >
                  {label}
                  <span
                    className={`crm-tab-count ${active ? 'crm-tab-count--active' : ''}`}
                    title={formatFullCount(count)}
                  >
                    {formatCompactCount(count)}
                  </span>
                </button>
              );
            })}
          </div>

          <FilesBulkBar
            count={selectedIds.length}
            pageCount={files.length}
            allSelected={files.length > 0 && files.every((f) => selectedIds.includes(f.id))}
            isAdmin={isAdmin}
            users={users}
            selectedFiles={files.filter((f) => selectedIds.includes(f.id))}
            busy={bulkBusy}
            onToggleSelectAll={toggleSelectAll}
            onAssign={(userId) => runBulk('assign', { userId })}
            onStatus={(status) => runBulk('status', { status })}
            onDelete={() => {
              setDeleteError('');
              setDeleteTarget(null);
              setBulkDeleteOpen(true);
            }}
            onClear={() => setSelectedIds([])}
          />

          {filterChips.length ? (
            <div className="crm-filter-chips print:hidden">
              <div className="crm-filter-chips-list">
                {filterChips.map((chip) => (
                  <span key={chip.key} className="crm-filter-chip">
                    {chip.label}
                    <button
                      type="button"
                      className="crm-filter-chip-remove"
                      onClick={chip.onRemove}
                      aria-label={`Remove ${chip.label}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <button type="button" className="crm-filter-clear-all" onClick={clearAllFilters}>
                Clear all
              </button>
            </div>
          ) : null}

          <div className="figma-table-card">
            <FileTable
              files={files}
              loading={loading}
              emptyIllustration={
                debouncedSearch || filterChips.length > 0 ? 'search' : 'folder'
              }
              hasMore={isMobileList && page < totalPages}
              loadingMore={loadingMore}
              onLoadMore={handleLoadMore}
              onStatusChange={handleStatusChange}
              onView={handleView}
              onEdit={handleEdit}
              onAddExpenses={handleAddExpenses}
              onWhatsApp={handleWhatsApp}
              onDelete={handleDeleteRequest}
              users={users}
              onAssignChange={handleAssignChange}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
            />

            {!loading && totalCount > 0 && (
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
            )}
          </div>
        </div>

      <FilesFilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        isAdmin={isAdmin}
        users={users}
        dealerOptions={dealerOptions}
        applied={appliedFilters}
        onApply={applyDrawerFilters}
        filterUi="invoice"
        appliedFilterChips={drawerAppliedChips}
        onClearAppliedFilters={clearDrawerFilters}
        allowStatusDateBasis={view !== 'all_records'}
      />

      </div>

      <FileDetailsModal
        file={viewFile}
        open={!!viewFile}
        onClose={() => setViewFile(null)}
        users={users}
      />

      <ObjectionModal
        open={!!objectionTarget}
        description={objectionDescription}
        onDescriptionChange={setObjectionDescription}
        error={objectionError}
        saving={savingObjection}
        onClose={closeObjectionModal}
        onConfirm={handleConfirmObjection}
      />

      <ExpenseModal
        file={expenseFile}
        open={!!expenseFile}
        onClose={() => setExpenseFile(null)}
        onSave={handleSaveExpenses}
        saving={savingExpenses}
      />

      <ConfirmModal
        open={!!deleteTarget || bulkDeleteOpen}
        title={bulkDeleteOpen ? `Delete ${selectedIds.length} files?` : 'Delete this file?'}
        description={
          bulkDeleteOpen
            ? `${selectedIds.length} selected file(s) will be permanently deleted. This cannot be undone.`
            : deleteTarget
              ? `${deleteTarget.fileNumber} · ${deleteTarget.vehicleNo} will be permanently deleted. This cannot be undone.`
              : undefined
        }
        error={deleteError}
        confirmLabel={deleting || bulkBusy ? 'Deleting…' : 'Delete'}
        confirmDisabled={deleting || bulkBusy}
        destructive
        onClose={() => {
          if (deleting || bulkBusy) return;
          closeDeleteModal();
          setBulkDeleteOpen(false);
        }}
        onConfirm={bulkDeleteOpen ? () => runBulk('delete') : handleConfirmDelete}
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
  );
}

import { useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { FileRecord } from '@/types/file.types';
import type { DealerRegistryRecord } from '@/types/dealer.types';
import type { BillingPickFileFilters } from '@/types/dealerBilling.types';
import type { User } from '@/types/user.types';
import type { FileFilterDraft } from '@/types/file.types';
import FilesFilterDrawer from '../files/FilesFilterDrawer';
import FileTable from '../FileTable';
import {
  billingDrawerFilterCount,
  billingFiltersToFileFilterDraft,
  buildBillingDrawerAppliedChips,
} from '@/lib/billingFileFilters';
import { areAllBillableFilesSelected } from '@/lib/billingFileSelection';

interface BillingFileSelectPanelProps {
  dealer: DealerRegistryRecord;
  files: FileRecord[];
  loading: boolean;
  selectedIds: Set<string>;
  selectedCount: number;
  billableTotal: number;
  filters: BillingPickFileFilters;
  filtersOpen: boolean;
  isAdmin: boolean;
  users: User[];
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onOpenFilters: () => void;
  onCloseFilters: () => void;
  onApplyFilters: (draft: FileFilterDraft) => void;
  onClearFilters: () => void;
  onPatchFilters: (patch: Partial<BillingPickFileFilters>) => void;
  onClearSearch: () => void;
  onToggle: (fileId: string) => void;
  onToggleAll: (checked: boolean) => void;
  onSelectAllBillable: () => void;
  /** Opens Add Expenses (same modal as File Records +). */
  onAddExpenses?: (file: FileRecord) => void;
  onClearSelection?: () => void;
}

export default function BillingFileSelectPanel({
  dealer,
  files,
  loading,
  selectedIds,
  selectedCount,
  billableTotal,
  filters,
  filtersOpen,
  isAdmin,
  users,
  searchInput,
  onSearchInputChange,
  onOpenFilters,
  onCloseFilters,
  onApplyFilters,
  onClearFilters,
  onPatchFilters,
  onClearSearch,
  onToggle,
  onToggleAll,
  onSelectAllBillable,
  onAddExpenses,
  onClearSelection,
}: BillingFileSelectPanelProps) {
  const drawerFilterCount = billingDrawerFilterCount(filters, isAdmin);
  const selectedList = Array.from(selectedIds);

  const appliedFilterDraft = useMemo(
    () => billingFiltersToFileFilterDraft(filters),
    [
      filters.userIds.join('\0'),
      filters.rtoNames.join('\0'),
      filters.workTypes.join('\0'),
      filters.statuses.join('\0'),
      filters.dateFrom,
      filters.dateTo,
      filters.datePreset,
    ]
  );

  const appliedDrawerChips = buildBillingDrawerAppliedChips(filters, users, isAdmin, {
    onRemoveUser: (userId) =>
      onPatchFilters({ userIds: (filters.userIds || []).filter((id) => id !== userId) }),
    onRemoveRto: (name) =>
      onPatchFilters({ rtoNames: (filters.rtoNames || []).filter((item) => item !== name) }),
    onRemoveWorkType: (name) =>
      onPatchFilters({ workTypes: (filters.workTypes || []).filter((item) => item !== name) }),
    onRemoveStatus: (status) =>
      onPatchFilters({ statuses: (filters.statuses || []).filter((item) => item !== status) }),
    onClearDate: () => onPatchFilters({ dateFrom: '', dateTo: '', datePreset: '' }),
  });

  /** Match FileTable: only billable rows (totalBill > 0) count — ₹0 rows stay unchecked. */
  const toggleSelectAll = () => {
    const allBillableSelected = areAllBillableFilesSelected(files, selectedIds);
    onToggleAll(!allBillableSelected);
  };

  return (
    <div
      className={`crm-page crm-page--files crm-files-split crm-billing-files-layout${
        filtersOpen ? ' crm-billing-files-layout--filters-open' : ''
      }`}
    >
      {filtersOpen ? (
        <button
          type="button"
          className="crm-billing-filter-backdrop print:hidden"
          onClick={onCloseFilters}
          aria-label="Close filters"
        />
      ) : null}
      <div className="crm-files-main">
        <div className="crm-billing-files-topbar print:hidden">
          <h1 className="crm-title crm-billing-files-page-title">
            <span className="sm:hidden">Files</span>
            <span className="hidden sm:inline">Select files</span>
          </h1>

          <div className="crm-billing-files-topbar-search">
            <div className="crm-search-wrap crm-search-wrap--expand crm-billing-files-search-wrap">
              <Search size={16} className="crm-search-icon" aria-hidden />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                placeholder="File, vehicle, mobile, chassis, engine…"
                className="crm-search crm-files-search"
                aria-label="Search files"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="crm-search-clear"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="crm-billing-files-topbar-actions">
            {billableTotal > 0 ? (
              <button
                type="button"
                className="crm-btn crm-btn--secondary crm-btn--compact crm-billing-select-all-btn"
                disabled={loading}
                onClick={onSelectAllBillable}
                title={`Select all billable files (${billableTotal}). Showing ${selectedCount} selected.`}
              >
                All ({selectedCount})
              </button>
            ) : null}
            <button
              type="button"
              className={`crm-btn crm-btn--filters ${drawerFilterCount || filtersOpen ? 'crm-btn--filters-active' : ''}`}
              onClick={onOpenFilters}
            >
              <SlidersHorizontal size={16} strokeWidth={1.75} />
              <span className="crm-billing-files-filter-label">Filters</span>
              {drawerFilterCount ? (
                <span className="crm-filter-count">{drawerFilterCount}</span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="crm-billing-dealer-subrow print:hidden">
          <p className="crm-billing-dealer-subrow-text">
            <strong className="crm-billing-selection-count">{selectedCount}</strong>
            {' of '}
            <strong>{billableTotal}</strong>
            {' billable '}
            {billableTotal === 1 ? 'file' : 'files'}
            {' selected for invoice'}
          </p>
          {selectedCount > 0 && onClearSelection ? (
            <button
              type="button"
              className="crm-billing-dealer-subrow-clear"
              onClick={onClearSelection}
            >
              Clear selection
            </button>
          ) : null}
        </div>

        {appliedDrawerChips.length ? (
          <div className="crm-filter-chips print:hidden">
            <div className="crm-filter-chips-list">
              {appliedDrawerChips.map((chip) => (
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
            <button type="button" className="crm-filter-clear-all" onClick={onClearFilters}>
              Clear all
            </button>
          </div>
        ) : null}

        <div className="figma-table-card crm-billing-files-table-card">
          <FileTable
            mode="billing"
            files={files}
            loading={loading}
            users={users}
            selectedIds={selectedList}
            onToggleSelect={onToggle}
            onToggleSelectAll={toggleSelectAll}
            onStatusChange={() => {}}
            onAddExpenses={onAddExpenses}
            emptyTitle="No unpaid files"
            emptyDescription="Try different filters or pick another dealer. Paid and paper-return files are excluded from billing."
            emptyIllustration="search"
          />
        </div>
      </div>

      <FilesFilterDrawer
        open={filtersOpen}
        onClose={onCloseFilters}
        isAdmin={isAdmin}
        users={users}
        dealerOptions={[]}
        applied={appliedFilterDraft}
        onApply={(draft) => onApplyFilters(draft)}
        hideDealer
        variant="billing"
        appliedFilterChips={appliedDrawerChips}
        onClearAppliedFilters={onClearFilters}
      />
    </div>
  );
}

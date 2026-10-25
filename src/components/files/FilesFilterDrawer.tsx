import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { FILE_STATUSES, RTOS } from '@/lib/constants';
import { fetchRtos } from '@/services/rtoService';
import { fetchWorkTypes } from '@/services/workTypeService';
import { NoResultsInline } from '@/components/EmptyStateIllustration';
import type { FileFilterDraft } from '@/types/file.types';
import type { User } from '@/types/user.types';
import type { BillingFilterChip } from '@/lib/billingFileFilters';

interface FilterOption {
  value: string;
  label: string;
}

const EMPTY: FileFilterDraft = {
  userId: '',
  userIds: [],
  rtoNames: [],
  workType: '',
  workTypes: [],
  statuses: [],
  dealerNames: [],
  dateFrom: '',
  dateTo: '',
  datePreset: '',
  dateBasis: 'created',
};

const DATE_BASIS_OPTIONS = [
  { value: 'created' as const, label: 'Created date' },
  { value: 'status' as const, label: 'Status date' },
];

const FILE_STATUS_OPTIONS = FILE_STATUSES.map((item) => ({
  value: item.value,
  label: item.label,
}));

const DATE_PRESETS = [
  { value: 'hour', label: 'Within 1 hour' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '30d', label: 'Last 30 days' },
];

function normalizeDraftForCompare(d: FileFilterDraft) {
  const userIds =
    d.userIds?.length ? d.userIds : d.userId ? [d.userId] : [];
  const workTypes =
    d.workTypes?.length ? d.workTypes : d.workType ? [d.workType] : [];
  return {
    userId: d.userId || '',
    userIds: [...userIds].sort(),
    workType: d.workType || '',
    workTypes: [...workTypes].sort(),
    statuses: [...(d.statuses || [])].sort(),
    dateFrom: d.dateFrom || '',
    dateTo: d.dateTo || '',
    datePreset: d.datePreset || '',
    dateBasis: d.dateBasis === 'status' ? 'status' : 'created',
    rtoNames: [...(d.rtoNames || [])].sort(),
    dealerNames: [...(d.dealerNames || [])].sort(),
  };
}

/** Custom range is valid only when both Start and End are set. */
function hasCompleteDateRange(draft: FileFilterDraft) {
  return Boolean(draft.dateFrom && draft.dateTo);
}

/** One side filled, the other empty — Apply must stay disabled until fixed. */
function hasIncompleteDateRange(draft: FileFilterDraft) {
  const hasFrom = Boolean(draft.dateFrom);
  const hasTo = Boolean(draft.dateTo);
  return (hasFrom && !hasTo) || (!hasFrom && hasTo);
}

function hasAnyFilterInDraft(draft: FileFilterDraft) {
  if (draft.userId) return true;
  if (draft.userIds?.length) return true;
  if (draft.rtoNames?.length) return true;
  if (draft.workType) return true;
  if (draft.workTypes?.length) return true;
  if (draft.statuses?.length) return true;
  if (draft.dealerNames?.length) return true;
  // Custom dates count only as a full Start+End pair (presets are separate).
  if (hasCompleteDateRange(draft) || draft.datePreset) return true;
  if (draft.dateBasis === 'status') return true;
  return false;
}

function draftDiffersFromApplied(draft: FileFilterDraft, applied: FileFilterDraft) {
  return (
    JSON.stringify(normalizeDraftForCompare(draft)) !==
    JSON.stringify(normalizeDraftForCompare(applied))
  );
}

function draftFromApplied(applied: FileFilterDraft | undefined): FileFilterDraft {
  const a = applied || EMPTY;
  return {
    ...EMPTY,
    ...a,
    userIds: Array.isArray(a.userIds) ? [...a.userIds] : a.userId ? [a.userId] : [],
    rtoNames: Array.isArray(a.rtoNames) ? [...a.rtoNames] : [],
    workTypes: Array.isArray(a.workTypes)
      ? [...a.workTypes]
      : a.workType
        ? [a.workType]
        : [],
    statuses: Array.isArray(a.statuses) ? [...a.statuses] : [],
    dealerNames: Array.isArray(a.dealerNames) ? [...a.dealerNames] : [],
    dateBasis: a.dateBasis === 'status' ? 'status' : 'created',
  };
}

function normalizeDraftForApply(draft: FileFilterDraft): FileFilterDraft {
  const normalized = normalizeDraftForCompare(draft);
  // Never apply a one-sided custom range (Start-only / End-only).
  const dateFrom = normalized.dateFrom && normalized.dateTo ? normalized.dateFrom : '';
  const dateTo = normalized.dateFrom && normalized.dateTo ? normalized.dateTo : '';
  return {
    userId: normalized.userId,
    userIds: normalized.userIds,
    rtoNames: normalized.rtoNames,
    workType: normalized.workType,
    workTypes: normalized.workTypes,
    statuses: normalized.statuses,
    dealerNames: normalized.dealerNames,
    dateFrom,
    dateTo,
    datePreset: dateFrom || dateTo ? '' : normalized.datePreset,
    dateBasis: normalized.dateBasis === 'status' ? 'status' : 'created',
  };
}

function rtoKey(name: string) {
  return name.trim().toUpperCase().split(/[\s-]+/)[0];
}

/** Built-in first, then custom DB RTOs (API returns oldest → newest). */
function mergeRtos(custom: string[]) {
  const seen = new Set();
  const out = [];
  for (const rto of [...RTOS, ...custom]) {
    const key = rtoKey(rto);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(rto);
  }
  return out;
}

function FilterSection({
  title,
  children,
  defaultOpen = false,
  forceOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Billing drawer: keep sections expanded. */
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || forceOpen);
  return (
    <section className={`crm-filter-section ${open ? 'crm-filter-section--open' : ''}`}>
      <button
        type="button"
        className="crm-filter-section-head"
        onClick={() => {
          if (forceOpen) return;
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        disabled={forceOpen}
      >
        <span>{title}</span>
        {forceOpen ? null : (
          <ChevronDown size={16} className="crm-filter-section-chevron" />
        )}
      </button>
      {open ? <div className="crm-filter-section-body">{children}</div> : null}
    </section>
  );
}

function FilterOptionList({
  options,
  value,
  values,
  onChange,
  onChangeValues,
  multiple = false,
  searchPlaceholder = 'Search',
}: {
  options: FilterOption[];
  value?: string;
  values?: string[];
  onChange?: (value: string) => void;
  onChangeValues?: (values: string[]) => void;
  multiple?: boolean;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(values || []), [values]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="crm-filter-inline">
      <div className="crm-filter-inline-search">
        <Search size={14} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
        />
      </div>
      <div className="crm-filter-inline-list">
        {filtered.length === 0 ? (
          <NoResultsInline />
        ) : (
          filtered.map((opt) => {
            const selected = multiple ? selectedSet.has(opt.value) : opt.value === value;
            return (
              <label key={opt.value} className="crm-filter-option">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    if (multiple) {
                      const next = selected
                        ? (values || []).filter((item) => item !== opt.value)
                        : [...(values || []), opt.value];
                      onChangeValues?.(next);
                      return;
                    }
                    onChange?.(selected ? '' : opt.value);
                  }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

interface FilesFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  users: User[];
  dealerOptions: Array<string | FilterOption>;
  applied: FileFilterDraft;
  onApply: (draft: FileFilterDraft) => void;
  /** Billing pick-files: dealer is already chosen — hide dealer filter. */
  hideDealer?: boolean;
  /** Overlay modal (no inline layout shift) vs side drawer on File Records. */
  presentation?: 'drawer' | 'modal';
  /**
   * Billing file pick: `variant="billing"` (legacy).
   * File Records: `filterUi="invoice"` — same panel look as billing invoice step; billing code unchanged.
   */
  variant?: 'default' | 'billing';
  /** Invoice-style filter panel (selected chips, flat sections, checkbox lists). */
  filterUi?: 'classic' | 'invoice';
  appliedFilterChips?: BillingFilterChip[];
  onClearAppliedFilters?: () => void;
  /**
   * File Records status tabs: show Created vs Status date basis.
   * All Files / Billing leave this false (Created only).
   */
  allowStatusDateBasis?: boolean;
}

export default function FilesFilterDrawer({
  open,
  onClose,
  isAdmin,
  users,
  dealerOptions,
  applied,
  onApply,
  hideDealer = false,
  presentation = 'drawer',
  variant = 'default',
  filterUi,
  appliedFilterChips = [],
  onClearAppliedFilters,
  allowStatusDateBasis = false,
}: FilesFilterDrawerProps) {
  const invoiceUi = filterUi === 'invoice' || variant === 'billing';
  const sectionForceOpen = invoiceUi;
  const [draft, setDraft] = useState<FileFilterDraft>(applied || EMPTY);
  const [rtoNames, setRtoNames] = useState<string[]>(RTOS);
  const [workTypes, setWorkTypes] = useState<string[]>([]);

  const isApplyActive = useMemo(() => {
    // Incomplete Start/End pair blocks Apply even if other filters changed.
    if (hasIncompleteDateRange(draft)) return false;
    return (
      hasAnyFilterInDraft(draft) ||
      draftDiffersFromApplied(draft, applied || EMPTY)
    );
  }, [draft, applied]);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (justOpened) {
      setDraft(draftFromApplied(applied));
    }
  }, [open, applied]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    fetchRtos()
      .then((items) => {
        if (active) setRtoNames(mergeRtos((items || []).map((r: { name: string }) => r.name)));
      })
      .catch(() => {
        if (active) setRtoNames(RTOS);
      });
    fetchWorkTypes()
      .then((items) => {
        if (active) setWorkTypes((items || []).map((w: { name: string }) => w.name).filter(Boolean));
      })
      .catch(() => {
        if (active) setWorkTypes([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || presentation !== 'modal') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, presentation]);

  const userOptions = (users || []).map((u) => ({ value: u.id, label: u.fullName }));
  const rtoOptions = rtoNames.map((name) => ({ value: name, label: name }));
  const workOptions = workTypes.map((name) => ({ value: name, label: name }));
  const dealerOpts = (dealerOptions || []).map((name) =>
    typeof name === 'string' ? { value: name, label: name } : name
  );

  const selectPreset = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      datePreset: prev.datePreset === value ? '' : value,
      dateFrom: '',
      dateTo: '',
    }));
  };

  const setDateRange = (key: 'dateFrom' | 'dateTo', value: string) => {
    setDraft((prev) => {
      let dateFrom = prev.dateFrom;
      let dateTo = prev.dateTo;
      if (key === 'dateFrom') {
        dateFrom = value;
        // Start moved past End → clear End so user picks a valid End (≥ Start).
        if (dateFrom && dateTo && dateTo < dateFrom) dateTo = '';
      } else {
        // Ignore End before Start (min= can be bypassed via keyboard on some browsers).
        if (prev.dateFrom && value && value < prev.dateFrom) return prev;
        dateTo = value;
      }
      return {
        ...prev,
        datePreset: '',
        dateFrom,
        dateTo,
      };
    });
  };

  if (!open) return null;

  const filterPanel = (
    <>
      {invoiceUi ? <div className="crm-billing-filter-sheet-handle" aria-hidden /> : null}
      <header className="crm-filter-drawer-head">
        <h2 id="files-filter-title" className="crm-filter-drawer-title">
          Filters
        </h2>
        <button type="button" className="crm-filter-drawer-close" onClick={onClose} aria-label="Close filters">
          <X size={18} strokeWidth={1.75} />
        </button>
      </header>

      <div className="crm-filter-drawer-body">
<<<<<<< HEAD
          {/* Applied chips render above the table (File Records + Billing), not inside the drawer. */}

          {/* Billing only: File status first so it is visible without scrolling. */}
          {variant === 'billing' ? (
            <FilterSection title="File status" forceOpen={sectionForceOpen} defaultOpen>
              <FilterOptionList
                options={FILE_STATUS_OPTIONS}
                multiple
                values={draft.statuses || []}
                onChangeValues={(next) => setDraft((prev) => ({ ...prev, statuses: next }))}
                searchPlaceholder="Search status"
              />
            </FilterSection>
=======
          {invoiceUi && appliedFilterChips.length > 0 ? (
            <div className="crm-filter-drawer-applied">
              <div className="crm-filter-drawer-applied-head">
                <span className="crm-filter-drawer-applied-title">Selected filters</span>
                {onClearAppliedFilters ? (
                  <button
                    type="button"
                    className="crm-filter-drawer-applied-clear"
                    onClick={onClearAppliedFilters}
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
              <div className="crm-filter-drawer-applied-chips">
                {appliedFilterChips.map((chip) => (
                  <span key={chip.key} className="crm-filter-chip crm-filter-chip--drawer">
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
            </div>
>>>>>>> 32693cab7b9956e6a71c81e09d2970768c4b9f06
          ) : null}

          {isAdmin ? (
            <FilterSection title="Assigned user" defaultOpen forceOpen={sectionForceOpen}>
              <FilterOptionList
                options={userOptions}
                multiple
                values={draft.userIds || []}
                onChangeValues={(next) =>
                  setDraft((prev) => ({ ...prev, userIds: next, userId: '' }))
                }
                searchPlaceholder="Search users"
              />
            </FilterSection>
          ) : null}

          <FilterSection title="RTO" defaultOpen={!isAdmin} forceOpen={sectionForceOpen}>
            <FilterOptionList
              options={rtoOptions}
              multiple
              values={draft.rtoNames}
              onChangeValues={(next) => setDraft((prev) => ({ ...prev, rtoNames: next }))}
              searchPlaceholder="Search RTO"
            />
          </FilterSection>

          <FilterSection title="Work type" forceOpen={sectionForceOpen} defaultOpen={invoiceUi}>
            <FilterOptionList
              options={workOptions}
              multiple
              values={draft.workTypes || []}
              onChangeValues={(next) =>
                setDraft((prev) => ({ ...prev, workTypes: next, workType: '' }))
              }
              searchPlaceholder="Search work type"
            />
          </FilterSection>

          {hideDealer ? null : (
            <FilterSection title="Dealer" forceOpen={sectionForceOpen}>
              <FilterOptionList
                options={dealerOpts}
                multiple
                values={draft.dealerNames}
                onChangeValues={(next) => setDraft((prev) => ({ ...prev, dealerNames: next }))}
                searchPlaceholder="Search dealer"
              />
            </FilterSection>
          )}

          <FilterSection title="File date" defaultOpen forceOpen={sectionForceOpen}>
            <div className="crm-filter-date-block">
              {allowStatusDateBasis ? (
                <div className="crm-filter-date-basis" role="group" aria-label="Date filter basis">
                  {DATE_BASIS_OPTIONS.map((opt) => {
                    const selected = (draft.dateBasis || 'created') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`crm-filter-date-basis-btn${selected ? ' crm-filter-date-basis-btn--active' : ''}`}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            dateBasis: opt.value,
                          }))
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {allowStatusDateBasis && draft.dateBasis === 'status' ? (
                <p className="crm-filter-date-basis-hint">
                  Filter by the day this file moved into the current status
                </p>
              ) : null}
              <div className="crm-filter-date-presets">
                {DATE_PRESETS.map((opt) => {
                  const selected = draft.datePreset === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`crm-filter-date-preset ${selected ? 'crm-filter-date-preset--active' : ''}`}
                      onClick={() => selectPreset(opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="crm-filter-date-range">
                <label className="crm-filter-date-range-field">
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={draft.dateFrom}
                    max={draft.dateTo || undefined}
                    onChange={(e) => setDateRange('dateFrom', e.target.value)}
                  />
                </label>
                <label className="crm-filter-date-range-field">
                  <span>End Date</span>
                  <input
                    type="date"
                    value={draft.dateTo}
                    min={draft.dateFrom || undefined}
                    disabled={!draft.dateFrom}
                    onChange={(e) => setDateRange('dateTo', e.target.value)}
                  />
                </label>
                {hasIncompleteDateRange(draft) ? (
                  <p className="crm-filter-date-basis-hint">
                    Select both Start Date and End Date to apply a custom range
                  </p>
                ) : null}
              </div>
            </div>
          </FilterSection>
      </div>

      <footer className="crm-filter-drawer-foot">
        <button
          type="button"
          className="crm-filter-reset"
          onClick={() => setDraft(EMPTY)}
        >
          Reset
        </button>
        <button
          type="button"
          className={`crm-filter-apply${isApplyActive ? ' crm-filter-apply--active' : ''}`}
          disabled={!isApplyActive}
          onClick={() => {
            const next = normalizeDraftForApply(draft);
            if (!allowStatusDateBasis) next.dateBasis = 'created';
            onApply(next);
            onClose();
          }}
        >
          Apply filters
        </button>
      </footer>
    </>
  );

  if (presentation === 'modal') {
    return createPortal(
      <div className="crm-modal-backdrop" onClick={onClose} role="presentation">
        <div
          className="crm-modal crm-modal--filters crm-filter-drawer"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          aria-labelledby="files-filter-title"
        >
          {filterPanel}
        </div>
      </div>,
      document.body
    );
  }

  const wrapClass = [
    'crm-filter-drawer-wrap',
    invoiceUi && hideDealer ? ' crm-filter-drawer-wrap--billing' : '',
    invoiceUi && !hideDealer ? ' crm-filter-drawer-wrap--records-invoice' : '',
  ].join('');

  return (
    <div className={wrapClass}>
      <aside
        className={`crm-filter-drawer${invoiceUi ? ' crm-filter-drawer--billing' : ''}`}
        role="dialog"
        aria-label="Filters"
        aria-labelledby="files-filter-title"
      >
        {filterPanel}
      </aside>
    </div>
  );
}

import type { BillingPickFileFilters } from '@/types/dealerBilling.types';
import type { FileFilterDraft } from '@/types/file.types';
import type { User } from '@/types/user.types';

export const BILLING_DATE_PRESET_LABELS: Record<string, string> = {
  hour: 'Within 1 hour',
  today: 'Today',
  yesterday: 'Yesterday',
  '30d': 'Last 30 days',
};

function toChipDate(iso: string) {
  return iso.split('-').reverse().join('/');
}

export function billingDateFilterLabel(filters: BillingPickFileFilters): string {
  if (filters.datePreset) {
    return BILLING_DATE_PRESET_LABELS[filters.datePreset] || filters.datePreset;
  }
  if (filters.dateFrom && filters.dateTo) {
    return `${toChipDate(filters.dateFrom)} – ${toChipDate(filters.dateTo)}`;
  }
  if (filters.dateFrom) return `From ${toChipDate(filters.dateFrom)}`;
  if (filters.dateTo) return `Until ${toChipDate(filters.dateTo)}`;
  return '';
}

/** Default page size for billing file pick (BE max 200 per page). */
export const BILLING_FILES_PAGE_SIZE = 50;

export type BillingFilesRequestPayload = {
  page?: number;
  pageSize?: number;
  userIds?: string[];
  rtoNames?: string[];
  workTypes?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  datePreset?: string;
  fileIds?: string[];
  billableIdsOnly?: boolean;
};

/** JSON body for POST /dealers/:id/files */
export function billingFiltersToApiPayload(
  filters: BillingPickFileFilters,
  {
    page,
    pageSize,
    fileIds,
    billableIdsOnly,
  }: {
    page?: number;
    pageSize?: number;
    fileIds?: string[];
    billableIdsOnly?: boolean;
  } = {}
): BillingFilesRequestPayload {
  const body: BillingFilesRequestPayload = {};
  if (page != null) body.page = page;
  if (pageSize != null) body.pageSize = pageSize;
  if (filters.userIds?.length) body.userIds = [...filters.userIds];
  if (filters.rtoNames?.length) body.rtoNames = [...filters.rtoNames];
  if (filters.workTypes?.length) body.workTypes = [...filters.workTypes];
  if (filters.search?.trim()) body.search = filters.search.trim();

  const hasRange = Boolean(filters.dateFrom || filters.dateTo);
  if (hasRange) {
    if (filters.dateFrom) body.dateFrom = filters.dateFrom;
    if (filters.dateTo) body.dateTo = filters.dateTo;
  } else if (filters.datePreset) {
    body.datePreset = filters.datePreset;
  }

  if (fileIds?.length) body.fileIds = [...fileIds];
  if (billableIdsOnly) body.billableIdsOnly = true;
  return body;
}

/** Legacy GET query string when POST /dealers/:id/files is unavailable. */
export function billingPayloadToQueryParams(body: BillingFilesRequestPayload): Record<string, string> {
  const params: Record<string, string> = {};
  if (body.page != null) params.page = String(body.page);
  if (body.pageSize != null) params.pageSize = String(body.pageSize);
  if (body.userIds?.length) params.userId = body.userIds.join(',');
  if (body.rtoNames?.length) params.rtoName = body.rtoNames.join(',');
  if (body.workTypes?.length) params.workType = body.workTypes.join(',');
  if (body.search) params.search = body.search;
  if (body.dateFrom) params.dateFrom = body.dateFrom;
  if (body.dateTo) params.dateTo = body.dateTo;
  if (body.datePreset) params.datePreset = body.datePreset;
  if (body.fileIds?.length) params.fileIds = body.fileIds.join(',');
  if (body.billableIdsOnly) params.billableIdsOnly = '1';
  return params;
}

/** @deprecated Use billingFiltersToApiPayload — POST body replaces query params. */
export function billingFiltersToApiParams(
  filters: BillingPickFileFilters,
  opts: { page?: number; pageSize?: number } = {}
) {
  return billingPayloadToQueryParams(billingFiltersToApiPayload(filters, opts));
}

export function billingFiltersToFileFilterDraft(filters: BillingPickFileFilters): FileFilterDraft {
  return {
    userId: '',
    userIds: [...(filters.userIds || [])],
    rtoNames: filters.rtoNames || [],
    workType: '',
    workTypes: [...(filters.workTypes || [])],
    dealerNames: [],
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    datePreset: filters.datePreset,
  };
}

/** Same counting rules as File Records drawer badge (excludes search). */
export function billingDrawerFilterCount(filters: BillingPickFileFilters, isAdmin: boolean): number {
  const dateChip = billingDateFilterLabel(filters);
  return (
    (isAdmin ? filters.userIds?.length || 0 : 0) +
    (filters.rtoNames?.length || 0) +
    (filters.workTypes?.length || 0) +
    (dateChip ? 1 : 0)
  );
}

export type BillingFilterChip = { key: string; label: string; onRemove: () => void };

export type BillingDrawerChipHandlers = {
  onRemoveUser: (userId: string) => void;
  onRemoveRto: (name: string) => void;
  onRemoveWorkType: (name: string) => void;
  onClearDate: () => void;
};

/** Applied drawer filters only (excludes top-bar search). */
export function buildBillingDrawerAppliedChips(
  filters: BillingPickFileFilters,
  users: User[],
  isAdmin: boolean,
  handlers: BillingDrawerChipHandlers
): BillingFilterChip[] {
  const dateChipLabel = billingDateFilterLabel(filters);

  return [
    ...(isAdmin ? filters.userIds || [] : []).map((id) => ({
      key: `user-${id}`,
      label: users.find((u) => u.id === id)?.fullName || 'User',
      onRemove: () => handlers.onRemoveUser(id),
    })),
    ...(filters.rtoNames || []).map((name) => ({
      key: `rto-${name}`,
      label: name,
      onRemove: () => handlers.onRemoveRto(name),
    })),
    ...(filters.workTypes || []).map((name) => ({
      key: `workType-${name}`,
      label: name,
      onRemove: () => handlers.onRemoveWorkType(name),
    })),
    dateChipLabel ? { key: 'date', label: dateChipLabel, onRemove: handlers.onClearDate } : null,
  ].filter((chip): chip is BillingFilterChip => Boolean(chip));
}

export function buildBillingFilterChips(
  filters: BillingPickFileFilters,
  users: User[],
  isAdmin: boolean,
  handlers: BillingDrawerChipHandlers & {
    onClearSearch: () => void;
  }
): BillingFilterChip[] {
  return [
    filters.search?.trim()
      ? {
          key: 'search',
          label: `Search: ${filters.search.trim()}`,
          onRemove: handlers.onClearSearch,
        }
      : null,
    ...buildBillingDrawerAppliedChips(filters, users, isAdmin, handlers),
  ].filter((chip): chip is BillingFilterChip => Boolean(chip));
}

function fileFilterDraftUserIds(draft: FileFilterDraft): string[] {
  if (draft.userIds?.length) return [...draft.userIds];
  if (draft.userId) return [draft.userId];
  return [];
}

function fileFilterDraftWorkTypes(draft: FileFilterDraft): string[] {
  if (draft.workTypes?.length) return [...draft.workTypes];
  if (draft.workType) return [draft.workType];
  return [];
}

/** Drawer badge count on File Records (excludes search). */
export function fileRecordsDrawerFilterCount(draft: FileFilterDraft, isAdmin: boolean): number {
  const dateChip = billingDateFilterLabel({
    userIds: [],
    rtoNames: [],
    workTypes: [],
    search: '',
    dateFrom: draft.dateFrom,
    dateTo: draft.dateTo,
    datePreset: draft.datePreset,
  });
  return (
    (isAdmin ? fileFilterDraftUserIds(draft).length : 0) +
    (draft.rtoNames?.length || 0) +
    fileFilterDraftWorkTypes(draft).length +
    (draft.dealerNames?.length || 0) +
    (dateChip ? 1 : 0)
  );
}

export type FileFilterDrawerChipHandlers = BillingDrawerChipHandlers & {
  onRemoveDealer: (name: string) => void;
};

/** Selected filters block inside File Records drawer (excludes search). */
export function buildFileFilterDrawerAppliedChips(
  draft: FileFilterDraft,
  users: User[],
  isAdmin: boolean,
  handlers: FileFilterDrawerChipHandlers
): BillingFilterChip[] {
  const filters: BillingPickFileFilters = {
    userIds: fileFilterDraftUserIds(draft),
    rtoNames: draft.rtoNames || [],
    workTypes: fileFilterDraftWorkTypes(draft),
    search: '',
    dateFrom: draft.dateFrom,
    dateTo: draft.dateTo,
    datePreset: draft.datePreset,
  };
  return [
    ...buildBillingDrawerAppliedChips(filters, users, isAdmin, handlers),
    ...(draft.dealerNames || []).map((name) => ({
      key: `dealer-${name}`,
      label: name,
      onRemove: () => handlers.onRemoveDealer(name),
    })),
  ];
}

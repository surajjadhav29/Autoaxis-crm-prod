import { useEffect, useRef } from 'react';
import { CrmEditIcon, CrmEyeIcon, CrmPlusIcon, CrmTrashIcon } from '@/components/icons/CrmIcons';
import { useAuth } from '@/features/auth';
import { clientName } from '@/lib/constants';
import { formatDisplayDate } from '@/lib/fileDates';
import type { FileRecord, FileStatus } from '@/types/file.types';
import type { User } from '@/types/user.types';
import {
  FigmaBodyRow,
  FigmaCell,
  FigmaCheckbox,
  FigmaHeaderRow,
  FigmaSortHeader,
  FigmaTable,
} from './table/FigmaTable';
import FileRecordCard from './FileRecordCard';
import EmptyData from './EmptyData';
import type { EmptyIllustrationVariant } from './EmptyStateIllustration';
import TableSkeleton from './table/TableSkeleton';
import StatusSelect from './StatusSelect';
import AssigneeSelect from './AssigneeSelect';
import { fieldAgentDisplayForFile } from '@/services/fieldAgentService';
import PaperLocationIcon, { resolvePaperLocation } from './file/PaperLocationIcon';
import { paperLocationLabel } from '@/lib/constants';
import WhatsAppActionButton from './WhatsAppActionButton';
import FileDocumentsCell from './FileDocumentsCell';
import { getAllowedStatusValues } from '@/lib/whatsapp';
import { FILE_STATUSES } from '@/lib/constants';
import { isObjectionOverdue } from '@/lib/objectionReminder';
import {
  BILLING_ZERO_BILL_TOOLTIP,
  isBillableForInvoice,
  areAllBillableFilesSelected,
} from '@/lib/billingFileSelection';

interface TableEmptyProps {
  title: string;
  description: string;
  illustration?: EmptyIllustrationVariant;
}

function TableEmpty({ title, description, illustration = 'folder' }: TableEmptyProps) {
  return (
    <div className="figma-table-shell">
      <div className="figma-table-empty">
        <EmptyData title={title} description={description} illustration={illustration} compact />
      </div>
    </div>
  );
}

interface FileTableProps {
  files: FileRecord[];
  loading: boolean;
  /** Billing invoice step: read-only table, no dealer/actions columns. */
  mode?: 'default' | 'billing';
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIllustration?: EmptyIllustrationVariant;
  onStatusChange: (id: string, status: FileStatus) => void;
  onView?: (file: FileRecord) => void;
  onEdit?: (file: FileRecord) => void;
  onAddExpenses?: (file: FileRecord) => void;
  onWhatsApp?: (file: FileRecord) => void;
  onDelete?: (file: FileRecord) => void;
  users?: User[];
  onAssignChange?: (id: string, userId: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function statusLabel(status: string) {
  return FILE_STATUSES.find((s) => s.value === status)?.label || status;
}

export default function FileTable({
  files,
  loading,
  mode = 'default',
  emptyTitle = 'No files found',
  emptyDescription = 'Try a different filter or add a new entry.',
  emptyIllustration = 'folder',
  onStatusChange,
  onView,
  onEdit,
  onAddExpenses,
  onWhatsApp,
  onDelete,
  users = [],
  onAssignChange,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: FileTableProps) {
  const { isAdmin } = useAuth();
  const isBilling = mode === 'billing';
  const showAdminCols = isAdmin && !isBilling;
  const selectedSet = new Set(selectedIds);
  const allSelected = isBilling
    ? areAllBillableFilesSelected(files, selectedSet)
    : files.length > 0 && files.every((f) => selectedSet.has(f.id));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading || !hasMore || loadingMore || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const root = el.closest('.crm-table-scroll');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMore();
      },
      { root: root instanceof Element ? root : null, rootMargin: '160px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, hasMore, loadingMore, onLoadMore, files.length]);

  if (loading) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="hidden lg:block">
            <TableSkeleton
              variant={showAdminCols ? 'files-admin' : 'files'}
              rows={8}
              title="Loading data"
            />
          </div>
          <div className="lg:hidden">
            <TableSkeleton variant="cards" rows={6} title="Loading data" />
          </div>
        </div>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="hidden lg:block">
            <TableEmpty
              title={emptyTitle}
              description={emptyDescription}
              illustration={emptyIllustration}
            />
          </div>
          <div className="lg:hidden">
            <TableEmpty
              title={emptyTitle}
              description={emptyDescription}
              illustration={emptyIllustration}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-files-table-panel">
      <div className="crm-table-scroll">
        <div className="hidden lg:block">
          <div className="figma-table-shell">
            <FigmaTable>
              <FigmaHeaderRow>
                <FigmaCell variant="check">
                  <FigmaCheckbox
                    checked={allSelected}
                    label="Select all files on this page"
                    onChange={() => onToggleSelectAll?.()}
                  />
                </FigmaCell>
                <FigmaCell variant="client">
                  <FigmaSortHeader label="Client Name" sortable={false} />
                </FigmaCell>
                <FigmaCell variant="vehicle">
                  <FigmaSortHeader label="Vehicle No" sortable={false} />
                </FigmaCell>
                <FigmaCell variant="work">
                  <FigmaSortHeader label="Work Type" sortable={false} />
                </FigmaCell>
                {!isBilling ? (
                  <FigmaCell variant="dealer">
                    <FigmaSortHeader label="Dealer" sortable={false} />
                  </FigmaCell>
                ) : null}
                <FigmaCell variant="filedate">
                  <FigmaSortHeader label="Date" sortable={false} />
                </FigmaCell>
                {!isBilling ? (
                  <FigmaCell variant="filedocs">
                    <FigmaSortHeader label="Documents" sortable={false} />
                  </FigmaCell>
                ) : null}
                {(isAdmin || isBilling) && (
                  <FigmaCell variant="bill">
                    <FigmaSortHeader label="Bill" sortable={false} />
                  </FigmaCell>
                )}
                <FigmaCell variant="filestatus">
                  <FigmaSortHeader label="Status" sortable={false} />
                </FigmaCell>
                {!isBilling ? (
                  <FigmaCell variant="fieldagent">
                    <FigmaSortHeader label="Field Agent" sortable={false} />
                  </FigmaCell>
                ) : null}
                {(showAdminCols || (isBilling && isAdmin)) ? (
                  <FigmaCell variant="assignee">
                    <FigmaSortHeader label="Assigned To" sortable={false} />
                  </FigmaCell>
                ) : null}
                {!isBilling ? (
                  <FigmaCell variant="fileactions">
                    <FigmaSortHeader label="Actions" sortable={false} />
                  </FigmaCell>
                ) : null}
              </FigmaHeaderRow>

              {files.map((f) => {
                const overdue = isObjectionOverdue(f);
                const zeroBill = isBilling && !isBillableForInvoice(f);
                const fieldAgentLabel = fieldAgentDisplayForFile(f);
                const paperLocLabel = paperLocationLabel(resolvePaperLocation(f));
                const fieldAgentTitle = [paperLocLabel, fieldAgentLabel !== '—' ? fieldAgentLabel : null]
                  .filter(Boolean)
                  .join(' · ');
                const rowClass = [
                  overdue ? 'figma-tr--objection-overdue' : '',
                  zeroBill ? 'figma-tr--billing-zero-bill' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                <FigmaBodyRow
                  key={f.id}
                  className={rowClass || undefined}
                  title={zeroBill ? BILLING_ZERO_BILL_TOOLTIP : undefined}
                >
                  <FigmaCell variant="check">
                    <FigmaCheckbox
                      checked={selectedSet.has(f.id)}
                      disabled={zeroBill}
                      label={`Select ${f.fileNumber || f.vehicleNo}`}
                      onChange={() => onToggleSelect?.(f.id)}
                    />
                  </FigmaCell>
                  <FigmaCell variant="client">
                    <span className="figma-td-text" style={{ fontWeight: 500 }}>
                      {clientName(f)}
                    </span>
                  </FigmaCell>
                  <FigmaCell variant="vehicle">
                    <span className="figma-td-text">{f.vehicleNo}</span>
                  </FigmaCell>
                  <FigmaCell variant="work">
                    <span className="figma-td-text figma-td-text--alert">{f.workType}</span>
                  </FigmaCell>
                  {!isBilling ? (
                    <FigmaCell variant="dealer">
                      <span className="figma-td-text" style={{ color: '#576579' }}>{f.dealerName}</span>
                    </FigmaCell>
                  ) : null}
                  <FigmaCell variant="filedate">
                    <span className="figma-td-text">
                      {formatDisplayDate(f.date)}
                    </span>
                  </FigmaCell>
                  {!isBilling ? (
                    <FigmaCell variant="filedocs">
                      <FileDocumentsCell file={f} />
                    </FigmaCell>
                  ) : null}
                  {(isAdmin || isBilling) && (
                    <FigmaCell variant="bill">
                      <span className="figma-bill-text">₹ {(f.totalBill || 0).toLocaleString('en-IN')}</span>
                    </FigmaCell>
                  )}
                  <FigmaCell variant="filestatus">
                    {isBilling ? (
                      <span className="figma-td-text">{statusLabel(f.status)}</span>
                    ) : (
                      <StatusSelect
                        value={f.status}
                        allowedStatuses={getAllowedStatusValues(f)}
                        onChange={(status) => onStatusChange(f.id, status)}
                      />
                    )}
                  </FigmaCell>
                  {!isBilling ? (
                    <FigmaCell variant="fieldagent">
                      <div className="crm-field-agent-cell min-w-0" title={fieldAgentTitle}>
                        <PaperLocationIcon
                          file={f}
                          size={16}
                          className="crm-field-agent-cell-paper-icon"
                        />
                        <span className="figma-td-text crm-field-agent-cell-name truncate">
                          {fieldAgentLabel}
                        </span>
                      </div>
                    </FigmaCell>
                  ) : null}
                  {showAdminCols ? (
                    <FigmaCell variant="assignee">
                      <AssigneeSelect
                        value={f.createdBy}
                        users={users}
                        onChange={(userId) => onAssignChange?.(f.id, userId)}
                      />
                    </FigmaCell>
                  ) : null}
                  {isBilling && isAdmin ? (
                    <FigmaCell variant="assignee">
                      <span className="figma-td-text">
                        {users.find((u) => u.id === f.createdBy)?.fullName || '—'}
                      </span>
                    </FigmaCell>
                  ) : null}
                  {!isBilling ? (
                    <FigmaCell variant="fileactions">
                      <div className="figma-file-actions">
                        <button
                          type="button"
                          title="View details"
                          className="figma-icon-btn"
                          onClick={() => onView?.(f)}
                        >
                          <CrmEyeIcon size={16} />
                        </button>
                        <WhatsAppActionButton file={f} onWhatsApp={onWhatsApp} />
                        <button
                          type="button"
                          title="Add Expenses"
                          className="figma-icon-btn figma-icon-btn--plus"
                          onClick={() => onAddExpenses?.(f)}
                        >
                          <CrmPlusIcon size={16} />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          className="figma-icon-btn"
                          onClick={() => onEdit?.(f)}
                        >
                          <CrmEditIcon size={16} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          className="figma-icon-btn figma-icon-btn--danger"
                          onClick={() => onDelete?.(f)}
                        >
                          <CrmTrashIcon size={16} />
                        </button>
                      </div>
                    </FigmaCell>
                  ) : null}
                </FigmaBodyRow>
              );
              })}
            </FigmaTable>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
          {files.map((f, index) => (
            <div
              key={f.id}
              className="crm-record-card-wrap crm-animate-in"
              style={{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }}
              title={isBilling && !isBillableForInvoice(f) ? BILLING_ZERO_BILL_TOOLTIP : undefined}
            >
              <FileRecordCard
                file={f}
                mode={mode}
                selected={selectedSet.has(f.id)}
                selectDisabled={isBilling && !isBillableForInvoice(f)}
                onToggleSelect={onToggleSelect}
                onStatusChange={isBilling ? () => {} : onStatusChange}
                onView={isBilling ? undefined : onView}
                onEdit={isBilling ? undefined : onEdit}
                onAddExpenses={isBilling ? undefined : onAddExpenses}
                onWhatsApp={isBilling ? undefined : onWhatsApp}
                onDelete={isBilling ? undefined : onDelete}
                users={users}
                onAssignChange={isBilling ? undefined : onAssignChange}
              />
            </div>
          ))}
        </div>
        {hasMore || loadingMore ? (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center py-3 lg:hidden"
            aria-hidden={!loadingMore}
          >
            {loadingMore ? (
              <div className="figma-table-spinner" aria-label="Loading more records" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

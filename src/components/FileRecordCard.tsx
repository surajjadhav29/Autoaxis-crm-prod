import { CrmEditIcon, CrmEyeIcon, CrmPlusIcon, CrmTrashIcon } from '@/components/icons/CrmIcons';
import { useAuth } from '@/features/auth';
import { clientName, FILE_STATUSES } from '@/lib/constants';
import { formatDisplayDate } from '@/lib/fileDates';
import type { FileRecord, FileStatus } from '@/types/file.types';
import type { User } from '@/types/user.types';
import { FigmaCheckbox } from './table/FigmaTable';
import StatusSelect from './StatusSelect';
import AssigneeSelect from './AssigneeSelect';
import { fieldAgentDisplayForFile } from '@/services/fieldAgentService';
import PaperLocationInline from './file/PaperLocationInline';
import WhatsAppActionButton from './WhatsAppActionButton';
import FileDocumentsCell from './FileDocumentsCell';
import { getAllowedStatusValues } from '@/lib/whatsapp';
import { isObjectionOverdue } from '@/lib/objectionReminder';
import {
  BILLING_EDIT_BILL_TOOLTIP,
  BILLING_ZERO_BILL_TOOLTIP,
  isBillableForInvoice,
} from '@/lib/billingFileSelection';

function statusLabel(status: string) {
  return FILE_STATUSES.find((s) => s.value === status)?.label || status;
}

interface FileRecordCardProps {
  file: FileRecord;
  /** Billing pick step: read-only fields, same columns as desktop billing table. */
  mode?: 'default' | 'billing';
  onStatusChange: (id: string, status: FileStatus) => void;
  onView?: (file: FileRecord) => void;
  onEdit?: (file: FileRecord) => void;
  onAddExpenses?: (file: FileRecord) => void;
  onWhatsApp?: (file: FileRecord) => void;
  onDelete?: (file: FileRecord) => void;
  users?: User[];
  onAssignChange?: (id: string, userId: string) => void;
  selected?: boolean;
  selectDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function FileRecordCard({
  file,
  mode = 'default',
  onStatusChange,
  onView,
  onEdit,
  onAddExpenses,
  onWhatsApp,
  onDelete,
  users = [],
  onAssignChange,
  selected = false,
  selectDisabled = false,
  onToggleSelect,
}: FileRecordCardProps) {
  const { isAdmin } = useAuth();
  const isBilling = mode === 'billing';
  const overdue = isObjectionOverdue(file);
  const assigneeName =
    users.find((u) => u.id === file.createdBy)?.fullName || '—';

  return (
    <article
      className={`crm-record-card${overdue ? ' crm-record-card--objection-overdue' : ''}${
        selectDisabled ? ' crm-record-card--billing-zero-bill' : ''
      }`}
    >
      <div className="crm-record-card-head">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          <FigmaCheckbox
            checked={selected}
            disabled={selectDisabled}
            label={`Select ${file.fileNumber || file.vehicleNo}`}
            onChange={() => onToggleSelect?.(file.id)}
          />
        </div>
        <div className="crm-record-card-title min-w-0 flex-1">
          <p className="crm-record-card-client">{clientName(file)}</p>
          <p className="crm-record-card-vehicle break-all">{file.vehicleNo}</p>
        </div>
        {isBilling ? (
          <span className="crm-record-card-status figma-td-text shrink-0">
            {statusLabel(file.status)}
          </span>
        ) : (
          <StatusSelect
            value={file.status}
            allowedStatuses={getAllowedStatusValues(file)}
            onChange={(status) => onStatusChange(file.id, status)}
            className="crm-record-card-status"
            aria-label="Update status"
          />
        )}
      </div>

      <dl className="crm-record-card-grid">
        <div className="crm-record-card-field min-w-0">
          <dt>Work Type</dt>
          <dd className="break-words whitespace-normal">{file.workType}</dd>
        </div>
        {!isBilling ? (
          <div className="crm-record-card-field min-w-0">
            <dt>Dealer</dt>
            <dd className="break-words whitespace-normal">{file.dealerName}</dd>
          </div>
        ) : null}
        <div className="crm-record-card-field">
          <dt>Date</dt>
          <dd>{formatDisplayDate(file.date)}</dd>
        </div>
        {!isBilling ? (
          <>
            <div className="crm-record-card-field">
              <dt>Documents</dt>
              <dd>
                <FileDocumentsCell file={file} compact />
              </dd>
            </div>
            <div className="crm-record-card-field crm-record-card-field--full min-w-0">
              <dt>Paper location</dt>
              <dd>
                <PaperLocationInline file={file} compact />
              </dd>
            </div>
            <div className="crm-record-card-field min-w-0">
              <dt>Field agent</dt>
              <dd className="break-words">{fieldAgentDisplayForFile(file)}</dd>
            </div>
          </>
        ) : null}
        {(isAdmin || isBilling) && (
          <div className="crm-record-card-field">
            <dt>Bill</dt>
            <dd>
              {isBilling && onAddExpenses ? (
                <button
                  type="button"
                  className="crm-record-card-bill crm-record-card-bill--btn"
                  title={
                    isBillableForInvoice(file)
                      ? BILLING_EDIT_BILL_TOOLTIP
                      : BILLING_ZERO_BILL_TOOLTIP
                  }
                  onClick={() => onAddExpenses(file)}
                >
                  ₹ {(file.totalBill || 0).toLocaleString('en-IN')}
                </button>
              ) : (
                <span className="crm-record-card-bill">
                  ₹ {(file.totalBill || 0).toLocaleString('en-IN')}
                </span>
              )}
            </dd>
          </div>
        )}
        {isBilling && isAdmin ? (
          <div className="crm-record-card-field min-w-0">
            <dt>Assigned To</dt>
            <dd className="break-words">{assigneeName}</dd>
          </div>
        ) : null}
        {!isBilling && isAdmin ? (
          <div className="crm-record-card-field">
            <dt>Assigned To</dt>
            <dd>
              <AssigneeSelect
                value={file.createdBy}
                users={users}
                onChange={(userId) => onAssignChange?.(file.id, userId)}
              />
            </dd>
          </div>
        ) : null}
      </dl>

      {!isBilling ? (
        <div className="crm-record-card-actions">
          <button
            type="button"
            title="View details"
            className="figma-icon-btn"
            onClick={() => onView?.(file)}
          >
            <CrmEyeIcon size={16} />
          </button>
          <WhatsAppActionButton file={file} onWhatsApp={onWhatsApp} />
          <button
            type="button"
            title="Add Expenses"
            className="figma-icon-btn figma-icon-btn--plus"
            onClick={() => onAddExpenses?.(file)}
          >
            <CrmPlusIcon size={16} />
          </button>
          <button
            type="button"
            title="Edit"
            className="figma-icon-btn"
            onClick={() => onEdit?.(file)}
          >
            <CrmEditIcon size={16} />
          </button>
          <button
            type="button"
            title="Delete"
            className="figma-icon-btn figma-icon-btn--danger"
            onClick={() => onDelete?.(file)}
          >
            <CrmTrashIcon size={16} />
          </button>
        </div>
      ) : null}
    </article>
  );
}

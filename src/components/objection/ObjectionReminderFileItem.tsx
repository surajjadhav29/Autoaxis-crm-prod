import { clientName } from '@/lib/constants';
import {
  formatObjectionPendingDaysLabel,
  formatObjectionReviewDate,
  formatObjectionSinceDate,
  getLatestObjectionReview,
  getObjectionNote,
  isObjectionOverdue,
} from '@/lib/objectionReminder';
import { getAllowedStatusValues } from '@/lib/whatsapp';
import type { FileRecord, FileStatus } from '@/types/file.types';
import StatusSelect from '../StatusSelect';

export interface ObjectionReminderFileItemProps {
  file: FileRecord;
  busy?: boolean;
  reviewBusy?: boolean;
  assigneeLabel?: string | null;
  /** Staff: Review + View only. Admin reminder rows include status control. */
  showStatusControl?: boolean;
  onStatusChange: (id: string, status: FileStatus) => void;
  onViewFile: (file: FileRecord) => void;
  onOpenReview: (file: FileRecord) => void;
}

export default function ObjectionReminderFileItem({
  file,
  busy = false,
  reviewBusy = false,
  assigneeLabel = null,
  showStatusControl = false,
  onStatusChange,
  onViewFile,
  onOpenReview,
}: ObjectionReminderFileItemProps) {
  const sinceLabel = formatObjectionSinceDate(file);
  const overdue = isObjectionOverdue(file);
  const note = getObjectionNote(file);
  const lastReview = getLatestObjectionReview(file);
  const lastReviewDate = lastReview ? formatObjectionReviewDate(lastReview.at) : null;
  const actionsBusy = busy || reviewBusy;

  return (
    <li
      className={`rounded-xl border p-3 sm:p-3.5 ${
        overdue ? 'border-[#e8c4c4] bg-[#fffafa]' : 'border-[#e4e0f5] bg-[#faf9fd]'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-semibold text-[#1e242c]">{clientName(file) || '—'}</p>
          <p className="mt-0.5 mb-0 break-words text-xs text-[#576579]">
            <span className="font-medium text-[#1e242c]">{file.vehicleNo || '—'}</span>
            {file.dealerName ? ` · ${file.dealerName}` : ''}
            {file.workType ? ` · ${file.workType}` : ''}
          </p>
          {assigneeLabel ? (
            <p className="mt-1 mb-0 text-[11px] font-medium text-[#667488]">
              Assigned to <span className="text-[#3d4654]">{assigneeLabel}</span>
            </p>
          ) : null}
          <p
            className={`mt-1.5 mb-0 text-[12px] font-semibold ${
              overdue ? 'text-[#b42318]' : 'text-[#5b5dd0]'
            }`}
          >
            {formatObjectionPendingDaysLabel(file)}
            {sinceLabel ? (
              <span className="font-normal text-[#667488]"> · since {sinceLabel}</span>
            ) : null}
          </p>
        </div>
        {overdue ? (
          <span
            className="inline-flex shrink-0 items-center rounded-md bg-[#b42318] px-2 py-0.5 text-[11px] font-semibold text-white"
            title="Needs follow-up"
          >
            Overdue
          </span>
        ) : null}
      </div>

      {note ? (
        <p className="mt-2 mb-0 line-clamp-2 text-xs leading-relaxed text-[#3d4654]">
          <span className="font-medium text-[#5b5dd0]">Objection: </span>
          {note}
        </p>
      ) : (
        <p className="mt-2 mb-0 text-xs text-[#8a94a6]">No objection note recorded.</p>
      )}

      {lastReview ? (
        <p className="mt-2 mb-0 line-clamp-2 text-xs leading-relaxed text-[#576579]">
          <span className="font-medium text-[#3d4654]">Last follow-up</span>
          {lastReviewDate ? ` · ${lastReviewDate}` : ''}: {lastReview.reason}
        </p>
      ) : (
        <p className="mt-2 mb-0 text-xs text-[#8a94a6]">No follow-up note yet.</p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {showStatusControl ? (
          <div className="w-full min-w-0 sm:w-auto">
            <StatusSelect
              value={file.status}
              allowedStatuses={getAllowedStatusValues(file)}
              onChange={(status) => onStatusChange(file.id, status)}
              className={actionsBusy ? 'pointer-events-none w-full opacity-55' : 'w-full sm:w-auto'}
              aria-label={`Update status for ${file.vehicleNo || file.fileNumber}`}
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenReview(file)}
            disabled={actionsBusy}
            className="flex-1 rounded-lg border border-[#c9ccf5] bg-[#f3f0fb] px-2.5 py-1.5 text-[12px] font-semibold text-[#5b5dd0] transition hover:bg-[#ebe7f8] disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none sm:px-3"
          >
            {reviewBusy ? 'Saving…' : 'Review'}
          </button>
          <button
            type="button"
            onClick={() => onViewFile(file)}
            disabled={actionsBusy}
            className="flex-1 rounded-lg border border-[#dbdfe5] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] disabled:opacity-55 sm:flex-none sm:px-3"
          >
            View
          </button>
        </div>
        {busy && !reviewBusy ? (
          <span className="text-[11px] font-medium text-[#667488]">Updating status…</span>
        ) : null}
      </div>
    </li>
  );
}

import { clientName } from '@/lib/constants';
import {
  formatObjectionPendingDaysLabel,
  formatObjectionReviewDate,
  formatObjectionSinceDate,
  getLatestObjectionReview,
  getObjectionNote,
  isObjectionOverdue,
} from '@/lib/objectionReminder';
import type { FileRecord } from '@/types/file.types';

export interface ObjectionFollowUpFileItemProps {
  file: FileRecord;
  assigneeLabel?: string | null;
  onViewFile: (file: FileRecord) => void;
}

export default function ObjectionFollowUpFileItem({
  file,
  assigneeLabel = null,
  onViewFile,
}: ObjectionFollowUpFileItemProps) {
  const sinceLabel = formatObjectionSinceDate(file);
  const note = getObjectionNote(file);
  const lastReview = getLatestObjectionReview(file);
  const lastReviewDate = lastReview ? formatObjectionReviewDate(lastReview.at) : null;
  const actionDue = isObjectionOverdue(file);

  return (
    <li className="rounded-xl border border-[#e4e0f5] bg-[#faf9fd] p-3 sm:p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-semibold text-[#1e242c]">{clientName(file) || '—'}</p>
          <p className="mt-0.5 mb-0 text-xs text-[#576579]">
            <span className="font-medium text-[#1e242c]">{file.vehicleNo || '—'}</span>
            {file.dealerName ? ` · ${file.dealerName}` : ''}
            {file.workType ? ` · ${file.workType}` : ''}
          </p>
          {assigneeLabel ? (
            <p className="mt-1 mb-0 text-[11px] font-medium text-[#667488]">
              Assigned to <span className="text-[#3d4654]">{assigneeLabel}</span>
            </p>
          ) : null}
          <p className="mt-1.5 mb-0 text-[12px] font-semibold text-[#5b5dd0]">
            {formatObjectionPendingDaysLabel(file)}
            {sinceLabel ? (
              <span className="font-normal text-[#667488]"> · since {sinceLabel}</span>
            ) : null}
          </p>
        </div>
        {actionDue ? (
          <span className="inline-flex shrink-0 items-center rounded-md bg-[#b42318] px-2 py-0.5 text-[11px] font-semibold text-white">
            Action due
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-md bg-[#e8f5e9] px-2 py-0.5 text-[11px] font-semibold text-[#1e7e34]">
            On follow-up
          </span>
        )}
      </div>

      {note ? (
        <p className="mt-2 mb-0 line-clamp-2 text-xs leading-relaxed text-[#3d4654]">
          <span className="font-medium text-[#5b5dd0]">Objection: </span>
          {note}
        </p>
      ) : null}

      {lastReview ? (
        <div className="mt-2 rounded-lg border border-[#eef0f3] bg-white px-2.5 py-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#667488]">
            Latest follow-up
            {lastReviewDate ? ` · ${lastReviewDate}` : ''}
          </p>
          {lastReview.userName?.trim() ? (
            <p className="mt-0.5 mb-0 text-[11px] font-medium text-[#5b5dd0]">
              By {lastReview.userName.trim()}
            </p>
          ) : null}
          <p className="mt-1 mb-0 text-xs leading-relaxed text-[#3d4654]">{lastReview.reason}</p>
        </div>
      ) : null}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => onViewFile(file)}
          className="w-full rounded-lg border border-[#dbdfe5] bg-white px-3 py-1.5 text-[12px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] sm:w-auto"
        >
          View file
        </button>
      </div>
    </li>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { clientName } from '@/lib/constants';
import {
  formatObjectionReviewDate,
  getObjectionReviews,
  OBJECTION_REMINDER_DAYS,
} from '@/lib/objectionReminder';
import type { FileRecord } from '@/types/file.types';

interface ObjectionReviewModalProps {
  open: boolean;
  file: FileRecord | null;
  reason: string;
  onReasonChange: (value: string) => void;
  error?: string;
  saving?: boolean;
  showReviewerNames?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ObjectionReviewModal({
  open,
  file,
  reason,
  onReasonChange,
  error,
  saving,
  showReviewerNames = false,
  onClose,
  onConfirm,
}: ObjectionReviewModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const history = useMemo(() => {
    if (!file) return [];
    return [...getObjectionReviews(file)].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );
  }, [file]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    textareaRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !file) return null;

  const titleName = clientName(file) || file.vehicleNo || 'File';
  const vehicle = file.vehicleNo ? ` · ${file.vehicleNo}` : '';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4 md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex h-[94dvh] max-h-[94dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl border border-[#dbdfe5] bg-white shadow-[0_20px_48px_rgba(14,16,19,0.18)] sm:h-auto sm:max-h-[min(640px,92dvh)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="objection-review-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#667488] hover:bg-[#f3f4f6] hover:text-[#1e242c]"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="border-b border-[#eef0f3] px-4 pt-5 pb-4 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3f0fb] text-[#5b5dd0]">
              <ClipboardList size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2
                id="objection-review-title"
                className="m-0 text-lg font-bold text-[#1e242c] sm:text-xl"
              >
                Objection follow-up
              </h2>
              <p className="mt-1 mb-0 text-sm text-[#576579]">
                <span className="font-medium text-[#1e242c]">{titleName}</span>
                {vehicle}
              </p>
              <p className="mt-2 mb-0 text-xs leading-relaxed text-[#667488]">
                Explain why this file is still in Objection. The reminder will pause for{' '}
                {OBJECTION_REMINDER_DAYS} days, then ask you to check again.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6">
          {history.length > 0 ? (
            <section className="mb-4" aria-label="Previous follow-ups">
              <h3 className="m-0 text-[11px] font-medium uppercase tracking-[0.04em] text-[#576579]">
                Previous follow-ups
              </h3>
              <ul className="mt-2 m-0 flex list-none flex-col gap-2 p-0">
                {history.map((entry, index) => {
                  const dateLabel = formatObjectionReviewDate(entry.at);
                  const reviewer =
                    showReviewerNames && entry.userName?.trim()
                      ? entry.userName.trim()
                      : null;
                  return (
                    <li
                      key={`${entry.at}-${index}`}
                      className="rounded-lg border border-[#eef0f3] bg-[#f9fafb] px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="m-0 text-[12px] font-semibold text-[#5b5dd0]">
                          {dateLabel || '—'}
                        </p>
                        {reviewer ? (
                          <p className="m-0 text-[11px] font-medium text-[#667488]">
                            Added by {reviewer}
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-1 mb-0 text-[13px] leading-relaxed text-[#3d4654]">
                        {entry.reason}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="objection-review-reason" className="text-[13px] font-medium text-[#3d4654]">
              Why is this file still in Objection?
              <span className="ml-[3px] font-semibold text-[#dc0024]" aria-hidden>
                *
              </span>
            </label>
            <textarea
              ref={textareaRef}
              id="objection-review-reason"
              rows={4}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="e.g. Client Aadhar pending from client side…"
              className={`min-h-[96px] w-full resize-y rounded-[10px] border px-3.5 py-2.5 font-sans text-sm text-[#1e242c] outline-none transition ${
                error
                  ? 'border-[#dc0024]'
                  : 'border-[#d8dde5] focus:border-[#1a73e8] focus:shadow-[0_0_0_3px_rgba(26,115,232,0.14)]'
              }`}
            />
            {error ? <p className="m-0 text-xs font-medium text-[#dc0024]">{error}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#eef0f3] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-lg border border-[#dbdfe5] bg-white px-5 py-2.5 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] sm:w-auto sm:min-h-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="min-h-[44px] w-full rounded-lg border-0 bg-[#1a73e8] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto sm:min-h-0"
          >
            {saving ? 'Saving…' : 'Save follow-up'}
          </button>
        </div>
      </div>
    </div>
  );
}

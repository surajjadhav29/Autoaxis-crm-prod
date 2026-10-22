import { useEffect } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { ObjectionFollowUpFileItem } from '@/components/objection';
import type { FileRecord } from '@/types/file.types';

interface ObjectionFollowUpsModalProps {
  open: boolean;
  files: FileRecord[];
  totalCount?: number;
  hasMore?: boolean;
  loading?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onClose: () => void;
  onViewFile: (file: FileRecord) => void;
  assigneeNameForFile?: (file: FileRecord) => string | null;
}

export default function ObjectionFollowUpsModal({
  open,
  files,
  totalCount,
  hasMore = false,
  loading = false,
  loadingMore = false,
  onLoadMore,
  onClose,
  onViewFile,
  assigneeNameForFile,
}: ObjectionFollowUpsModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const count = totalCount ?? files.length;

  return (
    <div
      className="fixed inset-0 z-[86] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4 md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[min(640px,92dvh)] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl border border-[#dbdfe5] bg-white shadow-[0_20px_48px_rgba(14,16,19,0.18)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="objection-follow-ups-title"
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
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef7ee] text-[#1e7e34]">
              <ClipboardList size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2
                id="objection-follow-ups-title"
                className="m-0 text-lg font-bold text-[#1e242c] sm:text-xl"
              >
                Follow-ups added
              </h2>
              <p className="mt-1 mb-0 text-sm text-[#576579]">
                {count === 1
                  ? '1 objection file has a staff follow-up note.'
                  : `${count} objection files have staff follow-up notes.`}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          {loading && files.length === 0 ? (
            <p className="m-0 py-6 text-center text-sm text-[#667488]">Loading…</p>
          ) : files.length === 0 ? (
            <p className="m-0 py-6 text-center text-sm text-[#667488]">
              No follow-up notes from users yet.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {files.map((file) => (
                <ObjectionFollowUpFileItem
                  key={file.id}
                  file={file}
                  assigneeLabel={assigneeNameForFile?.(file) ?? null}
                  onViewFile={onViewFile}
                />
              ))}
            </ul>
          )}
          {hasMore && onLoadMore ? (
            <div className="mt-3 pb-1 text-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="rounded-lg border border-[#dbdfe5] bg-white px-4 py-2 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : `Load more (${files.length} of ${count})`}
              </button>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#eef0f3] px-4 py-3 sm:flex sm:justify-end sm:px-6 sm:py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border-0 bg-[#1a73e8] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1557b0] sm:w-auto sm:py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

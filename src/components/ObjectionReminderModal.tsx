import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ObjectionFollowUpFileItem, ObjectionReminderFileItem } from '@/components/objection';
import { objectionReminderModalIntro } from '@/lib/objectionReminderCopy';
import type { FileRecord, FileStatus } from '@/types/file.types';

export type ObjectionReminderTab = 'pending' | 'followups';

interface ObjectionReminderModalProps {
  open: boolean;
  files: FileRecord[];
  totalCount?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  updatingId?: string | null;
  onClose: () => void;
  onRemindLater: () => void;
  onViewFile: (file: FileRecord) => void;
  onOpenReview: (file: FileRecord) => void;
  onStatusChange: (id: string, status: FileStatus) => void;
  onOpenAll?: () => void;
  reviewUpdatingId?: string | null;
  assigneeNameForFile?: (file: FileRecord) => string | null;
  showStatusControl?: boolean;
  showAdminTabs?: boolean;
  activeTab?: ObjectionReminderTab;
  onTabChange?: (tab: ObjectionReminderTab) => void;
  followUpFiles?: FileRecord[];
  followUpTotalCount?: number;
  followUpHasMore?: boolean;
  followUpLoading?: boolean;
  followUpLoadingMore?: boolean;
  onLoadMoreFollowUps?: () => void;
}

export default function ObjectionReminderModal({
  open,
  files,
  totalCount,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  updatingId = null,
  onClose,
  onRemindLater,
  onViewFile,
  onOpenReview,
  onStatusChange,
  onOpenAll,
  reviewUpdatingId = null,
  assigneeNameForFile,
  showStatusControl = false,
  showAdminTabs = false,
  activeTab = 'pending',
  onTabChange,
  followUpFiles = [],
  followUpTotalCount,
  followUpHasMore = false,
  followUpLoading = false,
  followUpLoadingMore = false,
  onLoadMoreFollowUps,
}: ObjectionReminderModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pendingCount = totalCount ?? files.length;
  const followUpCount = followUpTotalCount ?? followUpFiles.length;
  const onFollowUpsTab = showAdminTabs && activeTab === 'followups';

  const subtitle = onFollowUpsTab
    ? followUpCount === 1
      ? '1 objection file has a staff follow-up note.'
      : `${followUpCount} objection files have staff follow-up notes.`
    : objectionReminderModalIntro(pendingCount);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4 md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex h-[94dvh] max-h-[94dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl border border-[#dbdfe5] bg-white shadow-[0_20px_48px_rgba(14,16,19,0.18)] sm:h-auto sm:max-h-[min(640px,92dvh)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="objection-reminder-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#667488] hover:bg-[#f3f4f6] hover:text-[#1e242c]"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="border-b border-[#eef0f3] px-4 pt-5 pb-0 sm:px-6">
          <div className="flex items-start gap-3 pr-8 pb-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3f0fb] text-[#5b5dd0]">
              <AlertTriangle size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2
                id="objection-reminder-title"
                className="m-0 text-lg font-bold text-[#1e242c] sm:text-xl"
              >
                Objection paper reminder
              </h2>
              <p className="mt-1 mb-0 text-xs leading-relaxed text-[#576579] sm:text-sm">{subtitle}</p>
            </div>
          </div>

          {showAdminTabs && onTabChange ? (
            <div
              className="-mx-1 flex gap-0.5 overflow-x-auto border-t border-[#eef0f3] pt-1 [scrollbar-width:none] sm:mx-0 sm:gap-1 [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Objection reminder views"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'pending'}
                id="objection-tab-pending"
                aria-controls="objection-tabpanel-pending"
                onClick={() => onTabChange('pending')}
                className={[
                  'relative flex min-h-[36px] min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-t-lg px-1.5 py-2 text-[10px] font-semibold leading-none transition sm:min-h-[44px] sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-[13px] sm:leading-normal',
                  activeTab === 'pending'
                    ? 'text-[#1a73e8] after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#1a73e8] sm:after:inset-x-2'
                    : 'text-[#667488] hover:text-[#1e242c]',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span className="sm:hidden">Pending</span>
                  <span className="hidden sm:inline">Pending follow up</span>
                  {pendingCount > 0 ? (
                    <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#fce8e8] px-1 text-[10px] font-bold leading-none text-[#b42318]">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'followups'}
                id="objection-tab-followups"
                aria-controls="objection-tabpanel-followups"
                onClick={() => onTabChange('followups')}
                className={[
                  'relative flex min-h-[36px] min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-t-lg px-1.5 py-2 text-[10px] font-semibold leading-none transition sm:min-h-[44px] sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-[13px] sm:leading-normal',
                  activeTab === 'followups'
                    ? 'text-[#5b5dd0] after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#5b5dd0] sm:after:inset-x-2'
                    : 'text-[#667488] hover:text-[#1e242c]',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span className="sm:hidden">Added</span>
                  <span className="hidden sm:inline">Follow up added</span>
                  {followUpCount > 0 ? (
                    <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#f3f0fb] px-1 text-[10px] font-bold leading-none text-[#5b5dd0]">
                      {followUpCount > 99 ? '99+' : followUpCount}
                    </span>
                  ) : null}
                </span>
              </button>
            </div>
          ) : null}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-6"
          {...(showAdminTabs
            ? {
                role: 'tabpanel' as const,
                id: onFollowUpsTab ? 'objection-tabpanel-followups' : 'objection-tabpanel-pending',
                'aria-labelledby': onFollowUpsTab
                  ? 'objection-tab-followups'
                  : 'objection-tab-pending',
              }
            : {})}
        >
          {onFollowUpsTab ? (
            <>
              {followUpLoading && followUpFiles.length === 0 ? (
                <p className="m-0 py-6 text-center text-sm text-[#667488]">Loading…</p>
              ) : followUpFiles.length === 0 ? (
                <p className="m-0 py-6 text-center text-sm text-[#667488]">
                  No follow-up notes from users yet.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {followUpFiles.map((file) => (
                    <ObjectionFollowUpFileItem
                      key={file.id}
                      file={file}
                      assigneeLabel={assigneeNameForFile?.(file) ?? null}
                      onViewFile={onViewFile}
                    />
                  ))}
                </ul>
              )}
              {followUpHasMore && onLoadMoreFollowUps ? (
                <div className="mt-3 pb-1 text-center">
                  <button
                    type="button"
                    onClick={onLoadMoreFollowUps}
                    disabled={followUpLoadingMore}
                    className="rounded-lg border border-[#dbdfe5] bg-white px-4 py-2 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] disabled:opacity-60"
                  >
                    {followUpLoadingMore
                      ? 'Loading…'
                      : `Load more (${followUpFiles.length} of ${followUpCount})`}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {files.length === 0 ? (
                <p className="m-0 py-6 text-center text-sm text-[#667488]">
                  No objection papers overdue right now.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {files.map((file) => (
                    <ObjectionReminderFileItem
                      key={file.id}
                      file={file}
                      busy={updatingId === file.id}
                      reviewBusy={reviewUpdatingId === file.id}
                      assigneeLabel={assigneeNameForFile?.(file) ?? null}
                      showStatusControl={showStatusControl}
                      onStatusChange={onStatusChange}
                      onViewFile={onViewFile}
                      onOpenReview={onOpenReview}
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
                    {loadingMore ? 'Loading…' : `Load more (${files.length} of ${pendingCount})`}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-[#eef0f3] px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
          <button
            type="button"
            onClick={onRemindLater}
            className="mb-1.5 w-full rounded-lg border-0 bg-transparent px-2 py-1.5 text-[12px] font-medium text-[#576579] transition hover:text-[#1e242c] sm:mb-0 sm:w-auto sm:py-2 sm:text-[13px]"
          >
            Close for now
          </button>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
            {onOpenAll ? (
              <button
                type="button"
                onClick={onOpenAll}
                className="rounded-lg border border-[#dbdfe5] bg-white px-2 py-2 text-[12px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] sm:w-auto sm:px-4 sm:py-2 sm:text-[13px]"
              >
                Open Objection tab
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg border-0 bg-[#1a73e8] px-2 py-2 text-[12px] font-medium text-white transition hover:bg-[#1557b0] sm:px-4 sm:py-2 sm:text-[13px] ${onOpenAll ? '' : 'col-span-2'}`}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

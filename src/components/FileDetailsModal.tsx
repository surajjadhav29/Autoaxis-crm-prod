import { useEffect, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, X } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { FILE_STATUSES, paperLocationLabel, DEFAULT_PAPER_LOCATION } from '@/lib/constants';
import { formatDisplayDate } from '@/lib/fileDates';
import {
  formatObjectionReviewDate,
  getObjectionReviews,
} from '@/lib/objectionReminder';
import { getStatusPillClass } from '@/types/file.types';
import type { FileExpenses, FileRecord } from '@/types/file.types';
import type { User } from '@/types/user.types';

interface FileDetailsModalProps {
  file: FileRecord | null;
  open: boolean;
  onClose: () => void;
  /** When set, shows “Back” to return without closing the screen underneath (e.g. objection reminder). */
  onBack?: () => void;
  backLabel?: string;
  /** Raise above objection reminder (z-85) when stacked. */
  elevated?: boolean;
  users?: User[];
}

function statusLabel(status: string): string {
  return FILE_STATUSES.find((s) => s.value === status)?.label || status;
}

function display(value?: string | number | null): string {
  if (value === 0) return '0';
  if (value == null || value === '') return '—';
  return String(value);
}

function money(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `₹ ${value.toLocaleString('en-IN')}`;
}

function formatDate(value?: string): string {
  return formatDisplayDate(value, { month: 'short' });
}

function formatLogDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

interface FileActivityLogEntry {
  key: string;
  title: string;
  at: string;
  note?: string;
}

/** Status history + paper location history, merged chronologically. */
function buildFileActivityLog(file: FileRecord): FileActivityLogEntry[] {
  const rtoName = String(file.rtoName || '').trim();
  const noteForStatus = (status: string, note?: string) => {
    const saved = String(note || '').trim();
    if (saved) return saved;
    if (status === 'completed' || status === 'done') return rtoName;
    return '';
  };

  const entries: FileActivityLogEntry[] = [];

  if (Array.isArray(file.statusHistory) && file.statusHistory.length) {
    file.statusHistory.forEach((entry, index) => {
      entries.push({
        key: `status-${entry.status}-${entry.at}-${index}`,
        title: statusLabel(entry.status),
        at: entry.at,
        note: noteForStatus(entry.status, entry.note),
      });
    });
  } else {
    entries.push({
      key: 'status-fallback-pending',
      title: statusLabel('pending'),
      at: file.createdAt || file.date,
      note: 'File created',
    });
    if (file.status && file.status !== 'pending') {
      entries.push({
        key: `status-fallback-${file.status}`,
        title: statusLabel(file.status),
        at: file.updatedAt || file.createdAt || file.date,
        note: noteForStatus(file.status, ''),
      });
    }
  }

  if (Array.isArray(file.paperLocationHistory) && file.paperLocationHistory.length) {
    file.paperLocationHistory.forEach((entry, index) => {
      entries.push({
        key: `paper-${entry.location}-${entry.at}-${index}`,
        title: paperLocationLabel(entry.location),
        at: entry.at,
        note: entry.note?.trim() || undefined,
      });
    });
  }

  return entries.sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });
}

const BILLING_LINES: { key: keyof FileExpenses; label: string; adminOnly?: boolean }[] = [
  { key: 'challan', label: 'Challan' },
  { key: 'adjustment', label: 'Adjustment' },
  { key: 'puc', label: 'PUC' },
  { key: 'hsrp', label: 'HSRP' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'roadTax', label: 'Road tax' },
  { key: 'permitCancel', label: 'Permit cancel' },
  { key: 'duplicatePermit', label: 'Duplicate permit' },
  { key: 'newPermit', label: 'New permit' },
  { key: 'pTax', label: 'P-tax' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'cngAdjustment', label: 'CNG adjustment' },
  { key: 'mobNoUpdate', label: 'Mob no. update' },
  { key: 'lateInvoice', label: 'LATE N.O.C' },
  { key: 'setDeal', label: 'Set deal', adminOnly: true },
];

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
  emphasize?: boolean;
}

function Field({ label, value, mono, emphasize }: FieldProps) {
  return (
    <div className="min-w-0">
      <dt className="m-0 text-[11px] font-normal leading-4 tracking-[0.02em] text-[#667488] uppercase">
        {label}
      </dt>
      <dd
        className={[
          'mt-1 m-0 break-words text-[13px] leading-5 text-[#1e242c]',
          mono ? 'font-mono text-[12px]' : 'font-medium',
          emphasize ? 'font-semibold' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="rounded-lg border border-[#dbdfe5] bg-white">
      <div className="border-b border-[#eef0f3] bg-[#f9fafb] px-4 py-2.5">
        <h3 className="m-0 text-[11px] font-medium leading-4 tracking-[0.04em] text-[#576579] uppercase">
          {title}
        </h3>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export default function FileDetailsModal({
  file,
  open,
  onClose,
  onBack,
  backLabel = 'Back to reminder',
  elevated = false,
  users = [],
}: FileDetailsModalProps) {
  const { isAdmin, user } = useAuth();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onBack) onBack();
        else onClose();
      }
    };

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, onBack]);

  if (!open || !file) return null;

  const expenses = file.expenses || {};
  const statusClass = `${getStatusPillClass(file.status)} figma-file-status--readonly`;
  // Staff must not see Set Deal — show total without that amount
  const visibleTotal = isAdmin
    ? (file.totalBill ?? 0)
    : (file.totalBill ?? 0) - (Number(expenses.setDeal) || 0);
  const statusLog = buildFileActivityLog(file);
  const objectionFollowUps = [...getObjectionReviews(file)].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
  const currentPaperLocation = paperLocationLabel(file.paperLocation || DEFAULT_PAPER_LOCATION);

  const createdByName =
    users.find((u) => u.id === file.createdBy)?.fullName ||
    (user?.id === file.createdBy ? user.fullName : null) ||
    'Unknown';

  return (
    <div
      className={`fixed inset-0 flex items-end justify-center bg-[rgba(14,16,19,0.45)] p-0 sm:items-center sm:p-6 ${
        elevated ? 'z-[88]' : 'z-[80]'
      }`}
      onClick={onBack ?? onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-2xl border border-[#dbdfe5] bg-white shadow-[0_7px_15px_rgba(55,73,81,0.05),0_25px_51px_rgba(55,73,81,0.07),0_60px_120px_rgba(55,73,81,0.12)] sm:max-h-[min(860px,92dvh)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-details-title"
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-[#dbdfe5] px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="absolute top-3 left-3 inline-flex size-9 items-center justify-center rounded-lg text-[#667488] transition-colors hover:bg-[#e7eaee] hover:text-[#1e242c] sm:left-4"
              aria-label={backLabel}
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBack ?? onClose}
            className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-lg text-[#667488] transition-colors hover:bg-[#e7eaee] hover:text-[#1e242c]"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.75} />
          </button>

          <p
            className={`m-0 text-[11px] font-normal leading-4 tracking-[0.08em] text-[#667488] uppercase ${onBack ? 'pl-10 pr-10' : 'pr-10'}`}
          >
            File details · {display(file.fileNumber)}
          </p>

          <h2
            id="file-details-title"
            className={`m-0 mt-2 text-[23px] font-bold leading-8 tracking-[-0.01em] text-[#1e242c] ${onBack ? 'pl-10 pr-10' : 'pr-10'}`}
          >
            {display(file.vehicleNo)}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={statusClass}>{statusLabel(file.status)}</span>

            <span className="inline-flex items-center gap-1.5 rounded bg-[#e7eaee] px-2 py-1 text-[11px] font-medium leading-4 text-[#1e242c]">
              <CalendarDays size={12} strokeWidth={1.75} className="text-[#667488]" />
              {formatDate(file.date)}
            </span>

            {file.workType ? (
              <span className="inline-flex rounded bg-[#e4e9fa] px-2 py-1 text-[11px] font-medium leading-4 text-[#1a73e8]">
                {file.workType}
              </span>
            ) : null}

            {file.dealerName ? (
              <span className="inline-flex max-w-full truncate rounded border border-[#dbdfe5] bg-white px-2 py-1 text-[11px] font-medium leading-4 text-[#576579]">
                {file.dealerName}
              </span>
            ) : null}
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f9fafb] px-5 py-4 sm:px-6 sm:py-5 [scrollbar-width:thin] [scrollbar-color:#dbdfe5_transparent]">
          <Section title="Dealer & work">
            <Field label="Dealer name" value={display(file.dealerName)} />
            <Field label="Work type" value={display(file.workType)} />
            <Field label="Paper location" value={currentPaperLocation} />
            <Field label="RTO office" value={display(file.rtoName)} />
            <Field
              label="Field agent"
              value={
                file.fieldAgentName
                  ? [file.fieldAgentName, file.fieldAgentMobile].filter(Boolean).join(' · ')
                  : display(null)
              }
            />
            <Field label="Dealer mobile" value={display(file.dealerMob)} mono />
          </Section>

          <Section title="Vehicle">
            <Field label="Vehicle no." value={display(file.vehicleNo)} emphasize />
            <Field label="Vehicle model" value={display(file.vehicleModel)} />
            <Field label="Chassis no." value={display(file.chassisNo)} mono />
            <Field label="Engine no." value={display(file.engineNo)} mono />
          </Section>

          <Section title="Owner & contact">
            <Field label="Old owner name" value={display(file.oldOwnerName)} />
            <Field label="New owner name" value={display(file.ownerName)} />
            <Field label="Old owner mobile" value={display(file.oldOwnerMob)} mono />
            <Field label="New owner mobile" value={display(file.newOwnerMob)} mono />
          </Section>

          <section className="rounded-lg border border-[#dbdfe5] bg-white">
            <div className="border-b border-[#eef0f3] bg-[#f9fafb] px-4 py-2.5">
              <h3 className="m-0 text-[11px] font-medium leading-4 tracking-[0.04em] text-[#576579] uppercase">
                Documents
              </h3>
            </div>
            <p className="m-0 px-4 py-3 text-[13px] leading-5 text-[#3d4654]">
              {Array.isArray(file.documents) && file.documents.length
                ? file.documents.join(', ')
                : 'No documents selected.'}
            </p>
            {Array.isArray(file.requiredDocuments) && file.requiredDocuments.length ? (
              <p className="m-0 border-t border-[#eef0f3] px-4 py-3 text-[12px] leading-5 text-[#667488]">
                Required: {file.requiredDocuments.join(', ')}
              </p>
            ) : null}
          </section>

          <Section title="Billing">
            {BILLING_LINES.filter((line) => {
              if (line.adminOnly && !isAdmin) return false;
              return Number(expenses[line.key]) > 0;
            }).map((line) => (
              <Field key={line.key} label={line.label} value={money(expenses[line.key])} />
            ))}
            <Field label="Total bill" value={money(visibleTotal)} emphasize />
            <Field
              label="Payment status"
              value={file.paymentDone ? 'Payment done' : 'Payment not done'}
            />
          </Section>

          <section className="overflow-hidden rounded-lg border border-[#dbdfe5] bg-white">
            <div className="shrink-0 border-b border-[#eef0f3] bg-[#f9fafb] px-4 py-2.5">
              <h3 className="m-0 text-[11px] font-medium leading-4 tracking-[0.04em] text-[#576579] uppercase">
                Status log
              </h3>
            </div>
            {statusLog.length ? (
              <ul className="m-0 max-h-[min(36dvh,240px)] list-none space-y-0 overflow-y-auto p-0 sm:max-h-[180px] [scrollbar-width:thin] [scrollbar-color:#dbdfe5_transparent]">
                {statusLog.map((entry, index) => (
                  <li
                    key={entry.key}
                    className={[
                      'flex flex-wrap items-start justify-between gap-2 px-4 py-3',
                      index < statusLog.length - 1 ? 'border-b border-[#eef0f3]' : '',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[13px] font-medium leading-5 text-[#1e242c]">
                        {entry.title}
                      </p>
                      {entry.note ? (
                        <p className="m-0 mt-0.5 text-[12px] leading-4 text-[#667488]">{entry.note}</p>
                      ) : null}
                    </div>
                    <p className="m-0 shrink-0 text-[12px] font-medium leading-4 text-[#576579]">
                      {formatLogDateTime(entry.at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 px-4 py-3 text-[13px] leading-5 text-[#3d4654]">No status history yet.</p>
            )}
          </section>

          {file.status === 'objection' || objectionFollowUps.length > 0 ? (
            <section className="overflow-hidden rounded-lg border border-[#dbdfe5] bg-white">
              <div className="shrink-0 border-b border-[#eef0f3] bg-[#f9fafb] px-4 py-2.5">
                <h3 className="m-0 text-[11px] font-medium leading-4 tracking-[0.04em] text-[#576579] uppercase">
                  Objection follow-ups
                </h3>
              </div>
              {objectionFollowUps.length ? (
                <ul className="m-0 max-h-[min(36dvh,220px)] list-none space-y-0 overflow-y-auto p-0 [scrollbar-color:#dbdfe5_transparent] [scrollbar-width:thin]">
                  {objectionFollowUps.map((entry, index) => (
                    <li
                      key={`${entry.at}-${index}`}
                      className={[
                        'px-4 py-3',
                        index < objectionFollowUps.length - 1 ? 'border-b border-[#eef0f3]' : '',
                      ].join(' ')}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="m-0 text-[12px] font-semibold text-[#5b5dd0]">
                          {formatObjectionReviewDate(entry.at) || '—'}
                        </p>
                        {isAdmin && entry.userName?.trim() ? (
                          <p className="m-0 text-[11px] font-medium text-[#667488]">
                            {entry.userName.trim()}
                          </p>
                        ) : null}
                      </div>
                      <p className="m-0 mt-1 text-[13px] leading-5 text-[#3d4654]">{entry.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 px-4 py-3 text-[13px] leading-5 text-[#667488]">
                  No follow-up notes yet. Use Review in the objection reminder when action is due.
                </p>
              )}
            </section>
          ) : null}

          <section className="rounded-lg border border-[#dbdfe5] bg-white">
            <div className="border-b border-[#eef0f3] bg-[#f9fafb] px-4 py-2.5">
              <h3 className="m-0 text-[11px] font-medium leading-4 tracking-[0.04em] text-[#576579] uppercase">
                Remarks
              </h3>
            </div>
            <p className="m-0 px-4 py-3 text-[13px] leading-5 whitespace-pre-wrap text-[#3d4654]">
              {file.remarks?.trim() ? file.remarks : 'No remarks added.'}
            </p>
          </section>

          {file.createdBy ? (
            <p className="m-0 px-1 text-[11px] leading-4 text-[#667488]">
              Created by <span className="font-medium text-[#576579]">{createdByName}</span>
              {file.createdAt ? ` · ${formatDate(file.createdAt)}` : null}
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#dbdfe5] bg-white px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#dbdfe5] bg-white px-4 text-[13px] font-semibold text-[#1a73e8] transition-colors hover:bg-[#f9fafb] sm:min-h-8 sm:w-auto sm:text-[12px]"
            >
              <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
              {backLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#e7eaee] px-4 text-[13px] font-medium leading-4 text-[#1e242c] transition-colors hover:bg-[#dde2e8] sm:min-h-8 sm:w-auto sm:text-[11px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

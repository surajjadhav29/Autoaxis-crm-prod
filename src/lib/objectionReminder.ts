import type { FileRecord, ObjectionReviewEntry } from '@/types/file.types';

/**
 * Calendar days in Objection before reminder (popup / banner / row highlight).
 * Keep in sync with crm-backend/src/utils/objectionReminder.js
 */
export const OBJECTION_REMINDER_DAYS = 3;

export const OBJECTION_REMINDER_OPEN_EVENT = 'crm:objection-reminder-open';

function toValidDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * When the file entered its current Objection stint (last transition to Objection).
 */
export function getObjectionSince(file: FileRecord): Date | null {
  if (String(file?.status || '').toLowerCase() !== 'objection') return null;

  const history = Array.isArray(file.statusHistory) ? file.statusHistory : [];
  if (history.length) {
    let stintStart: Date | null = null;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const entry = history[i];
      if (String(entry?.status || '').toLowerCase() !== 'objection') break;
      const at = toValidDate(entry.at);
      if (at) stintStart = at;
    }
    if (stintStart) return stintStart;
  }

  return (
    toValidDate(file.lastStatusAt) ||
    toValidDate(file.updatedAt) ||
    toValidDate(file.createdAt) ||
    null
  );
}

function getCalendarDaysBetween(fromDate: Date | string, now = new Date()): number | null {
  const from = toValidDate(fromDate);
  if (!from) return null;
  const fromDay = startOfLocalCalendarDay(from);
  const nowDay = startOfLocalCalendarDay(now);
  const diff = Math.floor((nowDay.getTime() - fromDay.getTime()) / 86400000);
  return diff < 0 ? 0 : diff;
}

/** Whole calendar days since Objection started (local date, not 24-hour buckets). */
export function getObjectionPendingCalendarDays(file: FileRecord, now = new Date()): number | null {
  const since = getObjectionSince(file);
  if (!since) return null;
  return getCalendarDaysBetween(since, now);
}

export function getObjectionReviews(file: FileRecord): ObjectionReviewEntry[] {
  return Array.isArray(file?.objectionReviews) ? file.objectionReviews : [];
}

export function getLatestObjectionReview(file: FileRecord): ObjectionReviewEntry | null {
  const reviews = getObjectionReviews(file);
  if (!reviews.length) return null;
  return [...reviews].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  )[0];
}

export function formatObjectionReviewDate(at?: string): string | null {
  const d = toValidDate(at);
  if (!d) return null;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getObjectionPendingDays(file: FileRecord, now = new Date()): number | null {
  return getObjectionPendingCalendarDays(file, now);
}

export function isObjectionOverdue(file: FileRecord, now = new Date()): boolean {
  if (String(file?.status || '').toLowerCase() !== 'objection') return false;
  const objectionDays = getObjectionPendingCalendarDays(file, now);
  if (objectionDays == null || objectionDays < OBJECTION_REMINDER_DAYS) return false;

  const lastReview = getLatestObjectionReview(file);
  if (!lastReview) return true;

  const daysSinceReview = getCalendarDaysBetween(lastReview.at, now);
  if (daysSinceReview == null) return true;
  return daysSinceReview >= OBJECTION_REMINDER_DAYS;
}

export function formatObjectionPendingDaysLabel(file: FileRecord, now = new Date()): string {
  const days = getObjectionPendingDays(file, now);
  if (days == null) return 'In objection';
  if (days <= 0) return 'In objection · under 1 day';
  return days === 1 ? 'In objection · 1 day' : `In objection · ${days} days`;
}

export function formatObjectionOverdueLabel(file: FileRecord, now = new Date()): string {
  return formatObjectionPendingDaysLabel(file, now);
}

export function getObjectionNote(file: FileRecord): string {
  const history = Array.isArray(file.statusHistory) ? file.statusHistory : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (String(entry?.status || '').toLowerCase() !== 'objection') continue;
    const note = String(entry?.note || '').trim();
    if (note) return note;
  }
  return String(file.remarks || '').trim();
}

function sortObjectionFilesByPending(files: FileRecord[], now = new Date()): FileRecord[] {
  return [...files].sort((a, b) => {
    const aDays = getObjectionPendingCalendarDays(a, now) ?? 0;
    const bDays = getObjectionPendingCalendarDays(b, now) ?? 0;
    if (bDays !== aDays) return bDays - aDays;
    const aAt = getObjectionSince(a)?.getTime() ?? 0;
    const bAt = getObjectionSince(b)?.getTime() ?? 0;
    return aAt - bAt;
  });
}

function isObjectionStatus(file: FileRecord): boolean {
  return String(file?.status || '').toLowerCase() === 'objection';
}

export function getObjectionStatusFiles(files: FileRecord[], now = new Date()): FileRecord[] {
  return sortObjectionFilesByPending(
    (files || []).filter((file) => isObjectionStatus(file)),
    now
  );
}

export function getOverdueObjectionFiles(files: FileRecord[], now = new Date()): FileRecord[] {
  return sortObjectionFilesByPending(
    (files || []).filter((file) => isObjectionOverdue(file, now)),
    now
  );
}

export function formatObjectionSinceDate(file: FileRecord): string | null {
  const since = getObjectionSince(file);
  if (!since) return null;
  return since.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Opens the global objection reminder modal (see OverdueObjectionProvider). */
export function openObjectionReminderModal(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OBJECTION_REMINDER_OPEN_EVENT));
}

import type { FileRecord, FileStatus } from '@/types/file.types';

/**
 * Applies a local status/remarks update mirroring server rules.
 * Does not move lastStatusAt when only the objection note changes.
 */
export function applyFileStatusUpdate(
  file: FileRecord,
  status: FileStatus,
  changedAt: string,
  remarks?: string
): FileRecord {
  const statusChanged = file.status !== status;
  const history = Array.isArray(file.statusHistory) ? [...file.statusHistory] : [];

  if (statusChanged) {
    history.push({
      status,
      at: changedAt,
      note:
        status === 'objection' && remarks
          ? remarks.trim()
          : status === 'completed' || status === 'done'
            ? String(file.rtoName || '').trim()
            : '',
    });
  } else if (status === 'objection' && remarks !== undefined) {
    const trimmed = remarks.trim();
    let notePatched = false;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (String(history[i]?.status || '').toLowerCase() !== 'objection') continue;
      history[i] = { ...history[i], note: trimmed };
      notePatched = true;
      break;
    }
    if (!notePatched) {
      history.push({ status: 'objection', at: changedAt, note: trimmed });
    }
  }

  return {
    ...file,
    status,
    remarks: remarks !== undefined ? remarks : file.remarks,
    statusHistory: history,
    lastStatusAt: statusChanged ? changedAt : file.lastStatusAt,
  };
}

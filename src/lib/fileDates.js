/**
 * Format a calendar date for display without UTC shift.
 * `YYYY-MM-DD` is treated as a local calendar day (not UTC midnight).
 */
export function formatDisplayDate(value, options = {}) {
  if (!value) return '—';
  const raw = String(value).trim();
  const dayOnly = raw.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(dayOnly) && (raw.length === 10 || raw[10] === 'T')) {
    // Pure calendar date (or ISO starting with date): build local Date from parts.
    if (raw.length === 10) {
      const [y, m, d] = dayOnly.split('-').map(Number);
      const local = new Date(y, m - 1, d);
      if (Number.isNaN(local.getTime())) return raw;
      return local.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options,
      });
    }
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

function getLocalDateKey(value) {
  if (!value) return null;
  const raw = String(value).trim();
  // Stored file.date is YYYY-MM-DD — use as calendar key (no UTC parse).
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isNewToday(file) {
  const today = getLocalDateKey(new Date());
  return getLocalDateKey(file.createdAt || file.date) === today;
}

export function filterNewTodayFiles(files) {
  return files
    .filter(isNewToday)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
}

export function getStaffTodayDisplayFiles(files) {
  return filterNewTodayFiles(files);
}

/** Normalized dealer name — must match backend `dealerNameKey` (case + spaces). */
export function dealerNameKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/** Trim + collapse spaces for display and filter labels. */
export function normalizeDealerDisplayName(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** One entry per dealer after legacy duplicates (spacing / casing) in file records. */
export function uniqueDealerDisplayNames(names: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const raw of names) {
    const display = normalizeDealerDisplayName(raw);
    if (!display) continue;
    const key = dealerNameKey(display);
    if (!byKey.has(key)) byKey.set(key, display);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

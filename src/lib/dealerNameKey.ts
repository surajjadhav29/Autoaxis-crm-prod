/** Normalized dealer name — must match backend `dealerNameKey` (case + spaces). */
export function dealerNameKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

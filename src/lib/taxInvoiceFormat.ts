export function formatTaxInvoiceRs(amount: number): string {
  const n = Math.max(0, Number(amount) || 0);
  return `Rs ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function invoiceDateTimeParts(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { date: `${day}-${month}-${year}`, time };
}

/** Safe segment for downloaded PDF file names (Windows / macOS). */
function sanitizePdfFilenamePart(value: string): string {
  return String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

/** Download / share name: `{Dealer}20Oct2026.pdf` — dealer name + invoice date, no gap. */
export function dealerInvoicePdfFilename(dealerName: string, generatedAt?: string): string {
  const dealer = sanitizePdfFilenamePart(dealerName) || 'Dealer';
  const d = generatedAt ? new Date(generatedAt) : new Date();
  if (Number.isNaN(d.getTime())) {
    return `${dealer}.pdf`;
  }
  const dateOnly = d
    .toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace(/,/g, '')
    .replace(/\s+/g, '');
  return `${dealer}${dateOnly}.pdf`;
}

/** Shown on PDF/UI — e.g. `201026` (20 Oct 2026) or legacy `2010` / `201026-2`. */
export function displayInvoiceNumber(billNumber: string): string {
  const s = String(billNumber || '').trim();
  if (/^\d{6}(-\d+)?$/.test(s)) return s;
  if (/^\d{4}(-\d+)?$/.test(s)) return s;
  if (/^\d{2}-\d+$/.test(s)) return s;
  if (/^\d{3,}$/.test(s)) return s;
  const tail = s.split('-').pop();
  return tail && /^\d+$/.test(tail) ? tail : s;
}

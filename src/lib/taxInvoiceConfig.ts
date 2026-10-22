function envStr(value: string | undefined, fallback: string): string {
  const v = String(value ?? '').trim();
  return v || fallback;
}

const DEFAULT_INVOICE_ADDRESS_LINES = [
  'shop no 2 ground floor, nakoda pratap bldg new era society near indian',
  'oil petrol pump, bibwewadi',
  'kondhwa road, gangadham chowk, market yard pune 411037',
] as const;

/** First address block → two lines (break before “oil petrol pump,” through bibwewadi). */
function splitBeforeBibwewadi(chunkThroughBib: string): [string, string] | null {
  const normalized = chunkThroughBib.replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const marker = 'oil petrol pump';
  const markerIdx = lower.indexOf(marker);
  if (markerIdx === -1) return null;

  const line1 = normalized.slice(0, markerIdx).trim();
  const line2 = normalized.slice(markerIdx).trim();
  if (!line1 || !line2) return null;

  return [line1, line2];
}

/** Parse one-line or env address into invoice rows (2–3 lines). */
function splitCombinedInvoiceAddress(combined: string): string[] {
  const normalized = combined.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  if (normalized.includes('\n')) {
    return normalized
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const lower = normalized.toLowerCase();
  const bib = 'bibwewadi';
  const bibIdx = lower.indexOf(bib);
  if (bibIdx === -1) return [normalized];

  const throughBib = normalized.slice(0, bibIdx + bib.length).trim();
  let afterBib = normalized.slice(bibIdx + bib.length).trim();
  if (afterBib.startsWith(',')) afterBib = afterBib.slice(1).trim();

  const leading = splitBeforeBibwewadi(throughBib);
  if (leading && afterBib) return [leading[0], leading[1], afterBib];
  if (leading) return [leading[0], leading[1]];

  const splitAt = bibIdx + bib.length;
  const first = normalized.slice(0, splitAt).trim();
  let second = normalized.slice(splitAt).trim();
  if (second.startsWith(',')) second = second.slice(1).trim();
  if (first && second) return [first, second];

  return [normalized];
}

function resolveInvoiceAddressLines(): string[] {
  const line1 = String(import.meta.env.VITE_INVOICE_ADDRESS_LINE1 ?? '').trim();
  const line2 = String(import.meta.env.VITE_INVOICE_ADDRESS_LINE2 ?? '').trim();
  const line3 = String(import.meta.env.VITE_INVOICE_ADDRESS_LINE3 ?? '').trim();
  if (line1 && line2 && line3) return [line1, line2, line3];
  if (line1 && line2) return [line1, line2];

  const combined = String(import.meta.env.VITE_INVOICE_ADDRESS ?? '').trim();
  if (combined) {
    const split = splitCombinedInvoiceAddress(combined);
    if (split.length >= 2) return split;
  }

  if (line1) {
    const split = splitCombinedInvoiceAddress(line1);
    if (split.length >= 2) return split;
  }

  return [...DEFAULT_INVOICE_ADDRESS_LINES];
}

/** Address block rows for invoice header (split before “oil petrol pump,”). */
export function invoiceIssuerAddressLines(): string[] {
  const lines = resolveInvoiceAddressLines();
  if (lines.length >= 3) return lines;

  const joined = lines.join(' ').replace(/\s+/g, ' ').trim();
  const expanded = splitCombinedInvoiceAddress(joined);
  if (expanded.length >= 2) return expanded;

  return [...DEFAULT_INVOICE_ADDRESS_LINES];
}

/** @deprecated Use invoiceIssuerAddressLines() */
export function invoiceIssuerAddressTwoLines(): [string, string] {
  const lines = invoiceIssuerAddressLines();
  return [lines[0] ?? DEFAULT_INVOICE_ADDRESS_LINES[0], lines[1] ?? DEFAULT_INVOICE_ADDRESS_LINES[1]];
}

/** Issuer + bank details for tax invoice PDF / preview (from `.env` VITE_* keys). */
export const TAX_INVOICE_ISSUER = {
  legalName: envStr(
    import.meta.env.VITE_INVOICE_LEGAL_NAME,
    'AUTOAXIS SOLUTION AND SERVICES LLP'
  ),
  addressLines: invoiceIssuerAddressLines(),
  get address(): string {
    return TAX_INVOICE_ISSUER.addressLines.filter(Boolean).join('\n');
  },
  phone: envStr(import.meta.env.VITE_INVOICE_PHONE, '8308057172'),
  email: envStr(import.meta.env.VITE_INVOICE_EMAIL, 'support@autoaxissolution.com'),
  state: envStr(import.meta.env.VITE_INVOICE_STATE, '27-Maharashtra'),
  bankName: envStr(import.meta.env.VITE_INVOICE_BANK_NAME, 'HDFC BANK, BIBVEWADI'),
  accountNo: envStr(import.meta.env.VITE_INVOICE_BANK_ACCOUNT, '50200115764526'),
  ifsc: envStr(import.meta.env.VITE_INVOICE_BANK_IFSC, 'HDFC0000962'),
  accountHolder: envStr(
    import.meta.env.VITE_INVOICE_BANK_HOLDER,
    'AUTOAXIS SOLUTION AND SERVICES LLP'
  ),
  upiVpa: envStr(
    import.meta.env.VITE_UPI_ID || import.meta.env.VITE_INVOICE_UPI_VPA,
    ''
  ),
  paymentMode: envStr(import.meta.env.VITE_INVOICE_PAYMENT_MODE, 'Credit'),
  terms: envStr(import.meta.env.VITE_INVOICE_TERMS, 'Thanks for doing business with us!'),
};

/** Light purple used on sample tax invoice headers. */
export const TAX_INVOICE_PURPLE: [number, number, number] = [178, 169, 230];

import logoUrl from '@/assets/billing/autoaxis-solution-logo.jpg';

export const INVOICE_LOGO_SRC = logoUrl;

let cachedDataUrl: string | null = null;

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode invoice logo'));
    img.src = src;
  });
}

export async function loadInvoiceLogoDataUrl(): Promise<string> {
  if (cachedDataUrl) return cachedDataUrl;
  const res = await fetch(logoUrl);
  if (!res.ok) {
    throw new Error('Failed to load invoice logo');
  }
  const blob = await res.blob();
  cachedDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read logo'));
    reader.readAsDataURL(blob);
  });
  return cachedDataUrl;
}

export type InvoiceLogoPdfLayout = {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Top-right logo on tax invoice PDF (pt). */
export async function invoiceLogoPdfLayout(
  pageWidth: number,
  margin: number,
  topY: number
): Promise<InvoiceLogoPdfLayout> {
  const dataUrl = await loadInvoiceLogoDataUrl();
  const img = await loadHtmlImage(dataUrl);
  const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
  const width = 172;
  const height = width / aspect;
  const x = pageWidth - margin - width;
  const y = topY;
  return { dataUrl, x, y, width, height };
}

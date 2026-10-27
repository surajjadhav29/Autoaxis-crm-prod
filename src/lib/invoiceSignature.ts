import signatureUrl from '@/assets/billing/authorized-signatory-asif.png';

/** Bundled authorized signatory scan (preview + PDF). */
export const INVOICE_SIGNATURE_SRC = signatureUrl;

let cachedDataUrl: string | null = null;
let cachedCroppedDataUrl: string | null = null;

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode signature'));
    img.src = src;
  });
}

/** Flatten signature onto white invoice paper (drops dark scan background). */
async function cropSignatureScan(sourceUrl: string): Promise<string> {
  const img = await loadHtmlImage(sourceUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceUrl;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 48 && g < 48 && b < 48) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function loadInvoiceSignatureDataUrl(): Promise<string> {
  if (cachedCroppedDataUrl) return cachedCroppedDataUrl;
  if (!cachedDataUrl) {
    const res = await fetch(signatureUrl);
    if (!res.ok) {
      throw new Error('Failed to load invoice signature image');
    }
    const blob = await res.blob();
    cachedDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('read signature'));
      reader.readAsDataURL(blob);
    });
  }
  cachedCroppedDataUrl = await cropSignatureScan(cachedDataUrl);
  return cachedCroppedDataUrl;
}

export type InvoiceSignaturePdfLayout = {
  dataUrl: string;
  forY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signatoryY: number;
};

/** Right-aligned signature block (pt) for jsPDF invoice footer. */
export async function invoiceSignaturePdfLayout(
  pageWidth: number,
  margin: number,
  footerTop: number
): Promise<InvoiceSignaturePdfLayout> {
  const dataUrl = await loadInvoiceSignatureDataUrl();
  const img = await loadHtmlImage(dataUrl);
  const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
  const width = 96;
  const height = width / aspect;
  const x = pageWidth - margin - width;
  const forY = footerTop + 28;
  const y = forY + 14;
  const signatoryY = y + height + 10;
  return { dataUrl, forY, x, y, width, height, signatoryY };
}

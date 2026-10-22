import type { BillingDraft } from '@/types/dealerBilling.types';
import {
  billingDraftBalance,
  billingDraftReceivedAmount,
  billingDraftTotalAmount,
} from '@/lib/billingInvoice';
import { getDealerBillPdfBlob } from '@/lib/dealerBillingPdf';
import { TAX_INVOICE_ISSUER } from '@/lib/taxInvoiceConfig';
import {
  dealerInvoicePdfFilename,
  displayInvoiceNumber,
  formatTaxInvoiceRs,
  invoiceDateTimeParts,
} from '@/lib/taxInvoiceFormat';

function cleanMobile(mobile: string): string {
  const digits = String(mobile || '').replace(/[^0-9]/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function buildInvoiceWhatsAppMessage(draft: BillingDraft): string {
  const total = billingDraftTotalAmount(draft);
  const received = billingDraftReceivedAmount(draft);
  const balance = billingDraftBalance(draft);
  const invNo = displayInvoiceNumber(draft.billNumber);
  const when = draft.generatedAt ? new Date(draft.generatedAt) : new Date();
  const { date } = invoiceDateTimeParts(when);
  const vehicleLines = draft.lines
    .map((line, i) => `${i + 1}. ${line.vehicleNo || '—'} — ${formatTaxInvoiceRs(line.amount)}`)
    .join('\n');

  return (
    `*Tax Invoice — ${draft.dealer.name}*\n\n` +
    `Invoice No: ${invNo}\n` +
    `Generated: ${date}\n` +
    `Total: *${formatTaxInvoiceRs(total)}*\n` +
    `Received: ${formatTaxInvoiceRs(received)}\n` +
    `Balance: *${formatTaxInvoiceRs(balance)}*\n\n` +
    `*Vehicles:*\n${vehicleLines}\n\n` +
    `Invoice PDF is attached / downloaded for your records.\n\n` +
    `Regards,\n${TAX_INVOICE_ISSUER.legalName}`
  );
}

function triggerPdfDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openWhatsAppChat(mobile10: string, message: string) {
  const encoded = encodeURIComponent(message);
  const path = mobile10.length === 10 ? `https://wa.me/91${mobile10}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(path, '_blank', 'noopener,noreferrer');
}

export type ShareInvoiceWhatsAppResult = { ok: true; usedNativeShare: boolean } | { ok: false; reason: string };

/** Share tax invoice PDF + summary on WhatsApp (native share when supported). */
export async function shareDealerBillOnWhatsApp(draft: BillingDraft): Promise<ShareInvoiceWhatsAppResult> {
  const message = buildInvoiceWhatsAppMessage(draft);
  const blob = await getDealerBillPdfBlob(draft);
  const filename = dealerInvoicePdfFilename(draft.dealer.name, draft.generatedAt);
  const file = new File([blob], filename, { type: 'application/pdf' });
  const mobile = cleanMobile(draft.dealer.phone);

  const sharePayload = { files: [file], text: message, title: `Invoice ${draft.billNumber}` };
  if (typeof navigator.share === 'function' && navigator.canShare?.(sharePayload)) {
    try {
      await navigator.share(sharePayload);
      return { ok: true, usedNativeShare: true };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, reason: 'Share cancelled' };
      }
    }
  }

  triggerPdfDownload(blob, filename);
  openWhatsAppChat(
    mobile,
    `${message}\n\n_Please attach the downloaded PDF (${filename}) in this chat._`
  );

  if (mobile.length !== 10) {
    return {
      ok: true,
      usedNativeShare: false,
    };
  }

  return { ok: true, usedNativeShare: false };
}

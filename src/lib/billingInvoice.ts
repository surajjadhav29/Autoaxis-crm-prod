import type { BillingDraft, StoredDealerInvoice } from '@/types/dealerBilling.types';
import type { DealerRegistryRecord } from '@/types/dealer.types';
import { displayInvoiceNumber } from '@/lib/taxInvoiceFormat';

export function billingDraftTotal(draft: BillingDraft): number {
  return draft.lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
}

export function billingDraftTotalAmount(draft: BillingDraft): number {
  if (draft.totalAmount != null && Number.isFinite(draft.totalAmount)) {
    return Math.max(0, Number(draft.totalAmount));
  }
  return billingDraftTotal(draft);
}

export function billingDraftReceivedAmount(draft: BillingDraft): number {
  return Math.max(0, Number(draft.receivedAmount) || 0);
}

export function billingDraftBalance(draft: BillingDraft): number {
  return Math.max(0, billingDraftTotalAmount(draft) - billingDraftReceivedAmount(draft));
}

/** UPI QR uses remaining balance; nothing due when balance is 0. */
export function billingQrPayAmount(draft: BillingDraft): number {
  return billingDraftBalance(draft);
}

export function formatInvoiceGeneratedLabel(iso?: string, fallbackBillDate?: string): string {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  }
  return fallbackBillDate || '—';
}

/** Compact generated date for invoice tracking table (full string in title). */
export function formatInvoiceTrackingDateParts(iso?: string): {
  dateLine: string;
  timeLine: string;
  title: string;
} {
  const title = formatInvoiceGeneratedLabel(iso);
  if (!iso) {
    return { dateLine: '—', timeLine: '', title };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateLine: '—', timeLine: '', title };
  }
  const dateLine = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeLine = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { dateLine, timeLine, title };
}

export function snapshotToDealer(
  snapshot: DealerRegistryRecord,
  dealerId: string
): DealerRegistryRecord {
  return { ...snapshot, id: dealerId };
}

export function storedInvoiceToDraft(invoice: StoredDealerInvoice): BillingDraft {
  const generated = new Date(invoice.generatedAt);
  const billDate = Number.isNaN(generated.getTime())
    ? ''
    : generated.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
  return {
    invoiceId: invoice.id,
    dealer: snapshotToDealer(invoice.dealerSnapshot, invoice.dealerId),
    billNumber: invoice.billNumber,
    billDate,
    generatedAt: invoice.generatedAt,
    totalAmount: invoice.totalAmount,
    receivedAmount: invoice.receivedAmount,
    lines: invoice.lines,
  };
}

export function parseReceivedInput(value: string): number {
  const n = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Cumulative received on invoice must be between 0 and invoice total (inclusive). */
export function isReceivedAmountWithinTotal(received: number, total: number): boolean {
  if (!Number.isFinite(received) || received < 0) return false;
  const cap = Number.isFinite(total) ? Math.max(0, total) : 0;
  return received <= cap;
}

export type InvoicePaymentStatus = 'Paid' | 'Partial' | 'Open';

export function invoiceTrackingStatus(invoice: StoredDealerInvoice): InvoicePaymentStatus {
  const received = Math.max(0, Number(invoice.receivedAmount) || 0);
  const balance = Math.max(0, Number(invoice.balanceAmount) || 0);
  if (balance <= 0) return 'Paid';
  if (received > 0) return 'Partial';
  return 'Open';
}

export function invoiceTrackingStatusClass(status: InvoicePaymentStatus): string {
  const base = 'figma-file-status figma-file-status--readonly crm-billing-invoice-status';
  switch (status) {
    case 'Paid':
      return `${base} figma-file-status--done`;
    case 'Partial':
      return `${base} figma-file-status--progress`;
    default:
      return `${base} figma-file-status--pending`;
  }
}

export function matchesInvoiceTrackingSearch(
  invoice: StoredDealerInvoice,
  rawQuery: string
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const dealerName = (invoice.dealerSnapshot?.name || '').toLowerCase();
  if (dealerName.includes(q)) return true;

  const billLower = invoice.billNumber.toLowerCase();
  if (billLower.includes(q)) return true;

  const displayNo = displayInvoiceNumber(invoice.billNumber).toLowerCase();
  if (displayNo.includes(q)) return true;

  const amounts = [invoice.totalAmount, invoice.receivedAmount, invoice.balanceAmount];
  const qDigits = q.replace(/[^\d]/g, '');
  if (qDigits.length >= 1) {
    for (const amount of amounts) {
      const rounded = String(Math.round(Number(amount) || 0));
      if (rounded.includes(qDigits)) return true;
    }
  }

  const qNum = Number(q.replace(/,/g, ''));
  if (Number.isFinite(qNum) && qNum > 0) {
    if (amounts.some((amount) => Math.round(amount) === Math.round(qNum))) return true;
  }

  return false;
}

export function draftToCreateInvoiceBody(draft: BillingDraft, receivedAmount: number) {
  return {
    receivedAmount,
    lines: draft.lines.map((line) => ({
      fileId: line.fileId,
      vehicleNo: line.vehicleNo,
      vehicleModel: line.vehicleModel,
      rtoName: line.rtoName,
      workType: line.workType,
      fileNumber: line.fileNumber,
      extraAmount: line.extraAmount,
      dealAmount: line.dealAmount,
      amount: line.amount,
    })),
  };
}

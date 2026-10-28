import type { FileExpenses, FileRecord } from '@/types/file.types';
import type { BillingLineItem } from '@/types/dealerBilling.types';
import { formatTaxInvoiceRs } from '@/lib/taxInvoiceFormat';

/** Matches backend EXPENSE_FIELDS minus setDeal. */
export const INVOICE_EXTRA_EXPENSE_KEYS: (keyof FileExpenses)[] = [
  'challan',
  'adjustment',
  'puc',
  'hsrp',
  'insurance',
  'roadTax',
  'permitCancel',
  'duplicatePermit',
  'newPermit',
  'pTax',
  'urgent',
  'cngAdjustment',
  'mobNoUpdate',
  'lateInvoice',
];

function parseMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function splitFileExpensesForInvoice(
  expenses?: FileExpenses | null,
  totalBillFallback?: number
): { extraAmount: number; dealAmount: number; amount: number } {
  const exp = expenses || {};
  let extraAmount = 0;
  for (const key of INVOICE_EXTRA_EXPENSE_KEYS) {
    extraAmount += parseMoney(exp[key]);
  }
  const dealAmount = parseMoney(exp.setDeal);
  let amount = extraAmount + dealAmount;
  if (amount <= 0) {
    amount = parseMoney(totalBillFallback);
    if (amount > 0 && extraAmount === 0 && dealAmount === 0) {
      extraAmount = amount;
    }
  }
  return { extraAmount, dealAmount, amount };
}

export function billingLineFromFileRecord(file: FileRecord): BillingLineItem {
  const { extraAmount, dealAmount, amount } = splitFileExpensesForInvoice(
    file.expenses,
    file.totalBill
  );
  return {
    fileId: file.id,
    vehicleNo: file.vehicleNo,
    vehicleModel: file.vehicleModel,
    rtoName: file.rtoName || '',
    workType: file.workType,
    fileNumber: file.fileNumber,
    extraAmount,
    dealAmount,
    amount,
  };
}

/** Display amounts for PDF/preview (legacy lines may omit extra/deal). */
export function invoiceLineAmountColumns(line: BillingLineItem): {
  extraAmount: number | null;
  dealAmount: number | null;
  total: number;
} {
  const total = Math.max(0, Number(line.amount) || 0);
  if (line.extraAmount == null && line.dealAmount == null) {
    return { extraAmount: null, dealAmount: null, total };
  }
  const extra = Math.max(0, Number(line.extraAmount) || 0);
  const deal = Math.max(0, Number(line.dealAmount) || 0);
  const splitTotal = extra + deal;
  return {
    extraAmount: extra,
    dealAmount: deal,
    total: splitTotal > 0 ? splitTotal : total,
  };
}

export function formatInvoiceLineAmountCell(value: number | null): string {
  if (value == null) return '—';
  return formatTaxInvoiceRs(value);
}

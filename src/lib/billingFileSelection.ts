import type { FileRecord } from '@/types/file.types';

export const BILLING_ZERO_BILL_TOOLTIP =
  'Bill amount is ₹0. Open the file in File Records and add expenses before invoicing.';

export function fileBillAmount(file: FileRecord): number {
  return Math.max(0, Number(file.totalBill) || 0);
}

export function isBillableForInvoice(file: FileRecord): boolean {
  return fileBillAmount(file) > 0;
}

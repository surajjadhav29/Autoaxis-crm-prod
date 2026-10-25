import type { FileRecord } from '@/types/file.types';

export const BILLING_ZERO_BILL_TOOLTIP =
  'Bill amount is ₹0. Click the bill amount to add expenses before invoicing.';

export const BILLING_EDIT_BILL_TOOLTIP = 'Click to add or edit expenses';

export function fileBillAmount(file: FileRecord): number {
  return Math.max(0, Number(file.totalBill) || 0);
}

export function isBillableForInvoice(file: FileRecord): boolean {
  return fileBillAmount(file) > 0;
}

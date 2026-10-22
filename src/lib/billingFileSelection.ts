import type { FileRecord } from '@/types/file.types';

export const BILLING_ZERO_BILL_TOOLTIP =
  'Bill amount is ₹0. Open the file in File Records and add expenses before invoicing.';

export function fileBillAmount(file: FileRecord): number {
  return Math.max(0, Number(file.totalBill) || 0);
}

export function isBillableForInvoice(file: FileRecord): boolean {
  return fileBillAmount(file) > 0;
}

export function areAllBillableFilesSelected(
  files: FileRecord[],
  selectedIds: Iterable<string>
): boolean {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  const billable = files.filter(isBillableForInvoice);
  return billable.length > 0 && billable.every((f) => selected.has(f.id));
}

import type { DealerRegistryRecord } from './dealer.types';
import type { FileRecord } from './file.types';

export type BillingWizardStep = 1 | 2 | 3;

export interface BillingLineItem {
  fileId: string;
  vehicleNo: string;
  vehicleModel?: string;
  /** RTO office name from file record. */
  rtoName?: string;
  workType: string;
  fileNumber: string;
  /** Sum of expense lines except setDeal (Set Deal Amount). */
  extraAmount?: number;
  /** Set Deal Amount from file expenses. */
  dealAmount?: number;
  /** Line total (extraAmount + dealAmount). */
  amount: number;
}

export interface BillingDraft {
  invoiceId?: string;
  dealer: DealerRegistryRecord;
  lines: BillingLineItem[];
  billNumber: string;
  /** Display date label (legacy / fallback). */
  billDate: string;
  /** ISO — fixed when invoice was first saved on server. */
  generatedAt?: string;
  totalAmount?: number;
  receivedAmount?: number;
}

export interface StoredDealerInvoice {
  id: string;
  dealerId: string;
  billNumber: string;
  generatedAt: string;
  dealerSnapshot: Omit<DealerRegistryRecord, 'id' | 'createdBy'>;
  lines: BillingLineItem[];
  totalAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  filesMarkedPaid: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type BillingStudioMode = 'new' | 'track';

export interface BillingPreviewContext {
  draft: BillingDraft;
  files: FileRecord[];
}

/** Same filters as File Records (except dealer — fixed by billing step). */
export interface BillingPickFileFilters {
  userIds: string[];
  rtoNames: string[];
  workTypes: string[];
  dateFrom: string;
  dateTo: string;
  datePreset: string;
  search: string;
}

export const EMPTY_BILLING_FILE_FILTERS: BillingPickFileFilters = {
  userIds: [],
  rtoNames: [],
  workTypes: [],
  dateFrom: '',
  dateTo: '',
  datePreset: '',
  search: '',
};

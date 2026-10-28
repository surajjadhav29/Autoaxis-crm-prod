export type FileStatus =
  | 'pending'
  | 'in_progress'
  | 'objection'
  | 'paper_return'
  | 'on_hold'
  | 'completed'
  | 'done';

export type PaperLocation = 'paper_in_office' | 'paper_with_field_agent';

export interface PaperLocationLogEntry {
  location: PaperLocation | string;
  at: string;
  note?: string;
}

export interface FileExpenses {
  challan?: number;
  adjustment?: number;
  puc?: number;
  hsrp?: number;
  insurance?: number;
  roadTax?: number;
  permitCancel?: number;
  duplicatePermit?: number;
  newPermit?: number;
  pTax?: number;
  urgent?: number;
  cngAdjustment?: number;
  mobNoUpdate?: number;
  lateInvoice?: number;
  setDeal?: number;
}

export interface FileStatusLogEntry {
  status: FileStatus | string;
  at: string;
  note?: string;
}

export interface ObjectionReviewEntry {
  reason: string;
  at: string;
  userId?: string;
  userName?: string;
}

export interface FileFormValues {
  dealerId: string;
  dealerName: string;
  workType: string;
  paperLocation: PaperLocation;
  vehicleNo: string;
  vehicleModel: string;
  chassisNo: string;
  engineNo: string;
  oldOwnerName: string;
  ownerName: string;
  oldOwnerMob: string;
  newOwnerMob: string;
  dealerMob: string;
  rtoName: string;
  /** Set automatically from RTO — not shown on New Entry / Edit forms */
  fieldAgentId: string;
  remarks: string;
  documents: string[];
  requiredDocuments: string[];
}

export interface FileFilterDraft {
  userId: string;
  /** Billing drawer: multi assigned-user filter. */
  userIds?: string[];
  rtoNames: string[];
  workType: string;
  /** Billing drawer: multi work-type filter. */
  workTypes?: string[];
  /** Billing drawer: multi file-status filter. */
  statuses?: string[];
  dealerNames: string[];
  dateFrom: string;
  dateTo: string;
  datePreset: string;
  /**
   * File Records only. `created` (default) = file Created date;
   * `status` = day the file entered its current status (status tabs).
   */
  dateBasis?: 'created' | 'status';
}

export interface FileStats {
  pending?: number;
  inProcess?: number;
  objection?: number;
  holdSheet?: number;
  returnPaper?: number;
  completed?: number;
  totalRecords?: number;
  totalBilling?: number;
  live?: number;
  [key: string]: number | undefined;
}

export interface WorkType {
  id: string;
  name: string;
  documents?: string[];
}

export interface FileRecord {
  id: string;
  fileNumber: string;
  date: string;
  status: FileStatus;
  dealerName: string;
  dealerId?: string | null;
  workType: string;
  paperLocation?: PaperLocation;
  vehicleNo: string;
  vehicleModel: string;
  chassisNo: string;
  engineNo: string;
  oldOwnerName: string;
  ownerName?: string;
  oldOwnerMob: string;
  newOwnerMob: string;
  dealerMob?: string;
  rtoName: string;
  paperLocationHistory?: PaperLocationLogEntry[];
  fieldAgentId?: string | null;
  fieldAgentName?: string;
  fieldAgentMobile?: string;
  fieldAgentRtoName?: string;
  fieldAgentDistrict?: string;
  remarks?: string;
  documents?: string[];
  requiredDocuments?: string[];
  totalBill?: number;
  paymentDone?: boolean;
  expenses?: FileExpenses;
  statusHistory?: FileStatusLogEntry[];
  objectionReviews?: ObjectionReviewEntry[];
  /** Set when status changes — used to sort recently moved files first. */
  lastStatusAt?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export const FILE_STATUS_PILL: Partial<Record<FileStatus, string>> = {
  pending: 'figma-file-status figma-file-status--pending',
  in_progress: 'figma-file-status figma-file-status--progress',
  objection: 'figma-file-status figma-file-status--objection',
  paper_return: 'figma-file-status figma-file-status--paper',
  on_hold: 'figma-file-status figma-file-status--hold',
  completed: 'figma-file-status figma-file-status--done',
  done: 'figma-file-status figma-file-status--done',
};

export function getStatusPillClass(status: string): string {
  return FILE_STATUS_PILL[status as FileStatus] ?? 'figma-file-status';
}

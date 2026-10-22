import api from '../lib/api';
import { clientName, FILE_STATUSES } from '../lib/constants';
import { uniqueDealerDisplayNames } from '../lib/dealerNameKey';
import { WORK_TYPE_DOCUMENTS } from '../lib/workTypeDocuments';

/** Must match crm-backend file.service.js MAX_UNPAGINATED_FILES */
export const FILE_EXPORT_MAX_ROWS = 10000;

export async function fetchAllFiles(user, { filterUserId } = {}) {
  const isAdmin = user.role === 'superadmin';
  const params = { type: 'all_records' };
  if (isAdmin && filterUserId) params.userId = filterUserId;
  const { data } = await api.get('/files', { params });
  return data.files || [];
}

/** Distinct dealer names for the filter dropdown (scoped, not full file dump). */
export async function fetchDealerNames(user, { filterUserId } = {}) {
  const params = {};
  if (user.role === 'superadmin' && filterUserId) params.userId = filterUserId;
  const { data } = await api.get('/files/dealers', { params });
  return uniqueDealerDisplayNames(data.dealers || []);
}

function asFilterList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function fetchStats(
  user,
  { filterUserId, rtoName, workType, dealerName, search, date, dateFrom, dateTo, datePreset } = {}
) {
  const params = withFilters(
    {},
    { rtoName, workType, dealerName, date, dateFrom, dateTo, datePreset }
  );
  if (user.role === 'superadmin' && filterUserId) params.userId = filterUserId;
  if (search) params.search = search;
  const { data } = await api.get('/dashboard/stats', { params });
  return data;
}

export async function fetchDashboardAnalytics(user, { filterUserId, dateFrom, dateTo } = {}) {
  const params = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (user.role === 'superadmin' && filterUserId) params.userId = filterUserId;
  const { data } = await api.get('/dashboard/analytics', { params });
  return data;
}

export const OVERDUE_OBJECTION_PAGE_SIZE = 150;

export async function fetchDashboardLists(
  user,
  { filterUserId, overduePage, overduePageSize } = {}
) {
  const params = {};
  if (user.role === 'superadmin' && filterUserId) params.userId = filterUserId;
  if (overduePage != null) params.overduePage = overduePage;
  if (overduePageSize != null) params.overduePageSize = overduePageSize;
  const { data } = await api.get('/dashboard/lists', { params });
  const overdueObjections = data.overdueObjections || [];
  return {
    staffTodayFiles: data.staffTodayFiles || [],
    overdueObjections,
    overdueTotal: data.overdueTotal ?? overdueObjections.length,
    overduePage: data.overduePage ?? 1,
    overduePageSize: data.overduePageSize ?? OVERDUE_OBJECTION_PAGE_SIZE,
    overdueTotalPages: data.overdueTotalPages ?? 1,
  };
}

/** Overdue objection papers (3+ calendar days in Objection) — paginated dashboard lists API. */
export async function fetchOverdueObjections(
  user,
  { filterUserId, overduePage = 1, overduePageSize = OVERDUE_OBJECTION_PAGE_SIZE } = {}
) {
  const lists = await fetchDashboardLists(user, { filterUserId, overduePage, overduePageSize });
  return {
    files: lists.overdueObjections,
    total: lists.overdueTotal,
    page: lists.overduePage,
    pageSize: lists.overduePageSize,
    totalPages: lists.overdueTotalPages,
  };
}

/** Admin: objection files with at least one user follow-up review saved. */
export async function fetchObjectionFollowUps(
  user,
  { filterUserId, page = 1, pageSize = OVERDUE_OBJECTION_PAGE_SIZE } = {}
) {
  const params = { page, pageSize };
  if (user.role === 'superadmin' && filterUserId) params.userId = filterUserId;
  const { data } = await api.get('/dashboard/objection-follow-ups', { params });
  const files = data.objectionFollowUps || [];
  return {
    files,
    total: data.followUpTotal ?? files.length,
    page: data.followUpPage ?? page,
    pageSize: data.followUpPageSize ?? pageSize,
    totalPages: data.followUpTotalPages ?? 1,
  };
}

// Only include filter params that actually have a value, so we never send empty
// query strings to the API.
function withFilters(
  params,
  { rtoName, workType, dealerName, date, dateFrom, dateTo, datePreset } = {}
) {
  const rtos = asFilterList(rtoName);
  const workTypes = asFilterList(workType);
  const dealers = asFilterList(dealerName);
  if (rtos.length) params.rtoName = rtos.join(',');
  if (workTypes.length) params.workType = workTypes.join(',');
  if (dealers.length) params.dealerName = dealers.join(',');
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (!dateFrom && !dateTo) {
    if (date) params.date = date;
    if (datePreset) params.datePreset = datePreset;
  }
  return params;
}

// Returns every file matching the current view/search/filters (no pagination)
// so the Excel export can include the full filtered result set, not just a page.
/**
 * @param {object} user
 * @param {{
 *   type?: string,
 *   search?: string,
 *   filterUserId?: string,
 *   rtoName?: string,
 *   workType?: string,
 *   dealerName?: string,
 *   date?: string,
 *   dateFrom?: string,
 *   dateTo?: string,
 *   datePreset?: string,
 * }} [filters]
 */
export async function fetchFilesForExport(
  user,
  { type = 'all_records', search = '', filterUserId, rtoName, workType, dealerName, date, dateFrom, dateTo, datePreset } = {}
) {
  const isAdmin = user.role === 'superadmin';
  const params = withFilters({ type }, { rtoName, workType, dealerName, date, dateFrom, dateTo, datePreset });
  if (search) params.search = search;
  if (isAdmin && filterUserId) params.userId = filterUserId;
  const { data } = await api.get('/files', { params });
  return {
    files: data.files || [],
    truncated: Boolean(data.truncated),
    total: Number(data.total) || (data.files || []).length,
  };
}

/**
 * @param {{
 *   user: object,
 *   search?: string,
 *   type?: string,
 *   filterUserId?: string | null,
 *   page?: number,
 *   pageSize?: number,
 *   rtoName?: string,
 *   workType?: string,
 *   dealerName?: string,
 *   date?: string,
 *   dateFrom?: string,
 *   dateTo?: string,
 *   datePreset?: string,
 * }} opts
 */
export async function fetchFilesPaginated({
  user,
  search = '',
  type = 'all_records',
  filterUserId = null,
  page = 1,
  pageSize = 20,
  rtoName,
  workType,
  dealerName,
  date,
  dateFrom,
  dateTo,
  datePreset,
}) {
  const isAdmin = user.role === 'superadmin';
  const params = withFilters(
    { status: type, search, page, pageSize },
    { rtoName, workType, dealerName, date, dateFrom, dateTo, datePreset }
  );
  if (isAdmin && filterUserId) params.userId = filterUserId;
  const { data } = await api.get('/files/paginated', { params });
  return data;
}

export async function createFile(payload, _user) {
  const { data } = await api.post('/files', payload);
  return data;
}

/** Column headers for bulk file upload — must match BE excel import headers. */
export const FILE_UPLOAD_EXCEL_COLUMNS = [
  { header: 'Dealer Name', key: 'dealerName', width: 22 },
  { header: 'Work Type', key: 'workType', width: 16 },
  { header: 'Vehicle No', key: 'vehicleNo', width: 16 },
  { header: 'Vehicle Model', key: 'vehicleModel', width: 18 },
  { header: 'Chassis No', key: 'chassisNo', width: 12 },
  { header: 'Engine No', key: 'engineNo', width: 12 },
  { header: 'Old Owner Name', key: 'oldOwnerName', width: 22 },
  { header: 'New Owner Name', key: 'ownerName', width: 22 },
  { header: 'Old Owner Mobile', key: 'oldOwnerMob', width: 16 },
  { header: 'New Owner Mobile', key: 'newOwnerMob', width: 16 },
  { header: 'Dealer Mobile', key: 'dealerMob', width: 16 },
  { header: 'RTO', key: 'rtoName', width: 24 },
  { header: 'Remarks', key: 'remarks', width: 28 },
  { header: 'Documents', key: 'documents', width: 40 },
  { header: 'Challan Amount', key: 'challan', width: 14 },
  { header: 'Adjustment Amount', key: 'adjustment', width: 16 },
  { header: 'PUC Amount', key: 'puc', width: 12 },
  { header: 'HSRP Amount', key: 'hsrp', width: 12 },
  { header: 'Insurance Amount', key: 'insurance', width: 16 },
  { header: 'Road Tax', key: 'roadTax', width: 12 },
  { header: 'Permit Cancel', key: 'permitCancel', width: 14 },
  { header: 'Duplicate Permit', key: 'duplicatePermit', width: 16 },
  { header: 'New Permit', key: 'newPermit', width: 12 },
  { header: 'P-tax', key: 'pTax', width: 10 },
  { header: 'Urgent', key: 'urgent', width: 12 },
  { header: 'CNG Adjustment', key: 'cngAdjustment', width: 14 },
  { header: 'Mob No. Update', key: 'mobNoUpdate', width: 14 },
  { header: 'Set Deal Amount', key: 'setDeal', width: 14 },
  { header: 'Payment Done', key: 'paymentDone', width: 14 },
];

/**
 * Build & download the blank Excel upload format in the browser
 * (all create-form + price columns). Does not call the API.
 */
export async function downloadExcelTemplate() {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AutoAxis CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('File Upload', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = FILE_UPLOAD_EXCEL_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB6C6E0' } },
      bottom: { style: 'thin', color: { argb: 'FFB6C6E0' } },
      left: { style: 'thin', color: { argb: 'FFB6C6E0' } },
      right: { style: 'thin', color: { argb: 'FFB6C6E0' } },
    };
  });

  // Row 2 = sample only — helps clients see how to fill each column.
  sheet.addRow({
    dealerName: 'ABC FINANCE',
    workType: 'TO',
    vehicleNo: 'MH12AB1234',
    vehicleModel: 'SWIFT',
    chassisNo: 'AB123',
    engineNo: 'EN456',
    oldOwnerName: 'RAMESH PATIL',
    ownerName: 'SURESH SHINDE',
    oldOwnerMob: '9876543210',
    newOwnerMob: '9123456780',
    dealerMob: '9988776655',
    rtoName: 'MH12',
    remarks: 'SAMPLE ROW — replace with real data',
    documents: 'RC, Form 29, Form 30, Old aadhar',
    challan: 500,
    adjustment: 0,
    puc: 100,
    hsrp: 0,
    insurance: 0,
    roadTax: 0,
    permitCancel: 0,
    duplicatePermit: 0,
    newPermit: 0,
    pTax: 0,
    urgent: 0,
    cngAdjustment: 0,
    mobNoUpdate: 0,
    setDeal: 2500,
    paymentDone: 'No',
  });

  // Light yellow so the sample row is obvious.
  const sampleRow = sheet.getRow(2);
  sampleRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
  });

  // Force mobile / code columns to text so Excel keeps digits.
  [
    'oldOwnerMob',
    'newOwnerMob',
    'dealerMob',
    'chassisNo',
    'engineNo',
    'vehicleNo',
    'paymentDone',
    'documents',
  ].forEach((key) => {
    sheet.getColumn(key).numFmt = '@';
  });

  // Price columns as number (default 0 when left empty on import).
  [
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
    'setDeal',
  ].forEach((key) => {
    sheet.getColumn(key).numFmt = '#,##0.00';
  });

  const notes = workbook.addWorksheet('Instructions');
  notes.getColumn(1).width = 100;
  notes.addRow([
    `AutoAxis CRM — File upload format (${FILE_UPLOAD_EXCEL_COLUMNS.length} columns)`,
  ]);
  notes.addRow(['Keep header names exactly as on "File Upload" sheet.']);
  notes.addRow([
    'Row 2 is SAMPLE / DUMMY data only — it is auto-skipped on upload. Replace it with real data or leave it; add your rows below.',
  ]);
  notes.addRow([
    'REQUIRED (if any empty → that row is NOT uploaded): Dealer Name, Work Type, Vehicle No, Vehicle Model, Chassis No (5), Engine No (5), Old Owner Name, Old Owner Mobile (10 digits), RTO',
  ]);
  notes.addRow([
    'OPTIONAL (empty OK — record still added): New Owner Name, New Owner Mobile, Dealer Mobile, Remarks, Documents',
  ]);
  notes.addRow([
    'Documents: comma-separated (or semicolon), e.g. RC, Form 29, Old aadhar. Use exact names from the "Documents" sheet.',
  ]);
  notes.addRow([
    'Prices: Challan / Adjustment / PUC / HSRP / Insurance / Road Tax / Permit Cancel / Duplicate Permit / New Permit / P-tax / Urgent / CNG Adjustment / Mob No. Update / Set Deal — empty → 0. Payment Done empty → No',
  ]);
  notes.addRow([
    'Work Type: if the name is new, it is auto-created. Documents column (comma-separated) becomes that work type checklist — catalog names only (see Documents sheet). No new document types.',
  ]);
  notes.addRow([
    'RTO: if the name is new (not in built-in MH list), it is auto-added to the RTO list.',
  ]);
  notes.addRow([
    'Vehicle No + Work Type must be unique — same vehicle with the same work type is rejected; different work type is allowed.',
  ]);
  notes.addRow(['Work Type examples: TO, HPT, TO+HPT, TO+HPT+HPA, DRC, CA, FITNESS, …']);
  notes.addRow(['Save as .xlsx then use Upload Excel file on New Entry.']);
  notes.addRow(['Failed rows auto-download after upload with an "Error Reason" column.']);
  notes.getRow(1).font = { bold: true, size: 12 };

  const docSheet = workbook.addWorksheet('Documents');
  docSheet.getColumn(1).width = 36;
  docSheet.addRow(['Allowed document names (copy into Documents column, comma-separated)']);
  docSheet.getRow(1).font = { bold: true };
  WORK_TYPE_DOCUMENTS.forEach((name) => docSheet.addRow([name]));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AutoAxis_File_Upload_Template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Auto-download failed Excel rows after upload.
 * Same columns as the template + last column "Error Reason".
 */
export async function downloadFailedExcelRecords(errors = []) {
  const failed = (errors || []).filter((e) => e && (e.data || e.error));
  if (!failed.length) return;

  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AutoAxis CRM';
  workbook.created = new Date();

  const columns = [
    ...FILE_UPLOAD_EXCEL_COLUMNS,
    { header: 'Error Reason', key: 'errorReason', width: 48 },
  ];

  const sheet = workbook.addWorksheet('Failed Records', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    const isErrorCol = colNumber === columns.length;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isErrorCol ? 'FFDC0024' : 'FF1A73E8' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  failed.forEach((item) => {
    const data = item.data || {};
    sheet.addRow({
      dealerName: data.dealerName || '',
      workType: data.workType || '',
      vehicleNo: data.vehicleNo || item.vehicleNo || '',
      vehicleModel: data.vehicleModel || '',
      chassisNo: data.chassisNo || '',
      engineNo: data.engineNo || '',
      oldOwnerName: data.oldOwnerName || '',
      ownerName: data.ownerName || '',
      oldOwnerMob: data.oldOwnerMob || '',
      newOwnerMob: data.newOwnerMob || '',
      dealerMob: data.dealerMob || '',
      rtoName: data.rtoName || '',
      remarks: data.remarks || '',
      documents: data.documents || '',
      challan: data.challan ?? 0,
      adjustment: data.adjustment ?? 0,
      puc: data.puc ?? 0,
      hsrp: data.hsrp ?? 0,
      insurance: data.insurance ?? 0,
      roadTax: data.roadTax ?? 0,
      permitCancel: data.permitCancel ?? 0,
      duplicatePermit: data.duplicatePermit ?? 0,
      newPermit: data.newPermit ?? 0,
      pTax: data.pTax ?? 0,
      urgent: data.urgent ?? 0,
      cngAdjustment: data.cngAdjustment ?? 0,
      mobNoUpdate: data.mobNoUpdate ?? 0,
      setDeal: data.setDeal ?? 0,
      paymentDone: data.paymentDone || 'No',
      errorReason: item.error || 'Unknown error',
    });
  });

  sheet.getColumn('errorReason').alignment = { wrapText: true, vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AutoAxis_Failed_Records_${todayStamp()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Upload filled .xlsx and create files (system superadmin only). */
export async function uploadExcelFile(file) {
  if (!file) {
    const error = new Error('Please choose an Excel (.xlsx) file');
    error.response = { data: { error: error.message } };
    throw error;
  }
  const name = (file.name || '').toLowerCase();
  if (!name.endsWith('.xlsx')) {
    const error = new Error('Only .xlsx Excel files are allowed');
    error.response = { data: { error: error.message } };
    throw error;
  }

  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/files/excel-upload', formData);
  return data;
}

export async function updateFileStatus(fileId, status, _user, remarks) {
  const payload = remarks !== undefined ? { status, remarks } : { status };
  const { data } = await api.put(`/files/${fileId}/status`, payload);
  return data;
}

/** Follow-up note while file stays in Objection (snoozes overdue reminder for 3 days). */
export async function submitObjectionReview(fileId, reason) {
  const { data } = await api.post(`/files/${fileId}/objection-reviews`, { reason });
  return data;
}

export async function fetchFileById(fileId, _user) {
  const { data } = await api.get(`/files/${fileId}`);
  return data.file || data;
}

export async function updateFile(fileId, payload, _user) {
  const { data } = await api.put(`/files/${fileId}`, payload);
  return data;
}

export async function updateFileExpenses(fileId, expenses, _user, paymentDone) {
  const { data } = await api.put(`/files/${fileId}/expenses`, { ...expenses, paymentDone });
  return data;
}

export async function deleteFile(fileId, _user) {
  const { data } = await api.delete(`/files/${fileId}`);
  return data;
}

export async function bulkUpdateFiles({ ids, action, payload }) {
  const { data } = await api.post('/files/bulk', { ids, action, payload });
  return data;
}

const STATUS_LABELS = FILE_STATUSES.reduce((acc, s) => {
  acc[s.value] = s.label;
  return acc;
}, {});

function statusLabel(status) {
  if (status === 'done') return 'Done';
  return STATUS_LABELS[status] || status || '';
}

// e.g. "19-Jul-2026"
function todayStamp() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = String(now.getDate()).padStart(2, '0');
  return `${dd}-${months[now.getMonth()]}-${now.getFullYear()}`;
}

/** Optional amount columns. The download popup decides which of these are written. */
const EXPORT_EXPENSE_COLUMNS = [
  { header: 'Challan Amount', key: 'challan', width: 14 },
  { header: 'Adjustment Amount', key: 'adjustment', width: 16 },
  { header: 'PUC Amount', key: 'puc', width: 12 },
  { header: 'HSRP Amount', key: 'hsrp', width: 12 },
  { header: 'Insurance Amount', key: 'insurance', width: 16 },
  { header: 'Road Tax', key: 'roadTax', width: 12 },
  { header: 'Permit Cancel', key: 'permitCancel', width: 14 },
  { header: 'Duplicate Permit', key: 'duplicatePermit', width: 16 },
  { header: 'New Permit', key: 'newPermit', width: 12 },
  { header: 'P-tax', key: 'pTax', width: 10 },
  { header: 'Urgent', key: 'urgent', width: 12 },
  { header: 'CNG Adjustment', key: 'cngAdjustment', width: 14 },
  { header: 'Mob No. Update', key: 'mobNoUpdate', width: 14 },
];

const SET_DEAL_COLUMN = { header: 'Set Deal Amount', key: 'setDeal', width: 14 };

/** Labels for the Excel download popup. Set Deal is admin-only. */
export const EXCEL_OPTIONAL_COLUMNS = [
  ...EXPORT_EXPENSE_COLUMNS.map((col) => ({ key: col.key, label: col.header })),
  { key: SET_DEAL_COLUMN.key, label: SET_DEAL_COLUMN.header, adminOnly: true },
];

function selectedExpenseColumns(isAdmin, expenseKeys) {
  const wanted = new Set(Array.isArray(expenseKeys) ? expenseKeys : []);
  const columns = EXPORT_EXPENSE_COLUMNS.filter((col) => wanted.has(col.key));
  if (isAdmin && wanted.has(SET_DEAL_COLUMN.key)) columns.push(SET_DEAL_COLUMN);
  return columns;
}

/** Drop optional amount columns whose sum across the export set is zero. */
function expenseColumnsForExport(files, isAdmin, expenseKeys) {
  const selected = selectedExpenseColumns(isAdmin, expenseKeys);
  if (!files.length) return selected;
  return selected.filter((col) => {
    const total = files.reduce((sum, f) => sum + expenseAmount(f.expenses, col.key), 0);
    return total !== 0;
  });
}

function expenseAmount(expenses, key) {
  return Number(expenses?.[key]) || 0;
}

/** Bill total from expense lines (includes CNG Adjustment + Mob No. Update). */
function sumExportExpenses(expenses, isAdmin) {
  const exp = expenses || {};
  let sum = EXPORT_EXPENSE_COLUMNS.reduce((s, col) => s + expenseAmount(exp, col.key), 0);
  if (isAdmin) sum += expenseAmount(exp, 'setDeal');
  return sum;
}

function fileExportBill(file, isAdmin) {
  if (file?.expenses && typeof file.expenses === 'object') {
    return sumExportExpenses(file.expenses, isAdmin);
  }
  return Number(file?.totalBill) || 0;
}

// File details, Bill, and Payment always download. Amount columns are optional.
function buildExportColumns(isAdmin, expenseColumns) {
  const columns = [
    { header: 'File No', key: 'fileNumber', width: 14 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Dealer', key: 'dealer', width: 22 },
    { header: 'Owner', key: 'owner', width: 24 },
    { header: 'Vehicle No', key: 'vehicleNo', width: 16 },
    { header: 'Model', key: 'model', width: 18 },
    { header: 'Work Type', key: 'workType', width: 14 },
    { header: 'RTO', key: 'rtoName', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Remarks', key: 'remarks', width: 36 },
    ...expenseColumns,
    { header: 'Bill (₹)', key: 'bill', width: 14 },
  ];
  if (isAdmin) columns.push({ header: 'Payment', key: 'payment', width: 12 });
  return columns;
}

// Builds a styled .xlsx (bold header, borders, currency column, frozen header
// with autofilter) and downloads it with a dated filename.
export async function exportExcel(files, { isAdmin = false, tabLabel = 'Files', expenseKeys = [] } = {}) {
  // Loaded on demand so the (large) Excel library stays out of the main bundle.
  const { default: ExcelJS } = await import('exceljs');
  const expenseColumns = expenseColumnsForExport(files, isAdmin, expenseKeys);
  const exportColumns = buildExportColumns(isAdmin, expenseColumns);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AutoAxis CRM';
  workbook.created = new Date();

  const sheetTitle = String(tabLabel || 'Files').slice(0, 31);
  const sheet = workbook.addWorksheet(sheetTitle, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = exportColumns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  files.forEach((f) => {
    const exp = f.expenses || {};
    const row = {
      fileNumber: f.fileNumber || '',
      date: f.date || '',
      dealer: f.dealerName || '',
      owner: clientName(f),
      vehicleNo: f.vehicleNo || '',
      model: f.vehicleModel || '',
      workType: f.workType || '',
      rtoName: f.rtoName || '',
      status: statusLabel(f.status),
      remarks: (f.remarks || '').trim(),
      bill: fileExportBill(f, isAdmin),
    };
    expenseColumns.forEach((col) => {
      row[col.key] = expenseAmount(exp, col.key);
    });
    if (isAdmin) row.payment = f.paymentDone ? 'Paid' : 'Unpaid';
    sheet.addRow(row);
  });

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB6C6E0' } },
      bottom: { style: 'thin', color: { argb: 'FFB6C6E0' } },
      left: { style: 'thin', color: { argb: 'FFB6C6E0' } },
      right: { style: 'thin', color: { argb: 'FFB6C6E0' } },
    };
  });

  const moneyKeys = [...expenseColumns.map((col) => col.key), 'bill'];
  moneyKeys.forEach((key) => {
    const col = sheet.getColumn(key);
    col.numFmt = '#,##0.00';
    col.alignment = { horizontal: 'right' };
  });

  // Zebra striping + light borders on data rows.
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7FC' } };
      });
    }
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFE2E8F2' } },
      };
    });
  });

  // Totals row: sum of expense columns + Bill (admin also gets Paid/Unpaid breakdown).
  if (files.length) {
    const totalBill = files.reduce((sum, f) => sum + fileExportBill(f, isAdmin), 0);
    const expenseTotals = Object.fromEntries(
      expenseColumns.map((col) => [
        col.key,
        files.reduce((sum, f) => sum + expenseAmount(f.expenses, col.key), 0),
      ]),
    );

    sheet.addRow({});

    const totalRowData = {
      status: 'TOTAL',
      ...expenseTotals,
      bill: totalBill,
    };
    if (isAdmin) {
      const paidCount = files.filter((f) => f.paymentDone).length;
      const unpaidCount = files.length - paidCount;
      totalRowData.payment = `${paidCount} Paid / ${unpaidCount} Unpaid`;
    }

    const totalRow = sheet.addRow(totalRowData);
    totalRow.height = 20;
    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > exportColumns.length) return;
      cell.font = { bold: true, color: { argb: 'FF14213D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF1FB' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1A73E8' } },
        bottom: { style: 'thin', color: { argb: 'FF1A73E8' } },
      };
    });
    moneyKeys.forEach((key) => {
      const cell = totalRow.getCell(key);
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right' };
    });

    if (isAdmin) {
      const unpaidBill = files.reduce(
        (sum, f) => (f.paymentDone ? sum : sum + fileExportBill(f, true)),
        0,
      );
      const outstandingRow = sheet.addRow({ status: 'Unpaid amount', bill: unpaidBill });
      outstandingRow.getCell('status').font = { italic: true, color: { argb: 'FF667488' } };
      const outstandingCell = outstandingRow.getCell('bill');
      outstandingCell.numFmt = '#,##0.00';
      outstandingCell.alignment = { horizontal: 'right' };
      outstandingCell.font = { bold: true, color: { argb: 'FFB42318' } };
    }
  }

  sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(exportColumns.length).letter}1` };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AutoAxis ${sheetTitle} ${todayStamp()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

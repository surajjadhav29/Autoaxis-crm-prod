import { clientName, requiresNewOwner } from './constants';

const DEALER_GROUPS = {
  'CAR DEKHO': 'https://chat.whatsapp.com/IZjQfoPGO68KQyIGg1sOHF',
  'CAR DEKO': 'https://chat.whatsapp.com/IZjQfoPGO68KQyIGg1sOHF', // legacy typo alias
  'BADA FINANCE': 'https://chat.whatsapp.com/ISwc0T57ANW5xUcgK42S7L',
  'R K FINANCE': 'https://chat.whatsapp.com/JQj42qAxdy24bA0hnBbMzJ',
  'SAI FINANCE': 'https://chat.whatsapp.com/IDo3FAm9Ffn1dmZYCLpqUZ',
  'S I ADCON': 'https://chat.whatsapp.com/EP3HghlOr6s48A53l5vVco',
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  objection: 'Objection',
  paper_return: 'Paper Return',
  on_hold: 'On Hold',
  completed: 'Completed',
  done: 'Done',
};

function cleanMobile(mobile) {
  const digits = String(mobile || '').replace(/[^0-9]/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** True when value is a usable 10-digit Indian mobile (not empty / not all zeros). */
export function hasValidMobile(mobile) {
  const digits = cleanMobile(mobile);
  return digits.length === 10 && !/^0+$/.test(digits);
}

export const DEALER_NUMBER_MISSING = 'DEALER number not present';
/** TO / TO+HPT / TO+HPT+HPA — new owner number required (no old-owner fallback). */
export const NEW_OWNER_NUMBER_MISSING = 'NEW OWNER number is not present';
/** Other work types — neither new nor old owner number available. */
export const OWNER_NUMBER_MISSING = 'NEW OWNER / OLD OWNER number is not present';
/** @deprecated use OWNER_NUMBER_MISSING / NEW_OWNER_NUMBER_MISSING */
export const NEW_OWNER_AND_DEALER_MISSING = OWNER_NUMBER_MISSING;


const GOOGLE_REVIEW_LINK =
  'https://www.google.com/search?q=AutoAxis+Solution+LLP+Pune#lrd=0x3bc2ebe0defee803:0x1a327d4e78e238e8,3';

function statusLabel(status) {
  if (!status) return 'N/A';
  return STATUS_LABELS[status] || String(status).replace(/_/g, ' ');
}

function fileStatus(file) {
  return (file?.status || '').toLowerCase();
}

function isPending(file) {
  return fileStatus(file) === 'pending';
}

function isInProcess(file) {
  return fileStatus(file) === 'in_progress';
}

function isObjection(file) {
  return fileStatus(file) === 'objection';
}

function isPaperReturn(file) {
  return fileStatus(file) === 'paper_return';
}

function isDone(file) {
  const s = fileStatus(file);
  return s === 'completed' || s === 'done';
}

/** Hold Sheet = status On Hold only (no auto age rule). */
function isHoldSheet(file) {
  return fileStatus(file) === 'on_hold';
}

/**
 * Returns a block reason string when WhatsApp must stay disabled, otherwise null.
 * Does NOT change recipient rules — only gates the button.
 * - Hold / Pending / Objection / Paper Return → need dealer
 * - In Process / Done + TO / TO+HPT / TO+HPT+HPA → need new owner only
 * - In Process / Done + other work types → new owner, else old owner
 */
export function getWhatsAppBlockReason(file) {
  const status = fileStatus(file);
  const hasDealer = hasValidMobile(file?.dealerMob);

  // Hold Sheet first (on_hold only), same as openFileWhatsApp order
  if (isHoldSheet(file)) {
    if (!hasDealer) return DEALER_NUMBER_MISSING;
    return null;
  }

  if (status === 'in_progress' || status === 'completed' || status === 'done') {
    if (resolveCustomerRecipient(file)) return null;
    return requiresNewOwner(file?.workType)
      ? NEW_OWNER_NUMBER_MISSING
      : OWNER_NUMBER_MISSING;
  }

  if (status === 'pending' || status === 'objection' || status === 'paper_return') {
    if (!hasDealer) return DEALER_NUMBER_MISSING;
    return null;
  }

  return null;
}

export function isWhatsAppBlocked(file) {
  return Boolean(getWhatsAppBlockReason(file));
}

/** @deprecated use isWhatsAppBlocked / getWhatsAppBlockReason */
export function isDealerWhatsAppBlocked(file) {
  return isWhatsAppBlocked(file);
}

/** @deprecated use isWhatsAppBlocked */
export function isInProcessWithoutDealer(file) {
  return isWhatsAppBlocked(file);
}

/** Vehicle no. + model (no "+" sign). Example: MH12HV7628 ACCESS */
function vehicleLabel(file) {
  const vehicleNo = (file.vehicleNo || '').trim() || 'N/A';
  const model = (file.vehicleModel || '').trim();
  return model ? `${vehicleNo} ${model}` : vehicleNo;
}

/**
 * In Process / Done recipient:
 * - TO / TO+HPT / TO+HPT+HPA → new owner only (no old-owner fallback)
 * - Other work types → new owner, else old owner
 * Returns { mobile, name } or null when no usable recipient.
 */
function resolveCustomerRecipient(file) {
  if (hasValidMobile(file?.newOwnerMob)) {
    return {
      mobile: cleanMobile(file.newOwnerMob),
      name: (file.ownerName || '').trim() || clientName(file) || 'Customer',
    };
  }

  // Transfer-of-ownership work types must message new owner only
  if (requiresNewOwner(file?.workType)) {
    return null;
  }

  if (hasValidMobile(file?.oldOwnerMob)) {
    return {
      mobile: cleanMobile(file.oldOwnerMob),
      name: (file.oldOwnerName || '').trim() || 'Customer',
    };
  }
  return null;
}

function formatDisplayDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('en-IN');
  }
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Documents configured on the work type but not marked received on the file.
 */
/** @returns {string[]} */
export function getPendingDocuments(file) {
  const required = Array.isArray(file?.requiredDocuments) ? file.requiredDocuments : [];
  if (!required.length) return [];

  const received = new Set(
    (Array.isArray(file?.documents) ? file.documents : []).map((d) =>
      String(d || '')
        .trim()
        .toLowerCase()
    )
  );

  return required.filter((doc) => {
    const key = String(doc || '')
      .trim()
      .toLowerCase();
    return key && !received.has(key);
  });
}

/** Submitted vs pending document counts for table display. */
export function getFileDocumentCounts(file) {
  const required = Array.isArray(file?.requiredDocuments) ? file.requiredDocuments : [];
  if (!required.length) {
    return { submitted: 0, pending: 0, required: 0 };
  }

  const received = new Set(
    (Array.isArray(file?.documents) ? file.documents : []).map((d) =>
      String(d || '')
        .trim()
        .toLowerCase()
    )
  );

  let submitted = 0;
  for (const doc of required) {
    const key = String(doc || '')
      .trim()
      .toLowerCase();
    if (key && received.has(key)) submitted += 1;
  }

  return {
    submitted,
    pending: Math.max(0, required.length - submitted),
    required: required.length,
  };
}

/** True when at least one required document is still missing (any status). */
export function hasMissingRequiredDocuments(file) {
  return getPendingDocuments(file).length > 0;
}

/** True when file is pending and at least one required document is still missing. */
export function hasPendingRequiredDocuments(file) {
  if ((file?.status || '').toLowerCase() !== 'pending') return false;
  return hasMissingRequiredDocuments(file);
}

export const DOCUMENTS_REQUIRED_MESSAGE = 'DOC IS REQUIRED';
export const DOCUMENTS_REQUIRED_CODE = 'DOCUMENTS_REQUIRED';
export const STATUS_TRANSITION_BLOCKED_CODE = 'STATUS_TRANSITION_BLOCKED';

/**
 * Allowed next statuses for the status dropdown / change handler.
 * - Hold / Paper Return → only In Process
 * - Missing docs → no Done; from Pending only Hold / Paper Return
 */
export function getAllowedStatusValues(file) {
  const current = String(file?.status || '').toLowerCase();
  const all = ['pending', 'in_progress', 'objection', 'paper_return', 'on_hold', 'completed'];
  const docsMissing = hasMissingRequiredDocuments(file);

  if (current === 'on_hold' || current === 'paper_return') {
    return [current, 'in_progress'];
  }

  return all.filter((status) => {
    if (status === current) return true;
    if (docsMissing && (status === 'completed' || status === 'done')) return false;
    if (docsMissing && current === 'pending') {
      return status === 'on_hold' || status === 'paper_return';
    }
    return true;
  });
}

function formatPendingDocumentsBlock(file) {
  const pending = getPendingDocuments(file);
  if (!pending.length) return '';

  const lines = pending.map((doc, i) => `${i + 1}. ${doc}`).join('\n');
  return (
    `Pending documents:\n${lines}\n\n` +
    'Please send these documents at the earliest so we can process the file forward.\n\n'
  );
}

/** Pending → dealer: ask for pending documents (lists missing docs when known). */
function buildPendingDealerMessage(file) {
  const dealerName = (file.dealerName || '').trim() || 'Dealer';
  const vehicleNo = vehicleLabel(file);
  const pendingBlock = formatPendingDocumentsBlock(file);

  return (
    'Action Required - AutoAxis\n\n' +
    `Dear ${dealerName},\n\n` +
    `The RTO file for vehicle ${vehicleNo} is currently PENDING.\n\n` +
    (pendingBlock ||
      'Please provide the required pending documents at the earliest so we can process the file forward.\n\n') +
    'Regards,\n' +
    'AutoAxis Solution and Services LLP'
  );
}

/** Hold Sheet → dealer: file is on hold. */
function buildHoldSheetDealerMessage(file) {
  const dealerName = (file.dealerName || '').trim() || 'Dealer';
  const vehicleNo = vehicleLabel(file);
  const pendingBlock = formatPendingDocumentsBlock(file);

  return (
    'Hold Notice - AutoAxis\n\n' +
    `Dear ${dealerName},\n\n` +
    `The RTO file for vehicle ${vehicleNo} is currently on Hold.\n\n` +
    (pendingBlock ||
      'Please collect your documents immediately or instruct us to start the work.\n\n') +
    'Please note, AutoAxis Solution will not take any responsibility if the documents are misplaced.\n\n' +
    'Regards,\n' +
    'AutoAxis Solution and Services LLP'
  );
}

/**
 * In Process → customer (new owner, else old owner).
 * `recipientName` is personalized per chat.
 */
function buildInProcessMessage(file, recipientName) {
  const name = (recipientName || '').trim() || 'Sir/Madam';
  const vehicleNo = vehicleLabel(file);
  const rto = (file.rtoName || '').trim() || 'the RTO';

  return (
    'Update from AutoAxis\n\n' +
    `Dear ${name},\n\n` +
    `The RTO file for vehicle ${vehicleNo} has been successfully submitted to ${rto} today.\n\n` +
    'We will notify you once the process is complete.\n\n' +
    'Regards,\n' +
    'AutoAxis Solution and Services LLP'
  );
}

/** Objection → dealer: share objection reason from remarks + pending docs. */
function buildObjectionDealerMessage(file) {
  const dealerName = (file.dealerName || '').trim() || 'Dealer';
  const vehicleNo = vehicleLabel(file);
  const reason = (file.remarks || '').trim() || 'Not specified';
  const pendingBlock = formatPendingDocumentsBlock(file);

  return (
    'Important Update - AutoAxis\n\n' +
    `Dear ${dealerName},\n\n` +
    `The RTO file for vehicle ${vehicleNo} has received an OBJECTION from the RTO.\n\n` +
    `Reason: ${reason}\n\n` +
    (pendingBlock ||
      'Please provide the necessary details or documents to clear this objection immediately.\n\n') +
    'Regards,\n' +
    'AutoAxis Solution and Services LLP'
  );
}

/** Paper Return → dealer: papers returned on today's date. */
function buildPaperReturnDealerMessage(file) {
  const dealerName = (file.dealerName || '').trim() || 'Dealer';
  const vehicleNo = vehicleLabel(file);
  const returnedOn = formatDisplayDate(new Date());

  return (
    'Update from AutoAxis\n\n' +
    `Dear ${dealerName},\n\n` +
    `This is to inform you that the RTO file for vehicle ${vehicleNo} has been RETURNED to you on ${returnedOn}.\n\n` +
    'Please check your records.\n\n' +
    'Regards,\n' +
    'AutoAxis Solution and Services LLP'
  );
}

/**
 * Done / Completed → customer (new owner, else old owner).
 * `recipientName` is personalized per chat.
 */
function buildDoneMessage(file, recipientName) {
  const name = (recipientName || '').trim() || 'Sir/Madam';
  const vehicleNo = vehicleLabel(file);

  return (
    'Work Completed - AutoAxis\n\n' +
    `Dear ${name},\n\n` +
    `Your RTO work for vehicle ${vehicleNo} has been successfully completed by AutoAxis Solution and Services LLP.\n\n` +
    'If you liked our service, please leave us a 5-star review here:\n' +
    `${GOOGLE_REVIEW_LINK}\n\n` +
    'Regards,\n' +
    'AutoAxis Solution and Services LLP\n' +
    'Save our number 8308057172 for any future help.'
  );
}

/** Default status update message. */
function buildDefaultFileMessage(file) {
  const vehicleNo = file.vehicleNo || 'N/A';
  const ownerName = clientName(file) || 'N/A';
  const workType = file.workType || 'N/A';
  const dealer = file.dealerName || 'N/A';
  const fileNumber = file.fileNumber || file.id || 'N/A';
  const status = statusLabel(file.status);
  const remarks = (file.remarks || '').trim();

  let msg =
    '*AUTOAXIS - File Update*\n\n' +
    `*File No:* ${fileNumber}\n` +
    `*Vehicle:* ${vehicleNo}\n` +
    `*Owner:* ${ownerName}\n` +
    `*Work Type:* ${workType}\n` +
    `*Dealer:* ${dealer}\n` +
    `*Status:* ${status}`;

  if (remarks) {
    msg += `\n*Remarks:* ${remarks}`;
  }

  msg += '\n\nRegards,\nAutoAxis Solution and Services LLP';
  return msg;
}

export function buildFileWhatsAppMessage(file) {
  if (isHoldSheet(file)) return buildHoldSheetDealerMessage(file);
  if (isPending(file)) return buildPendingDealerMessage(file);
  if (isInProcess(file)) {
    const recipient = resolveCustomerRecipient(file);
    return buildInProcessMessage(file, recipient?.name || 'Customer');
  }
  if (isObjection(file)) return buildObjectionDealerMessage(file);
  if (isPaperReturn(file)) return buildPaperReturnDealerMessage(file);
  if (isDone(file)) {
    const recipient = resolveCustomerRecipient(file);
    return buildDoneMessage(file, recipient?.name || 'Customer');
  }
  return buildDefaultFileMessage(file);
}

function findDealerGroup(dealerName) {
  const dealer = (dealerName || '').toUpperCase();
  for (const name of Object.keys(DEALER_GROUPS)) {
    if (dealer.includes(name)) return DEALER_GROUPS[name];
  }
  return null;
}

function openWaChat(mobile, message) {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/91${mobile}?text=${encoded}`, '_blank', 'noopener,noreferrer');
}

export function openFileWhatsApp(file) {
  // HOLD SHEET → dealer only (on_hold)
  if (isHoldSheet(file)) {
    if (!hasValidMobile(file.dealerMob)) {
      return { warning: DEALER_NUMBER_MISSING };
    }
    const message = buildHoldSheetDealerMessage(file);
    openWaChat(cleanMobile(file.dealerMob), message);
    return {};
  }

  // PENDING → dealer only
  if (isPending(file)) {
    if (!hasValidMobile(file.dealerMob)) {
      return { warning: DEALER_NUMBER_MISSING };
    }
    const message = buildPendingDealerMessage(file);
    openWaChat(cleanMobile(file.dealerMob), message);
    return {};
  }

  // IN PROCESS → customer by work-type rules
  if (isInProcess(file)) {
    const recipient = resolveCustomerRecipient(file);
    if (!recipient) {
      return {
        warning: requiresNewOwner(file?.workType)
          ? NEW_OWNER_NUMBER_MISSING
          : OWNER_NUMBER_MISSING,
      };
    }
    openWaChat(recipient.mobile, buildInProcessMessage(file, recipient.name));
    return {};
  }

  // OBJECTION → dealer only
  if (isObjection(file)) {
    if (!hasValidMobile(file.dealerMob)) {
      return { warning: DEALER_NUMBER_MISSING };
    }
    openWaChat(cleanMobile(file.dealerMob), buildObjectionDealerMessage(file));
    return {};
  }

  // PAPER RETURN → dealer only
  if (isPaperReturn(file)) {
    if (!hasValidMobile(file.dealerMob)) {
      return { warning: DEALER_NUMBER_MISSING };
    }
    openWaChat(cleanMobile(file.dealerMob), buildPaperReturnDealerMessage(file));
    return {};
  }

  // DONE / COMPLETED → customer by work-type rules
  if (isDone(file)) {
    const recipient = resolveCustomerRecipient(file);
    if (!recipient) {
      return {
        warning: requiresNewOwner(file?.workType)
          ? NEW_OWNER_NUMBER_MISSING
          : OWNER_NUMBER_MISSING,
      };
    }
    openWaChat(recipient.mobile, buildDoneMessage(file, recipient.name));
    return {};
  }

  // Other statuses: prefer dealer → new owner → old owner
  const message = buildDefaultFileMessage(file);
  const candidates = [file.dealerMob, file.newOwnerMob, file.oldOwnerMob];
  const mobile = candidates.map(cleanMobile).find((m) => hasValidMobile(m));
  if (mobile) {
    openWaChat(mobile, message);
    return {};
  }

  const groupUrl = findDealerGroup(file.dealerName);
  if (groupUrl) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(message).catch(() => {});
    }
    window.open(groupUrl, '_blank', 'noopener,noreferrer');
    alert('File message copied. Paste it in the dealer WhatsApp group.');
    return {};
  }

  alert('Mobile number not available for this file.');
  return { warning: 'Mobile number not available for this file.' };
}

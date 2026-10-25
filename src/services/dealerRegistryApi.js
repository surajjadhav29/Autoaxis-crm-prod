import api from '../lib/api';
import { billingPayloadToQueryParams } from '../lib/billingFileFilters';

/** POST filters in body; fall back to GET if API is not restarted yet. */
async function requestDealerBillingFiles(dealerId, body, signal) {
  try {
    return await api.post(`/dealers/${dealerId}/files`, body, { signal });
  } catch (err) {
    const status = err.response?.status;
    if (status === 404 || status === 405) {
      return api.get(`/dealers/${dealerId}/files`, {
        signal,
        params: billingPayloadToQueryParams(body),
      });
    }
    throw err;
  }
}

function isRetryable(err) {
  if (!err.response) return true;
  const status = err.response.status;
  return status === 502 || status === 503 || status === 504;
}

/** GET /dealers — full dealer registry list. */
export async function fetchDealerRegistry() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data } = await api.get('/dealers');
      return data.dealers || [];
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === 2) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * GET /dealers/billing-pick — dealers with unpaid billing-eligible files (incl. ₹0)
 * (Billing → New invoice → Step 1).
 */
export async function fetchBillingPickDealers() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data } = await api.get('/dealers/billing-pick');
      return data.dealers || [];
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === 2) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

/** GET /dealers/names — id + name for dropdowns. */
export async function fetchDealerRegistryNames() {
  const { data } = await api.get('/dealers/names');
  return data.dealers || [];
}

export async function getDealerRegistryEntry(id) {
  const { data } = await api.get(`/dealers/${id}`);
  return data.dealer;
}

/** @typedef {import('@/types/file.types').FileRecord} FileRecord */

/**
 * Paginated billing file pick list for one dealer (filters in POST body).
 * @param {string} dealerId
 * @param {{ signal?: AbortSignal, body?: import('@/lib/billingFileFilters').BillingFilesRequestPayload }} [opts]
 */
export async function fetchDealerBillingFilePage(dealerId, { signal, body = {} } = {}) {
  const { data } = await requestDealerBillingFiles(dealerId, body, signal);
  return {
    files: /** @type {FileRecord[]} */ (data.files || []),
    total: Number(data.total) || (data.files || []).length,
    billableTotal: Number(data.billableTotal) || 0,
    page: Number(data.page) || 1,
    pageSize: Number(data.pageSize) || 50,
    totalPages: Number(data.totalPages) || 1,
  };
}

/** Resolve selected file ids for invoice preview (lean rows, max 300 ids). */
export async function fetchDealerBillingFilesByIds(dealerId, fileIds, { signal, body = {} } = {}) {
  const list = Array.isArray(fileIds) ? fileIds.filter(Boolean) : [];
  if (!list.length) return [];
  const { data } = await requestDealerBillingFiles(
    dealerId,
    { ...body, fileIds: list },
    signal
  );
  return /** @type {FileRecord[]} */ (data.files || []);
}

/** All billable (totalBill > 0) unpaid file ids for current billing filters. */
export async function fetchDealerBillableFileIds(dealerId, { signal, body = {} } = {}) {
  const { data } = await requestDealerBillingFiles(
    dealerId,
    { ...body, billableIdsOnly: true },
    signal
  );
  return /** @type {string[]} */ (data.fileIds || []);
}

const BILLING_RESOLVE_CHUNK = 300;

/** Resolve up to thousands of ids in 300-id API chunks (invoice preview / select-all). */
export async function resolveDealerBillingFilesForInvoice(
  dealerId,
  fileIds,
  { signal, body = {} } = {}
) {
  const list = Array.isArray(fileIds) ? [...new Set(fileIds.filter(Boolean))] : [];
  if (!list.length) return [];
  /** @type {FileRecord[]} */
  const out = [];
  for (let i = 0; i < list.length; i += BILLING_RESOLVE_CHUNK) {
    const chunk = list.slice(i, i + BILLING_RESOLVE_CHUNK);
    const rows = await fetchDealerBillingFilesByIds(dealerId, chunk, { signal, body });
    out.push(...rows);
  }
  return out;
}

/**
 * @deprecated Use fetchDealerBillingFilePage — kept for callers expecting a plain array.
 */
export async function fetchDealerRegistryFiles(dealerId, opts = {}) {
  const page = await fetchDealerBillingFilePage(dealerId, opts);
  return page.files;
}

/** After invoice PDF/WhatsApp — mark included files as paid (admin). */
export async function markDealerFilesInvoiced(dealerId, fileIds) {
  const { data } = await api.post(`/dealers/${dealerId}/mark-invoiced`, { fileIds });
  return data;
}

export async function fetchNextBillingInvoiceNumber() {
  const { data } = await api.get('/dealers/invoices/next-number');
  return data.billNumber || '';
}

export async function fetchBillingInvoices({ dealerId, page, pageSize, q, limit } = {}) {
  const params = {};
  if (dealerId) params.dealerId = dealerId;
  if (page != null) params.page = page;
  if (pageSize != null) params.pageSize = pageSize;
  if (q) params.q = q;
  if (limit) params.limit = limit;
  const { data } = await api.get('/dealers/invoices/tracking', { params });
  if (Array.isArray(data)) {
    return {
      invoices: data,
      total: data.length,
      page: 1,
      pageSize: data.length || params.pageSize || 20,
      totalPages: 1,
    };
  }
  const invoices = data.invoices || data.items || [];
  const total = Number(data.total ?? invoices.length) || 0;
  const resolvedPageSize = Number(data.pageSize) || params.pageSize || 20;
  const totalPages =
    Number(data.totalPages) || Math.max(1, Math.ceil(total / resolvedPageSize) || 1);
  return {
    invoices,
    total,
    page: Number(data.page) || params.page || 1,
    pageSize: resolvedPageSize,
    totalPages,
  };
}

export async function createDealerBillingInvoice(dealerId, body) {
  const { data } = await api.post(`/dealers/${dealerId}/invoices`, body);
  return data.invoice || data;
}

export async function updateDealerBillingInvoiceReceived(dealerId, invoiceId, receivedAmount) {
  const { data } = await api.patch(`/dealers/${dealerId}/invoices/${invoiceId}`, {
    receivedAmount,
  });
  return data.invoice || data;
}

/**
 * @param {import('@/types/dealer.types').DealerRegistryFormValues} body
 */
export async function createDealerRegistryEntry(body) {
  const { data } = await api.post('/dealers', body);
  return data.dealer;
}

export async function updateDealerRegistryEntry(id, body) {
  const { data } = await api.put(`/dealers/${id}`, body);
  return data.dealer;
}

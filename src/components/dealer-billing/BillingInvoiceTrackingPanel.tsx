import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { fetchBillingInvoices } from '@/services/dealerRegistryApi';
import { formatTaxInvoiceRs, displayInvoiceNumber } from '@/lib/taxInvoiceFormat';
import {
  formatInvoiceTrackingDateParts,
  invoiceTrackingStatus,
  invoiceTrackingStatusClass,
} from '@/lib/billingInvoice';
import type { StoredDealerInvoice } from '@/types/dealerBilling.types';
import EmptyData from '../EmptyData';
import TableSkeleton from '../table/TableSkeleton';
import Pagination from '../Pagination';
import BillingInvoiceHistoryCard from './BillingInvoiceHistoryCard';
import BillingInvoiceReviewSheet from './BillingInvoiceReviewSheet';
import {
  FigmaBodyRow,
  FigmaCell,
  FigmaHeaderRow,
  FigmaSortHeader,
  FigmaTable,
} from '../table/FigmaTable';

interface BillingInvoiceTrackingPanelProps {
  refreshKey?: number;
  onLoadError?: (message: string) => void;
  onInvoiceUpdated?: () => void;
}

const DEFAULT_PAGE_SIZE = 15;

export default function BillingInvoiceTrackingPanel({
  refreshKey = 0,
  onLoadError,
  onInvoiceUpdated,
}: BillingInvoiceTrackingPanelProps) {
  const [invoices, setInvoices] = useState<StoredDealerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reviewInvoice, setReviewInvoice] = useState<StoredDealerInvoice | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [refreshKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchBillingInvoices({
        page,
        pageSize,
        q: debouncedQ || undefined,
      });
      setInvoices(result.invoices);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      if (result.page !== page) setPage(result.page);
    } catch {
      setInvoices([]);
      setTotal(0);
      setTotalPages(1);
      onLoadError?.('Could not load invoice history.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQ, onLoadError]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const clearSearch = () => {
    setSearchInput('');
    setSearchOpen(false);
  };

  const countLabel = loading
    ? '…'
    : `${total} invoice${total === 1 ? '' : 's'}${debouncedQ ? ' found' : ''}`;

  let tableContent: ReactNode;
  if (loading) {
    tableContent = <TableSkeleton variant="staff" rows={8} title="Loading invoice history" />;
  } else if (!total && !debouncedQ) {
    tableContent = (
      <div className="figma-table-shell">
        <div className="figma-table-empty">
          <EmptyData
            title="No invoices yet"
            description="Generate an invoice from New invoice. Saved bills appear here for received amount and PDF download."
            illustration="folder"
            compact
          />
        </div>
      </div>
    );
  } else if (!invoices.length) {
    tableContent = (
      <div className="figma-table-shell">
        <div className="figma-table-empty">
          <EmptyData
            title="No matching invoices"
            description="Try another dealer name, invoice number, or amount."
            illustration="search"
            compact
          />
        </div>
      </div>
    );
  } else {
    tableContent = (
      <>
        <div className="crm-billing-invoice-history-mobile">
          <div className="crm-billing-invoice-history-card-grid">
            {invoices.map((inv) => (
              <BillingInvoiceHistoryCard key={inv.id} invoice={inv} onOpen={setReviewInvoice} />
            ))}
          </div>
        </div>
        <div className="crm-billing-invoice-history-desktop">
          <div className="figma-table-shell crm-billing-dealer-table crm-billing-invoice-table">
            <FigmaTable>
              <FigmaHeaderRow>
                <FigmaCell variant="filedate">
                  <FigmaSortHeader label="Generated" sortable={false} />
                </FigmaCell>
                <FigmaCell variant="dealer">
                  <FigmaSortHeader label="Dealer" sortable={false} />
                </FigmaCell>
                <FigmaCell variant="vehicle">
                  <FigmaSortHeader label="Invoice no." sortable={false} />
                </FigmaCell>
                <FigmaCell variant="bill">
                  <FigmaSortHeader label="Total" sortable={false} />
                </FigmaCell>
                <FigmaCell variant="bill">
                  <FigmaSortHeader label="Received" sortable={false} />
                </FigmaCell>
                <FigmaCell variant="bill">
                  <FigmaSortHeader label="Balance" sortable={false} />
                </FigmaCell>
                <FigmaCell variant="filestatus">
                  <FigmaSortHeader label="Status" sortable={false} />
                </FigmaCell>
                <FigmaCell variant="fileactions">
                  <FigmaSortHeader label="" sortable={false} />
                </FigmaCell>
              </FigmaHeaderRow>
              {invoices.map((inv) => {
                const status = invoiceTrackingStatus(inv);
                const generated = formatInvoiceTrackingDateParts(inv.generatedAt);
                return (
                  <FigmaBodyRow key={inv.id}>
                    <FigmaCell variant="filedate">
                      <div className="crm-billing-invoice-date" title={generated.title}>
                        <span className="figma-td-text">{generated.dateLine}</span>
                        {generated.timeLine ? (
                          <span className="crm-billing-invoice-date-time">{generated.timeLine}</span>
                        ) : null}
                      </div>
                    </FigmaCell>
                    <FigmaCell variant="dealer">
                      <span className="figma-td-text crm-billing-dealer-name">
                        {inv.dealerSnapshot?.name || '—'}
                      </span>
                    </FigmaCell>
                    <FigmaCell variant="vehicle">
                      <span className="figma-td-text crm-billing-invoice-no" title={inv.billNumber}>
                        #{displayInvoiceNumber(inv.billNumber)}
                      </span>
                    </FigmaCell>
                    <FigmaCell variant="bill">
                      <span className="figma-bill-text">{formatTaxInvoiceRs(inv.totalAmount)}</span>
                    </FigmaCell>
                    <FigmaCell variant="bill">
                      <span className="figma-bill-text">{formatTaxInvoiceRs(inv.receivedAmount)}</span>
                    </FigmaCell>
                    <FigmaCell variant="bill">
                      <span
                        className={`figma-bill-text${inv.balanceAmount > 0 ? ' crm-billing-invoice-balance-due' : ''}`}
                      >
                        {formatTaxInvoiceRs(inv.balanceAmount)}
                      </span>
                    </FigmaCell>
                    <FigmaCell variant="filestatus">
                      <span className={invoiceTrackingStatusClass(status)}>{status}</span>
                    </FigmaCell>
                    <FigmaCell variant="fileactions">
                      <button
                        type="button"
                        className="crm-btn crm-btn--secondary crm-btn--compact crm-billing-invoice-review-btn"
                        onClick={() => setReviewInvoice(inv)}
                      >
                        Manage
                      </button>
                    </FigmaCell>
                  </FigmaBodyRow>
                );
              })}
            </FigmaTable>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="crm-page crm-page--files crm-billing-dealer-layout crm-billing-tracking-layout">
        <div className="crm-files-main">
          <div className="crm-page-head-row print:hidden">
            <div className="crm-page-head flex min-w-0 flex-1 items-center lg:min-w-0 lg:flex-none">
              <h1 className="crm-title">Invoice history</h1>
            </div>

            <div className="crm-files-search-center hidden lg:flex">
              <div className="crm-files-search-slot crm-files-search-slot--open">
                <div className="crm-search-wrap crm-search-wrap--expand border border-gray-300 dark:border-gray-600 rounded-md px-2">
                  <Search size={16} className="crm-search-icon ml-2" aria-hidden />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Dealer, invoice no., or amount…"
                    className="crm-search crm-files-search"
                    aria-label="Search invoice history"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="crm-search-clear"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="crm-files-head-actions crm-billing-dealer-head-actions">
              <div
                className={`crm-files-search-slot${searchOpen || searchInput ? ' crm-files-search-slot--open' : ''} lg:hidden`}
              >
                {searchOpen || searchInput ? (
                  <div className="crm-search-wrap crm-search-wrap--expand">
                    <Search size={16} className="crm-search-icon" aria-hidden />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search invoices…"
                      className="crm-search crm-files-search"
                      autoFocus
                      onBlur={() => {
                        if (!searchInput) setSearchOpen(false);
                      }}
                      aria-label="Search invoice history"
                    />
                    {searchInput ? (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="crm-search-clear"
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="crm-icon-btn crm-icon-btn--ghost"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Search invoice history"
                  >
                    <Search size={20} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="crm-billing-dealer-subrow print:hidden">
            <span className="crm-billing-dealer-count">{countLabel}</span>
          </div>

          <div className="figma-table-card crm-billing-invoice-history-card-wrap">
            <div className="crm-files-table-panel">
              <div className="crm-table-scroll">{tableContent}</div>
              {total > 0 ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 15, 25, 50]}
                  onPageSizeChange={setPageSize}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <BillingInvoiceReviewSheet
        open={Boolean(reviewInvoice)}
        invoice={reviewInvoice}
        onClose={() => setReviewInvoice(null)}
        onSaved={() => {
          setReviewInvoice(null);
          onInvoiceUpdated?.();
          void load();
        }}
      />
    </>
  );
}

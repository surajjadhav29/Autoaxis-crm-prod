import { ChevronRight } from 'lucide-react';
import { formatTaxInvoiceRs, displayInvoiceNumber } from '@/lib/taxInvoiceFormat';
import {
  formatInvoiceTrackingDateParts,
  invoiceTrackingStatus,
  invoiceTrackingStatusClass,
} from '@/lib/billingInvoice';
import type { StoredDealerInvoice } from '@/types/dealerBilling.types';

interface BillingInvoiceHistoryCardProps {
  invoice: StoredDealerInvoice;
  onOpen: (invoice: StoredDealerInvoice) => void;
}

export default function BillingInvoiceHistoryCard({ invoice, onOpen }: BillingInvoiceHistoryCardProps) {
  const status = invoiceTrackingStatus(invoice);
  const generated = formatInvoiceTrackingDateParts(invoice.generatedAt);
  const dealerName = invoice.dealerSnapshot?.name || '—';

  return (
    <button
      type="button"
      className="crm-billing-invoice-history-card"
      onClick={() => onOpen(invoice)}
    >
      <div className="crm-billing-invoice-history-card-top">
        <div className="min-w-0 flex-1 text-left">
          <p className="crm-billing-invoice-history-card-dealer">{dealerName}</p>
          <p className="crm-billing-invoice-history-card-meta">
            Invoice #{displayInvoiceNumber(invoice.billNumber)} · {generated.dateLine}
            {generated.timeLine ? ` · ${generated.timeLine}` : ''}
          </p>
        </div>
        <span className={invoiceTrackingStatusClass(status)}>{status}</span>
      </div>
      <div className="crm-billing-invoice-history-card-amounts">
        <div className="crm-billing-invoice-history-card-amount-block">
          <span className="crm-billing-invoice-history-card-label">Total</span>
          <span className="crm-billing-invoice-history-card-value">
            {formatTaxInvoiceRs(invoice.totalAmount)}
          </span>
        </div>
        <div className="crm-billing-invoice-history-card-amount-block crm-billing-invoice-history-card-amount-block--received">
          <span className="crm-billing-invoice-history-card-label">Received</span>
          <span className="crm-billing-invoice-history-card-value">
            {formatTaxInvoiceRs(invoice.receivedAmount)}
          </span>
        </div>
        <div className="crm-billing-invoice-history-card-amount-block crm-billing-invoice-history-card-amount-block--balance">
          <span className="crm-billing-invoice-history-card-label">Balance</span>
          <span
            className={`crm-billing-invoice-history-card-value${invoice.balanceAmount > 0 ? ' crm-billing-invoice-balance-due' : ''}`}
          >
            {formatTaxInvoiceRs(invoice.balanceAmount)}
          </span>
        </div>
      </div>
      <span className="crm-billing-invoice-history-card-cta">
        Update payment & PDF
        <ChevronRight size={16} aria-hidden />
      </span>
    </button>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, X } from 'lucide-react';
import BillingBillPreviewPanel from './BillingBillPreviewPanel';
import BillingPaymentPanel from './BillingPaymentPanel';
import { downloadDealerBillPdf } from '@/lib/dealerBillingPdf';
import {
  billingDraftBalance,
  billingDraftTotalAmount,
  formatInvoiceTrackingDateParts,
  invoiceTrackingStatus,
  invoiceTrackingStatusClass,
  isReceivedAmountWithinTotal,
  parseReceivedInput,
  storedInvoiceToDraft,
} from '@/lib/billingInvoice';
import { displayInvoiceNumber } from '@/lib/taxInvoiceFormat';
import { updateDealerBillingInvoiceReceived } from '@/services/dealerRegistryApi';
import { getApiError } from '@/lib/apiError';
import type { StoredDealerInvoice } from '@/types/dealerBilling.types';

interface BillingInvoiceReviewSheetProps {
  open: boolean;
  invoice: StoredDealerInvoice | null;
  onClose: () => void;
  onSaved: (invoice: StoredDealerInvoice) => void;
}

export default function BillingInvoiceReviewSheet({
  open,
  invoice,
  onClose,
  onSaved,
}: BillingInvoiceReviewSheetProps) {
  const [receivedInput, setReceivedInput] = useState('0');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !invoice) return;
    setReceivedInput(String(invoice.receivedAmount ?? 0));
    setPreviewModalOpen(false);
    setError('');
  }, [open, invoice]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (previewModalOpen) {
        setPreviewModalOpen(false);
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, previewModalOpen]);

  const invoiceTotal = useMemo(
    () => (invoice ? billingDraftTotalAmount(storedInvoiceToDraft(invoice)) : 0),
    [invoice]
  );

  const draft = useMemo(() => {
    if (!invoice) return null;
    const base = storedInvoiceToDraft(invoice);
    return { ...base, receivedAmount: parseReceivedInput(receivedInput) };
  }, [invoice, receivedInput]);

  const total = invoiceTotal;
  const balance = draft ? billingDraftBalance(draft) : 0;
  const receivedAmount = parseReceivedInput(receivedInput);
  const receivedValid = isReceivedAmountWithinTotal(receivedAmount, invoiceTotal);

  useEffect(() => {
    if (!receivedValid) setPreviewModalOpen(false);
  }, [receivedValid]);

  const status = invoice ? invoiceTrackingStatus(invoice) : 'Open';
  const generated = invoice ? formatInvoiceTrackingDateParts(invoice.generatedAt) : null;

  const handleSaveAndDownload = async () => {
    if (!invoice || !draft) return;
    if (!isReceivedAmountWithinTotal(parseReceivedInput(receivedInput), invoiceTotal)) {
      setError('Received amount cannot exceed invoice total.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateDealerBillingInvoiceReceived(
        invoice.dealerId,
        invoice.id,
        receivedAmount
      );
      const nextDraft = storedInvoiceToDraft(updated);
      await downloadDealerBillPdf(nextDraft);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(getApiError(err, 'Could not save received amount or download PDF.'));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !invoice || !draft) return null;

  const sheet = (
    <div className="crm-billing-review-portal" role="presentation">
      <button
        type="button"
        className="crm-billing-review-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="crm-billing-review-sheet crm-billing-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="crm-billing-review-sheet-head">
          <div className="crm-billing-review-sheet-head-main">
            <h2 id="billing-review-title" className="crm-billing-review-title">
              #{displayInvoiceNumber(invoice.billNumber)}
            </h2>
            <p className="crm-billing-review-sub">
              {invoice.dealerSnapshot?.name || 'Dealer'}
              {generated?.dateLine ? ` · ${generated.dateLine}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="crm-icon-btn crm-icon-btn--ghost crm-billing-review-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </header>

        <div className="crm-billing-review-sheet-body">
          <div className="crm-billing-review-status-row">
            <span className={invoiceTrackingStatusClass(status)}>{status}</span>
          </div>

          <BillingPaymentPanel
            id="billing-review-received"
            total={total}
            receivedInput={receivedInput}
            onReceivedInputChange={setReceivedInput}
            balance={balance}
            error={error}
            compact
          />

          <button
            type="button"
            className="crm-billing-review-preview-open-btn"
            onClick={() => {
              if (!receivedValid) return;
              setPreviewModalOpen(true);
            }}
            disabled={!receivedValid}
            aria-disabled={!receivedValid}
            title={
              !receivedValid
                ? 'Fix the received amount before opening the invoice preview.'
                : 'Open invoice preview'
            }
          >
            <span>Invoice preview</span>
            <ExternalLink size={18} aria-hidden />
          </button>
        </div>

        <footer className="crm-billing-review-sheet-foot">
          <button type="button" className="crm-btn crm-btn--secondary" onClick={onClose} disabled={saving}>
            Close
          </button>
          <button
            type="button"
            className="crm-btn crm-btn--primary"
            onClick={() => {
              if (saving || !receivedValid) return;
              void handleSaveAndDownload();
            }}
            disabled={saving || !receivedValid}
            aria-disabled={saving || !receivedValid}
            title={
              !receivedValid
                ? 'Received amount cannot be greater than the invoice total or balance due.'
                : undefined
            }
          >
            <Download size={16} aria-hidden />
            {saving ? 'Saving…' : 'Save & download PDF'}
          </button>
        </footer>
      </div>
    </div>
  );

  const previewModal =
    previewModalOpen && draft ? (
      <div className="crm-billing-invoice-preview-portal" role="presentation">
        <button
          type="button"
          className="crm-billing-invoice-preview-backdrop"
          aria-label="Close invoice preview"
          onClick={() => setPreviewModalOpen(false)}
        />
        <div
          className="crm-billing-invoice-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="billing-invoice-preview-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="crm-billing-invoice-preview-head">
            <div>
              <h2 id="billing-invoice-preview-title" className="crm-billing-invoice-preview-title">
                Invoice preview
              </h2>
              <p className="crm-billing-invoice-preview-sub">
                #{displayInvoiceNumber(invoice.billNumber)}
                {invoice.dealerSnapshot?.name ? ` · ${invoice.dealerSnapshot.name}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="crm-icon-btn crm-icon-btn--ghost"
              onClick={() => setPreviewModalOpen(false)}
              aria-label="Close preview"
            >
              <X size={22} />
            </button>
          </header>
          <div className="crm-billing-invoice-preview-body">
            <BillingBillPreviewPanel draft={draft} />
          </div>
          <footer className="crm-billing-invoice-preview-foot">
            <button
              type="button"
              className="crm-btn crm-btn--secondary crm-btn--block"
              onClick={() => setPreviewModalOpen(false)}
            >
              Close preview
            </button>
          </footer>
        </div>
      </div>
    ) : null;

  return createPortal(
    <>
      {sheet}
      {previewModal}
    </>,
    document.body
  );
}

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, Plus, Printer, X } from 'lucide-react';
import BillingBillPreviewPanel from './BillingBillPreviewPanel';
import BillingPaymentPanel from './BillingPaymentPanel';
import ExpenseModal from '../ExpenseModal';
import { downloadDealerBillPdf, printDealerBillPdf } from '@/lib/dealerBillingPdf';
import { shareDealerBillOnWhatsApp } from '@/lib/dealerInvoiceWhatsApp';
import {
  billingDraftBalance,
  formatInvoiceTrackingDateParts,
  invoiceTrackingStatus,
  invoiceTrackingStatusClass,
  isReceivedAmountWithinTotal,
  parseReceivedInput,
  storedInvoiceToDraft,
} from '@/lib/billingInvoice';
import { billingLineFromFileRecord, invoiceLineAmountColumns } from '@/lib/fileExpenseSplit';
import { displayInvoiceNumber, formatTaxInvoiceRs } from '@/lib/taxInvoiceFormat';
import { updateDealerBillingInvoice } from '@/services/dealerRegistryApi';
import { fetchFileById, updateFileExpenses } from '@/services/fileService';
import { getApiError } from '@/lib/apiError';
import { useAuth } from '@/features/auth';
import { CrmWhatsAppIcon } from '@/components/icons/CrmIcons';
import type { BillingLineItem, StoredDealerInvoice } from '@/types/dealerBilling.types';
import type { FileExpenses, FileRecord } from '@/types/file.types';

interface BillingInvoiceReviewSheetProps {
  open: boolean;
  invoice: StoredDealerInvoice | null;
  onClose: () => void;
  onSaved: (invoice: StoredDealerInvoice) => void;
}

function lineLabel(line: BillingLineItem): string {
  return (
    [line.vehicleNo, line.workType, line.fileNumber].filter(Boolean).join(' · ') ||
    String(line.fileId || '')
  );
}

export default function BillingInvoiceReviewSheet({
  open,
  invoice,
  onClose,
  onSaved,
}: BillingInvoiceReviewSheetProps) {
  const { user } = useAuth();
  const [receivedInput, setReceivedInput] = useState('0');
  const [savedReceivedAmount, setSavedReceivedAmount] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [expenseFile, setExpenseFile] = useState<FileRecord | null>(null);
  const [openingExpenses, setOpeningExpenses] = useState(false);
  const [savingExpenses, setSavingExpenses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !invoice) return;
    const received = Number(invoice.receivedAmount ?? 0);
    setReceivedInput(String(received));
    setSavedReceivedAmount(received);
    setPreviewModalOpen(false);
    setExpenseFile(null);
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
      if (expenseFile) return;
      if (previewModalOpen) {
        setPreviewModalOpen(false);
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, previewModalOpen, expenseFile]);

  const invoiceLines = invoice?.lines || [];
  const invoiceTotal = useMemo(
    () => invoiceLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [invoiceLines]
  );

  const receivedAmount = parseReceivedInput(receivedInput);
  const receivedDirty = receivedAmount !== savedReceivedAmount;
  const receivedValid = isReceivedAmountWithinTotal(receivedAmount, invoiceTotal);
  const canSaveReceived = receivedDirty && receivedValid;

  const draft = useMemo(() => {
    if (!invoice) return null;
    return storedInvoiceToDraft({
      ...invoice,
      totalAmount: invoiceTotal,
      receivedAmount,
      balanceAmount: Math.max(0, invoiceTotal - receivedAmount),
    });
  }, [invoice, invoiceTotal, receivedAmount]);

  const balance = draft ? billingDraftBalance(draft) : 0;
  const busy = saving || downloading || printing || sharing || openingExpenses || savingExpenses;
  const changesSaved = !receivedDirty;

  useEffect(() => {
    if (!receivedValid) setPreviewModalOpen(false);
  }, [receivedValid]);

  const status = invoice
    ? invoiceTrackingStatus({
        ...invoice,
        totalAmount: invoiceTotal,
        receivedAmount,
        balanceAmount: Math.max(0, invoiceTotal - receivedAmount),
      })
    : 'Open';
  const generated = invoice ? formatInvoiceTrackingDateParts(invoice.generatedAt) : null;

  const handleOpenPricing = async (fileId: string) => {
    if (!fileId || busy) return;
    setOpeningExpenses(true);
    setError('');
    try {
      const file = await fetchFileById(fileId, user);
      setExpenseFile(file);
    } catch (err) {
      setError(getApiError(err, 'Could not open file pricing.'));
    } finally {
      setOpeningExpenses(false);
    }
  };

  /**
   * Same popup as File Records (+). Save updates the file, then refreshes this invoice line
   * from the new Extra/Deal split — same bill number.
   */
  const handleSaveExpenses = async (expenses: FileExpenses, _paymentDone: boolean) => {
    if (!invoice || !expenseFile) return;
    setSavingExpenses(true);
    setError('');
    try {
      // Keep file billed on this invoice (do not flip to Unpaid from this popup).
      const result = await updateFileExpenses(expenseFile.id, expenses, user, true);
      const saved =
        result && typeof result === 'object' && 'file' in result
          ? (result.file as FileRecord)
          : result && typeof result === 'object' && 'id' in (result as object)
            ? (result as FileRecord)
            : null;
      if (!saved?.id) {
        throw new Error('File save returned an incomplete response');
      }

      const updatedLine = billingLineFromFileRecord(saved);
      const nextLines = (invoice.lines || []).map((line) =>
        String(line.fileId) === String(saved.id) ? { ...line, ...updatedLine } : line
      );

      const updated = await updateDealerBillingInvoice(invoice.dealerId, invoice.id, {
        receivedAmount,
        lines: nextLines.map((line) => ({
          fileId: String(line.fileId),
          extraAmount: Number(line.extraAmount) || 0,
          dealAmount: Number(line.dealAmount) || 0,
        })),
      });

      setSavedReceivedAmount(Number(updated.receivedAmount ?? 0));
      setReceivedInput(String(updated.receivedAmount ?? 0));
      setExpenseFile(null);
      onSaved(updated);
    } catch (err) {
      setError(getApiError(err, 'Could not update pricing on file and invoice.'));
    } finally {
      setSavingExpenses(false);
    }
  };

  const handleSaveReceived = async () => {
    if (!invoice || !draft || !canSaveReceived) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateDealerBillingInvoice(invoice.dealerId, invoice.id, {
        receivedAmount,
      });
      setSavedReceivedAmount(Number(updated.receivedAmount ?? 0));
      setReceivedInput(String(updated.receivedAmount ?? 0));
      onSaved(updated);
    } catch (err) {
      setError(getApiError(err, 'Could not save received amount.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice || !draft || !changesSaved) return;
    setDownloading(true);
    setError('');
    try {
      await downloadDealerBillPdf(draft);
    } catch (err) {
      setError(getApiError(err, 'Could not download PDF.'));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice || !draft || !changesSaved) return;
    const printWindow = window.open('about:blank', '_blank');
    setPrinting(true);
    setError('');
    try {
      await printDealerBillPdf(draft, printWindow);
    } catch (err) {
      printWindow?.close();
      setError(getApiError(err, 'Could not print invoice.'));
    } finally {
      setPrinting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice || !draft || !changesSaved) return;
    setSharing(true);
    setError('');
    try {
      const result = await shareDealerBillOnWhatsApp(draft);
      if (!result.ok && result.reason !== 'Share cancelled') {
        setError(result.reason);
      }
    } catch (err) {
      setError(getApiError(err, 'Could not share on WhatsApp.'));
    } finally {
      setSharing(false);
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

          {invoiceLines.length ? (
            <section className="crm-billing-review-edit-lines" aria-label="Edit file pricing">
              <div className="crm-billing-review-edit-lines-head">
                <h3 className="crm-billing-review-edit-lines-title">Edit file pricing</h3>
                <p className="crm-billing-review-edit-lines-hint">
                  Click <strong>+</strong> Edit pricing on a file (same popup as File Records). Save
                  updates that file and this invoice — same bill number.
                </p>
              </div>
              <ul className="crm-billing-review-edit-lines-list">
                {invoiceLines.map((line) => {
                  const fileId = String(line.fileId || '');
                  if (!fileId) return null;
                  const cols = invoiceLineAmountColumns(line);
                  const label = lineLabel(line);
                  return (
                    <li key={fileId} className="crm-billing-review-edit-line">
                      <div className="crm-billing-review-edit-line-row">
                        <div className="crm-billing-review-edit-line-meta">
                          <p className="crm-billing-review-edit-line-label" title={label}>
                            {label}
                          </p>
                          <p className="crm-billing-review-edit-line-split">
                            Extra {formatTaxInvoiceRs(cols.extraAmount ?? 0)}
                            {' · '}
                            Deal {formatTaxInvoiceRs(cols.dealAmount ?? 0)}
                          </p>
                        </div>
                        <div className="crm-billing-review-edit-line-actions">
                          <strong className="crm-billing-review-edit-line-amount">
                            {formatTaxInvoiceRs(cols.total)}
                          </strong>
                          <button
                            type="button"
                            className="crm-btn crm-btn--secondary crm-btn--compact"
                            disabled={busy}
                            onClick={() => void handleOpenPricing(fileId)}
                            title="Open pricing (same as File Records +)"
                          >
                            <Plus size={16} aria-hidden />
                            Edit pricing
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="crm-billing-review-edit-invoice-total">
                Invoice total <strong>{formatTaxInvoiceRs(invoiceTotal)}</strong>
              </p>
            </section>
          ) : null}

          <BillingPaymentPanel
            id="billing-review-received"
            total={invoiceTotal}
            receivedInput={receivedInput}
            onReceivedInputChange={(value) => {
              setReceivedInput(value);
              setError('');
            }}
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
          <button
            type="button"
            className="crm-btn crm-btn--secondary"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
          <button
            type="button"
            className="crm-btn crm-btn--whatsapp"
            onClick={() => void handleShareWhatsApp()}
            disabled={busy || !changesSaved || !receivedValid}
            title={
              changesSaved
                ? 'Share invoice on WhatsApp'
                : 'Save received amount first, then share'
            }
          >
            <CrmWhatsAppIcon />
            {sharing ? 'Opening…' : 'Share'}
          </button>
          <button
            type="button"
            className="crm-btn crm-btn--secondary"
            onClick={() => void handlePrint()}
            disabled={busy || !changesSaved || !receivedValid}
            title={changesSaved ? 'Print invoice' : 'Save received amount first, then print'}
          >
            <Printer size={16} aria-hidden />
            {printing ? 'Opening…' : 'Print'}
          </button>
          <button
            type="button"
            className="crm-btn crm-btn--secondary"
            onClick={() => void handleSaveReceived()}
            disabled={busy || !canSaveReceived}
            title={
              canSaveReceived
                ? 'Save received amount'
                : changesSaved
                  ? 'No received-amount changes'
                  : 'Fix received amount before saving'
            }
          >
            {saving ? 'Saving…' : changesSaved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            className="crm-btn crm-btn--primary"
            onClick={() => void handleDownload()}
            disabled={busy || !changesSaved || !receivedValid}
            title={
              changesSaved
                ? 'Download invoice PDF'
                : 'Save received amount first, then download'
            }
          >
            <Download size={16} aria-hidden />
            {downloading ? 'Downloading…' : 'Download'}
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
      <ExpenseModal
        file={expenseFile}
        open={Boolean(expenseFile)}
        elevated
        onClose={() => {
          if (savingExpenses) return;
          setExpenseFile(null);
        }}
        onSave={(expenses, paymentDone) => {
          void handleSaveExpenses(expenses, paymentDone);
        }}
        saving={savingExpenses}
      />
    </>,
    document.body
  );
}

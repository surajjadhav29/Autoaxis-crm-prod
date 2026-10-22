import { useEffect, useState } from 'react';
import type { BillingDraft } from '@/types/dealerBilling.types';
import { amountInWordsInr } from '@/lib/amountInWords';
import {
  billToDisplayLines,
  buildPaymentQrDataUrlForDraft,
} from '@/lib/dealerBillingPdf';
import {
  billingDraftBalance,
  billingDraftReceivedAmount,
  billingDraftTotalAmount,
} from '@/lib/billingInvoice';
import { invoiceIssuerAddressLines, TAX_INVOICE_ISSUER } from '@/lib/taxInvoiceConfig';
import {
  displayInvoiceNumber,
  formatTaxInvoiceRs,
  invoiceDateTimeParts,
} from '@/lib/taxInvoiceFormat';
import {
  formatInvoiceLineAmountCell,
  invoiceLineAmountColumns,
} from '@/lib/fileExpenseSplit';
import { loadInvoiceLogoDataUrl } from '@/lib/invoiceLogo';
import { loadInvoiceSignatureDataUrl } from '@/lib/invoiceSignature';

interface BillingBillPreviewPanelProps {
  draft: BillingDraft;
}

export default function BillingBillPreviewPanel({ draft }: BillingBillPreviewPanelProps) {
  const addressLines = invoiceIssuerAddressLines();
  const total = billingDraftTotalAmount(draft);
  const received = billingDraftReceivedAmount(draft);
  const balance = billingDraftBalance(draft);
  const generatedWhen = draft.generatedAt ? new Date(draft.generatedAt) : new Date();
  const { date: invDate, time: invTime } = invoiceDateTimeParts(generatedWhen);
  const invNo = displayInvoiceNumber(draft.billNumber);
  const lineTotals = draft.lines.reduce(
    (acc, line) => {
      const cols = invoiceLineAmountColumns(line);
      if (cols.extraAmount != null) acc.extra += cols.extraAmount;
      if (cols.dealAmount != null) acc.deal += cols.dealAmount;
      acc.total += cols.total;
      return acc;
    },
    { extra: 0, deal: 0, total: 0 }
  );
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [signSrc, setSignSrc] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadInvoiceLogoDataUrl()
      .then((url) => {
        if (active) setLogoSrc(url);
      })
      .catch(() => {
        if (active) setLogoSrc(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadInvoiceSignatureDataUrl()
      .then((url) => {
        if (active) setSignSrc(url);
      })
      .catch(() => {
        if (active) setSignSrc(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    buildPaymentQrDataUrlForDraft(draft)
      .then((url) => {
        if (active) setQrSrc(url);
      })
      .catch(() => {
        if (active) setQrSrc(null);
      });
    return () => {
      active = false;
    };
  }, [draft]);

  return (
    <div className="crm-billing-preview-only">
      <article className="crm-tax-invoice-mock" aria-label="Tax invoice preview">
        <header className="crm-tax-invoice-mock-head">
          <div className="crm-tax-invoice-mock-issuer">
            <p className="crm-tax-invoice-mock-legal">{TAX_INVOICE_ISSUER.legalName}</p>
            <div className="crm-tax-invoice-mock-meta">
              {addressLines.map((line, index) => (
                <p key={`${index}-${line}`} className="crm-tax-invoice-mock-address-line">
                  {line}
                </p>
              ))}
              <p className="crm-tax-invoice-mock-contact-line">Phone no. : {TAX_INVOICE_ISSUER.phone}</p>
              <p className="crm-tax-invoice-mock-contact-line">Email : {TAX_INVOICE_ISSUER.email}</p>
              <p className="crm-tax-invoice-mock-contact-line">State: {TAX_INVOICE_ISSUER.state}</p>
            </div>
          </div>
          <div className="crm-tax-invoice-mock-logo">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Autoaxis Solution"
                className="crm-tax-invoice-mock-logo-img"
                width={172}
                height={48}
                decoding="async"
              />
            ) : null}
          </div>
        </header>

        <h2 className="crm-tax-invoice-mock-title">Tax Invoice</h2>

        <div className="crm-tax-invoice-mock-cols crm-tax-invoice-mock-cols--two">
          <div>
            <p className="crm-tax-invoice-mock-col-title">Bill To</p>
            {billToDisplayLines(draft.dealer).map((line, index) => (
              <p key={`bill-to-${index}`}>{line}</p>
            ))}
          </div>
          <div className="crm-tax-invoice-mock-cols-invoice">
            <p className="crm-tax-invoice-mock-col-title">Invoice Details</p>
            <p>Invoice No. : {invNo}</p>
            <p>Date : {invDate}</p>
            <p>Time : {invTime}</p>
          </div>
        </div>

        <table className="crm-tax-invoice-mock-table crm-tax-invoice-mock-table--billing-lines">
          <thead>
            <tr>
              <th>#</th>
              <th>Vehicle No.</th>
              <th>Model</th>
              <th>RTO</th>
              <th>Extra Amount</th>
              <th>Deal Amount</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((line, i) => {
              const cols = invoiceLineAmountColumns(line);
              return (
                <tr key={line.fileId}>
                  <td>{i + 1}</td>
                  <td>{line.vehicleNo || line.fileNumber || '—'}</td>
                  <td>{line.vehicleModel || '—'}</td>
                  <td>{line.rtoName || '—'}</td>
                  <td>{formatInvoiceLineAmountCell(cols.extraAmount)}</td>
                  <td>{formatInvoiceLineAmountCell(cols.dealAmount)}</td>
                  <td>{formatTaxInvoiceRs(cols.total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} />
              <td>Total</td>
              <td>{formatTaxInvoiceRs(lineTotals.extra)}</td>
              <td>{formatTaxInvoiceRs(lineTotals.deal)}</td>
              <td>{formatTaxInvoiceRs(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="crm-tax-invoice-mock-lower">
          <div className="crm-tax-invoice-mock-words">
            <p className="crm-tax-invoice-mock-col-title">Invoice Amount In Words</p>
            <p>{amountInWordsInr(total)}</p>
            <p className="crm-tax-invoice-mock-col-title">Terms and Conditions</p>
            <p>{TAX_INVOICE_ISSUER.terms}</p>
          </div>
          <table className="crm-tax-invoice-mock-summary">
            <tbody>
              <tr>
                <td>Sub Total</td>
                <td>{formatTaxInvoiceRs(total)}</td>
              </tr>
              <tr className="crm-tax-invoice-mock-summary-total">
                <td>Total</td>
                <td>{formatTaxInvoiceRs(total)}</td>
              </tr>
              <tr>
                <td>Received</td>
                <td>{formatTaxInvoiceRs(received)}</td>
              </tr>
              <tr>
                <td>Balance</td>
                <td>{formatTaxInvoiceRs(balance)}</td>
              </tr>
              <tr>
                <td>Payment mode</td>
                <td>{TAX_INVOICE_ISSUER.paymentMode}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer className="crm-tax-invoice-mock-footer">
          <div className="crm-tax-invoice-mock-qr-block">
            {qrSrc ? (
              <>
                <img src={qrSrc} alt="UPI payment QR code" className="crm-tax-invoice-mock-qr" />
                <p className="crm-tax-invoice-mock-upi">UPI | SCAN TO PAY</p>
              </>
            ) : (
              <p className="crm-tax-invoice-mock-qr-hint">
                Add <code>VITE_UPI_ID</code> in env for payment QR
              </p>
            )}
          </div>
          <div className="crm-tax-invoice-mock-bank">
            <p className="crm-tax-invoice-mock-col-title">Pay To:</p>
            <p>Bank Name : {TAX_INVOICE_ISSUER.bankName}</p>
            <p>Bank Account No. : {TAX_INVOICE_ISSUER.accountNo}</p>
            <p>Bank IFSC code : {TAX_INVOICE_ISSUER.ifsc}</p>
            <p>Account holder&apos;s name : {TAX_INVOICE_ISSUER.accountHolder}</p>
          </div>
          <div className="crm-tax-invoice-mock-sign">
            <p className="crm-tax-invoice-mock-sign-for">For :{TAX_INVOICE_ISSUER.legalName}</p>
            {signSrc ? (
              <div className="crm-tax-invoice-mock-sign-img-wrap">
                <img
                  src={signSrc}
                  alt="Authorized signatory signature"
                  className="crm-tax-invoice-mock-sign-img"
                  width={118}
                  height={48}
                  decoding="async"
                />
              </div>
            ) : null}
            <p className="crm-tax-invoice-mock-signatory">Authorized Signatory</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

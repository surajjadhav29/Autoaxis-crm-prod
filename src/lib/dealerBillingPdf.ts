import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { BillingDraft } from '@/types/dealerBilling.types';
import type { DealerRegistryRecord } from '@/types/dealer.types';
import {
  billingDraftBalance,
  billingDraftReceivedAmount,
  billingDraftTotal,
  billingDraftTotalAmount,
  billingQrPayAmount,
} from '@/lib/billingInvoice';
import { amountInWordsInr } from '@/lib/amountInWords';
import {
  invoiceIssuerAddressLines,
  TAX_INVOICE_ISSUER,
  TAX_INVOICE_PURPLE,
} from '@/lib/taxInvoiceConfig';
import {
  dealerInvoicePdfFilename,
  displayInvoiceNumber,
  formatTaxInvoiceRs,
  invoiceDateTimeParts,
} from '@/lib/taxInvoiceFormat';
import {
  formatInvoiceLineAmountCell,
  invoiceLineAmountColumns,
} from '@/lib/fileExpenseSplit';
import { invoiceLogoPdfLayout } from '@/lib/invoiceLogo';
import { invoiceSignaturePdfLayout } from '@/lib/invoiceSignature';

/** @deprecated Invoice numbers are assigned by the API (100, 101, …). */
export function buildBillNumber(_dealerName: string): string {
  return '';
}

export { billingDraftTotal } from '@/lib/billingInvoice';

/** Bill To block — shared by on-screen preview and downloaded PDF. */
export function billToDisplayLines(dealer: DealerRegistryRecord): string[] {
  const locationLine =
    [dealer.city, dealer.state].filter(Boolean).join(', ') ||
    String(dealer.address || '').trim();
  return [
    dealer.name,
    locationLine,
    dealer.phone ? `Contact No. : ${dealer.phone}` : '',
  ].filter(Boolean);
}

async function buildPaymentQrDataUrl(amount: number, invoiceNote: string): Promise<string | null> {
  const pa = TAX_INVOICE_ISSUER.upiVpa?.trim();
  if (!pa) return null;

  const pn = TAX_INVOICE_ISSUER.legalName.slice(0, 80);
  const tn = invoiceNote.slice(0, 80);
  const upiUri = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(tn)}`;
  return QRCode.toDataURL(upiUri, { width: 140, margin: 1, errorCorrectionLevel: 'M' });
}

export async function buildDealerBillPdfDoc(draft: BillingDraft): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 32;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const purple = TAX_INVOICE_PURPLE;
  const total = billingDraftTotalAmount(draft);
  const received = billingDraftReceivedAmount(draft);
  const balance = billingDraftBalance(draft);
  const { dealer } = draft;
  const generatedAt = draft.generatedAt ? new Date(draft.generatedAt) : new Date();
  const { date: invDate, time: invTime } = invoiceDateTimeParts(generatedAt);
  const invNo = displayInvoiceNumber(draft.billNumber);

  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(TAX_INVOICE_ISSUER.legalName, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  y += 16;
  const issuerTextWidth = contentWidth * 0.72;
  const issuerLineHeight = 9;
  const addressLines = invoiceIssuerAddressLines();
  const issuerRows: { text: string; wrap: boolean }[] = [
    ...addressLines.map((text) => ({ text, wrap: false as const })),
    { text: `Phone no. : ${TAX_INVOICE_ISSUER.phone}`, wrap: true },
    { text: `Email : ${TAX_INVOICE_ISSUER.email}`, wrap: true },
    { text: `State: ${TAX_INVOICE_ISSUER.state}`, wrap: true },
  ];
  for (const row of issuerRows) {
    if (row.wrap) {
      const wrapped = doc.splitTextToSize(row.text, issuerTextWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * issuerLineHeight;
    } else {
      doc.text(row.text, margin, y);
      y += issuerLineHeight;
    }
  }
  y += 5;

  const logoLayout = await invoiceLogoPdfLayout(pageWidth, margin, margin - 2);
  doc.addImage(
    logoLayout.dataUrl,
    'JPEG',
    logoLayout.x,
    logoLayout.y,
    logoLayout.width,
    logoLayout.height
  );

  y += 14;
  doc.setDrawColor(...purple);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...purple);
  doc.text('Tax Invoice', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y += 22;
  const colW = contentWidth / 2;
  const billToX = margin;
  const invoiceDetailsX = margin + colW;

  doc.setFontSize(8);
  let yBill = y;
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', billToX, yBill);
  doc.text('Invoice Details', invoiceDetailsX, yBill);

  yBill += 12;
  doc.setFont('helvetica', 'normal');
  doc.text(billToDisplayLines(dealer), billToX, yBill);

  doc.text(
    [`Invoice No. : ${invNo}`, `Date : ${invDate}`, `Time : ${invTime}`],
    invoiceDetailsX,
    yBill
  );

  y = yBill + 44;

  let sumExtra = 0;
  let sumDeal = 0;
  const lineRows = draft.lines.map((line, index) => {
    const cols = invoiceLineAmountColumns(line);
    if (cols.extraAmount != null) sumExtra += cols.extraAmount;
    if (cols.dealAmount != null) sumDeal += cols.dealAmount;
    return [
      String(index + 1),
      line.vehicleNo || line.fileNumber || '—',
      line.vehicleModel || '—',
      line.rtoName || '—',
      formatInvoiceLineAmountCell(cols.extraAmount),
      formatInvoiceLineAmountCell(cols.dealAmount),
      formatTaxInvoiceRs(cols.total),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Vehicle No.', 'Model', 'RTO', 'Extra Amount', 'Deal Amount', 'Total']],
    body: lineRows,
    foot: [
      [
        '',
        '',
        '',
        'Total',
        formatTaxInvoiceRs(sumExtra),
        formatTaxInvoiceRs(sumDeal),
        formatTaxInvoiceRs(total),
      ],
    ],
    styles: { fontSize: 7, cellPadding: 4, lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: {
      fillColor: purple,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
    },
    footStyles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    theme: 'grid',
    margin: { left: margin, right: margin },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 60;
  y = finalY + 16;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Amount In Words', margin, y);
  doc.setFont('helvetica', 'normal');
  const words = amountInWordsInr(total);
  const wordLines = doc.splitTextToSize(words, contentWidth * 0.55);
  doc.text(wordLines, margin, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions', margin, y + 12 + wordLines.length * 10 + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(TAX_INVOICE_ISSUER.terms, margin, y + 12 + wordLines.length * 10 + 20);

  const summaryX = pageWidth - margin - 180;
  const summaryRows: Array<[string, string, boolean]> = [
    ['Sub Total', formatTaxInvoiceRs(total), false],
    ['Total', formatTaxInvoiceRs(total), true],
    ['Received', formatTaxInvoiceRs(received), false],
    ['Balance', formatTaxInvoiceRs(balance), false],
    ['Payment mode', TAX_INVOICE_ISSUER.paymentMode, false],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryRows.map(([label, value]) => [label, value]),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: 'bold' },
      1: { cellWidth: 90, halign: 'right' },
    },
    margin: { left: summaryX },
    didParseCell: (data) => {
      const isTotalRow = data.row.index === 1;
      const isPricingValue =
        data.section === 'body' && data.column.index === 1 && data.row.index < 4;

      if (isPricingValue) {
        data.cell.styles.fontSize = 10;
        data.cell.styles.fontStyle = 'bold';
      }

      if (isTotalRow) {
        data.cell.styles.fillColor = purple;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y =
    Math.max(
      y + 12 + wordLines.length * 10 + 36,
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    ) + 24;

  const qrAmount = billingQrPayAmount(draft);
  const qrDataUrl =
    qrAmount > 0 ? await buildPaymentQrDataUrl(qrAmount, `Invoice ${invNo} balance`) : null;
  const footerTop = y;

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', margin, footerTop, 72, 72);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('UPI  |  SCAN TO PAY', margin, footerTop + 82);
  } else {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('(Set VITE_UPI_ID in .env for payment QR)', margin, footerTop + 8);
  }

  const payX = margin + (qrDataUrl ? 88 : 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Pay To:', payX, footerTop + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    [
      `Bank Name : ${TAX_INVOICE_ISSUER.bankName}`,
      `Bank Account No. : ${TAX_INVOICE_ISSUER.accountNo}`,
      `Bank IFSC code : ${TAX_INVOICE_ISSUER.ifsc}`,
      `Account holder's name : ${TAX_INVOICE_ISSUER.accountHolder}`,
    ],
    payX,
    footerTop + 20
  );

  const signLayout = await invoiceSignaturePdfLayout(pageWidth, margin, footerTop);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`For :${TAX_INVOICE_ISSUER.legalName}`, pageWidth - margin, signLayout.forY, {
    align: 'right',
  });
  doc.addImage(signLayout.dataUrl, 'JPEG', signLayout.x, signLayout.y, signLayout.width, signLayout.height);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', pageWidth - margin, signLayout.signatoryY, { align: 'right' });

  return doc;
}

export async function getDealerBillPdfBlob(draft: BillingDraft): Promise<Blob> {
  const doc = await buildDealerBillPdfDoc(draft);
  return doc.output('blob');
}

export async function downloadDealerBillPdf(draft: BillingDraft): Promise<void> {
  const doc = await buildDealerBillPdfDoc(draft);
  doc.save(dealerInvoicePdfFilename(draft.dealer.name, draft.generatedAt));
}

/**
 * Print invoice PDF.
 * Prefer passing a Window opened synchronously in the click handler
 * (`window.open('about:blank')`) so browsers do not treat it as a blocked pop-up
 * after the async PDF build.
 */
export async function printDealerBillPdf(
  draft: BillingDraft,
  printWindow?: Window | null
): Promise<void> {
  const doc = await buildDealerBillPdfDoc(draft);
  doc.autoPrint();
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  if (printWindow && !printWindow.closed) {
    printWindow.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  // Fallback: hidden iframe — no pop-up window required.
  await new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Print invoice');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      iframe.remove();
    };

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve();
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error('Could not print invoice'));
        return;
      }
      window.setTimeout(cleanup, 60_000);
    };
    iframe.onerror = () => {
      cleanup();
      reject(new Error('Could not load invoice for print'));
    };

    document.body.appendChild(iframe);
    iframe.src = url;
  });
}

/** Same QR as PDF (for on-screen preview). */
export async function buildPaymentQrDataUrlForDraft(
  draft: BillingDraft
): Promise<string | null> {
  const qrAmount = billingQrPayAmount(draft);
  if (qrAmount <= 0) return null;
  const invNo = displayInvoiceNumber(draft.billNumber);
  return buildPaymentQrDataUrl(qrAmount, `Invoice ${invNo} balance`);
}

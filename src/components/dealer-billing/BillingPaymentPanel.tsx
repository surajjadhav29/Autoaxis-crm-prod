import { parseReceivedInput } from '@/lib/billingInvoice';
import { formatTaxInvoiceRs } from '@/lib/taxInvoiceFormat';

interface BillingPaymentPanelProps {
  id: string;
  total: number;
  receivedInput: string;
  onReceivedInputChange: (value: string) => void;
  balance: number;
  error?: string;
  hint?: string;
  compact?: boolean;
}

function formatQuickAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return String(Math.round(n));
}

export default function BillingPaymentPanel({
  id,
  total,
  receivedInput,
  onReceivedInputChange,
  balance,
  error,
  hint,
  compact = false,
}: BillingPaymentPanelProps) {
  const receivedNum = parseReceivedInput(receivedInput);
  const overInvoiceTotal = total >= 0 && receivedNum > total;
  const pct = total > 0 ? Math.min(100, Math.round((receivedNum / total) * 100)) : 0;
  const paidInFull = total > 0 && balance <= 0;
  const validationError = overInvoiceTotal
    ? `Amount cannot exceed invoice total (${formatTaxInvoiceRs(total)}).`
    : '';
  const displayError = error || validationError;

  const setAmount = (amount: number) => {
    onReceivedInputChange(formatQuickAmount(amount));
  };

  return (
    <section
      className={`crm-billing-payment-panel${compact ? ' crm-billing-payment-panel--compact' : ''}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="crm-billing-payment-panel-head">
        <h3 id={`${id}-title`} className="crm-billing-payment-panel-title">
          Payment received
        </h3>
        {hint ? <p className="crm-billing-payment-panel-hint">{hint}</p> : null}
      </div>

      <div className="crm-billing-payment-panel-stats">
        <div className="crm-billing-payment-stat">
          <span className="crm-billing-payment-stat-label">Invoice total</span>
          <span className="crm-billing-payment-stat-value">{formatTaxInvoiceRs(total)}</span>
        </div>
        <div className="crm-billing-payment-stat">
          <span className="crm-billing-payment-stat-label">Balance due</span>
          <span
            className={`crm-billing-payment-stat-value${balance > 0 ? ' crm-billing-payment-stat-value--due' : ' crm-billing-payment-stat-value--clear'}`}
          >
            {formatTaxInvoiceRs(balance)}
          </span>
        </div>
      </div>

      <div className="crm-billing-payment-progress" aria-hidden={total <= 0}>
        <div className="crm-billing-payment-progress-track">
          <div
            className="crm-billing-payment-progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="crm-billing-payment-progress-label">
          {paidInFull ? 'Fully received' : `${pct}% received`}
        </span>
      </div>

      <div className="crm-billing-payment-input-row">
        <label htmlFor={id} className="crm-billing-payment-input-label">
          Amount received today (₹)
        </label>
        <div className="crm-billing-payment-input-wrap">
          <span className="crm-billing-payment-input-prefix" aria-hidden>
            ₹
          </span>
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            max={total}
            step={1}
            className={`crm-input crm-billing-payment-input${overInvoiceTotal ? ' crm-billing-payment-input--invalid' : ''}`}
            value={receivedInput}
            onChange={(e) => onReceivedInputChange(e.target.value)}
            placeholder="0"
            aria-invalid={overInvoiceTotal}
          />
        </div>
      </div>

      <div className="crm-billing-payment-quick">
        <span className="crm-billing-payment-quick-label">Quick fill</span>
        <div className="crm-billing-payment-quick-btns">
          <button type="button" className="crm-billing-payment-chip" onClick={() => setAmount(0)}>
            None
          </button>
          {total > 0 ? (
            <>
              <button
                type="button"
                className="crm-billing-payment-chip"
                onClick={() => setAmount(Math.round(total / 2))}
              >
                Half
              </button>
              <button
                type="button"
                className="crm-billing-payment-chip crm-billing-payment-chip--primary"
                onClick={() => setAmount(total)}
              >
                Full amount
              </button>
            </>
          ) : null}
        </div>
      </div>

      {displayError ? <p className="crm-billing-payment-error">{displayError}</p> : null}
    </section>
  );
}

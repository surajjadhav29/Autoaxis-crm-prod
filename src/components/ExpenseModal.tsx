import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { clientName } from '@/lib/constants';
import type { FileExpenses, FileRecord } from '@/types/file.types';

type ExpenseFieldKey = keyof FileExpenses;

interface ExpenseField {
  key: ExpenseFieldKey;
  label: string;
}

const STAFF_FIELDS: ExpenseField[] = [
  { key: 'challan', label: 'Challan Amount' },
  { key: 'adjustment', label: 'Adjustment Amount' },
  { key: 'puc', label: 'PUC Amount' },
  { key: 'hsrp', label: 'HSRP Amount' },
  { key: 'insurance', label: 'Insurance Amount' },
  { key: 'roadTax', label: 'Road Tax' },
  { key: 'permitCancel', label: 'Permit Cancel' },
  { key: 'duplicatePermit', label: 'Duplicate Permit' },
  { key: 'newPermit', label: 'New Permit' },
  { key: 'pTax', label: 'P-tax' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'cngAdjustment', label: 'CNG Adjustment' },
  { key: 'mobNoUpdate', label: 'Mob No. Update' },
  { key: 'lateInvoice', label: 'Late Invoice' },
];

const ADMIN_FIELDS: ExpenseField[] = [
  ...STAFF_FIELDS,
  { key: 'setDeal', label: 'Set Deal Amount' },
];

type ExpenseFormValues = Record<ExpenseFieldKey, string>;

function shownAmount(raw: string) {
  const amount = parseFloat(raw);
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const emptyExpenses = (): ExpenseFormValues => ({
  challan: '',
  adjustment: '',
  puc: '',
  hsrp: '',
  insurance: '',
  roadTax: '',
  permitCancel: '',
  duplicatePermit: '',
  newPermit: '',
  pTax: '',
  urgent: '',
  cngAdjustment: '',
  mobNoUpdate: '',
  lateInvoice: '',
  setDeal: '',
});

interface ExpenseModalProps {
  file: FileRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (expenses: FileExpenses, paymentDone: boolean) => void;
  saving?: boolean;
  /** Stack above billing review drawers (z-index 200+). */
  elevated?: boolean;
}

export default function ExpenseModal({
  file,
  open,
  onClose,
  onSave,
  saving,
  elevated = false,
}: ExpenseModalProps) {
  const { isAdmin } = useAuth();
  const fields = isAdmin ? ADMIN_FIELDS : STAFF_FIELDS;
  const [values, setValues] = useState<ExpenseFormValues>(emptyExpenses);
  const [paymentDone, setPaymentDone] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ExpenseFieldKey | ''>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !file) return;
    const exp = file.expenses || {};
    setValues({
      challan: exp.challan != null ? String(exp.challan) : '',
      adjustment: exp.adjustment != null ? String(exp.adjustment) : '',
      puc: exp.puc != null ? String(exp.puc) : '',
      hsrp: exp.hsrp != null ? String(exp.hsrp) : '',
      insurance: exp.insurance != null ? String(exp.insurance) : '',
      roadTax: exp.roadTax != null ? String(exp.roadTax) : '',
      permitCancel: exp.permitCancel != null ? String(exp.permitCancel) : '',
      duplicatePermit: exp.duplicatePermit != null ? String(exp.duplicatePermit) : '',
      newPermit: exp.newPermit != null ? String(exp.newPermit) : '',
      pTax: exp.pTax != null ? String(exp.pTax) : '',
      urgent: exp.urgent != null ? String(exp.urgent) : '',
      cngAdjustment: exp.cngAdjustment != null ? String(exp.cngAdjustment) : '',
      mobNoUpdate: exp.mobNoUpdate != null ? String(exp.mobNoUpdate) : '',
      lateInvoice: exp.lateInvoice != null ? String(exp.lateInvoice) : '',
      setDeal: exp.setDeal != null ? String(exp.setDeal) : '',
    });
    setPaymentDone(Boolean(file.paymentDone));
    setSelectedKey('');
    setMenuOpen(false);
  }, [open, file]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (selectRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const total = useMemo(() => {
    return fields.reduce((sum, { key }) => sum + (parseFloat(values[key]) || 0), 0);
  }, [fields, values]);

  if (!open || !file) return null;

  const handleChange = (key: ExpenseFieldKey, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: raw }));
  };

  const chooseField = (key: ExpenseFieldKey) => {
    setSelectedKey(key);
    setMenuOpen(false);
    requestAnimationFrame(() => valueRef.current?.focus());
  };

  const selectedField = fields.find((field) => field.key === selectedKey);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const existingSetDeal = file.expenses?.setDeal ?? 0;
    const payload: FileExpenses = {
      challan: parseFloat(values.challan) || 0,
      adjustment: parseFloat(values.adjustment) || 0,
      puc: parseFloat(values.puc) || 0,
      hsrp: parseFloat(values.hsrp) || 0,
      insurance: parseFloat(values.insurance) || 0,
      roadTax: parseFloat(values.roadTax) || 0,
      permitCancel: parseFloat(values.permitCancel) || 0,
      duplicatePermit: parseFloat(values.duplicatePermit) || 0,
      newPermit: parseFloat(values.newPermit) || 0,
      pTax: parseFloat(values.pTax) || 0,
      urgent: parseFloat(values.urgent) || 0,
      cngAdjustment: parseFloat(values.cngAdjustment) || 0,
      mobNoUpdate: parseFloat(values.mobNoUpdate) || 0,
      lateInvoice: parseFloat(values.lateInvoice) || 0,
      // Staff cannot edit Set Deal — keep existing value so it is not wiped to 0
      setDeal: isAdmin ? parseFloat(values.setDeal) || 0 : existingSetDeal,
    };
    onSave(payload, isAdmin ? paymentDone : Boolean(file.paymentDone));
  };

  return (
    <div
      className={`crm-modal-backdrop crm-modal-backdrop--expense${elevated ? ' crm-modal-backdrop--elevated' : ''}`}
      onClick={onClose}
    >
      <div className="crm-modal crm-modal--expense" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-head">
          <div>
            <p className="crm-modal-eyebrow">Billing</p>
            <h2 className="crm-modal-title">Add Expenses</h2>
            <p className="crm-modal-sub">
              {file.vehicleNo} · {clientName(file)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="crm-modal-close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="crm-modal-body">
          <div className="crm-modal-scroll">
            <div className="crm-expense-entry">
              <div className="crm-expense-select" ref={selectRef}>
                <button
                  type="button"
                  className={`crm-expense-select-btn ${selectedField ? '' : 'crm-expense-select-btn--placeholder'}`}
                  aria-haspopup="listbox"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((openMenu) => !openMenu)}
                >
                  <span>{selectedField?.label || 'Select expense'}</span>
                  <ChevronDown size={16} />
                </button>
                {menuOpen ? (
                  <ul className="crm-expense-menu" role="listbox">
                    {fields.map(({ key, label }) => (
                      <li key={key} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={key === selectedKey}
                          onClick={() => chooseField(key)}
                        >
                          {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <label className="crm-expense-value-wrap">
                <input
                  ref={valueRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedKey ? values[selectedKey] : ''}
                  onChange={(e) => {
                    if (!selectedKey) return;
                    handleChange(selectedKey, e.target.value);
                  }}
                  placeholder="Enter value"
                  disabled={!selectedKey}
                  className="crm-expense-input"
                  aria-label="Expense value"
                />
                <span className="crm-expense-rupee" aria-hidden="true">
                  ₹
                </span>
              </label>
            </div>

            <div className="crm-expense-values">
              {fields
                .filter((field) => field.key !== 'setDeal')
                .map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`crm-expense-value-row${key === selectedKey ? ' crm-expense-value-row--active' : ''}`}
                    onClick={() => chooseField(key)}
                  >
                    <span>{label}</span>
                    <strong>{shownAmount(values[key])}</strong>
                  </button>
                ))}
            </div>
            {isAdmin ? (
              <button
                type="button"
                className={`crm-expense-value-row crm-expense-value-row--set-deal${selectedKey === 'setDeal' ? ' crm-expense-value-row--active' : ''}`}
                onClick={() => chooseField('setDeal')}
              >
                <span>Set Deal Amount</span>
                <strong>{shownAmount(values.setDeal)}</strong>
              </button>
            ) : null}

            {isAdmin ? (
              <div className="mt-5 flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[#3d4654]">Payment status</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1e242c]">
                    <input
                      type="radio"
                      name="paymentDone"
                      checked={paymentDone === true}
                      onChange={() => setPaymentDone(true)}
                      className="h-4 w-4 accent-[#1a73e8]"
                    />
                    <span>Paid</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1e242c]">
                    <input
                      type="radio"
                      name="paymentDone"
                      checked={paymentDone === false}
                      onChange={() => setPaymentDone(false)}
                      className="h-4 w-4 accent-[#1a73e8]"
                    />
                    <span>Unpaid</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-[#576579]">
                Payment status:{' '}
                <strong className="font-medium text-[#1e242c]">
                  {paymentDone ? 'Paid' : 'Unpaid'}
                </strong>
                <span className="mt-1 block text-xs">Only an admin can change payment status.</span>
              </div>
            )}

            <div className="crm-expense-total">
              <span>Total</span>
              <strong>
                ₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="crm-modal-actions">
            <button type="button" onClick={onClose} className="crm-btn crm-btn--secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="crm-btn crm-btn--primary">
              {saving ? 'Saving…' : 'Save & Calculate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

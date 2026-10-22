import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  error?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  hideConfirm?: boolean;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  error,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  hideConfirm = false,
  destructive = false,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="crm-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="crm-modal crm-modal--confirm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        <button type="button" onClick={onClose} className="crm-confirm-close" aria-label="Close">
          <X size={18} />
        </button>

        <div className="crm-confirm-body">
          <h2 id="confirm-modal-title" className="crm-confirm-title">
            {title}
          </h2>
          {description ? (
            <p id="confirm-modal-desc" className="crm-confirm-desc">
              {description}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-[10px] border border-[#f8e4e4] bg-[#fef7f7] px-4 py-3 text-[13px] text-[#c40020]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="crm-modal-actions">
          <button type="button" onClick={onClose} className="crm-btn crm-btn--secondary">
            {cancelLabel}
          </button>
          {!hideConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`crm-btn ${
                destructive ? 'crm-btn--danger' : 'crm-btn--primary'
              } disabled:cursor-not-allowed disabled:opacity-55`}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

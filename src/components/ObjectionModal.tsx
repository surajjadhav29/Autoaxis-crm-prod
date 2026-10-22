import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ObjectionModalProps {
  open: boolean;
  description: string;
  onDescriptionChange: (value: string) => void;
  error?: string;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ObjectionModal({
  open,
  description,
  onDescriptionChange,
  error,
  saving,
  onClose,
  onConfirm,
}: ObjectionModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    textareaRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl border border-[#dbdfe5] bg-white p-6 shadow-[0_20px_48px_rgba(14,16,19,0.18)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="objection-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#667488] hover:bg-[#f3f4f6] hover:text-[#1e242c]"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 id="objection-modal-title" className="m-0 pr-8 text-xl font-bold text-[#1e242c] sm:text-2xl">
          Mark as Objection
        </h2>
        <p className="mt-2 mb-0 text-sm text-[#576579] sm:text-base">
          A description is required before this file can be marked as Objection.
        </p>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="objection-description" className="text-[13px] font-medium text-[#3d4654]">
            Description
            <span className="ml-[3px] font-semibold text-[#dc0024]" aria-hidden>
              *
            </span>
          </label>
          <textarea
            ref={textareaRef}
            id="objection-description"
            rows={4}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe the objection…"
            className={`min-h-[96px] w-full resize-y rounded-[10px] border px-3.5 py-2.5 font-sans text-sm text-[#1e242c] outline-none transition ${
              error ? 'border-[#dc0024]' : 'border-[#d8dde5] focus:border-[#1a73e8] focus:shadow-[0_0_0_3px_rgba(26,115,232,0.14)]'
            }`}
          />
          {error && <p className="m-0 text-xs font-medium text-[#dc0024]">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#dbdfe5] bg-white px-5 py-2.5 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-lg border-0 bg-[#1a73e8] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

type ToastVariant = 'success' | 'error';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  variant?: ToastVariant;
}

// Figma "Dynamic Island 2.0" toast standard: pill container, DLS 2.0 layered
// shadow, medium 13px label. Success = green, error = destructive red.
const VARIANTS: Record<ToastVariant, { bg: string; Icon: typeof CheckCircle; role: 'status' | 'alert' }> = {
  success: { bg: 'bg-[#1d7f50]', Icon: CheckCircle, role: 'status' },
  error: { bg: 'bg-[#dc0024]', Icon: AlertCircle, role: 'alert' },
};

export default function Toast({ message, onClose, duration = 3000, variant = 'success' }: ToastProps) {
  useEffect(() => {
    // Errors linger a little longer so they can be read before auto-dismiss.
    const ms = variant === 'error' ? Math.max(duration, 4500) : duration;
    const timer = window.setTimeout(onClose, ms);
    return () => window.clearTimeout(timer);
  }, [onClose, duration, variant]);

  const { bg, Icon, role } = VARIANTS[variant];

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-full ${bg} px-4 py-3 text-[13px] font-medium text-white shadow-[-9px_7px_25px_rgba(87,101,121,0.2),-35px_29px_45px_rgba(87,101,121,0.17),0_10px_24px_rgba(14,16,19,0.18)] sm:bottom-6`}
      role={role}
    >
      <Icon size={18} className="shrink-0" />
      <span className="truncate">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white hover:bg-white/20"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

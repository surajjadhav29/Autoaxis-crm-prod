import { useCallback, useState } from 'react';

export type ToastVariant = 'success' | 'error';

export interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    setToast({ id: Date.now(), message, variant });
  }, []);

  const showError = useCallback((message: string) => {
    setToast({ id: Date.now(), message, variant: 'error' });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showToast, showError, clearToast };
}

export default useToast;

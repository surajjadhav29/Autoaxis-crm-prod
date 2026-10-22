export function getApiError(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { response?: { data?: { error?: string } }; message?: string };
    return e.response?.data?.error || e.message || fallback;
  }
  return fallback;
}

export function getApiErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null) {
    return (err as { response?: { data?: { code?: string } } }).response?.data?.code;
  }
  return undefined;
}

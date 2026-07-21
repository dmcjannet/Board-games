import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface SnackbarPayload {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface SnackbarApi {
  show: (message: string, options?: { actionLabel?: string; onAction?: () => void; durationMs?: number }) => void;
}

const SnackbarContext = createContext<SnackbarApi>({ show: () => {} });

export function useSnackbar(): SnackbarApi {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<SnackbarPayload | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setActive(null);
  }, [clearTimer]);

  const show = useCallback<SnackbarApi['show']>(
    (message, options) => {
      clearTimer();
      nextIdRef.current += 1;
      const payload: SnackbarPayload = {
        id: nextIdRef.current,
        message,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
      };
      setActive(payload);
      const durationMs = options?.durationMs ?? 5000;
      timerRef.current = window.setTimeout(() => {
        setActive((current) => (current?.id === payload.id ? null : current));
        timerRef.current = null;
      }, durationMs);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  function handleAction() {
    if (active?.onAction) active.onAction();
    dismiss();
  }

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      {active && (
        <div className="snackbar" role="status" aria-live="polite">
          <span className="snackbar-message">{active.message}</span>
          {active.actionLabel && active.onAction && (
            <button type="button" className="snackbar-action" onClick={handleAction}>
              {active.actionLabel}
            </button>
          )}
          <button type="button" className="snackbar-close" onClick={dismiss} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

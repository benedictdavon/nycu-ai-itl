import { Check, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const TOAST_MS = 8000;

type ToastState = { id: number; title: string; detail?: string };

type ToastContextValue = {
  show: (title: string, detail?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Holds the one toast on screen. It lives in the app shell, so it survives route changes. The
 * message stays for about 8 seconds, or until "Dismiss".
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((title: string, detail?: string) => {
    setToast({ id: Date.now() + Math.random(), title, detail });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(dismiss, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* The live region is always rendered, so screen readers announce the text when it arrives. */}
      <div role="status">
        {toast && (
          <div
            key={toast.id}
            className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-[28rem] items-start gap-3 rounded-md bg-bench-ink p-4 shadow-float sm:inset-x-auto sm:right-6 sm:left-auto sm:w-full"
          >
            <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-selection" />
            <div className="min-w-0 flex-1">
              <p className="type-label font-bold text-paper">{toast.title}</p>
              {toast.detail && <p className="type-body-small text-rule">{toast.detail}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="-m-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-paper enabled:hover:bg-ink-muted"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (value === null) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}

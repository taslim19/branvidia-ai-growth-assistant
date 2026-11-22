"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2 } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  clearToasts: () => {},
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [bottomPx, setBottomPx] = useState<number | null>(null);

  const showToast = useCallback((message: string) => {
    toastId += 1;
    const id = toastId;
    setToasts((prev) => [...prev, { id, message }]);
    // Auto-dismiss after a few seconds so stale confirmations never linger.
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Error surfaces clear stale toasts so a toast can never sit on top of an
  // error's retry action.
  const clearToasts = useCallback(() => setToasts([]), []);

  // Anchor the toast stack just above the sticky chat composer whenever one is
  // on screen. The composer is not always at the viewport bottom: on the
  // assistant page the analysis and error panels render below it, so a fixed
  // viewport offset would leave the toast covering the wrong thing. Tracking
  // the composer's actual position keeps the toast above the input in every
  // layout state; elsewhere a small default offset applies.
  useEffect(() => {
    function update() {
      const composer = document.querySelector<HTMLElement>("[data-chat-composer]");
      if (!composer) {
        setBottomPx(null);
        return;
      }
      const top = composer.getBoundingClientRect().top;
      const offset = Math.round(window.innerHeight - top) + 8;
      const cap = Math.round(window.innerHeight * 0.6);
      setBottomPx(Math.min(Math.max(offset, 24), cap));
    }
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, clearToasts }}>
      {children}
      <div
        aria-live="polite"
        style={{
          bottom: `calc(${bottomPx ?? 24}px + env(safe-area-inset-bottom))`,
        }}
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="message-in pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-[0_12px_32px_var(--shadow-color)]"
          >
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Standalone inline toast for one-off confirmations (e.g. "Reply copied").
export function InlineToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="text-sm font-medium text-success">
      {message}
    </p>
  );
}

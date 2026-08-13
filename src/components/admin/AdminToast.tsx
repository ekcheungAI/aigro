import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

type ToastFn = (message: string) => void;

const ToastContext = createContext<ToastFn>(() => {});

/** Admin 全區 toast — 任何 admin 頁面用 useAdminToast() 觸發 */
export function useAdminToast(): ToastFn {
  return useContext(ToastContext);
}

interface ToastItem {
  id: number;
  message: string;
}

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback<ToastFn>((message) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] ml-auto flex max-w-sm flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[calc(100%-3rem)]"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, transform: "translateY(12px)" }}
              animate={{ opacity: 1, transform: "translateY(0)" }}
              exit={{ opacity: 0, transform: "translateY(8px)" }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-logo-paper/15 bg-logo-navy px-4 py-3 text-sm text-logo-paper shadow-lg"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime" strokeWidth={1.5} aria-hidden="true" />
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

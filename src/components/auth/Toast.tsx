import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Auth flow 共用 toast — 同 Ask.tsx 嘅「Club 優先預約」toast 同款:
 * fixed bottom,6 秒自動消失,reduced-motion 下只 fade。
 */
export function useToast(duration = 6000) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const showToast = useCallback(
    (msg: string) => {
      setToast(msg);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  return { toast, showToast };
}

export default function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="auth-toast"
          role="status"
          initial={{ opacity: 0, transform: "translate(-50%, 8px)" }}
          animate={{ opacity: 1, transform: "translate(-50%, 0px)" }}
          exit={{ opacity: 0, transform: "translate(-50%, 8px)" }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-8 left-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-md border bg-surface px-4 py-3 text-body-sm text-text-primary"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

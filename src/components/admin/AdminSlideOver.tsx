import { useEffect } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface AdminSlideOverProps {
  open: boolean;
  onClose: () => void;
  /** 面板標題(可省略,由 children 自帶 header) */
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** px,預設 480 */
  width?: number;
}

/**
 * Admin 通用右側 slide-over 面板 — 表格列詳情/編輯器用。
 * light 主題、hairline 邊框、Esc 關閉、body scroll lock。
 */
export default function AdminSlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 480,
}: AdminSlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-[#02122C]/40"
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-y-0 right-0 z-[110] flex w-full flex-col border-l border-border bg-surface"
            style={{ maxWidth: width }}
            role="dialog"
            aria-modal="true"
          >
            {(title !== undefined || subtitle !== undefined) && (
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  {title && (
                    <h2 className="font-display text-[20px] font-medium text-text-primary">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="關閉"
                  className="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

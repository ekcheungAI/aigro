import { useEffect, useId, useRef } from "react";
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
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

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
            className="fixed inset-0 z-[100] bg-logo-navy/45"
            aria-hidden="true"
          />
          <motion.aside
            ref={panelRef}
            key="panel"
            initial={{ transform: "translateX(100%)" }}
            animate={{ transform: "translateX(0)" }}
            exit={{ transform: "translateX(100%)" }}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-y-0 right-0 z-[110] flex w-full flex-col border-l border-border bg-surface outline-none"
            style={{ maxWidth: width }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title !== undefined ? titleId : undefined}
            aria-describedby={subtitle !== undefined ? subtitleId : undefined}
            aria-label={title === undefined ? "詳情面板" : undefined}
            tabIndex={-1}
          >
            {(title !== undefined || subtitle !== undefined) && (
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  {title && (
                    <h2 id={titleId} className="font-display text-[20px] font-medium text-text-primary">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p id={subtitleId} className="mt-1 text-sm text-text-muted">{subtitle}</p>
                  )}
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  aria-label="關閉"
                  className="press rounded-md border border-border p-1.5 text-text-muted outline-none transition-colors hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-lime"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
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

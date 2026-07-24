import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** 錯誤 caption(error token);有 error 時輸入框轉 error 邊框 */
  error?: string | null;
  /** 輔助說明(無 error 時顯示) */
  hint?: string;
}

/**
 * Auth 表單欄位 — label + 48px input + error/hint caption。
 * 輸入框規格跟 Ask 輸入 dock:border-strong、focus border-ink + ring-ink-soft。
 */
export default function Field({ id, label, error, hint, className, ...rest }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-label text-text-primary">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          "h-12 w-full rounded-md border bg-surface px-4 text-body text-text-primary transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:outline-none focus:ring-2",
          error
            ? "border-error focus:border-error focus:ring-error/20"
            : "border-border-strong focus:border-ink focus:ring-ink-soft"
        )}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

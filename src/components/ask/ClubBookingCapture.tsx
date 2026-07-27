import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Send } from "lucide-react";
import type { Persona } from "@/data/personas";
import { validEmail } from "@/components/auth/member";
import { captureWaitlist } from "@/lib/waitlist";
import { lastUserQuestion } from "@/components/ask/sessions";
import { cn } from "@/lib/utils";

/**
 * G5:Club 優先預約 — inline 迷你 email capture(取代空 toast)。
 * 留低 email → waitlist(kind "vip",source "club-booking-intent"),
 * note 記低分身同最近問題節錄,開放時專家可以直奔主題跟進。
 */
export default function ClubBookingCapture({
  persona,
  idPrefix,
  className,
  onSubmitted,
}: {
  persona: Persona;
  /** 同頁多個 capture 實例時保持 input id 唯一 */
  idPrefix: string;
  className?: string;
  onSubmitted?: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!validEmail(clean)) {
      setError("請輸入有效嘅 Email 地址");
      return;
    }
    const question = lastUserQuestion(persona.key);
    // 真實收集:waitlist vip + club-booking-intent(無 env / 離線 → 靜默,成功態照顯示)
    void captureWaitlist({
      email: clean,
      kind: "vip",
      source: "club-booking-intent",
      vertical: persona.key,
      note: `Club 預約意願(${persona.name})${question ? ` — 最近問題:「${question}」` : ""}`,
    });
    setError(null);
    setDone(true);
    onSubmitted?.(clean);
  };

  if (done) {
    return (
      <p
        className={cn(
          "flex items-center gap-1.5 rounded-sm border bg-surface px-3 py-2 text-caption text-lime-text",
          className
        )}
      >
        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        已記低 — Club 預約開放即通知你
      </p>
    );
  }

  return (
    <div className={cn("rounded-sm border bg-surface px-3 py-2.5", className)}>
      <p className="text-caption font-medium text-text-primary">
        Club 優先預約 — 即將開放
      </p>
      <p className="mt-0.5 text-caption text-text-muted">
        留低 email,開放即通知你(優先於公開名額)
      </p>
      <form onSubmit={submit} className="mt-2 flex gap-1.5">
        <label htmlFor={`${idPrefix}-email`} className="sr-only">
          Email
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          autoComplete="email"
          required
          value={email}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="you@example.com"
          className={cn(
            "h-8 min-w-0 flex-1 rounded-sm border bg-bg px-2 text-caption text-text-primary transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:outline-none focus:ring-2",
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-border-strong focus:border-ink focus:ring-ink-soft"
          )}
        />
        <button
          type="submit"
          aria-label="登記 Club 優先預約通知"
          className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-sm bg-ink-solid px-2.5 text-caption text-white hover:bg-ink-hover"
        >
          <Send className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          通知我
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-1.5 text-caption text-error">
          {error}
        </p>
      )}
    </div>
  );
}

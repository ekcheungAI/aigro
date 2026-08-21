import { useState } from "react";
import { Check } from "lucide-react";
import Reveal from "@/components/Reveal";
import {
  captureWaitlistWithFallback,
  type WaitlistSaveMode,
} from "@/lib/waitlist";

/**
 * Newsletter Block (design.md §6.9): surface full-width band + border top/bottom.
 * Left: display h3 + body-sm. Right: email input (48px) + solid ink 訂閱 button.
 * Success: success check + 「已訂閱成功」 replaces input. No modal, no confetti.
 */
export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [savedMode, setSavedMode] = useState<WaitlistSaveMode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  return (
    <section className="relative overflow-hidden border-y bg-surface">
      {/* AIGRO editorial research still life — low opacity keeps copy readable. */}
      <img
        src="/editorial/thumbnails/research-evidence.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15"
      />
      <div className="relative mx-auto flex max-w-container flex-col gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <Reveal className="max-w-md">
          <h3 className="font-display text-h3 text-text-primary">
            每週精選，直達信箱
          </h3>
          <p className="mt-2 text-body-sm text-text-secondary">
            一週最重要的 AI・增長情報，編輯精選五條，附香港視角解讀。
          </p>
        </Reveal>

        <Reveal delay={0.1} className="w-full max-w-md">
          {savedMode ? (
            <p className="flex h-12 items-center gap-2 text-label text-success">
              <Check className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              {savedMode === "server"
                ? "已訂閱成功"
                : "已儲存在此裝置 — 連線後請再登記"}
            </p>
          ) : (
            <form
              className="flex gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const value = email.trim();
                if (!value || submitting) return;
                setSubmitting(true);
                setError("");
                const mode = await captureWaitlistWithFallback(
                  {
                    email: value,
                    kind: "newsletter",
                    source: "newsletter-band",
                  },
                  "aigro-newsletter-interest"
                );
                setSubmitting(false);
                if (mode) setSavedMode(mode);
                else setError("暫時未能記錄，請稍後再試。");
              }}
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email 地址
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="你的 email 地址"
                className="h-12 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-4 text-body-sm text-text-primary placeholder:text-text-muted"
              />
              <button
                type="submit"
                disabled={submitting}
                className="h-12 shrink-0 rounded-md bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
              >
                {submitting ? "記錄中" : "訂閱"}
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-2 text-caption text-error">
              {error}
            </p>
          )}
          <p className="mt-2 text-caption text-text-muted">
            每週一封，隨時退訂
          </p>
        </Reveal>
      </div>
    </section>
  );
}

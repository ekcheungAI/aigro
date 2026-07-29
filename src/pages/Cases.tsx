import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import { captureWaitlist } from "@/lib/waitlist";

/* ================= Section 1 — Page Header ================= */

function PageHeader() {
  return (
    /* Cinematic dark band — editorial image layer (opacity-45 saturate-[0.85])
       + solid band overlay (no gradients), band text tokens, both themes */
    <section className="relative isolate overflow-hidden border-b border-band-border bg-band-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 select-none"
      >
        <img
          src="/editorial/cases-hero.jpg"
          alt=""
          className="h-full w-full object-cover opacity-45 saturate-[0.85]"
        />
        <span className="absolute inset-0 bg-band-bg/60" />
      </div>
      <div className="mx-auto flex min-h-[300px] max-w-container flex-col justify-center px-6 py-16 max-md:min-h-[280px] max-md:py-12">
        <motion.p
          className="flex items-center gap-3 text-overline font-sans uppercase text-band-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: REVEAL_EASE }}
        >
          <span className="inline-block h-px w-6 bg-band-border-strong" aria-hidden="true" />
          Field-Tested in Hong Kong
        </motion.p>

        {/* 行級 reveal — stagger 100ms, 450ms */}
        <span className="mt-6 block overflow-hidden">
          <motion.h1
            className="font-display text-display text-band-text"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.1, ease: REVEAL_EASE }}
          >
            實戰案例 Cases
          </motion.h1>
        </span>
        <span className="block overflow-hidden">
          <motion.p
            className="mt-4 max-w-[640px] text-body-lg text-band-text-secondary"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.2, ease: REVEAL_EASE }}
          >
            香港企業用 AI 嘅真實成果 —
            我哋只發佈有真實數據支持、客戶授權嘅案例。無數據，不上架。
          </motion.p>
        </span>
      </div>
    </section>
  );
}

/* ================= Section 2 — 誠實狀態:真實案例整理中 ================= */

/**
 * v1.27:5 個示範案例全部係虛構,已移除。
 * 呢個區塊係誠實狀態 — 講明上架標準,登記通知寫入 Supabase waitlist。
 */
function HonestState() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void captureWaitlist({
      email: email.trim(),
      kind: "newsletter",
      note: "案例上架通知",
      source: "cases-notify",
    });
    setDone(true);
  };

  return (
    <section className="mx-auto max-w-container px-6 pb-24 pt-16 max-md:pb-16 max-md:pt-12">
      <Reveal y={20} duration={0.45}>
        <div className="mx-auto max-w-[640px] rounded-md border bg-surface p-12 text-center shadow-card dark:shadow-none max-md:p-8">
          <img
            src="/editorial/cases-empty.png"
            alt="排版台上嘅空白案例版面 — 等待真實案例上架"
            width={640}
            height={400}
            loading="lazy"
            className="mx-auto aspect-[16/10] w-full max-w-[400px] rounded-md object-cover"
          />
          <h2 className="mt-6 font-display text-h3 text-text-primary">
            真實案例整理中
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-body-sm text-text-secondary">
            我哋只發佈有真實數據支持、客戶授權嘅案例 —
            每個案例要有量化成果、工具清單同可複製步驟,先至會上架。
            與其放示範數字,不如留空等真案例。
          </p>

          <div className="mx-auto mt-8 max-w-[440px] border-t pt-8">
            {done ? (
              <p
                role="status"
                className="inline-flex items-center gap-2 text-label text-success"
              >
                <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                已登記 — 第一個真案例上架即通知你
              </p>
            ) : (
              <form onSubmit={submit} className="flex gap-2 max-sm:flex-col">
                <label htmlFor="cases-notify-email" className="sr-only">
                  案例上架通知 email
                </label>
                <input
                  id="cases-notify-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="你的 email"
                  className="h-11 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 text-caption text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-11 shrink-0 rounded-md bg-ink-solid px-5 text-label text-white press hover:bg-ink-hover"
                >
                  上架通知我
                </button>
              </form>
            )}
            <p className="mt-3 text-caption text-text-muted">
              有真實成果想投稿?用下面「提交案例」留低意向。
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================= Section 3 — 投稿/授權說明帶 ================= */

function SubmitBand() {
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const t = window.setTimeout(() => setToastVisible(false), 2200);
    return () => window.clearTimeout(t);
  }, [toastVisible]);

  return (
    <section className="border-y bg-surface">
      <Reveal y={16} duration={0.4} className="mx-auto max-w-container px-6 py-16 text-center">
        <h4 className="font-display text-h4 text-text-primary">
          你都有實戰成果？
        </h4>
        <p className="mx-auto mt-3 max-w-[520px] text-body-sm text-text-secondary">
          我們歡迎有量化數據的香港 AI 落地案例，經核實同授權後署名刊登。
        </p>
        <button
          type="button"
          onClick={() => setToastVisible(true)}
          className="mt-6 inline-flex h-11 items-center gap-1 rounded-md border border-border-strong px-6 text-label text-ink press hover:bg-ink-soft"
        >
          提交案例
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </Reveal>

      {/* Toast（原型） */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            role="status"
            className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-md border bg-surface px-5 py-3 text-label text-text-primary shadow-card dark:shadow-none"
            initial={{ opacity: 0, transform: "translateX(-50%) translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateX(-50%) translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateX(-50%) translateY(8px)" }}
            transition={{ duration: 0.2, ease: REVEAL_EASE }}
          >
            投稿通道即將開放
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ================= Page ================= */

export default function Cases() {
  return (
    <>
      <PageHeader />
      <HonestState />
      <SubmitBand />
    </>
  );
}

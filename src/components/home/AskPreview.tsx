import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";

const CITATIONS = ["補習社 AI 批改案例", "GPT-5 發佈情報"];

/**
 * Ask CTA band — 用靜態對話預覽展示產品,唔使文字描述。
 * 左:價值文案 + CTA;右:迷你 chat mock(用戶問題 + AI 回答 + 引用 chips),
 * 成個 mock 係通往 /ask 嘅連結。無打字機 — 靜態展示(§5.4 精神)。
 */
export default function AskPreview() {
  return (
    <section className="border-y bg-surface">
      <div className="mx-auto grid max-w-container gap-12 px-6 py-20 max-md:py-16 lg:grid-cols-2 lg:items-center">
        {/* 左:文案 + CTA */}
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            Ask 問答
          </p>
          <h3 className="mt-4 font-display text-h2 text-text-primary">
            有咩 AI 問題?問我哋嘅 AI 編輯部。
          </h3>
          <p className="mt-4 max-w-[520px] text-body-sm text-text-secondary">
            基於全站情報與案例庫回答,每個論點附來源引用 —
            無引用,不下結論。
          </p>
          <div className="mt-8">
            <Link
              to="/ask"
              className="inline-flex h-12 items-center rounded-md bg-ink-solid px-8 text-label text-white press hover:bg-ink-hover"
            >
              開始對話
              <ArrowRight
                className="ml-1 h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
            <p className="mt-4 text-caption text-text-muted">
              免費每日 5 次・無需信用卡
            </p>
          </div>
        </Reveal>

        {/* 右:靜態對話預覽 — 成張卡連去 /ask */}
        <Reveal delay={0.12}>
          <Link
            to="/ask"
            aria-label="去 Ask 問答開始對話"
            className="card-hover group block rounded-lg border bg-surface p-6 shadow-card dark:shadow-none"
          >
            {/* 用戶氣泡(右)— card well,無色底規則內 */}
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-lg border bg-card px-4 py-3 text-body-sm text-text-primary">
                預算有限應該點用 AI 做營銷?
              </p>
            </div>

            {/* AI 氣泡(左)— ink-soft(design.md §2.3 唯一允許嘅有色氣泡) */}
            <div className="mt-4 flex justify-start">
              <div className="max-w-[92%] rounded-lg bg-ink-soft px-4 py-3">
                <p className="text-overline font-sans uppercase text-ink">
                  AIGRO 編輯部
                </p>
                <p className="mt-1.5 text-body-sm text-text-primary">
                  由免費額度開始已經夠:用 GPT-5
                  起草內容,再注入你嘅本地案例同觀點 — $0
                  預算都可以起步。
                </p>
                {/* 引用 chips — 穩定、不位移(§5.2) */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {CITATIONS.map((c) => (
                    <span
                      key={c}
                      className="rounded-sm border bg-surface px-2.5 py-1 text-caption text-text-secondary transition-colors duration-120 group-hover:text-ink"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-4 flex items-center justify-end gap-1 text-caption text-text-muted transition-colors duration-150 group-hover:text-ink">
              繼續對話
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-150 nudge-x"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </p>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

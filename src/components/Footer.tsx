import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { captureWaitlist } from "@/lib/waitlist";
import {
  CLASS_REVIEW_NAV_LINK,
  isPrimaryNavigationActive,
} from "@/data/navigation";

/**
 * Footer (elevated §6.2): cool-paper band in light mode and deep navy in dark
 * mode. A route-specific collaboration masthead sits above the shared
 * 4-column navigation, followed by the legal bar and theme toggle.
 */
export default function Footer() {
  const { isDark, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [devEmail, setDevEmail] = useState("");
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [devSavedMode, setDevSavedMode] = useState<"server" | "local" | null>(null);
  const [devError, setDevError] = useState("");
  const isGrowthMarketerReview = pathname.replace(/\/$/, "") === "/guides/100x-ai-growth-marketer";
  const isClassReview = isPrimaryNavigationActive(pathname, CLASS_REVIEW_NAV_LINK);

  return (
    <footer className="bg-band-bg [&_a]:inline-flex [&_a]:min-h-10 [&_a]:items-center max-sm:[&_a]:min-h-11">
      {/* Lime hairline — 2px solid accent rule (footer top, single rule only) */}
      <div aria-hidden="true" className="h-[2px] w-full bg-band-ink" />
      <div className="mx-auto max-w-container px-6 py-12 lg:py-14">
        {isGrowthMarketerReview && (
          <section
            aria-labelledby="course-collaboration-title"
            className="mb-8 grid gap-4 border-b border-band-border pb-8 lg:grid-cols-[minmax(0,0.64fr)_minmax(0,1.36fr)] lg:items-end"
          >
            <div>
              <p className="font-mono text-overline uppercase tracking-[0.12em] text-band-ink">
                Joint event · 聯合活動
              </p>
              <p className="mt-2 max-w-sm text-body-sm text-band-text-secondary">
                100x AI Growth Marketer · Level 1 + Level 2
              </p>
            </div>
            <div>
              <h2
                id="course-collaboration-title"
                className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.04] tracking-[-0.025em] text-band-text"
              >
                DotAI <span className="text-band-ink">×</span> EK{" "}
                <span className="whitespace-nowrap font-sans text-[0.42em] font-semibold tracking-normal text-band-text-secondary">
                  (ekcheungAI)
                </span>
              </h2>
              <p className="mt-3 max-w-2xl text-body-sm text-band-text-secondary">
                由 DotAI 與 EK（ekcheungAI）聯合策劃及教學；AIGRO 負責將公開課程資料整理成可閱讀、可執行嘅課堂重溫。
              </p>
            </div>
          </section>
        )}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-10 lg:grid-cols-[1fr_0.8fr_0.8fr_1.25fr]">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" aria-label="AIGRO 首頁" className="w-fit">
              <img
                src="/brand/aigro-wordmark-navy-transparent.png"
                alt="AIGRO"
                width={1267}
                height={636}
                loading="lazy"
                className="h-8 w-auto dark:hidden"
              />
              <img
                src="/brand/aigro-wordmark-white-transparent.png"
                alt="AIGRO"
                width={1267}
                height={636}
                loading="lazy"
                className="hidden h-8 w-auto dark:block"
              />
            </Link>
            <p className="mt-2 max-w-[230px] text-body-sm text-band-text-secondary">
              可信賴的 AI・增長・商業情報，香港視角。
            </p>
          </div>

          {/* 內容 */}
          <nav aria-label="內容">
            <p className="text-overline font-sans uppercase text-band-text-muted">內容</p>
            <ul className="mt-3 space-y-0.5 text-label">
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/insights">Insights 情報</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/sources">情報渠道 Sources</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/insights?tab=daily">Daily 日報</Link></li>
              <li>
                <Link
                  aria-current={isClassReview ? "page" : undefined}
                  className={isClassReview
                    ? "text-band-ink transition-colors duration-150 hover:text-band-text"
                    : "text-band-text-secondary transition-colors duration-150 hover:text-band-ink"}
                  to={CLASS_REVIEW_NAV_LINK.to}
                >
                  {CLASS_REVIEW_NAV_LINK.en} {CLASS_REVIEW_NAV_LINK.zh}
                </Link>
              </li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/branding">Branding 品牌</Link></li>
            </ul>
          </nav>

          {/* 平台 */}
          <nav aria-label="平台">
            <p className="text-overline font-sans uppercase text-band-text-muted">平台</p>
            <ul className="mt-3 space-y-0.5 text-label">
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/skills">Skills 技能</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/apis">Public APIs 公開 API</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/experts">Experts 專家</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/ask">Ask 問答</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/experts">領航專家邀請制</Link></li>
            </ul>
          </nav>

          {/* Developers — AIGRO MCP Network */}
          <div className="col-span-2 lg:col-span-1">
            <p className="text-overline font-sans uppercase text-band-text-muted">AIGRO MCP Network</p>
            <p className="mt-3 text-body-sm text-band-text-secondary">
              MCP / API 即將開放 — 將 AIGRO 情報接入你的 AI 工作流。
            </p>
            <div className="mt-2 flex flex-col items-start gap-0.5">
              <Link
                to="/developers"
                className="text-label text-band-ink transition-colors duration-150 hover:text-band-text"
              >
                MCP Network 優先名單
              </Link>
              <Link
                to="/insights?tab=data"
                className="text-label text-band-ink transition-colors duration-150 hover:text-band-text"
              >
                Data 合作
              </Link>
            </div>
            {devSavedMode ? (
              <p role="status" className="mt-3 flex min-h-10 items-center gap-2 text-caption text-band-ink">
                <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {devSavedMode === "server"
                  ? "已記低 — MCP 開放時通知你"
                  : "已儲存在此裝置 — 連線後請再登記"}
              </p>
            ) : (
            <form
              className="mt-3 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const email = devEmail.trim();
                if (!email || devSubmitting) return;
                setDevSubmitting(true);
                setDevError("");
                const serverSaved = await captureWaitlist({
                  email,
                  kind: "mcp",
                  source: "footer",
                });
                let saved = serverSaved;
                if (!saved) {
                  try {
                    window.localStorage.setItem(
                      "aigro-footer-mcp-interest",
                      JSON.stringify({ email, ts: Date.now() })
                    );
                    saved = true;
                  } catch {
                    /* 私隱模式可能拒絕 localStorage;下面顯示可重試狀態 */
                  }
                }
                setDevSubmitting(false);
                if (saved) {
                  setDevEmail("");
                  setDevSavedMode(serverSaved ? "server" : "local");
                } else {
                  setDevError("暫時未能記錄，請稍後再試。");
                }
              }}
            >
              <label htmlFor="dev-email" className="sr-only">
                開發者優先名單 email
              </label>
              <input
                id="dev-email"
                type="email"
                required
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="開發者優先名單"
                className="h-10 min-w-0 flex-1 rounded-md border border-band-border-strong bg-band-surface px-3 text-caption text-band-text placeholder:text-band-text-muted max-sm:h-11"
              />
              <button
                type="submit"
                disabled={devSubmitting}
                className="h-10 shrink-0 rounded-md border border-band-border-strong px-3 text-caption text-band-ink press hover:bg-band-ink-soft max-sm:h-11"
              >
                {devSubmitting ? "記錄中" : "登記"}
              </button>
            </form>
            )}
            {devError && (
              <p role="alert" className="mt-2 text-caption text-error">
                {devError}
              </p>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-9 flex flex-col items-start justify-between gap-3 border-t border-band-border pt-5 sm:flex-row sm:items-center">
          <p className="text-caption text-band-text-muted">
            © {new Date().getFullYear()} AIGRO・內容經編輯審核・AI 回答僅供參考・來源與授權聲明
          </p>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "切換至淺色模式" : "切換至深色模式"}
            className="flex h-11 w-11 items-center justify-center rounded-md text-band-text-muted press hover:bg-band-ink-soft hover:text-band-ink sm:h-9 sm:w-9"
          >
            {isDark ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}

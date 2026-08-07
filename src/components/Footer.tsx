import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { captureWaitlist } from "@/lib/waitlist";

/**
 * Footer (elevated §6.2): inverted near-black band in BOTH themes —
 * cinematic, premium closing act. Thin lime stripe band + 1px lime hairline
 * top accent, band text tokens (AA+ on #02122C), 64px vertical padding,
 * 4 columns (AIGRO / 內容 / 平台 / Developers) + bottom bar with theme toggle.
 */
export default function Footer() {
  const { isDark, toggleTheme } = useTheme();
  const [devEmail, setDevEmail] = useState("");
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [devSavedMode, setDevSavedMode] = useState<"server" | "local" | null>(null);
  const [devError, setDevError] = useState("");

  return (
    <footer className="bg-band-bg [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
      {/* Lime hairline — 2px solid accent rule (footer top, single rule only) */}
      <div aria-hidden="true" className="h-[2px] w-full bg-band-ink" />
      <div className="mx-auto max-w-container px-6 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
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
            <p className="mt-3 max-w-[240px] text-body-sm text-band-text-secondary">
              可信賴的 AI・增長・商業情報，香港視角。
            </p>
          </div>

          {/* 內容 */}
          <nav aria-label="內容">
            <p className="text-overline font-sans uppercase text-band-text-muted">內容</p>
            <ul className="mt-4 space-y-3 text-label">
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/insights">Insights 情報</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/sources">情報渠道 Sources</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/insights?tab=daily">Daily 日報</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/branding">Branding 品牌</Link></li>
            </ul>
          </nav>

          {/* 平台 */}
          <nav aria-label="平台">
            <p className="text-overline font-sans uppercase text-band-text-muted">平台</p>
            <ul className="mt-4 space-y-3 text-label">
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/skills">Skills 技能</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/experts">Experts 專家</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/ask">Ask 問答</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/pricing">Pricing 方案</Link></li>
              <li><Link className="text-band-text-secondary transition-colors duration-150 hover:text-band-ink" to="/experts">領航專家邀請制</Link></li>
            </ul>
          </nav>

          {/* Developers — AIGRO MCP Network */}
          <div>
            <p className="text-overline font-sans uppercase text-band-text-muted">AIGRO MCP Network</p>
            <p className="mt-4 text-body-sm text-band-text-secondary">
              MCP / API 即將開放 — 將 AIGRO 情報接入你的 AI 工作流。
            </p>
            <Link
              to="/developers"
              className="mt-3 inline-block text-label text-band-ink transition-colors duration-150 hover:text-band-text"
            >
              MCP Network 優先名單
            </Link>
            <Link
              to="/insights?tab=data"
              className="mt-3 block text-label text-band-ink transition-colors duration-150 hover:text-band-text"
            >
              Data 合作
            </Link>
            {devSavedMode ? (
              <p role="status" className="mt-4 flex min-h-11 items-center gap-2 text-caption text-band-ink">
                <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {devSavedMode === "server"
                  ? "已記低 — MCP 開放時通知你"
                  : "已儲存在此裝置 — 連線後請再登記"}
              </p>
            ) : (
            <form
              className="mt-4 flex gap-2"
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
                className="h-10 min-w-0 flex-1 rounded-md border border-band-border-strong bg-band-surface px-3 text-caption text-band-text placeholder:text-band-text-muted"
              />
              <button
                type="submit"
                disabled={devSubmitting}
                className="h-10 shrink-0 rounded-md border border-band-border-strong px-3 text-caption text-band-ink press hover:bg-band-ink-soft"
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
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-band-border pt-6 sm:flex-row sm:items-center">
          <p className="text-caption text-band-text-muted">
            © {new Date().getFullYear()} AIGRO・內容經編輯審核・AI 回答僅供參考・來源與授權聲明
          </p>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "切換至淺色模式" : "切換至深色模式"}
            className="flex h-9 w-9 items-center justify-center rounded-md text-band-text-muted press hover:bg-band-ink-soft hover:text-band-ink"
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

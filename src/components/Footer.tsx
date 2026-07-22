import { useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/**
 * Footer (design.md §6.2): bg + 1px border top, 64px vertical padding,
 * 4 columns (AIGRO / 內容 / 平台 / Developers) + bottom bar with theme toggle.
 */
export default function Footer() {
  const { isDark, toggleTheme } = useTheme();
  const [devEmail, setDevEmail] = useState("");

  return (
    <footer className="border-t bg-bg">
      <div className="mx-auto max-w-container px-6 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="font-display text-[20px] font-medium uppercase tracking-[0.04em] text-text-primary">
              AIGRO
            </p>
            <p className="mt-3 max-w-[240px] text-body-sm text-text-secondary">
              可信賴的 AI・增長・商業情報，香港視角。
            </p>
          </div>

          {/* 內容 */}
          <nav aria-label="內容">
            <p className="text-overline font-sans uppercase text-text-muted">內容</p>
            <ul className="mt-4 space-y-3 text-label">
              <li><Link className="text-text-secondary transition-colors duration-150 hover:text-ink" to="/insights">Insights 情報</Link></li>
              <li><Link className="text-text-secondary transition-colors duration-150 hover:text-ink" to="/insights/daily">Daily 日報</Link></li>
              <li><Link className="text-text-secondary transition-colors duration-150 hover:text-ink" to="/cases">Cases 案例</Link></li>
              <li><Link className="text-text-secondary transition-colors duration-150 hover:text-ink" to="/library">Library 資源庫</Link></li>
            </ul>
          </nav>

          {/* 平台 */}
          <nav aria-label="平台">
            <p className="text-overline font-sans uppercase text-text-muted">平台</p>
            <ul className="mt-4 space-y-3 text-label">
              <li><Link className="text-text-secondary transition-colors duration-150 hover:text-ink" to="/experts">Experts 專家</Link></li>
              <li><Link className="text-text-secondary transition-colors duration-150 hover:text-ink" to="/ask">Ask 問答</Link></li>
              <li><Link className="text-text-secondary transition-colors duration-150 hover:text-ink" to="/pricing">Pricing 方案</Link></li>
              <li><Link className="text-text-secondary transition-colors duration-150 hover:text-ink" to="/experts">導師申請</Link></li>
            </ul>
          </nav>

          {/* Developers — MCP/API 即將開放 */}
          <div>
            <p className="text-overline font-sans uppercase text-text-muted">Developers</p>
            <p className="mt-4 text-body-sm text-text-secondary">
              MCP / API 即將開放 — 將 AIGRO 情報接入你的 AI 工作流。
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setDevEmail("");
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
                className="h-10 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 text-caption text-text-primary placeholder:text-text-muted"
              />
              <button
                type="submit"
                className="h-10 shrink-0 rounded-md border border-border-strong px-3 text-caption text-ink transition-colors duration-150 hover:bg-ink-soft"
              >
                登記
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
          <p className="text-caption text-text-muted">
            © {new Date().getFullYear()} AIGRO・內容經編輯審核・AI 回答僅供參考・來源與授權聲明
          </p>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "切換至淺色模式" : "切換至深色模式"}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-ink-soft hover:text-ink"
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

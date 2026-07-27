import { Link } from "react-router-dom";
import { ArrowUpRight, ExternalLink, Puzzle } from "lucide-react";
import { skills } from "@/data/skills";
import { cn } from "@/lib/utils";

/**
 * Admin 技能目錄 — 目錄本身係前台 /skills 用緊嘅真實靜態數據
 * (src/data/skills.ts,同公開站一致),後台管理(新增/編輯/上下架)
 * 需要後端先可以改 — 而家 read-only,唔會假裝可以編輯。
 */
export default function AdminSkills() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Skills
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          技能目錄管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          同公開 /skills 頁一致嘅真實目錄 — 共 {skills.length} 個條目。
        </p>
      </div>

      <div className="mb-4 rounded-md border border-dashed border-border-strong bg-card/60 px-4 py-3 text-xs leading-relaxed text-text-muted">
        目錄管理後台(新增、編輯、上下架)即將推出 — 需要 skills 後端表。
        而家目錄寫死喺代碼庫(src/data/skills.ts),呢度 read-only 顯示真實內容。
      </div>

      <ul className="space-y-2">
        {skills.map((s) => (
          <li
            key={s.id}
            className="rounded-lg border border-border bg-surface px-4 py-3.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
                  s.status === "自家"
                    ? "bg-lime-soft text-lime-text"
                    : s.status === "優先名單"
                      ? "bg-card text-[#A36A0F]"
                      : "bg-card text-text-secondary"
                )}
              >
                {s.status}
              </span>
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-muted"
                >
                  {t}
                </span>
              ))}
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-lime-text hover:underline"
                >
                  來源
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-text-primary">{s.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {s.value}
            </p>
            <p className="mt-2 font-mono text-[11px] text-text-muted">
              {s.install}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center">
        <Link
          to="/skills"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
        >
          <Puzzle className="h-4 w-4" />
          睇公開目錄頁
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

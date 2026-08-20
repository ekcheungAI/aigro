import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, ExternalLink, Puzzle } from "lucide-react";
import AdminPublicApiDirectory from "@/components/admin/AdminPublicApiDirectory";
import { skills } from "@/data/skills";
import { cn } from "@/lib/utils";

/**
 * AIGRO Directory admin: Skills stays a truthful read-only code catalogue;
 * Public APIs is backed by Supabase with admin-only add/unpublish/restore.
 */
export default function AdminSkills() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "apis" ? "apis" : "skills";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          AIGRO Directory
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          {activeTab === "apis" ? "公開 API 目錄" : "技能目錄管理"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {activeTab === "apis"
            ? "管理公開目錄嘅已發佈、草稿同已下架 API。"
            : `同公開 /skills 頁一致嘅真實目錄 — 共 ${skills.length} 個條目。`}
        </p>
      </div>

      <nav className="mb-6 flex gap-1 border-b" aria-label="Directory 管理分類">
        <div role="tablist" aria-label="目錄類型" className="flex gap-1">
          <Link
            id="admin-directory-skills-tab"
            to="/admin/skills"
            role="tab"
            aria-selected={activeTab === "skills"}
            aria-controls="admin-directory-skills-panel"
            className={cn(
              "press inline-flex min-h-10 items-center border-b-2 px-4 text-sm font-medium",
              activeTab === "skills"
                ? "border-lime-text text-lime-text"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            Skills 技能
          </Link>
          <Link
            id="admin-directory-apis-tab"
            to="/admin/skills?tab=apis"
            role="tab"
            aria-selected={activeTab === "apis"}
            aria-controls="admin-directory-apis-panel"
            className={cn(
              "press inline-flex min-h-10 items-center border-b-2 px-4 text-sm font-medium",
              activeTab === "apis"
                ? "border-lime-text text-lime-text"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            Public APIs 公開 API
          </Link>
        </div>
      </nav>

      {activeTab === "apis" ? (
        <div
          id="admin-directory-apis-panel"
          role="tabpanel"
          aria-labelledby="admin-directory-apis-tab"
        >
          <AdminPublicApiDirectory />
        </div>
      ) : (
        <div
          id="admin-directory-skills-panel"
          role="tabpanel"
          aria-labelledby="admin-directory-skills-tab"
        >
          <div className="mb-4 rounded-md border border-dashed border-border-strong bg-card/60 px-4 py-3 text-xs leading-relaxed text-text-muted">
            Skills 目錄仍然寫喺程式碼庫（src/data/skills.ts），後台只讀顯示真實內容；API 目錄已經接通後端管理。
          </div>

          <ul className="space-y-2">
            {skills.map((skill) => (
              <li
                key={skill.id}
                className="rounded-lg border border-border bg-surface px-4 py-3.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
                      skill.status === "自家"
                        ? "bg-lime-soft text-lime-text"
                        : skill.status === "優先名單"
                          ? "bg-card text-warning"
                          : "bg-card text-text-secondary"
                    )}
                  >
                    {skill.status}
                  </span>
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                  {skill.url ? (
                    <a
                      href={skill.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-lime-text hover:underline"
                    >
                      來源
                      <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-medium text-text-primary">{skill.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {skill.value}
                </p>
                <p className="mt-2 font-mono text-[11px] text-text-muted">
                  {skill.install}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-center">
            <Link
              to="/skills"
              className="press inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
            >
              <Puzzle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              睇公開目錄頁
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

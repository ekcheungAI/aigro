import { Link } from "react-router-dom";
import { ArrowUpRight, FlaskConical } from "lucide-react";

/**
 * Admin 專家工作室 — 素材上傳 / Prompt 編輯 / 測試對話。
 *
 * 呢啲功能需要 Supabase Storage + distillation pipeline 先可以運作,
 * 後端未就位之前唔會顯示任何虛構嘅素材、資源或測試結果。
 */
export default function AdminStudio() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Studio
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          專家工作室
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          知識庫素材、Prompt 同測試工具嘅控制台。
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft">
          <FlaskConical className="h-5 w-5 text-lime-text" />
        </span>
        <p className="mt-4 font-display text-[18px] font-medium text-text-primary">
          即將推出 — 需要 Supabase Storage + distillation pipeline
        </p>
        <p className="mx-auto mt-2 max-w-[460px] text-xs leading-relaxed text-text-muted">
          工作室依賴三個未就位嘅後端:素材檔案儲存(Storage buckets)、
          知識庫切塊 / 重新蒸餾管道,同專家測試對話沙盒。
          喺呢啲接入之前,呢度唔會顯示任何示範素材或假測試結果。
        </p>

        <div className="mx-auto mt-6 grid max-w-[520px] gap-2 text-left sm:grid-cols-3">
          {[
            { title: "素材上傳", desc: "Storage buckets 未開通" },
            { title: "Prompt 編輯", desc: "需要 experts 後端表" },
            { title: "測試對話", desc: "需要蒸餾 pipeline" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-md border border-border bg-card px-3.5 py-3"
            >
              <p className="text-sm font-medium text-text-primary">{f.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                {f.desc}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                即將推出
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/admin/experts"
            className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
          >
            去專家管理
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
          >
            睇整合進度
          </Link>
        </div>
      </div>
    </div>
  );
}

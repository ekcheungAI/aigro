import { Link } from "react-router-dom";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import { usePortalExpert } from "@/components/portal/PortalLayout";

/**
 * PortalKB `/portal/kb` — 分身知識庫。
 *
 * 素材上傳、切塊、蒸餾同 Prompt 版本管理需要
 * Supabase Storage + distillation pipeline 先可以運作。
 * 後端未就位之前,呢度唔會顯示任何虛構嘅素材、片段數或版本歷史。
 */
export default function PortalKB() {
  const { slug, expert } = usePortalExpert();
  const firstName = expert?.nameEn.split(" ")[0] ?? slug;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Knowledge Base
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          分身知識庫
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {firstName} 嘅 AI 分身嘅知識來源同蒸餾狀態。
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft">
          <FlaskConical className="h-5 w-5 text-lime-text" />
        </span>
        <p className="mt-4 font-display text-[18px] font-medium text-text-primary">
          Distillation pipeline 即將推出
        </p>
        <p className="mx-auto mt-2 max-w-[460px] text-xs leading-relaxed text-text-muted">
          知識庫需要三個未就位嘅後端:素材檔案儲存(Supabase Storage)、
          切塊 / embedding 入庫管道,同 Prompt 版本審批流程。
          喺呢啲接入之前,呢度唔會顯示任何示範素材或虛構嘅片段數。
        </p>

        <div className="mx-auto mt-6 grid max-w-[520px] gap-2 text-left sm:grid-cols-3">
          {[
            { title: "素材上傳", desc: "Storage buckets 未開通" },
            { title: "蒸餾管道", desc: "切塊 + embedding 未接" },
            { title: "版本管理", desc: "需要 prompt 版本後端" },
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

        <p className="mt-6 font-mono text-[11px] text-text-muted">
          而家分身使用嘅 Prompt:{expert?.promptVersion ?? "未入檔"}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/portal"
            className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
          >
            返去總覽
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            to="/portal/socials"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
          >
            記低社交 handle(語料準備)
          </Link>
        </div>
      </div>
    </div>
  );
}

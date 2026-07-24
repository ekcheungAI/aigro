import { useMemo, useState } from "react";
import { BookPlus, Download, Flag } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import { conversations, dashboardKpis } from "@/data/admin-mock";
import type { Conversation } from "@/data/admin-mock";

type Filter = "全部" | "低信心" | "已標記";
const FILTERS: Filter[] = ["全部", "低信心", "已標記"];

const LOW_CONFIDENCE = 0.6;

function confidenceColor(c: number) {
  if (c < LOW_CONFIDENCE) return "text-[#A36A0F]";
  if (c < 0.8) return "text-text-secondary";
  return "text-lime-text";
}

export default function AdminEngagement() {
  const toast = useAdminToast();
  const [filter, setFilter] = useState<Filter>("全部");
  const [list, setList] = useState<Conversation[]>(conversations);
  const [openId, setOpenId] = useState<string | null>(null);

  const active = list.find((c) => c.id === openId) ?? null;

  const filtered = useMemo(() => {
    if (filter === "低信心") return list.filter((c) => c.confidenceAvg < LOW_CONFIDENCE);
    if (filter === "已標記") return list.filter((c) => c.flagged);
    return list;
  }, [list, filter]);

  const lowCount = list.filter((c) => c.confidenceAvg < LOW_CONFIDENCE).length;
  const avgConfidence =
    list.reduce((s, c) => s + c.confidenceAvg, 0) / list.length;

  const toggleFlag = (id: string) => {
    setList((l) => l.map((c) => (c.id === id ? { ...c, flagged: !c.flagged } : c)));
    const item = list.find((c) => c.id === id);
    toast(item?.flagged ? "已取消標記" : `已標記 ${item?.anonId ?? ""} 待跟進`);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Engagement
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          對話參與
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          訪客與 AI 分身嘅對話質量監察 — 低信心對話可轉化為知識庫素材。
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">今日對話</p>
          <p className="mt-1.5 font-mono text-2xl font-medium text-text-primary">
            {dashboardKpis.todayChats}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">平均信心</p>
          <p className="mt-1.5 font-mono text-2xl font-medium text-lime-text">
            {avgConfidence.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">低信心率</p>
          <p className="mt-1.5 font-mono text-2xl font-medium text-[#A36A0F]">
            {Math.round((lowCount / list.length) * 100)}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === f
                ? "border-lime bg-lime text-on-accent"
                : "border-border bg-surface text-text-secondary hover:border-border-strong"
            )}
          >
            {f}
            {f === "低信心" && (
              <span className="ml-1 font-mono">{lowCount}</span>
            )}
            {f === "已標記" && (
              <span className="ml-1 font-mono">
                {list.filter((c) => c.flagged).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted">
              <th className="px-4 py-3 font-medium">訪客</th>
              <th className="px-4 py-3 font-medium">分身</th>
              <th className="px-4 py-3 font-medium">首條問題</th>
              <th className="px-4 py-3 font-medium">日期</th>
              <th className="px-4 py-3 text-right font-medium">訊息數</th>
              <th className="px-4 py-3 text-right font-medium">信心</th>
              <th className="px-4 py-3 text-right font-medium">標記</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => setOpenId(c.id)}
                className="cursor-pointer transition-colors hover:bg-card/60"
              >
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                  {c.anonId}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-text-primary">
                  {c.persona}
                </td>
                <td className="max-w-[280px] truncate px-4 py-3 text-text-secondary">
                  {c.firstQuestion}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">
                  {c.date}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary">
                  {c.messageCount}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono text-xs font-medium",
                    confidenceColor(c.confidenceAvg)
                  )}
                >
                  {c.confidenceAvg.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    aria-label={c.flagged ? "取消標記" : "標記跟進"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlag(c.id);
                    }}
                    className={cn(
                      "rounded-md border p-1.5 transition-colors",
                      c.flagged
                        ? "border-lime bg-lime-soft text-lime-text"
                        : "border-border text-text-muted hover:border-border-strong"
                    )}
                  >
                    <Flag className={cn("h-3.5 w-3.5", c.flagged && "fill-current")} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-text-muted">
                  此篩選下暫無對話。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail slide-over */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active ? `對話 ${active.anonId}` : ""}
        subtitle={
          active
            ? `${active.persona} · ${active.date} · ${active.messageCount} 則訊息 · 平均信心 ${active.confidenceAvg.toFixed(2)}`
            : ""
        }
      >
        {active && (
          <div className="flex h-full flex-col">
            {/* Thread */}
            <div className="flex-1 space-y-3 px-6 py-5">
              {active.messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "border border-border bg-card text-text-primary"
                        : "bg-lime-soft text-text-primary"
                    )}
                  >
                    <p>{m.text}</p>
                    <p className="mt-1.5 text-right font-mono text-[10px] text-text-muted">
                      {m.role === "user" ? "訪客" : active.persona} · {m.time}
                    </p>
                  </div>
                </div>
              ))}
              {active.confidenceAvg < LOW_CONFIDENCE && (
                <p className="rounded-md border border-dashed border-[#A36A0F]/50 bg-card px-3 py-2.5 text-xs leading-relaxed text-[#A36A0F]">
                  此對話平均信心低於 0.6 — 建議跟進:補充知識庫素材或轉介真人專家。
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 border-t border-border px-6 py-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleFlag(active.id)}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    active.flagged
                      ? "border-lime bg-lime-soft text-lime-text"
                      : "border-border text-text-secondary hover:border-border-strong"
                  )}
                >
                  <Flag className={cn("h-4 w-4", active.flagged && "fill-current")} />
                  {active.flagged ? "已標記跟進" : "標記跟進"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toast(`已匯出對話 ${active.anonId}(JSON · mock)`)
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:border-border-strong"
                >
                  <Download className="h-4 w-4" />
                  匯出
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast(
                    `已加入 ${
                      active.expertSlug === "elvin-cheung"
                        ? "Elvin"
                        : active.expertSlug === "jimmy-lau"
                          ? "Jimmy"
                          : "平台編輯部"
                    } 知識庫待審核`
                  )
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-3 py-2 text-sm font-medium text-on-accent hover:bg-lime-hover"
              >
                <BookPlus className="h-4 w-4" />
                將此 Q&A 加入知識庫
              </button>
            </div>
          </div>
        )}
      </AdminSlideOver>
    </div>
  );
}

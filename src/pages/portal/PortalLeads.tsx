import { useMemo, useState } from "react";
import {
  CheckCircle2,
  MessageSquareText,
  Sparkles,
  StickyNote,
  Target,
} from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { cn } from "@/lib/utils";
import { crmLeads } from "@/data/admin-mock";
import type { CrmLead, CrmSignal } from "@/data/admin-mock";
import { personaNameForSlug } from "@/data/portal-mock";

/** 高意向訊號(評分邏輯:導入/預約/價錢 = 高,課程 = 中,閒聊 = 低) */
const HIGH_SIGNALS: CrmSignal[] = ["問公司導入", "問預約", "問價錢"];

function isHigh(score: number) {
  return score >= 70;
}

function signalChipClass(s: CrmSignal) {
  if (HIGH_SIGNALS.includes(s)) return "bg-lime-soft text-lime-text";
  return "bg-card text-text-secondary";
}

function typeChipClass(t: CrmLead["type"]) {
  if (t === "進階會員") return "bg-lime text-on-accent";
  if (t === "免費會員") return "bg-lime-soft text-lime-text";
  return "bg-card text-text-secondary";
}

function stageChipClass(stage: CrmLead["stage"], followedUp: boolean) {
  if (followedUp || stage === "已轉化") return "bg-lime-soft text-lime-text";
  if (stage === "跟進中") return "bg-card text-[#A36A0F]";
  return "bg-card text-text-secondary";
}

/**
 * PortalLeads `/portal/leads` — 我的線索(scoped CRM)。
 * 只顯示同「我」嘅分身傾過偈嘅線索;read-focused,
 * 動作限於「記低跟進」+「標記已跟進」(轉化由 admin 負責)。
 */
export default function PortalLeads() {
  const { slug, expert } = usePortalExpert();
  const toast = useAdminToast();
  const persona = personaNameForSlug(slug);
  const firstName = expert.nameEn.split(" ")[0] ?? expert.nameEn;

  /** 本人分身嘅線索,按評分排序 */
  const [list, setList] = useState<CrmLead[]>(() =>
    crmLeads
      .filter((l) => l.persona === persona)
      .sort((a, b) => b.score - a.score)
  );
  /** 專家已標記跟進嘅 lead id(示範模式本地 state) */
  const [followedUp, setFollowedUp] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const active = list.find((l) => l.id === openId) ?? null;

  const kpis = useMemo(() => {
    return {
      total: list.length,
      high: list.filter((l) => isHigh(l.score)).length,
      following: list.filter((l) => l.stage === "跟進中").length,
      done: followedUp.size,
    };
  }, [list, followedUp]);

  const leadLabel = (l: CrmLead) => l.name ?? l.anonId;

  const markFollowedUp = (lead: CrmLead) => {
    setFollowedUp((s) => new Set(s).add(lead.id));
    setList((ls) =>
      ls.map((x) =>
        x.id === lead.id
          ? {
              ...x,
              timeline: [
                ...x.timeline,
                { date: "今日", label: `${firstName} 已標記跟進` },
              ],
            }
          : x
      )
    );
    toast(`已標記 ${leadLabel(lead)} 為已跟進`);
  };

  const addNote = () => {
    if (!active || !note.trim()) return;
    const text = note.trim();
    setList((ls) =>
      ls.map((x) =>
        x.id === active.id
          ? {
              ...x,
              timeline: [
                ...x.timeline,
                { date: "今日", label: `專家跟進備註 — ${text}` },
              ],
            }
          : x
      )
    );
    setNote("");
    toast("已記低跟進備註");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          My Leads
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          我的線索
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          同你嘅分身傾過偈嘅訪客同會員 — 評分由問題內容推算;轉化同發信由平台團隊負責。
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {[
          { label: "分身線索", value: kpis.total },
          { label: "高意向(70+)", value: kpis.high },
          { label: "跟進中", value: kpis.following },
          { label: "我已跟進", value: kpis.done },
        ].map((k) => (
          <div key={k.label} className="bg-surface px-5 py-4">
            <p className="text-xs text-text-muted">{k.label}</p>
            <p className="mt-1.5 font-mono text-[26px] font-semibold leading-none text-text-primary">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <section className="rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="px-4 py-3 font-medium">線索</th>
                <th className="px-4 py-3 font-medium">類型</th>
                <th className="px-4 py-3 font-medium">評分</th>
                <th className="px-4 py-3 font-medium">訊號</th>
                <th className="px-4 py-3 font-medium">最近活動</th>
                <th className="px-4 py-3 text-right font-medium">階段</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((l) => {
                const done = followedUp.has(l.id);
                return (
                  <tr
                    key={l.id}
                    onClick={() => {
                      setOpenId(l.id);
                      setNote("");
                    }}
                    className="cursor-pointer transition-colors hover:bg-card/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">
                        {l.name ?? "訪客"}
                        <span className="ml-1.5 font-mono text-xs text-text-muted">
                          {l.anonId}
                        </span>
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-sm px-2 py-0.5 text-xs font-medium",
                          typeChipClass(l.type)
                        )}
                      >
                        {l.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-mono text-sm font-semibold",
                          isHigh(l.score) ? "text-lime-text" : "text-text-primary"
                        )}
                      >
                        {l.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {l.signals.map((s) => (
                          <span
                            key={s}
                            className={cn(
                              "rounded-sm px-1.5 py-0.5 text-[11px]",
                              signalChipClass(s)
                            )}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {l.lastActivity}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "rounded-sm px-2 py-0.5 text-xs font-medium",
                          stageChipClass(l.stage, done)
                        )}
                      >
                        {done ? "已跟進" : l.stage}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-text-muted"
                  >
                    暫時未有線索同你嘅分身對話。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail slide-over */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active ? (active.name ?? "訪客") : undefined}
        subtitle={
          active
            ? `${active.anonId} · ${active.type} · 評分 ${active.score}`
            : undefined
        }
        width={520}
      >
        {active && (
          <div className="space-y-6 px-6 py-5">
            {/* 問題列表 */}
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                <MessageSquareText className="h-3.5 w-3.5" />
                問過嘅問題({active.questions.length})
              </p>
              <ul className="mt-2.5 space-y-2">
                {active.questions.map((q, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-border bg-card/50 px-3.5 py-2.5"
                  >
                    <p className="text-sm leading-relaxed text-text-primary">
                      {q.text}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-text-muted">
                      {q.date} · {q.persona}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* 意向分析 */}
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                <Sparkles className="h-3.5 w-3.5" />
                意向分析
              </p>
              <div className="mt-2.5 rounded-md border border-border bg-surface px-4 py-3.5">
                <ul className="space-y-1.5">
                  {active.analysis.detected.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-2 text-xs text-text-secondary"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime" />
                      {d}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-border pt-2.5 text-xs font-medium leading-relaxed text-lime-text">
                  {active.analysis.angle}
                </p>
              </div>
            </div>

            {/* 跟進時間線 */}
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                <Target className="h-3.5 w-3.5" />
                跟進時間線
              </p>
              <ol className="mt-2.5 space-y-0">
                {active.timeline.map((t, i) => (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < active.timeline.length - 1 && (
                      <span className="absolute left-[3px] top-3 h-full w-px bg-border" />
                    )}
                    <span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-border-strong" />
                    <div>
                      <p className="text-xs leading-relaxed text-text-primary">
                        {t.label}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                        {t.date}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* 記低跟進 */}
            <div className="rounded-md border border-border bg-card/50 px-4 py-4">
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                <StickyNote className="h-3.5 w-3.5" />
                記低跟進
              </p>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例:佢哋 20 人團隊,下星期想約 15 分鐘快傾…"
                className="mt-2.5 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-lime"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={addNote}
                  disabled={note.trim() === ""}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    note.trim() === ""
                      ? "cursor-not-allowed bg-card text-text-muted"
                      : "bg-lime text-on-accent hover:bg-lime-hover"
                  )}
                >
                  <StickyNote className="h-4 w-4" />
                  記低跟進
                </button>
                <button
                  type="button"
                  onClick={() => markFollowedUp(active)}
                  disabled={followedUp.has(active.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                    followedUp.has(active.id)
                      ? "cursor-not-allowed border-border text-text-muted"
                      : "border-border text-text-secondary hover:border-lime hover:text-lime-text"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {followedUp.has(active.id) ? "已跟進" : "標記已跟進"}
                </button>
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-text-muted">
                發信同轉化由平台團隊跟進 — 你嘅備註會即時同步俾佢哋(mock)。
              </p>
            </div>
          </div>
        )}
      </AdminSlideOver>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Mail,
  MessagesSquare,
  Send,
  Sparkles,
  StickyNote,
  User,
} from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import { crmKpis, crmLeads } from "@/data/admin-mock";
import type { CrmLead, CrmSignal, CrmStage } from "@/data/admin-mock";

type StageFilter = "全部" | CrmStage;

const STAGES: { key: CrmStage; en: string }[] = [
  { key: "新線索", en: "New" },
  { key: "已接觸", en: "Contacted" },
  { key: "跟進中", en: "Following" },
  { key: "已轉化", en: "Converted" },
];

/** 高意向訊號(評分邏輯:導入/預約/價錢 = 高,課程 = 中,閒聊 = 低) */
const HIGH_SIGNALS: CrmSignal[] = ["問公司導入", "問預約", "問價錢"];

function isHigh(score: number) {
  return score >= 70;
}

function signalChipClass(s: CrmSignal) {
  if (HIGH_SIGNALS.includes(s)) return "bg-lime-soft text-lime-text border-lime/40";
  if (s === "閒聊") return "bg-card text-text-muted border-border";
  return "bg-card text-text-secondary border-border";
}

function typeChipClass(t: CrmLead["type"]) {
  if (t === "進階會員") return "bg-lime text-on-accent";
  if (t === "免費會員") return "bg-lime-soft text-lime-text";
  return "bg-card text-text-secondary";
}

/** 意向評分錶盤 — 大 mono 數字 + hairline 圓環 */
function ScoreDial({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <span className="relative inline-block h-14 w-14 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="1.5" className="stroke-border" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className={isHigh(score) ? "stroke-lime" : "stroke-border-strong"}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono text-base font-medium",
          isHigh(score) ? "text-lime-text" : "text-text-primary"
        )}
      >
        {score}
      </span>
    </span>
  );
}

/** 跟進 Email 編輯器(示範模式)— 按 key=lead.id 重置預填內容 */
function EmailComposer({
  lead,
  onSend,
  onCancel,
}: {
  lead: CrmLead;
  onSend: () => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(lead.emailDraft.subject);
  const [body, setBody] = useState(lead.emailDraft.body);
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 px-6 py-5">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
            收件人
          </label>
          <p className="mt-1 text-sm text-text-primary">
            {lead.name ?? lead.anonId}
            {lead.member && (
              <span className="ml-2 font-mono text-xs text-text-muted">
                {lead.member.email}
              </span>
            )}
          </p>
        </div>
        <div>
          <label
            htmlFor="email-subject"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            主旨
          </label>
          <input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-lime"
          />
        </div>
        <div>
          <label
            htmlFor="email-body"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            內容(按 {lead.persona} 語氣預填)
          </label>
          <textarea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            className="mt-1.5 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-text-primary outline-none transition-colors focus:border-lime"
          />
        </div>
      </div>
      <div className="flex gap-2 border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={onSend}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-lime px-3 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <Send className="h-4 w-4" />
          發送
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
        >
          取消
        </button>
      </div>
    </div>
  );
}

export default function AdminCRM() {
  const toast = useAdminToast();
  const [list, setList] = useState<CrmLead[]>(crmLeads);
  const [stageFilter, setStageFilter] = useState<StageFilter>("全部");
  const [openId, setOpenId] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [note, setNote] = useState("");

  const active = list.find((l) => l.id === openId) ?? null;

  const filtered = useMemo(
    () => (stageFilter === "全部" ? list : list.filter((l) => l.stage === stageFilter)),
    [list, stageFilter]
  );

  const stageCount = (s: CrmStage) => list.filter((l) => l.stage === s).length;

  /** 建議跟進 queue — 未接觸線索按評分排序,取 top 5 */
  const followUpQueue = useMemo(
    () =>
      list
        .filter((l) => l.stage === "新線索")
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    [list]
  );

  const leadLabel = (l: CrmLead) => l.name ?? l.anonId;

  const moveStage = (lead: CrmLead, stage: CrmStage) => {
    setList((ls) =>
      ls.map((x) =>
        x.id === lead.id
          ? {
              ...x,
              stage,
              timeline: [
                ...x.timeline,
                { date: "今日", label: `階段更新 — 移至${stage}` },
              ],
            }
          : x
      )
    );
    toast(`已將 ${leadLabel(lead)} 移至「${stage}」`);
  };

  const acceptSuggestion = (lead: CrmLead) => {
    setList((ls) =>
      ls.map((x) =>
        x.id === lead.id
          ? {
              ...x,
              stage: "已接觸",
              timeline: [
                ...x.timeline,
                { date: "今日", label: "接受建議跟進 — 移至已接觸" },
              ],
            }
          : x
      )
    );
    toast(`已接受建議 — ${leadLabel(lead)} 移至已接觸`);
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
                { date: "今日", label: `跟進備註 — ${text}` },
              ],
            }
          : x
      )
    );
    setNote("");
    toast("已記低跟進備註");
  };

  const sendEmail = () => {
    if (!active) return;
    setList((ls) =>
      ls.map((x) =>
        x.id === active.id
          ? {
              ...x,
              timeline: [
                ...x.timeline,
                { date: "今日", label: "發出跟進 email(示範模式)" },
              ],
            }
          : x
      )
    );
    setEmailOpen(false);
    toast("已記錄(示範模式)");
  };

  const kpis = [
    { label: "總線索", value: crmKpis.total, lime: false },
    { label: "高意向", value: crmKpis.highIntent, lime: true },
    { label: "本週新增", value: crmKpis.newThisWeek, lime: false },
    { label: "跟進中", value: crmKpis.following, lime: false },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          CRM
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          線索管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          每個同分身傾過計嘅訪客都係線索 — 由問題訊號評分,驅動第二階段跟進。
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">{k.label}</p>
            <p
              className={cn(
                "mt-1.5 font-mono text-2xl font-medium",
                k.lime ? "text-lime-text" : "text-text-primary"
              )}
            >
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline stage tabs */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStageFilter("全部")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
            stageFilter === "全部"
              ? "border-lime bg-lime text-on-accent"
              : "border-border bg-surface text-text-secondary hover:border-border-strong"
          )}
        >
          全部
          <span className="ml-1 font-mono">{list.length}</span>
        </button>
        {STAGES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStageFilter(s.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              stageFilter === s.key
                ? "border-lime bg-lime text-on-accent"
                : "border-border bg-surface text-text-secondary hover:border-border-strong"
            )}
          >
            {s.key} {s.en}
            <span className="ml-1 font-mono">{stageCount(s.key)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Leads table */}
        <div className="overflow-x-auto rounded-lg border border-border bg-surface lg:col-span-2">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">類型</th>
                <th className="px-4 py-3 font-medium">接觸分身</th>
                <th className="px-4 py-3 font-medium">意向評分</th>
                <th className="px-4 py-3 font-medium">關鍵訊號</th>
                <th className="px-4 py-3 font-medium">最近活動</th>
                <th className="px-4 py-3 font-medium">階段</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setOpenId(l.id)}
                  className="cursor-pointer transition-colors hover:bg-card/60"
                >
                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap text-sm font-medium text-text-primary">
                      {leadLabel(l)}
                    </p>
                    {l.name && (
                      <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                        {l.member?.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
                        typeChipClass(l.type)
                      )}
                    >
                      {l.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                    {l.persona}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-14 rounded-full bg-card">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            isHigh(l.score) ? "bg-lime" : "bg-border-strong"
                          )}
                          style={{ width: `${l.score}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "font-mono text-xs font-medium",
                          isHigh(l.score) ? "text-lime-text" : "text-text-secondary"
                        )}
                      >
                        {l.score}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[180px] flex-wrap gap-1">
                      {l.signals.map((s) => (
                        <span
                          key={s}
                          className={cn(
                            "inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px]",
                            signalChipClass(s)
                          )}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">
                    {l.lastActivity}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block whitespace-nowrap rounded-md border border-border border-l-2 border-l-lime bg-card px-2 py-1 text-xs text-text-primary">
                      {l.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`開啟 ${leadLabel(l)} 詳情`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(l.id);
                      }}
                      className="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-lime hover:text-lime-text"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-text-muted">
                    此階段暫無線索。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-2.5 font-mono text-[11px] text-text-muted">
            顯示樣本 {list.length} 個線索 · 全站 {crmKpis.total} 個(mock)
          </p>
        </div>

        {/* 建議跟進 — 第二階段 follow-up queue */}
        <section className="h-fit rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-lime-text" />
            <h2 className="font-display text-[16px] font-medium text-text-primary">
              建議跟進
            </h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            未接觸嘅高分線索,按意向評分排序。
          </p>
          <div className="mt-4 space-y-3">
            {followUpQueue.map((l) => (
              <div
                key={l.id}
                className="rounded-md border border-border border-l-2 border-l-lime bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(l.id)}
                    className="truncate text-sm font-medium text-text-primary hover:text-lime-text"
                  >
                    {leadLabel(l)}
                  </button>
                  <span
                    className={cn(
                      "font-mono text-xs font-medium",
                      isHigh(l.score) ? "text-lime-text" : "text-text-secondary"
                    )}
                  >
                    {l.score}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-text-muted">
                  {l.persona} · {l.lastActivity}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                  {l.suggestedAction}
                </p>
                <button
                  type="button"
                  onClick={() => acceptSuggestion(l)}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-2.5 py-1.5 text-xs font-medium text-on-accent transition-colors hover:bg-lime-hover"
                >
                  接受建議
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
            {followUpQueue.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
                所有高分線索都已接觸,做得好。
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Lead detail slide-over */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => {
          setOpenId(null);
          setNote("");
        }}
        title={
          active ? (
            <span className="flex items-center gap-4">
              <ScoreDial score={active.score} />
              <span>
                <span className="block">{leadLabel(active)}</span>
                <span className="mt-0.5 block text-xs font-normal text-text-muted">
                  {active.name ? `${active.anonId} · ` : ""}
                  {active.type} · {active.persona}
                </span>
              </span>
            </span>
          ) : (
            ""
          )
        }
      >
        {active && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-6 px-6 py-5">
              {/* 佢問過咩 */}
              <section>
                <div className="flex items-center gap-2">
                  <MessagesSquare className="h-4 w-4 text-lime-text" />
                  <h3 className="font-display text-[15px] font-medium text-text-primary">
                    佢問過咩
                  </h3>
                </div>
                <ul className="mt-3 space-y-2">
                  {active.questions.map((q, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-border bg-card px-3 py-2.5"
                    >
                      <p className="text-sm leading-relaxed text-text-primary">
                        「{q.text}」
                      </p>
                      <p className="mt-1.5 font-mono text-[10px] text-text-muted">
                        {q.persona} · {q.date}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 意向分析 */}
              <section className="rounded-lg border border-border border-l-2 border-l-lime bg-card p-4">
                <h3 className="font-display text-[15px] font-medium text-text-primary">
                  意向分析
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {active.signals.map((s) => (
                    <span
                      key={s}
                      className={cn(
                        "inline-block rounded-full border px-2 py-0.5 text-[11px]",
                        signalChipClass(s)
                      )}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <ul className="mt-3 space-y-1">
                  {active.analysis.detected.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime" />
                      {d}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-lime-text">
                  {active.analysis.angle}
                </p>
              </section>

              {/* 會員資料 */}
              {active.member && (
                <section>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-lime-text" />
                    <h3 className="font-display text-[15px] font-medium text-text-primary">
                      會員資料
                    </h3>
                  </div>
                  <dl className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <dt className="text-xs text-text-muted">Email</dt>
                      <dd className="font-mono text-xs text-text-primary">
                        {active.member.email}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <dt className="text-xs text-text-muted">層級</dt>
                      <dd className="text-xs font-medium text-text-primary">
                        {active.member.tier}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <dt className="text-xs text-text-muted">加入日</dt>
                      <dd className="font-mono text-xs text-text-primary">
                        {active.member.joinedAt}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <dt className="text-xs text-text-muted">MCP 興趣</dt>
                      <dd className="flex flex-wrap justify-end gap-1">
                        {active.member.mcpInterests.length > 0 ? (
                          active.member.mcpInterests.map((m) => (
                            <span
                              key={m}
                              className="rounded-full bg-lime-soft px-2 py-0.5 text-[11px] text-lime-text"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>
              )}

              {/* 跟進時間線 */}
              <section>
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-lime-text" />
                  <h3 className="font-display text-[15px] font-medium text-text-primary">
                    跟進時間線
                  </h3>
                </div>
                <ol className="mt-3 space-y-0">
                  {active.timeline.map((t, i) => (
                    <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < active.timeline.length - 1 && (
                        <span className="absolute left-[3.5px] top-3 h-full w-px bg-border" />
                      )}
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          i === active.timeline.length - 1 ? "bg-lime" : "bg-border-strong"
                        )}
                      />
                      <div>
                        <p className="text-xs leading-relaxed text-text-primary">{t.label}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-text-muted">{t.date}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex gap-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addNote();
                    }}
                    placeholder="記低跟進…"
                    className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-lime"
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={!note.trim()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong disabled:opacity-40"
                  >
                    記低跟進
                  </button>
                </div>
              </section>
            </div>

            {/* Stage actions */}
            <div className="space-y-2 border-t border-border px-6 py-4">
              <div className="grid grid-cols-3 gap-2">
                {STAGES.filter((s) => s.key !== active.stage && s.key !== "新線索").map(
                  (s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => moveStage(active, s.key)}
                      className={cn(
                        "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                        s.key === "已轉化"
                          ? "border-lime bg-lime-soft text-lime-text hover:bg-lime hover:text-on-accent"
                          : "border-border text-text-secondary hover:border-border-strong"
                      )}
                    >
                      {s.key === "已轉化" ? "標記已轉化" : `移至${s.key}`}
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={() => setEmailOpen(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-3 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
              >
                <Mail className="h-4 w-4" />
                發送跟進 Email
              </button>
            </div>
          </div>
        )}
      </AdminSlideOver>

      {/* Email template drawer */}
      <AdminSlideOver
        open={emailOpen && active !== null}
        onClose={() => setEmailOpen(false)}
        title="跟進 Email"
        subtitle={active ? `${leadLabel(active)} · 按 ${active.persona} 語氣預填` : ""}
      >
        {active && (
          <EmailComposer
            key={active.id}
            lead={active}
            onSend={sendEmail}
            onCancel={() => setEmailOpen(false)}
          />
        )}
      </AdminSlideOver>
    </div>
  );
}

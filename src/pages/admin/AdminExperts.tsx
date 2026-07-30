import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, Save, Target, X } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import VerifiedBadge from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { experts, expertFullName } from "@/data/experts";
import type { Expert, RadarDimension } from "@/data/experts";
import {
  daysAgoUtcStartIso,
  formatDate,
  personaLabel,
  timeAgo,
  useAdminQuery,
  utcDayKey,
} from "@/components/admin/adminData";
import type {
  AdminConversationRow,
  AdminLeadRow,
} from "@/components/admin/adminData";
import {
  loadDraftExperts,
  persistDraftExperts,
  slugifyExpertName,
  uniqueExpertSlug,
} from "@/components/admin/draftExperts";
import type { DraftExpertInput } from "@/components/admin/draftExperts";

type EditorTab = "基本資料" | "風格與原則" | "知識庫" | "數據 Data" | "線索 CRM" | "活動 Activity" | "發佈";
const TABS: EditorTab[] = ["基本資料", "風格與原則", "知識庫", "數據 Data", "線索 CRM", "活動 Activity", "發佈"];

interface ExpertDraft {
  nameEn: string;
  nameZh: string;
  title: string;
  bio: string;
  brandColor: string;
  verified: boolean;
  radar: RadarDimension[];
  traits: string[];
}

function toDraft(e: Expert): ExpertDraft {
  return {
    nameEn: e.nameEn,
    nameZh: e.nameZh,
    title: e.title,
    bio: e.bio ?? "",
    brandColor: e.brandColor ?? "#466A5E",
    verified: e.verified,
    radar: (e.radar ?? []).map((r) => ({ ...r })),
    traits: [...(e.traits ?? [])],
  };
}

/** 草稿 → Expert 形狀,直接混入表格/編輯器渲染(標明「草稿 — 未發佈」) */
function draftToExpert(d: DraftExpertInput): Expert {
  return {
    slug: d.slug,
    nameEn: d.name,
    nameZh: "",
    title: d.credential || "領航導師(草稿)",
    image: "",
    verified: false,
    specialties: d.specialties,
    quote: d.quote || undefined,
    brandColor: d.brandColor,
    credential: d.credential || undefined,
    kbUpdated: "—",
    promptVersion: "v0.1(草稿)",
    pendingNote:
      "草稿 — 未發佈,只存喺呢個瀏覽器(localStorage)。下一步:接 Supabase experts 後端 + 蒸餾 pipeline,審批通過先可以 Verified 上線。",
  };
}

/** brand color presets — 去飽和、金色禁用(同現有專家色同調) */
const BRAND_PRESETS = [
  { hex: "#466A5E", label: "霧綠" },
  { hex: "#8A5A44", label: "陶棕" },
  { hex: "#3E5A78", label: "灰藍" },
  { hex: "#5C5470", label: "紫灰" },
];

interface CreateForm {
  name: string;
  slug: string;
  slugTouched: boolean;
  credential: string;
  specialties: string[];
  brandColor: string;
  quote: string;
}

const EMPTY_CREATE: CreateForm = {
  name: "",
  slug: "",
  slugTouched: false,
  credential: "",
  specialties: [],
  brandColor: BRAND_PRESETS[0].hex,
  quote: "",
};

const FIELD =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none";

function Avatar({ expert }: { expert: Expert }) {
  if (expert.image) {
    return (
      <img
        src={expert.image}
        alt={expert.nameEn}
        className="h-9 w-9 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-border-strong bg-card font-mono text-[11px] text-text-muted">
      ?
    </span>
  );
}

/* ---------------- 專家 360 真數據(conversations + leads) ---------------- */

interface Expert360Data {
  conversations: AdminConversationRow[];
  leads: AdminLeadRow[];
}

async function fetchExpert360(): Promise<Expert360Data> {
  if (!supabase) throw new Error("Supabase 未連接");
  const [convRes, leadRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id,user_id,anon_id,persona,title,created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("leads")
      .select(
        "id,user_id,anon_id,persona,score,signals,stage,questions,analysis,timeline,last_activity_at,created_at"
      )
      .order("last_activity_at", { ascending: false })
      .limit(500),
  ]);
  if (convRes.error) throw new Error(convRes.error.message);
  if (leadRes.error) throw new Error(leadRes.error.message);
  return {
    conversations: (convRes.data ?? []) as AdminConversationRow[],
    leads: (leadRes.data ?? []) as AdminLeadRow[],
  };
}

/** 單一專家嘅 360 tabs 內容 — conversations/leads 以 persona = expert slug 過濾 */
function Expert360Tabs({
  expert,
  tab,
  closeEditor,
}: {
  expert: Expert;
  tab: EditorTab;
  closeEditor: () => void;
}) {
  const { data, loading, error, refetch } = useAdminQuery(fetchExpert360);

  const convos = useMemo(
    () => (data?.conversations ?? []).filter((c) => c.persona === expert.slug),
    [data, expert.slug]
  );
  const leads = useMemo(
    () => (data?.leads ?? []).filter((l) => l.persona === expert.slug),
    [data, expert.slug]
  );

  return (
    <QueryState
      loading={loading}
      error={error ? `載入失敗:${error}` : null}
      retry={refetch}
      skeletonRows={2}
    >
      {data && (
        <>
          {/* ---- 數據 Data ---- */}
          {tab === "數據 Data" && (
            <>
              {convos.length === 0 ? (
                <p className="rounded-md border border-dashed border-border-strong bg-card px-4 py-6 text-xs text-text-muted">
                  未有對話數據 — {personaLabel(expert.slug)}暫時未有人傾過偈,
                  有對話之後呢度會顯示總量、週趨勢同信心。
                </p>
              ) : (
                (() => {
                  const weekCount = convos.filter(
                    (c) => c.created_at && c.created_at >= daysAgoUtcStartIso(6)
                  ).length;
                  const days: { label: string; count: number }[] = [];
                  const weekday = ["日", "一", "二", "三", "四", "五", "六"];
                  for (let i = 6; i >= 0; i -= 1) {
                    const d = new Date();
                    d.setUTCHours(0, 0, 0, 0);
                    d.setUTCDate(d.getUTCDate() - i);
                    const key = d.toISOString().slice(0, 10);
                    days.push({
                      label: weekday[d.getUTCDay()],
                      count: convos.filter((c) => utcDayKey(c.created_at) === key).length,
                    });
                  }
                  const maxBar = Math.max(...days.map((d) => d.count), 1);
                  return (
                    <div>
                      <p className="mb-2 text-xs text-text-muted">分身對話(真數據)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-border bg-card px-3 py-2.5">
                          <p className="font-mono text-[16px] font-medium text-text-primary">
                            {convos.length}
                          </p>
                          <p className="mt-0.5 text-[11px] text-text-muted">總對話</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2.5">
                          <p className="font-mono text-[16px] font-medium text-text-primary">
                            {weekCount}
                          </p>
                          <p className="mt-0.5 text-[11px] text-text-muted">近 7 日</p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-md border border-border px-3 py-3">
                        <p className="mb-2 text-[11px] text-text-muted">近 7 日對話量</p>
                        <div className="flex h-20 items-end gap-1.5">
                          {days.map((d, i) => (
                            <div key={i} className="flex flex-1 flex-col items-center gap-1">
                              <span className="font-mono text-[10px] text-text-muted">
                                {d.count}
                              </span>
                              <div
                                className="w-full rounded-sm bg-lime"
                                style={{
                                  height: `${Math.max((d.count / maxBar) * 100, 8)}%`,
                                }}
                              />
                              <span className="text-[10px] text-text-muted">{d.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
                        投稿、知識庫規模同社交觸及指標需要蒸餾 pipeline +
                        社交同步後端,即將推出。
                      </p>
                    </div>
                  );
                })()
              )}
            </>
          )}

          {/* ---- 線索 CRM ---- */}
          {tab === "線索 CRM" && (
            <>
              {leads.length === 0 ? (
                <p className="rounded-md border border-dashed border-border-strong bg-card px-4 py-6 text-xs text-text-muted">
                  暫無屬於呢個分身嘅線索 — 分身對話出現高意圖訊號時,
                  leads 表會自動記低並喺呢度顯示。
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-muted">
                      {personaLabel(expert.slug)}相關線索
                      <span className="ml-1 font-mono text-lime-text">{leads.length}</span>
                    </p>
                    <Link
                      to="/admin/crm"
                      onClick={closeEditor}
                      className="inline-flex items-center gap-1 text-xs font-medium text-lime-text hover:underline"
                    >
                      前往 CRM
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {leads.map((l) => (
                      <li key={l.id} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                            {l.anon_id
                              ? `訪客 ${l.anon_id.slice(0, 8)}`
                              : `會員 ${l.user_id?.slice(0, 8) ?? "—"}`}
                          </p>
                          <span
                            className={cn(
                              "rounded-sm px-1.5 py-0.5 font-mono text-[11px]",
                              (l.score ?? 0) >= 70
                                ? "bg-lime-soft text-lime-text"
                                : (l.score ?? 0) >= 40
                                  ? "bg-card text-[#A36A0F]"
                                  : "bg-card text-text-muted"
                            )}
                          >
                            {l.score ?? 0}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-5 text-[11px] text-text-muted">
                          <span className="rounded-sm bg-card px-1.5 py-0.5">{l.stage}</span>
                          <span className="font-mono">{timeAgo(l.last_activity_at)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {/* ---- 活動 Activity ---- */}
          {tab === "活動 Activity" && (
            <>
              {convos.length === 0 ? (
                <p className="rounded-md border border-dashed border-border-strong bg-card px-4 py-6 text-xs text-text-muted">
                  暫無互動記錄 — 訪客同呢個分身嘅對話會即時列喺呢度。
                </p>
              ) : (
                <div>
                  <p className="mb-2 text-xs text-text-muted">
                    最近對話(conversations 表即時)
                  </p>
                  <ol className="relative space-y-0 border-l border-border pl-4">
                    {convos.slice(0, 10).map((c) => (
                      <li key={c.id} className="relative pb-4 last:pb-0">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-lime" />
                        <p className="font-mono text-[11px] text-text-muted">
                          {timeAgo(c.created_at)} · {formatDate(c.created_at)}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                          {c.title?.trim() || "未命名對話"}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </>
      )}
    </QueryState>
  );
}

export default function AdminExperts() {
  const toast = useAdminToast();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>("基本資料");
  const [draft, setDraft] = useState<ExpertDraft | null>(null);
  const [newTrait, setNewTrait] = useState("");

  /* 新增導師草稿 — localStorage 持久化,標明「草稿 — 未發佈」 */
  const [drafts, setDrafts] = useState<DraftExpertInput[]>(() =>
    loadDraftExperts()
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
  const [newSpecialty, setNewSpecialty] = useState("");

  const draftExperts = drafts.map(draftToExpert);
  const allExperts = [...experts, ...draftExperts];
  const draftSlugs = new Set(drafts.map((d) => d.slug));

  const expert = allExperts.find((e) => e.slug === openSlug) ?? null;
  const expertIsDraft = expert !== null && draftSlugs.has(expert.slug);

  const openEditor = (e: Expert, initialTab: EditorTab = "基本資料") => {
    setOpenSlug(e.slug);
    setDraft(toDraft(e));
    setTab(initialTab);
    setNewTrait("");
  };

  const closeEditor = () => {
    setOpenSlug(null);
    setDraft(null);
  };

  const patch = (p: Partial<ExpertDraft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const patchForm = (p: Partial<CreateForm>) =>
    setForm((f) => ({ ...f, ...p }));

  const openCreate = () => {
    setForm(EMPTY_CREATE);
    setNewSpecialty("");
    setCreateOpen(true);
  };

  const saveCreate = () => {
    const name = form.name.trim();
    if (!name) {
      toast("請填寫導師姓名");
      return;
    }
    const taken = [...experts.map((e) => e.slug), ...drafts.map((d) => d.slug)];
    const base = slugifyExpertName(form.slug.trim() || name);
    const next: DraftExpertInput = {
      slug: uniqueExpertSlug(base, taken),
      name,
      credential: form.credential.trim(),
      specialties: form.specialties,
      brandColor: form.brandColor,
      quote: form.quote.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const nextDrafts = [...drafts, next];
    setDrafts(nextDrafts);
    persistDraftExperts(nextDrafts);
    setCreateOpen(false);
    toast("已建立草稿(未發佈,只存本機)— 下一步:接後端做蒸餾");
    openEditor(draftToExpert(next), "知識庫");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            Experts
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            專家管理
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            領航專家資料、風格檔案與知識庫蒸餾狀態 — 分身數據為 Supabase 即時查詢。
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <Plus className="h-4 w-4" />
          新增導師
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted">
              <th className="px-4 py-3 font-medium">專家</th>
              <th className="px-4 py-3 font-medium">領域</th>
              <th className="px-4 py-3 font-medium">狀態</th>
              <th className="px-4 py-3 font-medium">知識庫更新</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allExperts.map((e) => (
              <tr
                key={e.slug}
                onClick={() => openEditor(e)}
                className="cursor-pointer transition-colors hover:bg-card/60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar expert={e} />
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-text-primary">
                        {e.verified
                          ? expertFullName(e)
                          : draftSlugs.has(e.slug)
                            ? e.nameEn
                            : "領航專家席(待定)"}
                        {e.verified && <VerifiedBadge size={16} />}
                      </p>
                      <p className="mt-0.5 max-w-[280px] truncate text-xs text-text-muted">
                        {e.title}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {e.specialties.slice(0, 2).map((s) => (
                      <span
                        key={s}
                        className="rounded-sm bg-card px-1.5 py-0.5 text-[11px] text-text-secondary"
                      >
                        {s}
                      </span>
                    ))}
                    {e.specialties.length > 2 && (
                      <span className="rounded-sm bg-card px-1.5 py-0.5 text-[11px] text-text-muted">
                        +{e.specialties.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {e.verified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-lime-soft px-2 py-0.5 text-xs font-medium text-lime-text">
                      Verified
                    </span>
                  ) : draftSlugs.has(e.slug) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-[#A36A0F]/50 bg-card px-2 py-0.5 text-xs font-medium text-[#A36A0F]">
                      草稿 — 未發佈
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-card px-2 py-0.5 text-xs font-medium text-text-muted">
                      邀請中
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                  {e.kbUpdated ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openEditor(e);
                    }}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
                  >
                    編輯
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Editor slide-over */}
      <AdminSlideOver
        open={expert !== null && draft !== null}
        onClose={closeEditor}
        title={
          expert
            ? expert.verified
              ? expertFullName(expert)
              : expertIsDraft
                ? `${expert.nameEn}(草稿 — 未發佈)`
                : "領航專家席(草稿)"
            : ""
        }
        subtitle={
          expert?.credential ??
          (expertIsDraft
            ? "草稿 · 未發佈 — 只存本機,接後端先會上線"
            : "等待邀請確認 · 未完成領航認證")
        }
        width={560}
      >
        {expert && draft && (
          <div className="flex h-full flex-col">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-border px-6 py-3">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    tab === t
                      ? "bg-lime text-on-accent"
                      : "text-text-secondary hover:bg-card"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-5 px-6 py-5">
              {/* ---- 基本資料 ---- */}
              {tab === "基本資料" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs text-text-muted">英文名</span>
                      <input
                        className={FIELD}
                        value={draft.nameEn}
                        onChange={(e) => patch({ nameEn: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-text-muted">中文名</span>
                      <input
                        className={FIELD}
                        value={draft.nameZh}
                        onChange={(e) => patch({ nameZh: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-text-muted">職銜 Role</span>
                    <input
                      className={FIELD}
                      value={draft.title}
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-text-muted">簡介 Bio</span>
                    <textarea
                      className={cn(FIELD, "min-h-[140px] resize-y leading-relaxed")}
                      value={draft.bio}
                      placeholder="未填寫 — 完成領航認證後由編輯部整理"
                      onChange={(e) => patch({ bio: e.target.value })}
                    />
                  </label>
                  <div>
                    <span className="mb-1 block text-xs text-text-muted">
                      專家專屬色(僅 Expert Profile 頁使用)
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-10 w-10 rounded-md border border-border"
                        style={{ backgroundColor: draft.brandColor }}
                      />
                      <input
                        className={cn(FIELD, "max-w-[140px] font-mono")}
                        value={draft.brandColor}
                        onChange={(e) => patch({ brandColor: e.target.value })}
                      />
                      <span className="text-xs text-text-muted">
                        去飽和 · 金色禁用
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ---- 風格與原則 ---- */}
              {tab === "風格與原則" && (
                <>
                  <div>
                    <p className="mb-2 text-xs text-text-muted">
                      領航風格雷達(編輯部評估 0–100)
                    </p>
                    {draft.radar.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border-strong bg-card px-3 py-4 text-xs text-text-muted">
                        未建立 — 完成知識庫蒸餾後由編輯部評估。
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {draft.radar.map((r, i) => (
                          <div key={r.label}>
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm text-text-primary">{r.label}</span>
                              <span className="font-mono text-xs text-lime-text">
                                {r.score}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={r.score}
                              onChange={(e) => {
                                const next = [...draft.radar];
                                next[i] = { ...r, score: Number(e.target.value) };
                                patch({ radar: next });
                              }}
                              className="mt-1 w-full accent-[#42CAAC]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs text-text-muted">核心特質 chips</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {draft.traits.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-sm bg-lime-soft px-2 py-1 text-xs text-lime-text"
                        >
                          {t}
                          <button
                            type="button"
                            aria-label={`移除 ${t}`}
                            onClick={() =>
                              patch({ traits: draft.traits.filter((x) => x !== t) })
                            }
                            className="text-lime-text/60 hover:text-lime-text"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={newTrait}
                        onChange={(e) => setNewTrait(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTrait.trim()) {
                            patch({ traits: [...draft.traits, newTrait.trim()] });
                            setNewTrait("");
                          }
                        }}
                        placeholder="+ 新增特質"
                        className="w-24 rounded-sm border border-dashed border-border-strong bg-transparent px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs text-text-muted">
                      決策原則 Heuristics({expert.heuristics?.length ?? 0} 條)
                    </p>
                    {expert.heuristics && expert.heuristics.length > 0 ? (
                      <ul className="space-y-2">
                        {expert.heuristics.map((h) => (
                          <li
                            key={h.name}
                            className="rounded-md border border-border bg-card px-3 py-2.5"
                          >
                            <p className="text-sm font-medium text-text-primary">
                              {h.name}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                              使用時機:{h.whenToUse}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-md border border-dashed border-border-strong bg-card px-3 py-4 text-xs text-text-muted">
                        未建立 — 由授權訪談蒸餾。
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ---- 知識庫(誠實 state — 蒸餾 pipeline 未接) ---- */}
              {tab === "知識庫" && (
                <div className="rounded-md border border-dashed border-border-strong bg-card px-4 py-8 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    知識庫蒸餾 — 即將推出
                  </p>
                  <p className="mx-auto mt-1.5 max-w-[360px] text-xs leading-relaxed text-text-muted">
                    素材上載、切塊同重新蒸餾需要 Supabase Storage +
                    distillation pipeline 先可以運作,而家未有真後端,
                    所以唔會顯示任何虛構嘅素材數量。Prompt 版本:
                    <span className="font-mono text-text-secondary">
                      {expert.promptVersion ?? "—"}
                    </span>
                  </p>
                  <Link
                    to="/admin/studio"
                    onClick={closeEditor}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
                  >
                    去工作室睇進度
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* ---- 數據 Data / 線索 CRM / 活動 Activity(真查詢) ---- */}
              {(tab === "數據 Data" || tab === "線索 CRM" || tab === "活動 Activity") && (
                <Expert360Tabs expert={expert} tab={tab} closeEditor={closeEditor} />
              )}

              {/* ---- 發佈 ---- */}
              {tab === "發佈" && (
                <>
                  <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Verified 上線狀態
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        開關只係本機預覽 — 上線流程需要 experts 後端(即將推出)
                      </p>
                    </div>
                    <AdminToggle
                      checked={draft.verified}
                      onChange={(v) => patch({ verified: v })}
                      label="Verified 上線狀態"
                    />
                  </div>
                  <div className="rounded-md border border-border px-4 py-3">
                    <p className="text-xs text-text-muted">公開預覽連結</p>
                    {expert.verified ? (
                      <Link
                        to={`/experts/${expert.slug}`}
                        className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-lime-text hover:underline"
                      >
                        /experts/{expert.slug}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <p className="mt-1.5 text-sm text-text-muted">
                        草稿狀態暫無公開頁 — 完成認證後自動生成。
                      </p>
                    )}
                  </div>
                  {expert.pendingNote && (
                    <p className="rounded-md border border-dashed border-border-strong bg-card px-4 py-3 text-xs leading-relaxed text-text-secondary">
                      {expert.pendingNote}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  toast("變更只保留喺呢個畫面 — experts 後端未接,唔會寫入資料庫");
                  closeEditor();
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
              >
                <Save className="h-4 w-4" />
                儲存變更
              </button>
            </div>
          </div>
        )}
      </AdminSlideOver>

      {/* 新增導師 slide-over */}
      <AdminSlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新增導師"
        subtitle="建立草稿(未發佈,只存本機)— 接 Supabase experts 後端 + 蒸餾 pipeline 之後先會上線"
        width={480}
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-5 px-6 py-5">
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">
                姓名 Display name <span className="text-lime-text">*</span>
              </span>
              <input
                className={FIELD}
                placeholder="例:Ada Wong 黃雅達"
                value={form.name}
                onChange={(e) =>
                  patchForm(
                    form.slugTouched
                      ? { name: e.target.value }
                      : {
                          name: e.target.value,
                          slug: slugifyExpertName(e.target.value),
                        }
                  )
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">
                slug(由姓名自動生成,可改)
              </span>
              <input
                className={cn(FIELD, "font-mono")}
                placeholder="ada-wong"
                value={form.slug}
                onChange={(e) =>
                  patchForm({ slug: e.target.value, slugTouched: true })
                }
              />
              <span className="mt-1 block text-[11px] text-text-muted">
                用於 /experts/&#123;slug&#125; 同知識庫命名 — 小寫英文加連字符
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">
                頭銜 Credential
              </span>
              <input
                className={FIELD}
                placeholder="例:XX 創辦人 · 前 YY 增長主管"
                value={form.credential}
                onChange={(e) => patchForm({ credential: e.target.value })}
              />
            </label>

            <div>
              <span className="mb-1 block text-xs text-text-muted">
                領域 Specialty chips(Enter 加入,可自訂)
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {form.specialties.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-sm bg-lime-soft px-2 py-1 text-xs text-lime-text"
                  >
                    {s}
                    <button
                      type="button"
                      aria-label={`移除 ${s}`}
                      onClick={() =>
                        patchForm({
                          specialties: form.specialties.filter((x) => x !== s),
                        })
                      }
                      className="text-lime-text/60 hover:text-lime-text"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSpecialty.trim()) {
                      const v = newSpecialty.trim();
                      if (!form.specialties.includes(v)) {
                        patchForm({ specialties: [...form.specialties, v] });
                      }
                      setNewSpecialty("");
                    }
                  }}
                  placeholder="+ 新增領域"
                  className="w-24 rounded-sm border border-dashed border-border-strong bg-transparent px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
                />
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs text-text-muted">
                專家專屬色 Brand color(去飽和 preset,僅 Expert Profile 頁使用)
              </span>
              <div className="flex items-center gap-2">
                {BRAND_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`選擇${c.label} ${c.hex}`}
                    title={`${c.label} ${c.hex}`}
                    onClick={() => patchForm({ brandColor: c.hex })}
                    className={cn(
                      "h-10 w-10 rounded-md border transition-all",
                      form.brandColor === c.hex
                        ? "border-lime ring-2 ring-lime/40"
                        : "border-border hover:border-border-strong"
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <span className="ml-1 font-mono text-xs text-text-muted">
                  {form.brandColor}
                </span>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">
                一句話定位 Quote
              </span>
              <textarea
                className={cn(FIELD, "min-h-[80px] resize-y leading-relaxed")}
                placeholder="例:AI 唔係工具,係你團隊嘅新同事。"
                value={form.quote}
                onChange={(e) => patchForm({ quote: e.target.value })}
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
            >
              取消
            </button>
            <button
              type="button"
              onClick={saveCreate}
              className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
            >
              <Plus className="h-4 w-4" />
              建立草稿
            </button>
          </div>
        </div>
      </AdminSlideOver>
    </div>
  );
}

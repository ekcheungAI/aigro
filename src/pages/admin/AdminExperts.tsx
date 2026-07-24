import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, RefreshCw, Save, Target, X } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import VerifiedBadge from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { experts, expertFullName } from "@/data/experts";
import type { Expert, RadarDimension } from "@/data/experts";
import { crmLeads } from "@/data/admin-mock";
import {
  expertActivityBySlug,
  expertStatsBySlug,
  personaByExpertSlug,
} from "@/data/admin-mock2";

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

export default function AdminExperts() {
  const toast = useAdminToast();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>("基本資料");
  const [draft, setDraft] = useState<ExpertDraft | null>(null);
  const [newTrait, setNewTrait] = useState("");

  const expert = experts.find((e) => e.slug === openSlug) ?? null;

  const openEditor = (e: Expert) => {
    setOpenSlug(e.slug);
    setDraft(toDraft(e));
    setTab("基本資料");
    setNewTrait("");
  };

  const closeEditor = () => {
    setOpenSlug(null);
    setDraft(null);
  };

  const patch = (p: Partial<ExpertDraft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

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
            領航專家資料、風格檔案與知識庫蒸餾狀態。
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("新專家需先完成領航認證面談 — 已加入邀請清單(mock)")}
          className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <Plus className="h-4 w-4" />
          邀請專家
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
            {experts.map((e) => (
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
                        {e.verified ? expertFullName(e) : "領航專家席(待定)"}
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
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-card px-2 py-0.5 text-xs font-medium text-[#A36A0F]">
                      草稿
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
        title={expert ? (expert.verified ? expertFullName(expert) : "領航專家席(草稿)") : ""}
        subtitle={expert?.credential ?? "等待邀請確認 · 未完成領航認證"}
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
                              className="mt-1 w-full accent-[#43F50E]"
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

              {/* ---- 知識庫 ---- */}
              {tab === "知識庫" && (
                <>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {[
                      {
                        name: "公開分享",
                        desc: "Threads · LinkedIn · 演講內容",
                        count: expert.verified ? 12 : 0,
                      },
                      {
                        name: "授權訪談",
                        desc: "編輯部逐字稿",
                        count: expert.verified ? 3 : 0,
                      },
                      {
                        name: `Prompt ${expert.promptVersion ?? "v0.1(草稿)"}`,
                        desc: "分身系統提示詞版本",
                        count: null,
                      },
                    ].map((s) => (
                      <li
                        key={s.name}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">{s.name}</p>
                          <p className="mt-0.5 text-xs text-text-muted">{s.desc}</p>
                        </div>
                        {s.count !== null && (
                          <span className="font-mono text-sm text-lime-text">{s.count}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs leading-relaxed text-text-muted">
                    知識庫最近更新:
                    <span className="font-mono text-text-secondary">
                      {expert.kbUpdated ?? "—"}
                    </span>
                    。重新蒸餾會將新授權素材合入分身回答(mock,Supabase 接入後觸發真實 pipeline)。
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      toast(
                        `已排程重新蒸餾 — ${
                          expert.verified ? expertFullName(expert) : "領航專家席"
                        } 知識庫(mock)`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
                  >
                    <RefreshCw className="h-4 w-4" />
                    重新蒸餾
                  </button>
                </>
              )}

              {/* ---- 數據 Data ---- */}
              {tab === "數據 Data" && (
                <>
                  {(() => {
                    const stats = expertStatsBySlug[expert.slug];
                    if (!stats) {
                      return (
                        <p className="rounded-md border border-dashed border-border-strong bg-card px-4 py-6 text-xs text-text-muted">
                          未有待機數據 — 專家完成領航認證並上線後,呢度會顯示對話、投稿同社交觸及。
                        </p>
                      );
                    }
                    const maxBar = Math.max(...stats.weeklyBars, 1);
                    const days = ["一", "二", "三", "四", "五", "六", "日"];
                    return (
                      <>
                        <div>
                          <p className="mb-2 text-xs text-text-muted">分身對話</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "總對話", value: stats.convTotal.toLocaleString() },
                              { label: "本週", value: String(stats.convWeek) },
                              { label: "平均信心", value: `${stats.avgConfidence}%` },
                            ].map((s) => (
                              <div
                                key={s.label}
                                className="rounded-md border border-border bg-card px-3 py-2.5"
                              >
                                <p className="font-mono text-[16px] font-medium text-text-primary">
                                  {s.value}
                                </p>
                                <p className="mt-0.5 text-[11px] text-text-muted">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 rounded-md border border-border px-3 py-3">
                            <p className="mb-2 text-[11px] text-text-muted">近 7 日對話量</p>
                            <div className="flex h-20 items-end gap-1.5">
                              {stats.weeklyBars.map((v, i) => (
                                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                                  <span className="font-mono text-[10px] text-text-muted">{v}</span>
                                  <div
                                    className="w-full rounded-sm bg-lime"
                                    style={{ height: `${Math.max((v / maxBar) * 100, 8)}%` }}
                                  />
                                  <span className="text-[10px] text-text-muted">{days[i]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md border border-border bg-card px-3 py-2.5">
                            <p className="font-mono text-[16px] font-medium text-text-primary">
                              {stats.insightsPublished}/{stats.insightsSubmitted}
                            </p>
                            <p className="mt-0.5 text-[11px] text-text-muted">情報已發佈 / 投稿</p>
                          </div>
                          <div className="rounded-md border border-border bg-card px-3 py-2.5">
                            <p className="font-mono text-[16px] font-medium text-text-primary">
                              {stats.kbChunks}
                              <span className="ml-1 text-[11px] text-text-muted">
                                chunks · {stats.kbSizeMb}MB
                              </span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-text-muted">知識庫規模</p>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs text-text-muted">社交觸及(已連接平台)</p>
                          <ul className="divide-y divide-border rounded-md border border-border">
                            {stats.social.map((s) => (
                              <li
                                key={s.platform}
                                className="flex items-center justify-between gap-3 px-3 py-2.5"
                              >
                                <div>
                                  <p className="text-sm font-medium text-text-primary">
                                    {s.platform}
                                  </p>
                                  <p className="text-[11px] text-text-muted">{s.handle}</p>
                                </div>
                                <span className="font-mono text-sm text-lime-text">
                                  {s.followers}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}

              {/* ---- 線索 CRM ---- */}
              {tab === "線索 CRM" && (
                <>
                  {(() => {
                    const persona = personaByExpertSlug[expert.slug];
                    const leads = persona
                      ? crmLeads.filter((l) => l.persona === persona)
                      : [];
                    if (!persona || leads.length === 0) {
                      return (
                        <p className="rounded-md border border-dashed border-border-strong bg-card px-4 py-6 text-xs text-text-muted">
                          暫無屬於呢個分身嘅線索 — 專家上線後,分身對話產生嘅高意向線索會自動歸入。
                        </p>
                      );
                    }
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-text-muted">
                            分身<span className="font-medium text-text-secondary">「{persona}」</span>
                            相關線索
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
                                  {l.name ?? `訪客 ${l.anonId}`}
                                </p>
                                <span
                                  className={cn(
                                    "rounded-sm px-1.5 py-0.5 font-mono text-[11px]",
                                    l.score >= 70
                                      ? "bg-lime-soft text-lime-text"
                                      : l.score >= 40
                                        ? "bg-card text-[#A36A0F]"
                                        : "bg-card text-text-muted"
                                  )}
                                >
                                  {l.score}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-5 text-[11px] text-text-muted">
                                <span className="rounded-sm bg-card px-1.5 py-0.5">{l.stage}</span>
                                <span className="rounded-sm bg-card px-1.5 py-0.5">{l.type}</span>
                                <span className="font-mono">{l.lastActivity}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    );
                  })()}
                </>
              )}

              {/* ---- 活動 Activity ---- */}
              {tab === "活動 Activity" && (
                <>
                  {(() => {
                    const activity = expertActivityBySlug[expert.slug] ?? [];
                    if (activity.length === 0) {
                      return (
                        <p className="rounded-md border border-dashed border-border-strong bg-card px-4 py-6 text-xs text-text-muted">
                          暫無互動記錄 — 創始會員同分身嘅活動會喺上線後顯示。
                        </p>
                      );
                    }
                    return (
                      <div>
                        <p className="mb-2 text-xs text-text-muted">
                          創始會員 ↔ 分身互動時間線
                        </p>
                        <ol className="relative space-y-0 border-l border-border pl-4">
                          {activity.map((a, i) => (
                            <li key={i} className="relative pb-4 last:pb-0">
                              <span
                                className={cn(
                                  "absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface",
                                  a.kind === "系統" ? "bg-border-strong" : "bg-lime"
                                )}
                              />
                              <p className="font-mono text-[11px] text-text-muted">{a.time}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                                {a.text}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })()}
                </>
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
                        開啟後專家頁與 AI 分身對外公開
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
                  toast(
                    `已儲存 ${expert.verified ? expertFullName(expert) : "專家席"} 變更(本地原型,mock)`
                  );
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
    </div>
  );
}

import { useMemo, useState } from "react";
import { Pencil, Search, UserRound } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  countRows,
  formatDate,
  timeAgo,
  useAdminQuery,
} from "@/components/admin/adminData";
import type {
  AdminProfileRow,
  AdminWaitlistRow,
} from "@/components/admin/adminData";
import { ROLE_LABELS, TIER_LABEL } from "@/components/auth/member";
import type { MemberRole, MemberTier } from "@/components/auth/member";

type RoleFilter = "全部" | MemberRole;
type TierFilter = "全部" | MemberTier;
const ROLE_FILTERS: RoleFilter[] = ["全部", "free", "founding", "expert", "admin"];
const TIER_FILTERS: TierFilter[] = ["全部", "free", "pro", "vip"];
const ROLE_ORDER: MemberRole[] = ["free", "founding", "expert", "admin"];
const TIER_ORDER: MemberTier[] = ["free", "pro", "vip"];
/** 已知分身 slug(datalist 建議,自訂都得) */
const KNOWN_EXPERT_SLUGS = ["jimmy-lau", "elvin-cheung"];

function roleChip(role: string | null) {
  if (role === "admin") return "bg-lime text-on-accent";
  if (role === "expert" || role === "founding") return "bg-lime-soft text-lime-text";
  return "bg-card text-text-secondary";
}

function roleLabel(role: string | null): string {
  return ROLE_LABELS[(role as MemberRole) ?? "free"] ?? role ?? "免費會員";
}

function tierLabel(tier: string | null): string {
  return TIER_LABEL[(tier as MemberTier) ?? "free"] ?? tier ?? "免費會員";
}

interface MembersData {
  profiles: AdminProfileRow[];
  total: number;
  mcpWaitlist: AdminWaitlistRow[];
}

async function fetchMembers(): Promise<MembersData> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const [total, profilesRes, waitlistRes] = await Promise.all([
    countRows("profiles"),
    supabase
      .from("profiles")
      .select("id,email,name,persona,interests,created_at,account_access(app_role,tier,expert_id,experts(slug))")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("waitlist")
      .select("id,email,kind,vertical,role,note,source,created_at")
      .eq("kind", "mcp"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (waitlistRes.error) throw new Error(waitlistRes.error.message);
  return {
    profiles: (profilesRes.data ?? []).map((row) => {
      const accessRaw = Array.isArray(row.account_access) ? row.account_access[0] : row.account_access;
      const access = accessRaw as {
        app_role?: string;
        tier?: string;
        experts?: { slug?: string } | Array<{ slug?: string }> | null;
      } | null;
      const expertRaw = access?.experts;
      const expert = Array.isArray(expertRaw) ? expertRaw[0] : expertRaw;
      const role = access?.app_role === "admin"
        ? "admin"
        : access?.app_role === "expert"
        ? "expert"
        : access?.tier && access.tier !== "free"
        ? "founding"
        : "free";
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        persona: row.persona,
        interests: row.interests,
        created_at: row.created_at,
        role,
        tier: access?.tier ?? "free",
        expert_slug: expert?.slug ?? null,
      } as AdminProfileRow;
    }),
    total,
    mcpWaitlist: (waitlistRes.data ?? []) as AdminWaitlistRow[],
  };
}

/* ---------------- 會員級別編輯(真 update profiles) ---------------- */

function MemberRoleEditor({
  member,
  onSaved,
  onCancel,
}: {
  member: AdminProfileRow;
  /** 儲存成功後 callback(父層 refetch + 關閉) */
  onSaved: (role: MemberRole, tier: MemberTier) => void;
  onCancel: () => void;
}) {
  const [role, setRole] = useState<MemberRole>(
    (member.role as MemberRole) ?? "free"
  );
  const [tier, setTier] = useState<MemberTier>(
    (member.tier as MemberTier) ?? "free"
  );
  const [expertSlug, setExpertSlug] = useState(member.expert_slug ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async () => {
    if (!supabase) {
      setSaveError("Supabase 未連接 — 請檢查環境變數。");
      return;
    }
    setSaving(true);
    setSaveError(null);
    let expertId: string | null = null;
    if (role === "expert" && expertSlug.trim()) {
      const { data: expert, error: expertError } = await supabase.from("experts")
        .select("id").eq("slug", expertSlug.trim()).maybeSingle();
      if (expertError || !expert) {
        setSaving(false);
        setSaveError(expertError?.message ?? "找不到呢個專家 slug");
        return;
      }
      expertId = expert.id;
    }
    const appRole = role === "admin" ? "admin" : role === "expert" ? "expert" : "member";
    const { error: updateError } = await supabase.from("account_access").upsert({
      user_id: member.id,
      app_role: appRole,
      tier,
      expert_id: expertId,
    });
    setSaving(false);
    if (updateError) {
      setSaveError(
        `更新失敗:${updateError.message} — 請確認 distillation migration 同 account_access admin policy 已套用。`
      );
      return;
    }
    onSaved(role, tier);
  };

  if (saveError) {
    return (
      <div className="flex-1 space-y-4 px-6 py-5">
        <QueryState error={saveError} retry={() => void save()} />
        <button
          type="button"
          onClick={() => setSaveError(null)}
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
        >
          返回修改
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 px-6 py-5">
        <div>
          <label
            htmlFor="me-role"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            級別 Role
          </label>
          <select
            id="me-role"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary focus:border-lime focus:outline-none"
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}({r})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="me-tier"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            層級 Tier
          </label>
          <select
            id="me-tier"
            value={tier}
            onChange={(e) => setTier(e.target.value as MemberTier)}
            className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary focus:border-lime focus:outline-none"
          >
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}({t})
              </option>
            ))}
          </select>
        </div>
        {role === "expert" && (
          <div>
            <label
              htmlFor="me-slug"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
            >
              專家分身 slug
            </label>
            <input
              id="me-slug"
              list="known-expert-slugs"
              value={expertSlug}
              onChange={(e) => setExpertSlug(e.target.value)}
              placeholder="例:jimmy-lau"
              className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
            />
            <datalist id="known-expert-slugs">
              {KNOWN_EXPERT_SLUGS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              連結佢嘅 AI 分身身份(jimmy-lau / elvin-cheung 或自訂 slug)—
              設定後佢喺專家平台見到自己嘅分身數據;留空即未連結。
            </p>
          </div>
        )}
        <p className="rounded-md border border-dashed border-border-strong bg-card/60 px-3.5 py-2.5 text-xs leading-relaxed text-text-muted">
          Role、tier 同 expert 關係會寫入受保護嘅 account_access({member.email})；
          會員唔可以自行修改。
        </p>
      </div>
      <div className="flex gap-2 border-t border-border px-6 py-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex flex-1 items-center justify-center rounded-md bg-lime px-3 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover disabled:opacity-50"
        >
          {saving ? "儲存中…" : "儲存變更"}
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

export default function AdminMembers() {
  const { data, loading, error, refetch } = useAdminQuery(fetchMembers);
  const toast = useAdminToast();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("全部");
  const [tierFilter, setTierFilter] = useState<TierFilter>("全部");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const list = useMemo(() => data?.profiles ?? [], [data]);
  const active = list.find((m) => m.id === openId) ?? null;
  const editing = list.find((m) => m.id === editId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((m) => {
      if (roleFilter !== "全部" && (m.role ?? "free") !== roleFilter) return false;
      if (tierFilter !== "全部" && (m.tier ?? "free") !== tierFilter) return false;
      const name = m.name ?? "";
      if (q && !name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [list, query, roleFilter, tierFilter]);

  const roleCounts = ROLE_ORDER.map((r) => ({
    role: r,
    count: list.filter((m) => (m.role ?? "free") === r).length,
  }));
  const maxRole = Math.max(...roleCounts.map((t) => t.count), 1);

  const tierCounts = TIER_ORDER.map((t) => ({
    tier: t,
    count: list.filter((m) => (m.tier ?? "free") === t).length,
  }));

  // MCP 優先名單按行業分組(真 waitlist,0 就誠實顯示)
  const verticalCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of data?.mcpWaitlist ?? []) {
      const v = w.vertical?.trim() || "未分類";
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);
  const maxVertical = Math.max(...verticalCounts.map(([, c]) => c), 1);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Members
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          會員管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          profiles 表即時列表 — 總數 {loading ? "…" : (data?.total ?? 0)} 位。
        </p>
      </div>

      <QueryState
        loading={loading}
        error={error ? `載入失敗:${error}` : null}
        retry={refetch}
        empty={
          data && data.total === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
              <UserRound className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-3 text-sm font-medium text-text-primary">
                未有會員
              </p>
              <p className="mx-auto mt-1.5 max-w-[360px] text-xs leading-relaxed text-text-muted">
                profiles 表而家係 0 — 第一位用 magic link 登入嘅會員會即時出現喺呢度。
              </p>
            </div>
          ) : null
        }
      >
        {data && (
          <>
            {/* Top: role distribution + MCP waitlist */}
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-border bg-surface p-5">
                <h2 className="font-display text-[16px] font-medium text-text-primary">
                  級別分佈
                </h2>
                <div className="mt-4 space-y-3">
                  {roleCounts.map((t) => (
                    <div key={t.role} className="flex items-center gap-3">
                      <span className="w-16 text-xs text-text-secondary">
                        {ROLE_LABELS[t.role]}
                      </span>
                      <div className="h-4 flex-1 rounded-sm bg-card">
                        <div
                          className="h-full rounded-sm bg-lime"
                          style={{ width: `${(t.count / maxRole) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-xs text-text-primary">
                        {t.count}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[11px] text-text-muted">
                  層級:{tierCounts.map((t) => `${TIER_LABEL[t.tier]} ${t.count}`).join(" · ")}
                </p>
              </section>

              <section className="rounded-lg border border-border bg-surface p-5">
                <h2 className="font-display text-[16px] font-medium text-text-primary">
                  MCP 優先名單(按行業)
                </h2>
                {verticalCounts.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {verticalCounts.map(([v, c]) => (
                      <div key={v} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-text-secondary">{v}</span>
                        <div className="h-4 flex-1 rounded-sm bg-card">
                          <div
                            className="h-full rounded-sm bg-lime"
                            style={{ width: `${(c / maxVertical) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-mono text-xs text-text-primary">
                          {c}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">
                    暫未有 MCP 優先名單登記 — Developers 頁嘅 waitlist 登記會即時計入。
                  </p>
                )}
              </section>
            </div>

            {/* Search + role filter */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋姓名或電郵…"
                  className="w-64 rounded-md border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_FILTERS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                      roleFilter === r
                        ? "border-lime bg-lime text-on-accent"
                        : "border-border bg-surface text-text-secondary hover:border-border-strong"
                    )}
                  >
                    {r === "全部" ? "全部" : ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] text-text-muted">層級</span>
                {TIER_FILTERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTierFilter(t)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      tierFilter === t
                        ? "border-lime bg-lime text-on-accent"
                        : "border-border bg-surface text-text-secondary hover:border-border-strong"
                    )}
                  >
                    {t === "全部" ? "全部" : TIER_LABEL[t]}
                  </button>
                ))}
              </div>
              <span className="ml-auto font-mono text-xs text-text-muted">
                {filtered.length} / {list.length} 位
              </span>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted">
                    <th className="px-4 py-3 font-medium">會員</th>
                    <th className="px-4 py-3 font-medium">級別</th>
                    <th className="px-4 py-3 font-medium">層級</th>
                    <th className="px-4 py-3 font-medium">興趣</th>
                    <th className="px-4 py-3 font-medium">加入日期</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setOpenId(m.id)}
                      className="cursor-pointer transition-colors hover:bg-card/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">
                          {m.name?.trim() || m.email.split("@")[0]}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">{m.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-sm px-2 py-0.5 text-xs font-medium",
                            roleChip(m.role)
                          )}
                        >
                          {roleLabel(m.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {tierLabel(m.tier)}
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <p className="truncate text-xs text-text-secondary">
                          {m.interests && m.interests.length > 0
                            ? m.interests.join("、")
                            : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditId(m.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
                        >
                          <Pencil className="h-3 w-3" />
                          編輯
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-text-muted">
                        找不到符合嘅會員。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>

      {/* Member detail slide-over(read-only,全部真欄位) */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active ? active.name?.trim() || active.email.split("@")[0] : ""}
        subtitle={active ? `${active.email} · 加入於 ${formatDate(active.created_at)}` : ""}
      >
        {active && (
          <div className="flex-1 space-y-6 px-6 py-5">
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "rounded-sm px-2 py-1 text-xs font-medium",
                  roleChip(active.role)
                )}
              >
                {roleLabel(active.role)}
              </span>
              <span className="rounded-sm bg-card px-2 py-1 text-xs font-medium text-text-secondary">
                {tierLabel(active.tier)}
              </span>
              {active.expert_slug && (
                <span className="rounded-sm bg-lime-soft px-2 py-1 font-mono text-xs text-lime-text">
                  專家:{active.expert_slug}
                </span>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs text-text-muted">身份 Persona</p>
              <p className="text-sm text-text-primary">{active.persona ?? "未選擇"}</p>
            </div>

            <div>
              <p className="mb-2 text-xs text-text-muted">興趣</p>
              {active.interests && active.interests.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {active.interests.map((v) => (
                    <span
                      key={v}
                      className="rounded-sm border border-lime/40 bg-lime-soft px-2 py-1 font-mono text-xs text-lime-text"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">未填寫。</p>
              )}
            </div>

            <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <dt className="text-xs text-text-muted">Profile ID</dt>
                <dd className="font-mono text-[11px] text-text-primary">{active.id}</dd>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <dt className="text-xs text-text-muted">加入</dt>
                <dd className="font-mono text-xs text-text-primary">
                  {formatDate(active.created_at)}({timeAgo(active.created_at)})
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => {
                setOpenId(null);
                setEditId(active.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
            >
              <Pencil className="h-3.5 w-3.5" />
              編輯級別 / 層級
            </button>
          </div>
        )}
      </AdminSlideOver>

      {/* 級別編輯 slide-over(真 update profiles.role/tier/expert_slug) */}
      <AdminSlideOver
        open={editing !== null}
        onClose={() => setEditId(null)}
        title="編輯會員級別"
        subtitle={editing ? editing.email : ""}
      >
        {editing && (
          <MemberRoleEditor
            member={editing}
            onCancel={() => setEditId(null)}
            onSaved={(role, tier) => {
              setEditId(null);
              toast(
                `已更新 ${editing.email}:${ROLE_LABELS[role]} · ${TIER_LABEL[tier]}`
              );
              refetch();
            }}
          />
        )}
      </AdminSlideOver>
    </div>
  );
}

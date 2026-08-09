import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Pin, Plus, Save, X } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { PORTAL_FIELD, PortalSectionHeader } from "@/components/portal/portal-ui";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAdminQuery } from "@/components/admin/adminData";
import { expertHasPhoto } from "@/data/experts";

/** 品牌色 3 個預設(design.md §2.5 專家專屬色,低飽和、禁金色) */
const BRAND_PRESETS = [
  { hex: "#466A5E", label: "墨綠" },
  { hex: "#8A5A44", label: "赭棕" },
  { hex: "#4A5A6A", label: "石板藍" },
] as const;

const EXPERT_INITIALS: Record<string, string> = {
  "jimmy-lau": "JL",
  "elvin-cheung": "EC",
};

/** expert_profiles.stats / socials(jsonb)— 動態列表 */
interface StatLine {
  label: string;
  value: string;
}
interface SocialLine {
  label: string;
  url: string;
}

/** expert_profiles 表行(v3 SQL;jsonb 欄位防禦性解析) */
interface ExpertProfileRow {
  slug: string;
  headline: string | null;
  bio: string | null;
  stats: unknown;
  socials: unknown;
  featured_ids: unknown;
}

/** 自己嘅 published 情報(featured_ids 選擇器用) */
interface PublishedItem {
  id: string;
  title: string;
}

const MAX_FEATURED = 3;

/** 檔案編輯按專家 slug 持久化(reload 唔會還原)— key:`aigro-portal-profile-<slug>`
 *  Supabase expert_profiles 為主;localStorage 係離線 / 未跑 v3 SQL 時嘅 fallback。 */
interface ProfileDraft {
  displayName: string;
  title: string;
  bio: string;
  specialties: string[];
  brandColor: string;
  quote: string;
  stats?: StatLine[];
  socials?: SocialLine[];
  featuredIds?: string[];
}

function profileKey(slug: string) {
  return `aigro-portal-profile-${slug}`;
}

function cleanStats(input: unknown): StatLine[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s): StatLine | null => {
      if (typeof s !== "object" || s === null) return null;
      const rec = s as Record<string, unknown>;
      if (typeof rec.label !== "string" || typeof rec.value !== "string")
        return null;
      return { label: rec.label, value: rec.value };
    })
    .filter((s): s is StatLine => s !== null);
}

function cleanSocials(input: unknown): SocialLine[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s): SocialLine | null => {
      if (typeof s !== "object" || s === null) return null;
      const rec = s as Record<string, unknown>;
      if (typeof rec.label !== "string" || typeof rec.url !== "string")
        return null;
      return { label: rec.label, url: rec.url };
    })
    .filter((s): s is SocialLine => s !== null);
}

function cleanIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is string => typeof x === "string");
}

function loadProfileDraft(slug: string): ProfileDraft | null {
  try {
    const raw = window.localStorage.getItem(profileKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProfileDraft>;
    if (typeof parsed.displayName !== "string" || !Array.isArray(parsed.specialties))
      return null;
    return {
      displayName: parsed.displayName,
      title: typeof parsed.title === "string" ? parsed.title : "",
      bio: typeof parsed.bio === "string" ? parsed.bio : "",
      specialties: parsed.specialties.filter((s): s is string => typeof s === "string"),
      brandColor: typeof parsed.brandColor === "string" ? parsed.brandColor : "",
      quote: typeof parsed.quote === "string" ? parsed.quote : "",
      stats: cleanStats(parsed.stats),
      socials: cleanSocials(parsed.socials),
      featuredIds: cleanIds(parsed.featuredIds),
    };
  } catch {
    return null;
  }
}

/* ---------------- Supabase 查詢 ---------------- */

interface ProfileBundle {
  profile: ExpertProfileRow | null;
  published: PublishedItem[];
}

async function fetchProfileBundle(slug: string): Promise<ProfileBundle> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const [{ data: profile, error: profileError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase.from("expert_profiles").select("*").eq("slug", slug).maybeSingle(),
      supabase
        .from("items")
        .select("id,title")
        .eq("expert_slug", slug)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50),
    ]);
  if (profileError) throw new Error(profileError.message);
  if (itemsError) throw new Error(itemsError.message);
  return {
    profile: (profile as ExpertProfileRow | null) ?? null,
    published: (items ?? []) as PublishedItem[],
  };
}

function rlsHint(message: string): string {
  return `${message} — 請由 Master Admin 檢查最新 migration、owner assignment 同 RLS readiness；唔好執行已退役嘅 legacy policy SQL。`;
}

/**
 * PortalProfile `/portal/profile` — 檔案自訂。
 * 左:編輯表單(顯示名稱/頭銜 headline/bio/專長 chips/品牌色/一句觀點
 *    + stats 動態列表 + socials 動態列表 + 置頂情報);
 * 右:live preview(同公開專家卡一致嘅渲染)。
 * 儲存由 membership-checked RPC 同步 experts + expert_profiles；
 * localStorage 只係離線草稿 cache，唔係權限或公開資料 source of truth。
 */
export default function PortalProfile() {
  const { slug, expert, expertId } = usePortalExpert();
  const toast = useAdminToast();
  const [saved] = useState<ProfileDraft | null>(() => loadProfileDraft(slug));

  const [displayName, setDisplayName] = useState(
    saved?.displayName ??
      (expert
        ? [expert.nameZh, expert.nameEn].filter(Boolean).join(" ")
        : slug)
  );
  const [title, setTitle] = useState(saved?.title ?? expert?.title ?? "");
  const [bio, setBio] = useState(saved?.bio ?? expert?.bio ?? "");
  const [specialties, setSpecialties] = useState<string[]>(
    saved?.specialties ?? expert?.specialties ?? []
  );
  const [newSpec, setNewSpec] = useState("");
  const [brandColor, setBrandColor] = useState(
    saved?.brandColor || expert?.brandColor || BRAND_PRESETS[0].hex
  );
  const [quote, setQuote] = useState(saved?.quote ?? expert?.quote ?? "");
  const [stats, setStats] = useState<StatLine[]>(
    saved?.stats && saved.stats.length > 0
      ? saved.stats
      : (expert?.metrics ?? []).map((m) => ({ label: m.label, value: m.value }))
  );
  const [socials, setSocials] = useState<SocialLine[]>(
    saved?.socials && saved.socials.length > 0
      ? saved.socials
      : (expert?.socials ?? []).map((s) => ({ label: s.label, url: s.url }))
  );
  const [featuredIds, setFeaturedIds] = useState<string[]>(
    saved?.featuredIds ?? []
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // expert_profiles + 自己 published 情報(置頂選擇器)
  const { data: bundle, error: loadError } = useAdminQuery(
    () => fetchProfileBundle(slug),
    [slug]
  );

  // 表有數據優先 — 第一次載入完成時 hydrate(唔會覆寫用戶之後嘅編輯)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!bundle || hydratedRef.current) return;
    hydratedRef.current = true;
    const row = bundle.profile;
    if (!row) return; // 表冇 row → 保持 localStorage / experts.ts fallback
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (typeof row.headline === "string" && row.headline) setTitle(row.headline);
      if (typeof row.bio === "string" && row.bio) setBio(row.bio);
      const remoteStats = cleanStats(row.stats);
      if (remoteStats.length > 0) setStats(remoteStats);
      const remoteSocials = cleanSocials(row.socials);
      if (remoteSocials.length > 0) setSocials(remoteSocials);
      setFeaturedIds(cleanIds(row.featured_ids).slice(0, MAX_FEATURED));
    });
    return () => { cancelled = true; };
  }, [bundle]);

  const publishedItems = bundle?.published ?? [];

  const addSpec = () => {
    const v = newSpec.trim();
    if (!v || specialties.includes(v)) return;
    if (specialties.length >= 6) {
      toast("專長最多 6 個 — 保持聚焦");
      return;
    }
    setSpecialties((s) => [...s, v]);
    setNewSpec("");
  };

  const removeSpec = (s: string) =>
    setSpecialties((list) => list.filter((x) => x !== s));

  const toggleFeatured = (id: string) => {
    setFeaturedIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_FEATURED) {
        toast(`置頂最多 ${MAX_FEATURED} 篇 — 先取消一篇再揀`);
        return cur;
      }
      return [...cur, id];
    });
  };

  const save = async () => {
    const draft: ProfileDraft = {
      displayName,
      title,
      bio,
      specialties,
      brandColor,
      quote,
      stats,
      socials,
      featuredIds,
    };
    // 本機持久化 — 離線 / 未跑 v3 SQL 時嘅 fallback(永遠做)
    try {
      window.localStorage.setItem(profileKey(slug), JSON.stringify(draft));
    } catch {
      /* private mode — Supabase 仍然會寫 */
    }

    if (!supabase) {
      setSaveError("Supabase 未連接 — 請檢查環境變數。變更已存喺呢個瀏覽器。");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const { error: upsertError } = await supabase.rpc(
      "update_expert_public_profile",
      {
        p_expert_id: expertId,
        p_display_name: displayName.trim(),
        p_title: title.trim(),
        p_bio: bio.trim(),
        p_specialties: specialties,
        p_brand_color: brandColor,
        p_quote: quote.trim(),
        p_stats: stats.filter((s) => s.label.trim() && s.value.trim()),
        p_socials: socials.filter((s) => s.label.trim() && s.url.trim()),
        p_featured_ids: featuredIds,
      }
    );
    setSaving(false);
    if (upsertError) {
      setSaveError(rlsHint(`同步失敗:${upsertError.message}`));
      return;
    }
    toast("檔案已安全儲存；完成 release gate 後先會公開上線");
  };

  const initials = EXPERT_INITIALS[slug] ?? "·";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Profile
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          檔案設定
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          自訂你喺公開專家頁嘅呈現 — 右邊即時預覽,儲存即寫入 expert_profiles。
        </p>
      </div>

      {loadError && (
        <p className="rounded-md border border-[#A36A0F]/40 bg-card px-4 py-2.5 text-xs leading-relaxed text-[#A36A0F]">
          讀取 expert_profiles 失敗:{loadError} — 請由 Master Admin 檢查 backend readiness；
          而家只顯示本機草稿 cache。
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- 左:編輯表單 ---- */}
        <section className="rounded-lg border border-border bg-surface">
          <PortalSectionHeader overline="01 · Edit" title="編輯檔案" />
          <div className="space-y-5 px-5 py-5">
            <div>
              <label
                htmlFor="pf-name"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
              >
                顯示名稱
              </label>
              <input
                id="pf-name"
                className={cn(PORTAL_FIELD, "mt-1.5")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="pf-title"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
              >
                頭銜 Headline
              </label>
              <input
                id="pf-title"
                className={cn(PORTAL_FIELD, "mt-1.5")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="pf-bio"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
              >
                簡介 Bio
              </label>
              <textarea
                id="pf-bio"
                rows={5}
                className={cn(PORTAL_FIELD, "mt-1.5 resize-none leading-relaxed")}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <p className="mt-1 text-right font-mono text-[11px] text-text-muted">
                {bio.length} 字
              </p>
            </div>
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                專長 chips
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {specialties.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-lime-soft px-2.5 py-1 text-xs font-medium text-lime-text"
                  >
                    {s}
                    <button
                      type="button"
                      aria-label={`移除 ${s}`}
                      onClick={() => removeSpec(s)}
                      className="rounded-full p-0.5 transition-colors hover:bg-lime/30"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className={cn(PORTAL_FIELD, "flex-1")}
                  placeholder="新增專長…"
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpec();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addSpec}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
                >
                  <Plus className="h-3.5 w-3.5" />
                  加入
                </button>
              </div>
            </div>

            {/* stats 動態列表(expert_profiles.stats jsonb) */}
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                成就數據 Stats(label + value)
              </label>
              <div className="mt-1.5 space-y-2">
                {stats.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      aria-label={`統計 ${i + 1} 標籤`}
                      className={cn(PORTAL_FIELD, "flex-1")}
                      placeholder="標籤,如 創辦"
                      value={s.label}
                      onChange={(e) =>
                        setStats((list) =>
                          list.map((x, j) =>
                            j === i ? { ...x, label: e.target.value } : x
                          )
                        )
                      }
                    />
                    <input
                      aria-label={`統計 ${i + 1} 數值`}
                      className={cn(PORTAL_FIELD, "flex-1")}
                      placeholder="數值,如 DOTAI"
                      value={s.value}
                      onChange={(e) =>
                        setStats((list) =>
                          list.map((x, j) =>
                            j === i ? { ...x, value: e.target.value } : x
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label={`移除統計 ${i + 1}`}
                      onClick={() =>
                        setStats((list) => list.filter((_, j) => j !== i))
                      }
                      className="shrink-0 rounded-md border border-border p-2 text-text-muted transition-colors hover:border-[#A63A30]/50 hover:text-[#A63A30]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setStats((list) => [...list, { label: "", value: "" }])
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-border-strong px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
                >
                  <Plus className="h-3.5 w-3.5" />
                  加一行統計
                </button>
              </div>
            </div>

            {/* socials 動態列表(expert_profiles.socials jsonb) */}
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                社交連結 Socials(label + url)
              </label>
              <div className="mt-1.5 space-y-2">
                {socials.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      aria-label={`連結 ${i + 1} 名稱`}
                      className={cn(PORTAL_FIELD, "w-32 shrink-0")}
                      placeholder="平台名"
                      value={s.label}
                      onChange={(e) =>
                        setSocials((list) =>
                          list.map((x, j) =>
                            j === i ? { ...x, label: e.target.value } : x
                          )
                        )
                      }
                    />
                    <input
                      aria-label={`連結 ${i + 1} URL`}
                      className={cn(PORTAL_FIELD, "flex-1")}
                      placeholder="https://"
                      value={s.url}
                      onChange={(e) =>
                        setSocials((list) =>
                          list.map((x, j) =>
                            j === i ? { ...x, url: e.target.value } : x
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label={`移除連結 ${i + 1}`}
                      onClick={() =>
                        setSocials((list) => list.filter((_, j) => j !== i))
                      }
                      className="shrink-0 rounded-md border border-border p-2 text-text-muted transition-colors hover:border-[#A63A30]/50 hover:text-[#A63A30]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setSocials((list) => [...list, { label: "", url: "" }])
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-border-strong px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
                >
                  <Plus className="h-3.5 w-3.5" />
                  加一條連結
                </button>
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                品牌色(檔案頁專用)
              </label>
              <div className="mt-2 flex gap-2.5">
                {BRAND_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setBrandColor(p.hex)}
                    aria-label={`品牌色 ${p.label}`}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md border transition-all",
                      brandColor === p.hex
                        ? "border-text-primary"
                        : "border-border hover:border-border-strong"
                    )}
                    style={{ backgroundColor: `${p.hex}1F` }}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: p.hex }}
                    >
                      {brandColor === p.hex && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </span>
                  </button>
                ))}
                <span className="ml-1 self-center font-mono text-xs text-text-muted">
                  {brandColor}
                </span>
              </div>
            </div>
            <div>
              <label
                htmlFor="pf-quote"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
              >
                一句觀點 Quote
              </label>
              <textarea
                id="pf-quote"
                rows={3}
                className={cn(PORTAL_FIELD, "mt-1.5 resize-none leading-relaxed")}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
              />
            </div>
            {saveError && (
              <p
                role="alert"
                className="rounded-md border border-[#A63A30]/40 bg-card px-3.5 py-2.5 text-xs leading-relaxed text-[#A63A30]"
              >
                {saveError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "儲存中…" : "儲存並同步上線"}
            </button>
          </div>
        </section>

        {/* ---- 右:live preview(同公開專家卡渲染一致) ---- */}
        <section className="rounded-lg border border-border bg-surface">
          <PortalSectionHeader
            overline="02 · Preview"
            title="即時預覽"
            desc="同 /experts 公開頁嘅專家卡一致。"
          />
          <div className="px-5 py-5">
            <article className="rounded-md border border-border bg-surface p-8 shadow-card max-md:p-6">
              <div className="flex gap-6 max-md:flex-col max-md:gap-5">
                <div className="relative shrink-0">
                  {expert && expertHasPhoto(expert) ? (
                    <PhotoAvatar
                      src={expert.image}
                      alt={displayName}
                      size={96}
                      verified
                    />
                  ) : (
                    <MonogramAvatar
                      initials={initials}
                      color={brandColor}
                      size={96}
                      verified
                    />
                  )}
                  <VerifiedBadge
                    size={24}
                    ambient
                    className="absolute -right-0.5 -top-0.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-h3 text-text-primary">
                    {displayName || "未命名"}
                  </h3>
                  <p className="mt-1 text-overline font-sans text-text-muted">
                    {title}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans text-ink"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  {quote && (
                    <p className="mt-4 line-clamp-2 text-body-sm text-text-secondary">
                      「{quote}」
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
                    <p className="font-mono text-caption text-text-muted">
                      {expert?.achievements ?? ""}
                    </p>
                    <span className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-md bg-ink-solid px-6 text-label text-on-accent">
                      查看領航檔案
                      <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* Bio preview */}
            {bio && (
              <div className="mt-4 rounded-md border border-border bg-card/50 px-4 py-3.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                  Bio(檔案頁簡介段)
                </p>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-text-secondary">
                  {bio}
                </p>
              </div>
            )}

            {/* Stats preview */}
            {stats.filter((s) => s.label.trim() && s.value.trim()).length > 0 && (
              <div className="mt-4 rounded-md border border-border bg-card/50 px-4 py-3.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                  Stats(檔案頁成就佐證)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {stats
                    .filter((s) => s.label.trim() && s.value.trim())
                    .map((s, i) => (
                      <span
                        key={i}
                        className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans text-ink"
                      >
                        {s.label} · {s.value}
                      </span>
                    ))}
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-text-muted">
              預覽為即時渲染 — 儲存會 upsert 入 Supabase expert_profiles
              (headline / bio / stats / socials / featured_ids),
              同時保留一份本機草稿做離線 fallback。
            </p>
          </div>
        </section>
      </div>

      {/* ---- 置頂情報 featured_ids(最多 3 篇) ---- */}
      <section className="rounded-lg border border-border bg-surface">
        <PortalSectionHeader
          overline="03 · Featured"
          title="置頂情報"
          desc={`揀最多 ${MAX_FEATURED} 篇已發佈情報,置頂喺你嘅公開檔案頁。`}
        />
        <div className="px-5 py-5">
          {publishedItems.length === 0 ? (
            <p className="text-sm text-text-muted">
              你仲未有已發佈情報 — 去「我的情報」投稿,編輯部發佈後就可以喺度置頂。
            </p>
          ) : (
            <div className="space-y-2">
              {publishedItems.map((item) => {
                const checked = featuredIds.includes(item.id);
                const disabled = !checked && featuredIds.length >= MAX_FEATURED;
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors",
                      checked
                        ? "border-lime bg-lime-soft/40"
                        : disabled
                          ? "cursor-not-allowed border-border opacity-50"
                          : "border-border hover:border-border-strong"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleFeatured(item.id)}
                      className="h-4 w-4 shrink-0 accent-lime"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {item.title}
                    </span>
                    {checked && (
                      <Pin className="h-3.5 w-3.5 shrink-0 text-lime-text" />
                    )}
                  </label>
                );
              })}
              <p className="pt-1 font-mono text-[11px] text-text-muted">
                已揀 {featuredIds.length}/{MAX_FEATURED} — 儲存後寫入
                expert_profiles.featured_ids
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

import { useState } from "react";
import { ArrowRight, Check, Plus, Save, X } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { PORTAL_FIELD, PortalSectionHeader } from "@/components/portal/portal-ui";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
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

/** 檔案編輯按專家 slug 持久化(reload 唔會還原)— key:`aigro-portal-profile-<slug>` */
interface ProfileDraft {
  displayName: string;
  title: string;
  bio: string;
  specialties: string[];
  brandColor: string;
  quote: string;
}

function profileKey(slug: string) {
  return `aigro-portal-profile-${slug}`;
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
    };
  } catch {
    return null;
  }
}

/**
 * PortalProfile `/portal/profile` — 檔案自訂。
 * 左:編輯表單(顯示名稱/頭銜/bio/專長 chips/品牌色/一句觀點);
 * 右:live preview(同公開專家卡一致嘅渲染)。儲存 = 示範模式 toast。
 */
export default function PortalProfile() {
  const { slug, expert } = usePortalExpert();
  const toast = useAdminToast();
  const [saved] = useState<ProfileDraft | null>(() => loadProfileDraft(slug));

  const [displayName, setDisplayName] = useState(
    saved?.displayName ?? [expert.nameZh, expert.nameEn].filter(Boolean).join(" ")
  );
  const [title, setTitle] = useState(saved?.title ?? expert.title);
  const [bio, setBio] = useState(saved?.bio ?? expert.bio ?? "");
  const [specialties, setSpecialties] = useState<string[]>(
    saved?.specialties ?? expert.specialties
  );
  const [newSpec, setNewSpec] = useState("");
  const [brandColor, setBrandColor] = useState(
    saved?.brandColor || expert.brandColor || BRAND_PRESETS[0].hex
  );
  const [quote, setQuote] = useState(saved?.quote ?? expert.quote ?? "");

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

  const save = () => {
    const draft: ProfileDraft = {
      displayName,
      title,
      bio,
      specialties,
      brandColor,
      quote,
    };
    try {
      window.localStorage.setItem(profileKey(slug), JSON.stringify(draft));
      toast("已儲存 — 檔案變更已保留,reload 都唔會甩");
    } catch {
      toast("儲存失敗 — 瀏覽器 localStorage 唔可用");
    }
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
          自訂你喺公開專家頁嘅呈現 — 右邊即時預覽,同訪客見到嘅一致。
        </p>
      </div>

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
                頭銜
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
            <button
              type="button"
              onClick={save}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
            >
              <Save className="h-4 w-4" />
              儲存
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
                  {expertHasPhoto(expert) ? (
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
                      {expert.achievements}
                    </p>
                    <span className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-md bg-ink-solid px-6 text-label text-white">
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
            <p className="mt-4 text-xs text-text-muted">
              預覽為即時渲染 — 儲存後變更會保留喺呢個瀏覽器(localStorage),接
              Supabase 後同步上線。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

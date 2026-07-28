/**
 * expertProfiles.ts — Supabase `expert_profiles` 表(v3 SQL)嘅 runtime 數據層。
 *
 * 設計(同 liveItems.ts 一致嘅 graceful degradation):
 * - 表公開可讀(anon)。表未建 / 查詢失敗 / 無行 → 全部回 null,
 *   consumer 回落 src/data/experts.ts 嘅已核實靜態資料,頁面永遠唔會空。
 * - 動態統計(對話數 / 情報數 / 知識條目)全部真查 Supabase;
 *   任何一條 query 失敗(如 expert_knowledge 表未建)→ 該項靜默 0,唔虛構。
 *
 * expert_profiles 表結構(v3 SQL):
 *   slug text pk, headline text, bio text,
 *   stats jsonb [{label,value}], socials jsonb [{label,url}],
 *   featured_ids text[] (items.id,優先排序嘅精選情報)
 */

import { supabase } from "./supabase";

export interface ExpertProfileStat {
  label: string;
  value: string;
}

export interface ExpertProfileSocial {
  label: string;
  url: string;
}

export interface ExpertProfileRow {
  slug: string;
  headline: string | null;
  bio: string | null;
  /** 自訂關鍵數據(expert_profiles.stats);無 → [],consumer 唔顯示該區 */
  stats: ExpertProfileStat[];
  /** Social IP 連結(expert_profiles.socials);無 → [],consumer 回落 experts.ts */
  socials: ExpertProfileSocial[];
  /** 精選情報 items.id 列表(優先按此排序);無 → [] */
  featuredIds: string[];
}

/** 真實動態統計(全部 Supabase count 真查;失敗項 = 0) */
export interface ExpertLiveStats {
  /** 分身對話數 — conversations where persona = slug */
  conversations: number;
  /** 已發佈情報數 — items where expert_slug = slug + status = published */
  insights: number;
  /** 知識庫條目數 — expert_knowledge where expert_slug = slug + status = active(表未建時 0) */
  knowledge: number;
}

/** Top 3 精選情報卡片用嘅最小欄位集 */
export interface ExpertInsight {
  id: string;
  title: string;
  summary: string | null;
  originalUrl: string | null;
  publishedAt: string | null;
}

/* ---------------- jsonb 安全解析(唔信 DB 形狀,逐項驗證) ---------------- */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function cleanStr(x: unknown): string | null {
  return typeof x === "string" && x.trim() !== "" ? x.trim() : null;
}

function parseStats(raw: unknown): ExpertProfileStat[] {
  if (!Array.isArray(raw)) return [];
  const out: ExpertProfileStat[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const label = cleanStr(item.label);
    const value = cleanStr(item.value);
    if (label && value) out.push({ label, value });
  }
  return out;
}

function parseSocials(raw: unknown): ExpertProfileSocial[] {
  if (!Array.isArray(raw)) return [];
  const out: ExpertProfileSocial[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const label = cleanStr(item.label);
    const url = cleanStr(item.url);
    // 只收 http(s) 真實連結,其他一律 drop(防 javascript: 之類)
    if (label && url && /^https?:\/\//i.test(url)) out.push({ label, url });
  }
  return out;
}

function parseFeaturedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

/* ---------------- 查詢 ---------------- */

/**
 * 讀 expert_profiles 單行。失敗 / 無行 → null(consumer 回落 experts.ts)。
 */
export async function fetchExpertProfile(
  slug: string
): Promise<ExpertProfileRow | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("expert_profiles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
      slug,
      headline: cleanStr(row.headline),
      bio: cleanStr(row.bio),
      stats: parseStats(row.stats),
      socials: parseSocials(row.socials),
      featuredIds: parseFeaturedIds(row.featured_ids),
    };
  } catch {
    return null;
  }
}

/**
 * 三條真實動態統計 count 查詢並行;任何一條失敗 → 該項靜默 0。
 * (conversations RLS:anon 可讀匿名對話;items:published 公開;expert_knowledge
 *  表未建時 PostgREST 報錯 → 0)
 */
export async function fetchExpertLiveStats(
  slug: string
): Promise<ExpertLiveStats> {
  const zero: ExpertLiveStats = { conversations: 0, insights: 0, knowledge: 0 };
  if (!supabase) return zero;
  const client = supabase;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countSafe = async (table: string, apply: (q: any) => any): Promise<number> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = client.from(table).select("id", { count: "exact", head: true });
      q = apply(q);
      const { count, error } = await q;
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const [conversations, insights, knowledge] = await Promise.all([
    countSafe("conversations", (q) => q.eq("persona", slug)),
    countSafe("items", (q) => q.eq("expert_slug", slug).eq("status", "published")),
    countSafe("expert_knowledge", (q) =>
      q.eq("expert_slug", slug).eq("status", "active")
    ),
  ]);
  return { conversations, insights, knowledge };
}

/**
 * Top 3 精選情報:items where expert_slug = slug + status = published,
 * 按 published_at desc;featured_ids 有值時優先按佢嘅次序排最前。
 * 零 published → [](consumer 顯示誠實空態,唔虛構內容)。
 */
export async function fetchExpertTopInsights(
  slug: string,
  featuredIds: string[]
): Promise<ExpertInsight[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("items")
      .select("id,title,summary,original_url,published_at")
      .eq("expert_slug", slug)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(50);
    if (error || !data) return [];

    const rows = (
      data as {
        id: string;
        title: string | null;
        summary: string | null;
        original_url: string | null;
        published_at: string | null;
      }[]
    )
      .filter((r) => r.id && r.title)
      .map((r) => ({
        id: r.id,
        title: r.title as string,
        summary: r.summary,
        originalUrl: r.original_url,
        publishedAt: r.published_at,
      }));

    if (featuredIds.length > 0) {
      const rank = new Map(featuredIds.map((id, i) => [id, i]));
      rows.sort((a, b) => {
        const ra = rank.get(a.id) ?? Number.POSITIVE_INFINITY;
        const rb = rank.get(b.id) ?? Number.POSITIVE_INFINITY;
        if (ra !== rb) return ra - rb;
        // 同為非精選 → 保持 published_at desc
        return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
      });
    }
    return rows.slice(0, 3);
  } catch {
    return [];
  }
}

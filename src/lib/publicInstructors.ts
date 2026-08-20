import { experts as editorialExperts, type Expert, type RadarDimension } from "@/data/experts";
import { supabase } from "@/lib/supabase";

export interface PublicInstructorRow {
  id: string;
  slug: string;
  display_name: string;
  name_en: string | null;
  name_zh: string | null;
  title: string | null;
  bio: string | null;
  brand_color: string | null;
  specialties: string[] | null;
  quote: string | null;
  credential: string | null;
  verified: boolean;
  radar: unknown;
  traits: string[] | null;
  public_profile_enabled: boolean;
  greeting: string | null;
  chat_ready: boolean;
}

export interface PublicInstructor {
  id: string;
  expert: Expert;
  greeting: string;
  chatReady: boolean;
}

function validSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function radarDimensions(value: unknown): RadarDimension[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object"
  ).flatMap((item) => {
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const score = typeof item.score === "number" ? item.score : Number(item.score);
    const note = typeof item.note === "string" ? item.note.trim() : "";
    if (!label || !Number.isFinite(score)) return [];
    return [{ label, score: Math.max(0, Math.min(100, score)), note }];
  });
  return rows.length ? rows : undefined;
}

export function normalizePublicInstructor(
  row: PublicInstructorRow,
  editorial = editorialExperts.find((item) => item.slug === row.slug)
): PublicInstructor {
  const nameEn = row.name_en?.trim() || editorial?.nameEn || row.display_name.trim();
  const nameZh = row.name_zh?.trim() || editorial?.nameZh || "";
  const specialties = row.specialties?.filter(Boolean) ?? editorial?.specialties ?? [];
  const chatReady = row.chat_ready === true;
  const expert: Expert = {
    ...editorial,
    slug: row.slug,
    nameEn,
    nameZh,
    title: row.title?.trim() || editorial?.title || "AIGRO 領航專家",
    image: editorial?.image ?? "",
    verified: row.verified === true,
    specialties,
    quote: row.quote?.trim() || editorial?.quote,
    brandColor: row.brand_color?.trim() || editorial?.brandColor,
    credential: row.credential?.trim() || editorial?.credential,
    bio: row.bio?.trim() || editorial?.bio || "",
    radar: radarDimensions(row.radar) ?? editorial?.radar,
    traits: row.traits?.filter(Boolean) ?? editorial?.traits,
    transparency: editorial?.transparency ??
      "此 AI 導師優先使用已批准、可追溯嘅授權內容回答；未有足夠來源時會清楚標明一般知識回覆，唔會將內容冒充真人觀點。",
    askIntro: editorial?.askIntro ??
      "優先基於已批准知識回答；命中來源時會顯示引用，資料不足會標明一般知識並建議補充資料或預約真人導師。",
    pendingNote: chatReady
      ? editorial?.pendingNote
      : "AI 導師仍在完成知識、角色評估或服務設定；公開檔案可瀏覽，聊天暫未開放。",
  };

  return {
    id: row.id,
    expert,
    greeting: row.greeting?.trim() ||
      `你好，我係 ${nameEn} 嘅授權 AI 導師版本。你想由邊個問題開始？`,
    chatReady,
  };
}

export function mergePublicInstructors(rows: PublicInstructorRow[]): PublicInstructor[] {
  return rows
    .filter((row) => row.public_profile_enabled && validSlug(row.slug) && row.slug !== "platform")
    .map((row) => normalizePublicInstructor(row));
}

export async function fetchPublicInstructors(): Promise<PublicInstructor[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_public_instructors");
  if (error) throw new Error(error.message);
  return mergePublicInstructors((data ?? []) as PublicInstructorRow[]);
}

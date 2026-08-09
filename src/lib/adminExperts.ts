import { supabase } from "@/lib/supabase";
import type { Expert, RadarDimension } from "@/data/experts";

export interface AdminExpertRecord {
  id: string;
  slug: string;
  display_name: string;
  name_en: string | null;
  name_zh: string | null;
  title: string | null;
  bio: string | null;
  brand_color: string | null;
  specialties: string[];
  quote: string | null;
  credential: string | null;
  verified: boolean;
  radar: unknown;
  traits: string[];
  status: string;
  owner_user_id: string | null;
  public_profile_enabled: boolean;
  invitation_status: string | null;
  invitation_email: string | null;
  invitation_expires_at: string | null;
}

export interface SaveAdminExpertInput {
  id: string | null;
  slug: string;
  displayName: string;
  nameEn: string;
  nameZh: string;
  title: string;
  bio: string;
  brandColor: string;
  specialties: string[];
  quote: string;
  credential: string;
  verified: boolean;
  radar: RadarDimension[];
  traits: string[];
}

function parseRadar(value: unknown): RadarDimension[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.label !== "string" || typeof row.score !== "number") return [];
    return [{
      label: row.label,
      score: Math.min(100, Math.max(0, row.score)),
      note: typeof row.note === "string" ? row.note : "",
    }];
  });
}

export function adminExpertToView(
  row: AdminExpertRecord,
  staticExperts: Expert[]
): Expert {
  const fallback = staticExperts.find((expert) => expert.slug === row.slug);
  return {
    ...(fallback ?? {}),
    slug: row.slug,
    nameEn: row.name_en || fallback?.nameEn || row.display_name,
    nameZh: row.name_zh ?? fallback?.nameZh ?? "",
    title: row.title || fallback?.title || "領航導師草稿",
    image: fallback?.image ?? "",
    verified: row.verified && row.status === "active",
    specialties: row.specialties.length > 0 ? row.specialties : (fallback?.specialties ?? []),
    quote: row.quote ?? fallback?.quote,
    credential: row.credential ?? fallback?.credential,
    bio: row.bio ?? fallback?.bio,
    brandColor: row.brand_color ?? fallback?.brandColor,
    radar: parseRadar(row.radar).length > 0 ? parseRadar(row.radar) : fallback?.radar,
    traits: row.traits.length > 0 ? row.traits : fallback?.traits,
    pendingNote: row.status === "active"
      ? fallback?.pendingNote
      : "草稿已安全儲存於 Supabase；完成知識蒸餾、角色評估同審批後先可以 Verified 上線。",
  };
}

export async function fetchAdminExperts(): Promise<AdminExpertRecord[]> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data, error } = await supabase
    .from("experts")
    .select("id,slug,display_name,name_en,name_zh,title,bio,brand_color,specialties,quote,credential,verified,radar,traits,status,owner_user_id,public_profile_enabled")
    .neq("slug", "platform")
    .is("archived_at", null)
    .order("created_at");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Omit<AdminExpertRecord,
    "invitation_status" | "invitation_email" | "invitation_expires_at">>;
  if (rows.length === 0) return [];
  const { data: invitations, error: invitationError } = await supabase
    .from("expert_invitations")
    .select("expert_id,email,status,expires_at,created_at")
    .in("expert_id", rows.map((row) => row.id))
    .order("created_at", { ascending: false });
  if (invitationError) throw new Error(invitationError.message);
  const latest = new Map<string, Record<string, unknown>>();
  for (const invitation of invitations ?? []) {
    const row = invitation as Record<string, unknown>;
    const expertId = String(row.expert_id ?? "");
    if (expertId && !latest.has(expertId)) latest.set(expertId, row);
  }
  return rows.map((row) => {
    const invitation = latest.get(row.id);
    return {
      ...row,
      invitation_status: typeof invitation?.status === "string" ? invitation.status : null,
      invitation_email: typeof invitation?.email === "string" ? invitation.email : null,
      invitation_expires_at:
        typeof invitation?.expires_at === "string" ? invitation.expires_at : null,
    };
  });
}

export async function saveAdminExpert(input: SaveAdminExpertInput): Promise<string> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data, error } = await supabase.rpc("upsert_admin_expert", {
    p_expert_id: input.id,
    p_slug: input.slug,
    p_display_name: input.displayName,
    p_name_en: input.nameEn,
    p_name_zh: input.nameZh,
    p_title: input.title,
    p_bio: input.bio,
    p_brand_color: input.brandColor,
    p_specialties: input.specialties,
    p_quote: input.quote,
    p_credential: input.credential,
    p_verified: input.verified,
    p_radar: input.radar,
    p_traits: input.traits,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "string") throw new Error("導師儲存回應格式無效");
  return data;
}

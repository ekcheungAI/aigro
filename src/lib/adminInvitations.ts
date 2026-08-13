import { supabase } from "@/lib/supabase";

export type InvitationMemberClass = "free" | "founding";
export type InvitationTier = "free" | "pro" | "vip";

export interface AdminInvitationInput {
  email: string;
  name: string;
  memberClass: InvitationMemberClass;
  tier: InvitationTier;
  personalMessage?: string;
}

export type SendInvitationResult =
  | { ok: true; invitationId: string }
  | { ok: false; code: string; error: string };

export async function sendAdminInvitation(input: AdminInvitationInput): Promise<SendInvitationResult> {
  if (!supabase) return { ok: false, code: "supabase_unavailable", error: "Supabase 未連接" };
  const body = {
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    memberClass: input.memberClass,
    tier: input.tier,
    ...(input.personalMessage?.trim() ? { personalMessage: input.personalMessage.trim() } : {}),
  };
  const { data, error } = await supabase.functions.invoke("admin-send-invite", { body });
  const response = data as {
    invitation?: { id?: string };
    code?: string;
    error?: string;
  } | null;

  if (error || !response?.invitation?.id) {
    return {
      ok: false,
      code: response?.code ?? "invite_failed",
      error: response?.error ?? "暫時未能發送邀請，請稍後再試。",
    };
  }
  return { ok: true, invitationId: response.invitation.id };
}

export async function resendAdminInvitation(invitationId: string): Promise<SendInvitationResult> {
  if (!supabase) return { ok: false, code: "supabase_unavailable", error: "Supabase 未連接" };
  const { data, error } = await supabase.functions.invoke("admin-send-invite", {
    body: { invitationId },
  });
  const response = data as {
    invitation?: { id?: string };
    code?: string;
    error?: string;
  } | null;
  if (error || !response?.invitation?.id) {
    return {
      ok: false,
      code: response?.code ?? "resend_failed",
      error: response?.error ?? "暫時未能重新發送邀請。",
    };
  }
  return { ok: true, invitationId: response.invitation.id };
}

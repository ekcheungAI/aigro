import { createClient } from "@supabase/supabase-js";
import {
  parseInvitationId,
  parseInvitationInput,
  renderInvitationEmail,
} from "../_shared/invitations.ts";

const DEFAULT_ORIGINS = [
  "https://aigro.io",
  "https://www.aigro.io",
  "https://aigro-blue.vercel.app",
  "http://localhost:3000",
];

function allowedOrigins(): Set<string> {
  return new Set(
    (Deno.env.get("ALLOWED_ORIGINS") ?? DEFAULT_ORIGINS.join(","))
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (allowedOrigins().has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

function serverConfiguration() {
  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_INVITE_FROM_EMAIL") ??
    Deno.env.get("RESEND_FROM_EMAIL");
  const replyTo = Deno.env.get("RESEND_REPLY_TO");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "https://aigro.io").replace(/\/+$/, "");
  if (!url || !publishableKey || !secretKey || !resendKey || !from) return null;
  return { url, publishableKey, secretKey, resendKey, from, replyTo, siteUrl };
}

function inviteExpiryHours(): number {
  const configured = Number(Deno.env.get("INVITE_EXPIRY_HOURS") ?? "1");
  return Number.isFinite(configured) && configured > 0 && configured <= 168
    ? configured
    : 1;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const config = serverConfiguration();
  if (!config) {
    return json(request, {
      code: "email_not_configured",
      error: "邀請郵件服務尚未完成設定。",
    }, 503);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(request, { code: "unauthorized", error: "請先登入。" }, 401);
  }

  const callerClient = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  });
  const [{ data: userData, error: userError }, { data: isSuperAdmin, error: roleError }] =
    await Promise.all([
      callerClient.auth.getUser(),
      callerClient.rpc("is_super_admin"),
    ]);
  const caller = userData.user;
  if (userError || roleError || !caller || isSuperAdmin !== true) {
    return json(request, {
      code: "super_admin_required",
      error: "只有最高管理員可以發送會員邀請。",
    }, 403);
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const admin = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: inviterProfile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", caller.id)
    .maybeSingle();
  const inviterName = inviterProfile?.name?.trim() || "AIGRO 團隊";
  const expiresAt = new Date(Date.now() + inviteExpiryHours() * 60 * 60 * 1000).toISOString();
  const resendId = body?.invitationId === undefined
    ? null
    : parseInvitationId(body.invitationId);
  if (resendId && !resendId.ok) {
    return json(request, { code: resendId.code, error: resendId.error }, 400);
  }

  let invitation;
  let invitationInput;
  let isResend = false;
  if (resendId?.ok) {
    const { data: existing, error: existingError } = await admin
      .from("invitations")
      .select("id,email,name,member_class,tier,personal_message,status,delivery_status,send_count,sent_at,expires_at,created_at")
      .eq("id", resendId.value)
      .maybeSingle();
    if (existingError || !existing) {
      return json(request, { code: "invite_not_found", error: "找不到呢封邀請。" }, 404);
    }
    if (["accepted", "revoked"].includes(existing.status)) {
      return json(request, {
        code: "invite_not_resendable",
        error: existing.status === "accepted" ? "呢封邀請已經接受。" : "呢封邀請已經撤回。",
      }, 409);
    }
    const parsedExisting = parseInvitationInput({
      email: existing.email,
      name: existing.name,
      memberClass: existing.member_class,
      tier: existing.tier,
      personalMessage: existing.personal_message,
    });
    if (!parsedExisting.ok) {
      return json(request, { code: "stored_invite_invalid", error: "邀請資料未能通過驗證。" }, 500);
    }
    invitation = existing;
    invitationInput = parsedExisting.value;
    isResend = true;
    const { error: queueError } = await admin.from("invitations").update({
      status: "pending",
      delivery_status: "queued",
      expires_at: expiresAt,
      last_error_code: null,
    }).eq("id", existing.id);
    if (queueError) {
      const duplicate = queueError.code === "23505";
      return json(request, {
        code: duplicate ? "invite_exists" : "invite_update_failed",
        error: duplicate
          ? "呢個電郵已有另一封尚未完成嘅邀請。"
          : "暫時未能更新邀請記錄。",
      }, duplicate ? 409 : 500);
    }
  } else {
    const parsed = parseInvitationInput(body);
    if (!parsed.ok) return json(request, { code: parsed.code, error: parsed.error }, 400);
    invitationInput = parsed.value;
    const { data: created, error: invitationError } = await admin
      .from("invitations")
      .insert({
        email: invitationInput.email,
        name: invitationInput.name,
        invited_by: caller.id,
        member_class: invitationInput.memberClass,
        tier: invitationInput.tier,
        personal_message: invitationInput.personalMessage,
        expires_at: expiresAt,
      })
      .select("id,email,name,member_class,tier,personal_message,status,delivery_status,send_count,sent_at,expires_at,created_at")
      .single();
    if (invitationError || !created) {
      const duplicate = invitationError?.code === "23505";
      return json(request, {
        code: duplicate ? "invite_exists" : "invite_record_failed",
        error: duplicate
          ? "呢個電郵已有尚未完成嘅邀請。"
          : "暫時未能建立邀請記錄。",
      }, duplicate ? 409 : 500);
    }
    invitation = created;
  }

  const nextSendCount = invitation.send_count + 1;

  const redirectTo = `${config.siteUrl}/reset-password?invite=1`;
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: invitationInput.email,
    options: {
      data: { name: invitationInput.name },
      redirectTo,
    },
  });

  if (linkError || !linkData.properties?.action_link || !linkData.user?.id) {
    await admin.from("invitations").update({
      status: "failed",
      delivery_status: "failed",
      last_error_code: linkError?.code ?? "auth_link_failed",
    }).eq("id", invitation.id);
    return json(request, {
      code: linkError?.code === "email_exists" ? "already_registered" : "auth_link_failed",
      error: linkError?.code === "email_exists"
        ? "呢個電郵已經有 AIGRO 帳號。"
        : "暫時未能建立安全邀請連結。",
    }, linkError?.code === "email_exists" ? 409 : 502);
  }

  await admin.from("invitations").update({
    auth_user_id: linkData.user.id,
  }).eq("id", invitation.id);

  const email = renderInvitationEmail({
    recipientName: invitationInput.name,
    inviterName,
    actionUrl: linkData.properties.action_link,
    personalMessage: invitationInput.personalMessage,
  });
  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `aigro-invite-${invitation.id}-${nextSendCount}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [invitationInput.email],
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: "category", value: "member-invitation" }],
    }),
  });
  const sendResult = await sendResponse.json().catch(() => ({})) as {
    id?: string;
    name?: string;
  };

  if (!sendResponse.ok || !sendResult.id) {
    await admin.from("invitations").update({
      status: "failed",
      delivery_status: "failed",
      last_error_code: sendResult.name ?? `resend_http_${sendResponse.status}`,
    }).eq("id", invitation.id);
    return json(request, {
      code: "email_send_failed",
      error: "邀請已建立，但郵件暫時未能送出。請稍後重試。",
    }, 502);
  }

  const sentAt = new Date().toISOString();
  const { data: sentInvitation } = await admin
    .from("invitations")
    .update({
      status: "sent",
      delivery_status: "sent",
      provider_message_id: sendResult.id,
      sent_at: invitation.sent_at ?? sentAt,
      last_sent_at: sentAt,
      send_count: nextSendCount,
      last_error_code: null,
    })
    .eq("id", invitation.id)
    .select("id,email,name,status,delivery_status,expires_at,created_at")
    .single();

  await admin.from("audit_events").insert({
    actor_id: caller.id,
    action: isResend ? "invitation.resent" : "invitation.sent",
    entity_type: "invitation",
    entity_id: invitation.id,
    metadata: { member_class: invitationInput.memberClass, tier: invitationInput.tier },
  });

  return json(request, { invitation: sentInvitation ?? invitation }, isResend ? 200 : 201);
});

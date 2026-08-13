import { createClient } from "@supabase/supabase-js";
import { Webhook } from "svix";
import { deliveryStatusForEvent } from "../_shared/invitations.ts";

interface ResendEvent {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
  };
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const admin = serviceClient();
  if (!webhookSecret || !admin) {
    return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const payload = await request.text();
  let event: ResendEvent;
  try {
    event = new Webhook(webhookSecret).verify(payload, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as ResendEvent;
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const deliveryStatus = event.type ? deliveryStatusForEvent(event.type) : null;
  const providerMessageId = event.data?.email_id;
  if (!deliveryStatus || !providerMessageId) return Response.json({ ignored: true });

  const { data: invitation } = await admin
    .from("invitations")
    .select("id,status")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (!invitation) return Response.json({ ignored: true });

  const occurredAt = event.created_at ?? new Date().toISOString();
  const lifecycleStatus = invitation.status === "accepted"
    ? "accepted"
    : deliveryStatus === "delivered"
    ? "delivered"
    : ["bounced", "complained", "failed"].includes(deliveryStatus)
    ? "failed"
    : invitation.status;
  const update: Record<string, unknown> = {
    status: lifecycleStatus,
    delivery_status: deliveryStatus,
    last_error_code: ["bounced", "complained", "failed"].includes(deliveryStatus)
      ? deliveryStatus
      : null,
  };
  if (deliveryStatus === "delivered") update.delivered_at = occurredAt;

  await admin.from("invitations").update(update).eq("id", invitation.id);
  await admin.from("audit_events").insert({
    actor_id: null,
    action: `invitation.email.${deliveryStatus}`,
    entity_type: "invitation",
    entity_id: invitation.id,
    metadata: { provider: "resend" },
  });

  return Response.json({ received: true });
});

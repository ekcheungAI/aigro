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
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const admin = serviceClient();
  if (!webhookSecret || !admin) {
    return json({ error: "Webhook is not configured" }, 503);
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
    return json({ error: "Invalid webhook signature" }, 401);
  }

  const deliveryStatus = event.type ? deliveryStatusForEvent(event.type) : null;
  const providerMessageId = event.data?.email_id;
  if (!deliveryStatus || !providerMessageId) return json({ ignored: true });

  const { data: invitation, error: invitationError } = await admin
    .from("invitations")
    .select("id,status")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (invitationError) return json({ error: "Invitation lookup failed" }, 500);
  if (!invitation) return json({ ignored: true });

  const occurredAt = event.created_at ?? new Date().toISOString();
  const failedDelivery = ["bounced", "complained", "failed", "suppressed"]
    .includes(
      deliveryStatus,
    );
  const lifecycleStatus = invitation.status === "accepted"
    ? "accepted"
    : deliveryStatus === "delivered"
    ? "delivered"
    : failedDelivery
    ? "failed"
    : invitation.status;
  const update: Record<string, unknown> = {
    status: lifecycleStatus,
    delivery_status: deliveryStatus,
    last_error_code: failedDelivery ? deliveryStatus : null,
  };
  if (deliveryStatus === "delivered") update.delivered_at = occurredAt;

  const { error: updateError } = await admin
    .from("invitations")
    .update(update)
    .eq("id", invitation.id);
  if (updateError) return json({ error: "Invitation update failed" }, 500);

  const { error: auditError } = await admin.from("audit_events").insert({
    actor_id: null,
    action: `invitation.email.${deliveryStatus}`,
    entity_type: "invitation",
    entity_id: invitation.id,
    metadata: { provider: "resend" },
  });
  if (auditError) return json({ error: "Invitation audit failed" }, 500);

  return json({ received: true });
});

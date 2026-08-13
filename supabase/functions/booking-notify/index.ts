import {
  bookingSubject,
  renderBookingEmail,
} from "../_shared/booking-email.ts";

interface BookingWebhook {
  type?: "INSERT" | "UPDATE";
  table?: string;
  record?: {
    id?: string;
    member_id?: string;
    expert_id?: string;
    starts_at?: string;
    ends_at?: string;
    status?: string;
    meeting_url?: string | null;
  };
  old_record?: { status?: string; meeting_url?: string | null };
}

function authorized(request: Request): boolean {
  const expected = Deno.env.get("BOOKING_WEBHOOK_SECRET");
  return Boolean(expected && request.headers.get("x-webhook-secret") === expected);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const payload = await request.json() as BookingWebhook;
  const booking = payload.record;
  if (payload.table !== "bookings" || !booking?.id || !booking.member_id || !booking.starts_at) {
    return Response.json({ ignored: true });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  const replyTo = Deno.env.get("RESEND_REPLY_TO");
  if (!supabaseUrl || !serviceKey || !resendKey || !from) {
    return Response.json({ error: "Notification provider is not configured" }, { status: 503 });
  }
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${booking.member_id}`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  const user = await userResponse.json().catch(() => ({})) as { email?: string };
  if (!userResponse.ok || !user.email) {
    return Response.json({ error: "Booking member email unavailable" }, { status: 422 });
  }

  const recipients = new Set([user.email]);
  if (booking.expert_id && ["requested", "cancelled_member"].includes(booking.status ?? "")) {
    const expertResponse = await fetch(
      `${supabaseUrl}/rest/v1/experts?select=owner_user_id&id=eq.${encodeURIComponent(booking.expert_id)}&limit=1`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
    );
    const experts = await expertResponse.json().catch(() => []) as Array<{ owner_user_id?: string }>;
    const ownerId = experts[0]?.owner_user_id;
    if (expertResponse.ok && ownerId) {
      const ownerResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${ownerId}`, {
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      });
      const owner = await ownerResponse.json().catch(() => ({})) as { email?: string };
      if (ownerResponse.ok && owner.email) recipients.add(owner.email);
    }
  }

  const action = booking.status ?? "updated";
  const email = renderBookingEmail({
    status: action,
    startsAt: booking.starts_at,
    meetingUrl: booking.meeting_url,
    accountUrl: "https://aigro.io/account",
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [...recipients],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: bookingSubject(action),
      html: email.html,
      text: email.text,
    }),
  });
  const result = await response.json().catch(() => ({}));
  return Response.json(result, { status: response.ok ? 200 : response.status });
});

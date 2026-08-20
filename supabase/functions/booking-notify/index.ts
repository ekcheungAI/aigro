import {
  type BookingAudience,
  renderBookingEmail,
} from "../_shared/booking-email.ts";

interface BookingRecord {
  id?: string;
  member_id?: string;
  expert_id?: string;
  starts_at?: string;
  ends_at?: string;
  status?: string;
  meeting_url?: string | null;
}

interface BookingWebhook {
  type?: "INSERT" | "UPDATE";
  table?: string;
  record?: BookingRecord;
  old_record?: BookingRecord | null;
}

interface Recipient {
  audience: BookingAudience;
  email: string;
  accountUrl: string;
}

function authorized(request: Request): boolean {
  const expected = Deno.env.get("BOOKING_WEBHOOK_SECRET");
  return Boolean(
    expected && request.headers.get("x-webhook-secret") === expected,
  );
}

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") && email.length <= 254 ? email : null;
}

async function eventDigest(
  booking: BookingRecord,
  previous: BookingRecord | null | undefined,
  audience: BookingAudience,
): Promise<string> {
  const input = JSON.stringify([
    booking.id,
    booking.status,
    booking.meeting_url ?? null,
    previous?.status ?? null,
    previous?.meeting_url ?? null,
    audience,
  ]);
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)),
  );
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json().catch(() => null) as
    | BookingWebhook
    | null;
  const booking = payload?.record;
  if (
    payload?.table !== "bookings" ||
    !booking?.id ||
    !booking.member_id ||
    !booking.starts_at
  ) {
    return Response.json({ ignored: true });
  }
  if (
    payload.type === "UPDATE" &&
    payload.old_record?.status === booking.status &&
    (payload.old_record?.meeting_url ?? null) === (booking.meeting_url ?? null)
  ) {
    return Response.json({ ignored: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  const replyTo = Deno.env.get("RESEND_REPLY_TO");
  const siteUrl = (
    Deno.env.get("SITE_URL") ??
      Deno.env.get("PUBLIC_SITE_URL") ??
      "https://aigro.io"
  ).replace(/\/+$/, "");
  if (!supabaseUrl || !serviceKey || !resendKey || !from) {
    return Response.json({ error: "Notification provider is not configured" }, {
      status: 503,
    });
  }

  const userResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${booking.member_id}`,
    {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    },
  );
  const user = await userResponse.json().catch(() => ({})) as {
    email?: string;
  };
  const memberEmail = normalizedEmail(user.email);
  if (!userResponse.ok || !memberEmail) {
    return Response.json({ error: "Booking member email unavailable" }, {
      status: 422,
    });
  }

  const recipients = new Map<string, Recipient>();
  recipients.set(memberEmail, {
    audience: "member",
    email: memberEmail,
    accountUrl: `${siteUrl}/account`,
  });

  if (
    booking.expert_id &&
    ["requested", "cancelled_member"].includes(booking.status ?? "")
  ) {
    const expertResponse = await fetch(
      `${supabaseUrl}/rest/v1/experts?select=owner_user_id&id=eq.${
        encodeURIComponent(booking.expert_id)
      }&limit=1`,
      {
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      },
    );
    if (!expertResponse.ok) {
      return Response.json({ error: "Booking expert unavailable" }, {
        status: 502,
      });
    }
    const experts = await expertResponse.json().catch(() => []) as Array<{
      owner_user_id?: string;
    }>;
    const ownerId = experts[0]?.owner_user_id;
    if (ownerId) {
      const ownerResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${ownerId}`,
        {
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        },
      );
      const owner = await ownerResponse.json().catch(() => ({})) as {
        email?: string;
      };
      const ownerEmail = normalizedEmail(owner.email);
      if (!ownerResponse.ok || !ownerEmail) {
        return Response.json({ error: "Booking expert email unavailable" }, {
          status: 502,
        });
      }
      if (!recipients.has(ownerEmail)) {
        recipients.set(ownerEmail, {
          audience: "expert",
          email: ownerEmail,
          accountUrl: `${siteUrl}/portal/bookings`,
        });
      }
    }
  }

  let sent = 0;
  let failed = 0;
  for (const recipient of recipients.values()) {
    const email = renderBookingEmail({
      status: booking.status ?? "updated",
      startsAt: booking.starts_at,
      meetingUrl: booking.meeting_url,
      accountUrl: recipient.accountUrl,
      audience: recipient.audience,
    });
    const digest = await eventDigest(
      booking,
      payload.old_record,
      recipient.audience,
    );
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `aigro-booking-${booking.id}-${recipient.audience}-${
          digest.slice(0, 24)
        }`,
      },
      body: JSON.stringify({
        from,
        to: [recipient.email],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [
          { name: "category", value: "booking-notification" },
          { name: "audience", value: recipient.audience },
        ],
      }),
    });
    if (response.ok) sent += 1;
    else failed += 1;
  }

  if (failed > 0) {
    return Response.json(
      { error: "One or more booking notifications failed", sent, failed },
      { status: 502 },
    );
  }
  return Response.json({ sent });
});

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

function hkTime(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

function subject(status: string): string {
  const labels: Record<string, string> = {
    requested: "已收到你嘅導師預約申請",
    confirmed: "導師預約已確認",
    declined: "導師未能接受今次預約",
    cancelled_member: "你已取消導師預約",
    cancelled_expert: "導師已取消預約",
  };
  return labels[status] ?? "AIGRO 導師預約更新";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
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
  const detail = [
    `<p>預約時間：${hkTime(booking.starts_at)}</p>`,
    booking.meeting_url
      ? `<p>會面連結：<a href="${escapeHtml(booking.meeting_url)}">${escapeHtml(booking.meeting_url)}</a></p>`
      : "<p>會面連結會由導師確認後提供。</p>",
    '<p><a href="https://aigro-blue.vercel.app/account">到會員專區查看</a></p>',
  ].join("");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [...recipients],
      subject: subject(action),
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1 style="font-size:22px">${subject(action)}</h1>${detail}</div>`,
    }),
  });
  const result = await response.json().catch(() => ({}));
  return Response.json(result, { status: response.ok ? 200 : response.status });
});

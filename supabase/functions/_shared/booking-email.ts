export function bookingSubject(status: string): string {
  const labels: Record<string, string> = {
    requested: "已收到你嘅導師預約申請",
    confirmed: "導師預約已確認",
    declined: "導師未能接受今次預約",
    cancelled_member: "你已取消導師預約",
    cancelled_expert: "導師已取消預約",
  };
  return labels[status] ?? "AIGRO 導師預約更新";
}

function hkTime(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
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

export function renderBookingEmail({
  status,
  startsAt,
  meetingUrl,
  accountUrl,
}: {
  status: string;
  startsAt: string;
  meetingUrl?: string | null;
  accountUrl: string;
}): { html: string; text: string } {
  const subject = bookingSubject(status);
  const time = hkTime(startsAt);
  const safeMeetingUrl = meetingUrl ? escapeHtml(meetingUrl) : null;
  const safeAccountUrl = escapeHtml(accountUrl);
  const meetingHtml = safeMeetingUrl
    ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.7"><a href="${safeMeetingUrl}" style="color:#1F7A06">${safeMeetingUrl}</a></p>`
    : '<p style="margin:8px 0 0;font-size:15px;line-height:1.7;color:#676B65">會面連結會由導師確認後提供。</p>';
  const meetingText = meetingUrl
    ? `會面連結：${meetingUrl}`
    : "會面連結會由導師確認後提供。";

  const html = `<!doctype html>
<html lang="zh-HK"><body style="margin:0;background:#F3F5F1;color:#0D0D0C;font-family:Inter,'Noto Sans TC',Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#F3F5F1"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #D9DDD6;background:#FFFFFF">
<tr><td style="padding:24px 32px;background:#0D0D0C;color:#FFFFFF;font-size:23px;font-weight:700;letter-spacing:.04em">AIGRO</td></tr>
<tr><td style="padding:36px 32px">
<p style="margin:0 0 12px;color:#1F7A06;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Mentor booking</p>
<h1 style="margin:0 0 24px;font-family:Georgia,'Noto Serif TC',serif;font-size:30px;line-height:1.3;font-weight:600">${subject}</h1>
<p style="margin:0;font-size:13px;color:#676B65">預約時間</p><p style="margin:6px 0 20px;font-size:17px;font-weight:600;line-height:1.6">${time}</p>
<p style="margin:0;font-size:13px;color:#676B65">會面安排</p>${meetingHtml}
<p style="margin:24px 0 0"><a href="${safeAccountUrl}" style="display:inline-block;background:#43F50E;color:#0D0D0C;padding:13px 22px;text-decoration:none;font-size:15px;font-weight:700">查看會員專區</a></p>
</td></tr><tr><td style="padding:20px 32px;border-top:1px solid #D9DDD6;font-size:12px;color:#676B65">AIGRO · AI + Growth · Hong Kong</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${subject}\n\n預約時間：${time}\n${meetingText}\n\n查看會員專區：${accountUrl}`;
  return { html, text };
}

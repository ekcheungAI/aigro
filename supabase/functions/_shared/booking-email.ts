export type BookingAudience = "member" | "expert";

const MEMBER_SUBJECTS: Record<string, string> = {
  requested: "AIGRO 預約｜已收到你嘅導師預約申請",
  confirmed: "AIGRO 預約｜導師已確認預約",
  declined: "AIGRO 預約｜導師未能接受今次預約",
  completed: "AIGRO 預約｜導師預約已完成",
  cancelled_member: "AIGRO 預約｜你已取消導師預約",
  cancelled_expert: "AIGRO 預約｜導師已取消預約",
  no_show: "AIGRO 預約｜預約狀態已更新",
};

const EXPERT_SUBJECTS: Record<string, string> = {
  requested: "AIGRO 預約｜你有新嘅導師預約申請",
  cancelled_member: "AIGRO 預約｜會員已取消預約",
};

export function bookingSubject(
  status: string,
  audience: BookingAudience = "member",
): string {
  const labels = audience === "expert" ? EXPERT_SUBJECTS : MEMBER_SUBJECTS;
  return labels[status] ?? "AIGRO 預約｜預約狀態更新";
}

function bookingMessage(status: string, audience: BookingAudience): string {
  if (audience === "expert") {
    if (status === "requested") {
      return "有會員提交咗新預約申請。請登入導師專區查看詳情並確認安排。";
    }
    if (status === "cancelled_member") {
      return "會員已取消今次預約，導師專區內嘅狀態亦已同步更新。";
    }
    return "預約資料有更新，請登入導師專區查看最新安排。";
  }

  const messages: Record<string, string> = {
    requested: "我哋已收到你嘅預約申請。導師確認後，你會再收到最新安排。",
    confirmed: "導師已確認今次預約。請保存以下時間同會面連結。",
    declined: "導師今次未能接受預約。你可以返回 AIGRO 查看其他導師或時間。",
    completed: "今次導師預約已完成，多謝你使用 AIGRO。",
    cancelled_member: "你已成功取消今次預約，會員專區內嘅狀態亦已同步更新。",
    cancelled_expert:
      "導師已取消今次預約。你可以返回 AIGRO 查看其他導師或時間。",
    no_show:
      "今次預約已標記為未有出席。如你認為狀態有誤，請透過 AIGRO 聯絡團隊。",
  };
  return messages[status] ?? "預約資料有更新，請登入會員專區查看最新安排。";
}

function hkTime(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    ({
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
  audience = "member",
}: {
  status: string;
  startsAt: string;
  meetingUrl?: string | null;
  accountUrl: string;
  audience?: BookingAudience;
}): { subject: string; html: string; text: string } {
  const subject = bookingSubject(status, audience);
  const message = bookingMessage(status, audience);
  const time = hkTime(startsAt);
  const safeMeetingUrl = meetingUrl ? escapeHtml(meetingUrl) : null;
  const safeAccountUrl = escapeHtml(accountUrl);
  const safeMessage = escapeHtml(message);
  const showMeeting = status === "requested" || status === "confirmed";
  const meetingHtml = status === "confirmed" && safeMeetingUrl
    ? `<p style="margin:0;font-size:13px;color:#676B65">會面連結</p><p style="margin:6px 0 0;font-size:15px;line-height:1.7;word-break:break-all"><a href="${safeMeetingUrl}" style="color:#1F7A06">${safeMeetingUrl}</a></p>`
    : status === "requested"
    ? `<p style="margin:0;font-size:13px;color:#676B65">會面安排</p><p style="margin:6px 0 0;font-size:15px;line-height:1.7;color:#343733">${
      audience === "expert"
        ? "確認預約時，請喺導師專區加入會面連結。"
        : "會面連結會由導師確認後提供。"
    }</p>`
    : "";
  const meetingText = status === "confirmed" && meetingUrl
    ? `\n會面連結：${meetingUrl}`
    : status === "requested"
    ? `\n${
      audience === "expert"
        ? "確認預約時，請加入會面連結。"
        : "會面連結會由導師確認後提供。"
    }`
    : "";
  const cta = audience === "expert" ? "處理預約" : "查看會員專區";

  const html = `<!doctype html>
<html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${
    escapeHtml(subject)
  }</title></head>
<body style="margin:0;background:#F3F5F1;color:#0D0D0C;font-family:Inter,'Chiron GoRound TC','PingFang TC','Microsoft JhengHei',Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${safeMessage}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#F3F5F1"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #D9DDD6;background:#FFFFFF">
<tr><td style="padding:24px 32px;background:#0D0D0C;color:#FFFFFF;font-size:23px;font-weight:700;letter-spacing:.04em">AIGRO</td></tr>
<tr><td style="padding:36px 32px">
<p style="margin:0 0 12px;color:#1F7A06;font-size:12px;font-weight:700;letter-spacing:.12em">導師預約</p>
<h1 style="margin:0 0 18px;font-family:Georgia,'Chiron GoRound TC','PingFang TC','Microsoft JhengHei',serif;font-size:30px;line-height:1.3;font-weight:600">${
    escapeHtml(subject.replace("AIGRO 預約｜", ""))
  }</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#343733">${safeMessage}</p>
<p style="margin:0;font-size:13px;color:#676B65">預約時間（香港時間）</p><p style="margin:6px 0 ${
    showMeeting ? "20px" : "0"
  };font-size:17px;font-weight:600;line-height:1.6">${time}</p>
${meetingHtml}
<p style="margin:24px 0 0"><a href="${safeAccountUrl}" style="display:inline-block;background:#43F50E;color:#0D0D0C;padding:13px 22px;text-decoration:none;font-size:15px;font-weight:700">${cta}</a></p>
</td></tr><tr><td style="padding:20px 32px;border-top:1px solid #D9DDD6;font-size:12px;line-height:1.6;color:#676B65">AIGRO · AI + Growth · Hong Kong<br>呢封係系統發出嘅預約通知。</td></tr>
</table></td></tr></table></body></html>`;
  const text =
    `${subject}\n\n${message}\n\n預約時間（香港時間）：${time}${meetingText}\n\n${cta}：${accountUrl}\n\n呢封係系統發出嘅預約通知。`;
  return { subject, html, text };
}

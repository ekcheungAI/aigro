export interface InvitationInput {
  email: string;
  name: string;
  memberClass: "free" | "founding";
  tier: "free" | "pro" | "vip";
  personalMessage: string | null;
}

export type InvitationParseResult =
  | { ok: true; value: InvitationInput }
  | { ok: false; code: string; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEMBER_CLASSES = new Set(["free", "founding"]);
const TIERS = new Set(["free", "pro", "vip"]);

function invalid(code: string, error: string): InvitationParseResult {
  return { ok: false, code, error };
}

export type InvitationIdParseResult =
  | { ok: true; value: string }
  | { ok: false; code: "invalid_invitation_id"; error: string };

export function parseInvitationId(input: unknown): InvitationIdParseResult {
  const value = typeof input === "string" ? input.trim().toLowerCase() : "";
  return UUID_PATTERN.test(value) ? { ok: true, value } : {
    ok: false,
    code: "invalid_invitation_id",
    error: "Invalid invitation id",
  };
}

export function parseInvitationInput(input: unknown): InvitationParseResult {
  if (!input || typeof input !== "object") {
    return invalid("invalid_request", "Invalid request");
  }
  const record = input as Record<string, unknown>;
  const email = typeof record.email === "string"
    ? record.email.trim().toLowerCase()
    : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const memberClass = typeof record.memberClass === "string"
    ? record.memberClass
    : "founding";
  const tier = typeof record.tier === "string" ? record.tier : "free";
  const personalMessage = typeof record.personalMessage === "string"
    ? record.personalMessage.trim()
    : "";

  if (!email || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    return invalid("invalid_email", "請輸入有效電郵地址");
  }
  if (!name || name.length > 80) {
    return invalid("invalid_name", "姓名必須為 1 至 80 個字元");
  }
  if (!MEMBER_CLASSES.has(memberClass)) {
    return invalid("invalid_member_class", "Invalid member class");
  }
  if (!TIERS.has(tier)) return invalid("invalid_tier", "Invalid tier");
  if (personalMessage.length > 1000) {
    return invalid("message_too_long", "Personal message is too long");
  }

  return {
    ok: true,
    value: {
      email,
      name,
      memberClass: memberClass as InvitationInput["memberClass"],
      tier: tier as InvitationInput["tier"],
      personalMessage: personalMessage || null,
    },
  };
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

export function renderInvitationEmail({
  recipientName,
  inviterName,
  actionUrl,
  personalMessage,
  memberClass = "founding",
  tier = "free",
}: {
  recipientName: string;
  inviterName: string;
  actionUrl: string;
  personalMessage?: string | null;
  memberClass?: InvitationInput["memberClass"];
  tier?: InvitationInput["tier"];
}): { subject: string; html: string; text: string } {
  const subject = "AIGRO 專屬邀請｜加入會員專區";
  const safeRecipient = escapeHtml(recipientName);
  const safeInviter = escapeHtml(inviterName);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeMessage = personalMessage ? escapeHtml(personalMessage) : "";
  const membership = `${
    memberClass === "founding" ? "創始會員" : "免費會員"
  } · ${tier === "vip" ? "VIP" : tier === "pro" ? "Pro" : "Free"}`;
  const safeMembership = escapeHtml(membership);
  const messageBlock = safeMessage
    ? `<div style="margin:24px 0;padding:18px 20px;border-left:3px solid #43F50E;background:#F3F5F1;color:#343733;white-space:pre-wrap">${safeMessage}</div>`
    : "";

  const html = `<!doctype html>
<html lang="zh-HK">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${subject}</title></head>
  <body style="margin:0;background:#F3F5F1;color:#0D0D0C;font-family:Inter,'Chiron GoRound TC','PingFang TC','Microsoft JhengHei',Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${safeInviter} 邀請你加入 AIGRO 會員專區。</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F5F1;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #D9DDD6">
          <tr><td style="padding:24px 32px;background:#0D0D0C;color:#FFFFFF;font-size:23px;font-weight:700;letter-spacing:.04em">AIGRO</td></tr>
          <tr><td style="padding:36px 32px">
            <p style="margin:0 0 12px;color:#1F7A06;font-size:12px;font-weight:700;letter-spacing:.12em">專屬邀請</p>
            <h1 style="margin:0 0 20px;font-family:Georgia,'Chiron GoRound TC','PingFang TC','Microsoft JhengHei',serif;font-size:30px;line-height:1.3;font-weight:600">${safeRecipient}，歡迎加入 AIGRO</h1>
            <p style="margin:0 0 14px;font-size:16px;line-height:1.75;color:#343733">${safeInviter} 邀請你加入香港 AI・增長・商業情報平台 AIGRO。</p>
            <p style="margin:18px 0 0;font-size:13px;color:#676B65">邀請方案</p>
            <p style="margin:5px 0 0;font-size:16px;font-weight:700;color:#0D0D0C">${safeMembership}</p>
            ${messageBlock}
            <p style="margin:24px 0"><a href="${safeActionUrl}" style="display:inline-block;background:#43F50E;color:#0D0D0C;padding:13px 22px;text-decoration:none;font-size:15px;font-weight:700">接受邀請並設定密碼</a></p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#676B65">為保障帳戶安全，呢條連結只可使用一次，亦會自動失效。如果按鈕未能開啟，請複製以下連結：</p>
            <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;color:#1F7A06">${safeActionUrl}</p>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #D9DDD6;font-size:12px;line-height:1.6;color:#676B65">AIGRO · AI + Growth · Hong Kong<br>如果你唔認識邀請人，唔需要撳連結，可以直接忽略呢封郵件。</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const messageText = personalMessage ? `\n\n${personalMessage.trim()}` : "";
  const text =
    `${recipientName.trim()}，歡迎加入 AIGRO\n\n${inviterName.trim()} 邀請你加入香港 AI・增長・商業情報平台 AIGRO。\n邀請方案：${membership}${messageText}\n\n接受邀請並設定密碼：\n${actionUrl}\n\n呢條連結只可使用一次，亦會自動失效。\n如果你唔認識邀請人，唔需要撳連結，可以直接忽略呢封郵件。`;
  return { subject, html, text };
}

export function deliveryStatusForEvent(event: string): string | null {
  const statusByEvent: Record<string, string> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delayed",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.failed": "failed",
    "email.suppressed": "suppressed",
    "email.opened": "opened",
    "email.clicked": "clicked",
  };
  return statusByEvent[event] ?? null;
}

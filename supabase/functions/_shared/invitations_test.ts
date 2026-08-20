import {
  deliveryStatusForEvent,
  parseInvitationId,
  parseInvitationInput,
  renderInvitationEmail,
} from "./invitations.ts";

Deno.test("accepts only canonical invitation ids for resend", () => {
  const valid = parseInvitationId("3ad30004-1cf4-4e11-96e8-f7e5f16f9ad7");
  if (!valid.ok || valid.value !== "3ad30004-1cf4-4e11-96e8-f7e5f16f9ad7") {
    throw new Error("valid invitation id was rejected");
  }
  const invalid = parseInvitationId("../../other-invitation");
  if (invalid.ok || invalid.code !== "invalid_invitation_id") {
    throw new Error("unsafe invitation id was accepted");
  }
});

Deno.test("normalises a safe founding-member invitation", () => {
  const invitation = parseInvitationInput({
    email: "  New.Member@Example.com ",
    name: "  新會員  ",
    personalMessage: "  歡迎加入 AIGRO。  ",
  });

  if (!invitation.ok) throw new Error(invitation.error);
  if (invitation.value.email !== "new.member@example.com") {
    throw new Error("email was not normalised");
  }
  if (invitation.value.name !== "新會員") {
    throw new Error("name was not trimmed");
  }
  if (invitation.value.memberClass !== "founding") {
    throw new Error("wrong default member class");
  }
  if (invitation.value.tier !== "free") throw new Error("wrong default tier");
});

Deno.test("rejects invalid or overlong invitation fields", () => {
  const invalidEmail = parseInvitationInput({
    email: "not-an-email",
    name: "AIGRO Member",
  });
  if (invalidEmail.ok || invalidEmail.code !== "invalid_email") {
    throw new Error("invalid email was accepted");
  }

  const invalidTier = parseInvitationInput({
    email: "member@example.com",
    name: "AIGRO Member",
    tier: "enterprise",
  });
  if (invalidTier.ok || invalidTier.code !== "invalid_tier") {
    throw new Error("invalid tier was accepted");
  }

  const longMessage = parseInvitationInput({
    email: "member@example.com",
    name: "AIGRO Member",
    personalMessage: "a".repeat(1001),
  });
  if (longMessage.ok || longMessage.code !== "message_too_long") {
    throw new Error("overlong message was accepted");
  }
});

Deno.test("renders a branded invitation without trusting user HTML", () => {
  const email = renderInvitationEmail({
    recipientName: '<script>alert("recipient")</script>',
    inviterName: "Elvin <Admin>",
    actionUrl: "https://aigro.io/reset-password?type=invite&token=abc",
    personalMessage: '<img src=x onerror="alert(1)">',
  });

  if (email.subject !== "AIGRO 專屬邀請｜加入會員專區") {
    throw new Error("unexpected subject");
  }
  if (email.html.includes("<script>") || email.html.includes("<img src=x")) {
    throw new Error("user HTML was not escaped");
  }
  if (!email.html.includes("Elvin &lt;Admin&gt;")) {
    throw new Error("inviter was not escaped");
  }
  if (
    !email.html.includes(
      "https://aigro.io/reset-password?type=invite&amp;token=abc",
    )
  ) {
    throw new Error("action URL was not escaped");
  }
  if (
    !email.text.includes(
      "https://aigro.io/reset-password?type=invite&token=abc",
    )
  ) {
    throw new Error("plain-text fallback is missing the action URL");
  }
  if (!email.text.includes("創始會員 · Free")) {
    throw new Error("invited membership is missing");
  }
});

Deno.test("maps Resend webhook events to delivery states", () => {
  const cases: Record<string, string | null> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delayed",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.failed": "failed",
    "email.suppressed": "suppressed",
    "email.opened": "opened",
    "email.clicked": "clicked",
    "domain.updated": null,
  };

  for (const [event, expected] of Object.entries(cases)) {
    if (deliveryStatusForEvent(event) !== expected) {
      throw new Error(`${event} did not map to ${expected}`);
    }
  }
});

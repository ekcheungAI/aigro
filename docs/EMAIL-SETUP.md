# AIGRO production email setup

This repository contains the email code and templates, but production credentials
must be installed directly in Resend and Supabase. Never paste API keys into chat,
issues, source files, or shell history.

## Architecture

| Email | Delivery path | Template source |
| --- | --- | --- |
| Confirm signup | Supabase Auth → Resend SMTP | `supabase/templates/confirmation.html` |
| Password recovery | Supabase Auth → Resend SMTP | `supabase/templates/recovery.html` |
| Email change | Supabase Auth → Resend SMTP | `supabase/templates/email-change.html` |
| Security notifications | Supabase Auth → Resend SMTP | `supabase/templates/*-changed.html` |
| Super-admin member invitation | `admin-send-invite` → Resend API | `supabase/functions/_shared/invitations.ts` |
| Booking notification | `booking-notify` → Resend API | `supabase/functions/_shared/booking-email.ts` |
| Delivery and bounce status | Resend webhook → `resend-webhook` | `public.invitations` |

Supabase Auth owns account confirmation and password sessions. Resend owns email
delivery. The browser never receives a Resend or Supabase secret key.

Resend-hosted templates are intentionally unused. Auth templates live in Supabase,
while invitation and booking templates are versioned with the Edge Functions so copy
changes can be reviewed and tested in Git.

## Approved subject lines

| Email | Subject |
| --- | --- |
| Confirm signup | `AIGRO｜確認你嘅電郵地址` |
| Password recovery | `AIGRO｜重設密碼` |
| Supabase invitation | `AIGRO 專屬邀請｜加入會員專區` |
| Magic link | `AIGRO｜安全登入連結` |
| Confirm email change | `AIGRO 安全通知｜確認新電郵地址` |
| Password changed | `AIGRO 安全通知｜密碼已更新` |
| Email changed | `AIGRO 安全通知｜帳號電郵已更新` |
| Admin member invitation | `AIGRO 專屬邀請｜加入會員專區` |
| Booking updates | `AIGRO 預約｜<event>` |

## 1. Revoke any exposed key

If a Resend key has appeared in chat or another shared record, revoke it in
**Resend → API Keys** before doing anything else. Do not reuse it in production.

Create two replacement keys so the systems can be rotated independently:

1. `aigro-supabase-auth-smtp` — used only by Supabase Auth SMTP.
2. `aigro-edge-transactional` — stored as the Edge Function secret
   `RESEND_API_KEY`.

Do not add either value to `.env.example`; that file contains names and placeholders only.

## 2. Verify the sending domain

`aigro.io` is verified in Resend for the `ap-northeast-1` region. SPF, DKIM,
the return-path MX record, and DMARC must remain DNS-only and must not be altered
or shortened.

Recommended identities:

- Auth: `AIGRO <auth@aigro.io>`
- Invitations: `AIGRO <invite@aigro.io>`
- Bookings: `AIGRO <booking@aigro.io>`
- Reply-to: omit until `hello@aigro.io` has a real receiving mailbox

These sender addresses do not need separate Resend accounts. Sending capability
does not create an inbox: only configure `RESEND_REPLY_TO=hello@aigro.io` after an
inbound mail provider or Cloudflare Email Routing has been tested. Otherwise replies
will bounce.

Disable click tracking for Auth and invitation links. Link rewriting can interfere
with single-use Supabase confirmation URLs. Delivery and bounce webhooks still work.

## 3. Connect Resend SMTP to Supabase Auth

In **Supabase → Authentication → Email → SMTP Settings**:

| Setting | Value |
| --- | --- |
| Sender name | `AIGRO` |
| Sender email | `auth@aigro.io` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the new `aigro-supabase-auth-smtp` key |

Keep **Confirm email** enabled. Set **Email OTP Expiration** to one hour and keep
`INVITE_EXPIRY_HOURS=1` so the admin status matches the real Auth link lifetime.

Hosted Supabase does not upload templates from `config.toml`. Copy the subject and
HTML from `supabase/config.toml` and `supabase/templates/` into the matching
**Authentication → Email Templates** and **Security Notifications** screens.

## 4. Install Edge Function secrets

Use **Supabase → Edge Functions → Secrets**. Add the replacement values directly:

```text
RESEND_API_KEY=<new aigro-edge-transactional key>
RESEND_INVITE_FROM_EMAIL=AIGRO <invite@aigro.io>
RESEND_FROM_EMAIL=AIGRO <booking@aigro.io>
# Add only after hello@aigro.io can receive mail:
RESEND_REPLY_TO=hello@aigro.io
RESEND_WEBHOOK_SECRET=<created in step 5>
INVITE_EXPIRY_HOURS=1
SITE_URL=https://aigro.io
ALLOWED_ORIGINS=https://aigro.io,https://www.aigro.io,https://aigro-blue.vercel.app
```

Supabase supplies `SUPABASE_URL`, publishable keys, and secret keys to hosted Edge
Functions. Do not create browser-prefixed copies of server secrets.

## 5. Configure the Resend webhook

Create a Resend webhook targeting:

```text
https://zpdwalqnhkbxhmaagkfc.supabase.co/functions/v1/resend-webhook
```

Subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`,
`email.opened`, `email.clicked`, `email.bounced`, `email.complained`,
`email.failed`, and `email.suppressed`.
Copy its signing secret directly into the Supabase secret
`RESEND_WEBHOOK_SECRET`. The handler rejects unsigned requests and returns a
retryable error if a database write fails.

## 6. Deploy

First inspect migration history:

```sh
npx supabase migration list --linked
```

This repository currently has local/remote migration drift. Do **not** run a broad
`supabase db push` until that history is reconciled and the exact migration set has
been reviewed. After the invitation migration is safely applied, deploy the reviewed
functions:

```sh
npx supabase functions deploy admin-send-invite
npx supabase functions deploy resend-webhook --no-verify-jwt
npx supabase functions deploy booking-notify --no-verify-jwt
```

`admin-send-invite` must retain JWT verification. It also verifies
`public.is_super_admin()` inside the function before it uses Auth Admin or Resend.

## 7. Production acceptance test

1. Sign in as the AIGRO `super_admin`.
2. Open **Admin → Members → 發送邀請**.
3. Send an invitation to a controlled external inbox.
4. Confirm the admin row moves from `sent` to `delivered`.
5. Open the link, choose a password, and enter the member area.
6. Confirm `profiles`, `account_access`, and `invitations.status = accepted` agree.
7. Test signup confirmation and password recovery separately.
8. Send to Resend's bounce test recipient and confirm the admin delivery state changes.

Never use a real customer address for initial testing.

## Readiness audit — 2026-08-15

- Resend OAuth connection: active.
- `aigro.io`: verified; sending enabled; open and click tracking disabled.
- Resend API key metadata: one key named `onboarding`; rotate it because keys were
  previously shared outside a secret manager.
- Supabase Edge Function secrets installed: `RESEND_API_KEY`,
  `RESEND_WEBHOOK_SECRET`, both sender identities, invitation expiry, and
  canonical site URL.
- Intentionally unset: `RESEND_REPLY_TO` (no inbound mailbox yet).
- Supabase Auth SMTP and hosted-template state still require confirmation from an
  account with Dashboard access to this project.
- Deployed email functions: `booking-notify`, `admin-send-invite`, and
  `resend-webhook` are active with their intended JWT settings.
- Applied migration: `20260813165248_admin_member_invitations.sql`; the table,
  RLS policy, explicit grants, and acceptance triggers were verified in production.
- Resend webhook: enabled for all delivery events supported by the handler. One
  incomplete webhook from setup is disabled and may be deleted after explicit
  confirmation.
- Production integration audit: `14 pass, 0 blocked, 0 fail`.
- Other historical local/remote migration drift remains and still blocks broad
  `supabase db push`; the invitation migration itself is aligned.
- No production email has been sent through this Resend workspace yet.

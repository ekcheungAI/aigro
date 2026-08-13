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

## 1. Revoke any exposed key

If a Resend key has appeared in chat or another shared record, revoke it in
**Resend → API Keys** before doing anything else. Do not reuse it in production.

Create two replacement keys so the systems can be rotated independently:

1. `aigro-supabase-auth-smtp` — used only by Supabase Auth SMTP.
2. `aigro-edge-transactional` — stored as the Edge Function secret
   `RESEND_API_KEY`.

Do not add either value to `.env.example`; that file contains names and placeholders only.

## 2. Verify the sending domain

In **Resend → Domains**, add `aigro.io`, then publish every SPF, DKIM, and MX
record supplied by Resend in the authoritative DNS provider. Add a DMARC record
after SPF and DKIM pass. Do not alter or shorten the generated values.

Recommended identities:

- Auth: `AIGRO <auth@aigro.io>`
- Invitations: `AIGRO <invite@aigro.io>`
- Bookings: `AIGRO <booking@aigro.io>`
- Reply-to: `hello@aigro.io`

Resend can send from these addresses once the domain is verified; they do not need
separate Resend accounts. `hello@aigro.io` should be a real receiving mailbox so
member replies are not lost.

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
https://mxjgavuzzpcvazxdnuzg.supabase.co/functions/v1/resend-webhook
```

Subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`,
`email.bounced`, and `email.complained`. Copy its signing secret directly into the
Supabase secret `RESEND_WEBHOOK_SECRET`. The handler rejects unsigned requests.

## 6. Deploy

After authenticating the Supabase CLI and reviewing the migration:

```sh
npx supabase db push
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

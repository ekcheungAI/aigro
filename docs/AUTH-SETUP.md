# AIGRO production authentication setup

The application code sends email links, password resets, and Google OAuth back to
`https://aigro.io`. The following dashboard settings are also required; secrets must
never be committed to this repository.

## 1. Connect the domain to Vercel

- In the DNS provider, set the apex `A` record for `aigro.io` to `76.76.21.21`.
- Configure `www.aigro.io` as a redirect to the apex domain in Vercel.
- Wait for Vercel to issue TLS, then confirm both URLs load over HTTPS.
- Set Vercel Production environment variable `VITE_SITE_URL=https://aigro.io`.

## 2. Configure Supabase URL settings

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://aigro.io`
- Redirect URLs:
  - `https://aigro.io/**`
  - `http://localhost:3000/**` (development only)

For email templates that use a custom redirect, use `{{ .RedirectTo }}` rather than
`{{ .SiteURL }}`.

## 3. Configure Google OAuth

Create a Google OAuth client of type **Web application**:

- Authorized JavaScript origins:
  - `https://aigro.io`
  - `http://localhost:3000` (development only)
- Authorized redirect URI:
  - `https://mxjgavuzzpcvazxdnuzg.supabase.co/auth/v1/callback`

Add the resulting Client ID and Client Secret in Supabase Dashboard → Authentication
→ Providers → Google, then enable the provider. Configure the Google consent screen
with `aigro.io`, the AIGRO name/logo, privacy policy, and terms links.

For local Supabase CLI only, export these without committing their values:

```sh
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-client-secret
```

## 4. Production smoke test

1. Open `https://aigro.io/login` in a private window.
2. Complete Google sign-in and confirm the final browser origin is `https://aigro.io`.
3. Confirm a user and matching `profiles` row exist in Supabase.
4. Send a password reset; it must return to `https://aigro.io/reset-password`.
5. Confirm signing out removes the local session and protected account pages reject it.

## 5. Email provider and templates

Keep **Confirm email** enabled. Configure custom SMTP before production; Supabase's
default provider is not intended for public transactional email delivery. Use a
verified sender such as `AIGRO <auth@aigro.io>` and publish the provider's SPF, DKIM,
and DMARC DNS records.

The **Confirm signup** template should use `{{ .ConfirmationURL }}` for its action.
Recommended subject: `確認你嘅 AIGRO 帳號`.

The **Reset password** template should also use `{{ .ConfirmationURL }}`. The app
supplies `https://aigro.io/reset-password` as its allowlisted recovery destination.

The complete Resend SMTP, Edge Function, invitation, webhook, template, and
production verification procedure is in `docs/EMAIL-SETUP.md`.

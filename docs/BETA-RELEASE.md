# AIGRO Live Chat Beta Contract

`https://beta.aigro.io` is the review environment for Live Chat, instructor CRM,
knowledge distillation and persona evaluation. It must stay isolated from the
public AIGRO deployment until the release gates pass.

## Vercel beta project

The stable review domain belongs to the separate Vercel project `aigro-beta`.
Its Production environment is the beta release channel; it must never inherit
the public `aigro` project's production backend values.

Before its first deployment, `aigro-beta` requires all of these frontend build
variables:

```dotenv
VITE_DEPLOY_ENV=beta
VITE_EXPERT_CHAT_ROLLOUT=true
VITE_SITE_URL=https://beta.aigro.io
VITE_SUPABASE_URL=https://STAGING_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=STAGING_PUBLISHABLE_KEY
VITE_TURNSTILE_SITE_KEY=STAGING_TURNSTILE_SITE_KEY
```

The Vite build fails closed when the Vercel project identity and these values
disagree. The beta project rejects the production Supabase URL, a missing
Turnstile site key, a non-beta site URL, or a disabled chat rollout. The public
project likewise rejects beta/staging values.

Link and deploy `aigro-beta` only from a clean worktree containing the reviewed
beta commit. Do not replace this repository checkout's existing `.vercel` link
to the public project.

## Environment boundary

| Setting | Public production | Beta review |
| --- | --- | --- |
| Domain | `https://aigro.io` | `https://beta.aigro.io` |
| `VITE_DEPLOY_ENV` | `production` (required) | `beta` |
| `VITE_EXPERT_CHAT_ROLLOUT` | `false` until release approval | `true` |
| `VITE_SITE_URL` | `https://aigro.io` | `https://beta.aigro.io` |
| Supabase | production project | separate staging project |
| Turnstile | production widget | beta-domain widget |

`VITE_DEPLOY_ENV=beta` injects `robots` and `googlebot` metadata with
`noindex, nofollow, noarchive` into the built `index.html`. Production does not
receive that override; a Vercel build with an unset or mismatched channel fails.

The beta deployment must also use Vercel Authentication, password protection,
or an application-level tester allowlist. Noindex is not access control. Create
a Vercel Deployment Protection automation-bypass secret for CI/review only; do
not put it in `VITE_*` variables or commit it.

Provisioning note (2026-08-20): Vercel's API rejected `All Deployments`
authentication for the current team entitlement, so the custom beta domain is
not yet access-controlled. Before the first deployment, either enable the
required Vercel protection entitlement or place `beta.aigro.io` behind
Cloudflare Access/an application-level tester allowlist. Do not treat the
injected noindex tags as a substitute.

## Staging backend contract

Deploy the complete migration and Edge Function set to a separate Supabase
staging project. Server-only provider, worker and service-role secrets belong in
Supabase Edge Function secrets, never in Vercel `VITE_*` variables.

Use these staging-only origin settings:

```dotenv
ALLOWED_ORIGINS=https://beta.aigro.io,http://localhost:3000
MINIMAX_API_KEY=STAGING_MINIMAX_KEY
OPENAI_API_KEY=STAGING_OPENAI_KEY
TURNSTILE_SECRET_KEY=STAGING_TURNSTILE_SECRET
TURNSTILE_EXPECTED_HOSTNAMES=beta.aigro.io,localhost
SITE_URL=https://beta.aigro.io
PUBLIC_SITE_URL=https://beta.aigro.io
```

`MINIMAX_API_KEY`, `OPENAI_API_KEY`, and `TURNSTILE_SECRET_KEY` are mandatory in
beta and production. Exact request replay also fails closed if any provider or
verification configuration is missing. Setting
`REQUIRE_TURNSTILE=false` cannot bypass verification on a hosted Supabase URL;
that opt-out works only with an `http://localhost`, `127.0.0.1`, or `[::1]`
local Supabase runtime.

Add `https://beta.aigro.io/**` to the staging Supabase Auth redirect allowlist.
Do not add the beta frontend to production Supabase while it is under review.

## Citation privacy review

The ingestion URL, original-file URL, storage path and temporary signed URL are
private operator data and are never valid public chat citations. For each
source, open `Portal → Knowledge Studio → 公開引用` and either:

- enter a separately verified public HTTPS canonical location plus a human
  review note; or
- leave the URL empty to keep the citation non-clickable. Manual notes and
  private PDFs should normally use this private setting.

The database removes all query strings and fragments before storing the public
citation, so page, section and video-time locators remain separate typed fields.
Admin Studio's reference panel must show `public citation reviewed` only for a
reviewed public location; otherwise it must show `public citation private`.
Run `supabase test db public_citation_privacy.sql` before beta acceptance and
inspect one fresh answer plus one replayed answer to confirm neither payload
contains `source_url`, `source_blob_url`, `signed_url`, `storage_path`, tokens,
or credentials.

## Review commands

Local Playwright keeps starting the Vite development server by default:

```bash
npm run test:e2e
```

To test an already deployed beta, set the remote base URL. Playwright then skips
the local `webServer`:

```bash
AIGRO_E2E_BASE_URL=https://beta.aigro.io \
AIGRO_E2E_PROTECTION_BYPASS=VERCEL_AUTOMATION_BYPASS_SECRET \
npm run test:e2e
```

The release acceptance test is opt-in and uses a staging-only service key from
the shell environment to verify the streamed citation, atomic messages, lead,
interaction and idempotent deletion. It cleans up its synthetic anonymous user:

```bash
AIGRO_E2E_BASE_URL=https://beta.aigro.io \
AIGRO_E2E_CHAT=true \
AIGRO_E2E_PROTECTION_BYPASS=VERCEL_AUTOMATION_BYPASS_SECRET \
AIGRO_E2E_REPORT_PATH=test-results/beta-chat-acceptance.json \
AIGRO_E2E_EXPERT_SLUG=REVIEW_READY_EXPERT \
AIGRO_E2E_CHAT_QUESTION='A grounded corpus-specific question' \
AIGRO_E2E_SUPABASE_URL=https://STAGING_PROJECT_REF.supabase.co \
AIGRO_E2E_SUPABASE_PUBLISHABLE_KEY=STAGING_PUBLISHABLE_KEY \
AIGRO_E2E_SERVICE_ROLE_KEY=STAGING_SERVICE_ROLE_KEY \
npm run test:e2e -- tests/e2e/beta-live-chat.spec.ts
```

Run the integration checker against the staging backend:

```bash
AIGRO_SITE_URL=https://beta.aigro.io \
AIGRO_EXPERT_SLUG=REVIEW_READY_EXPERT \
AIGRO_E2E_PROTECTION_BYPASS=VERCEL_AUTOMATION_BYPASS_SECRET \
AIGRO_E2E_REPORT_PATH=test-results/beta-chat-acceptance.json \
SUPABASE_URL=https://STAGING_PROJECT_REF.supabase.co \
SUPABASE_PUBLISHABLE_KEY=STAGING_PUBLISHABLE_KEY \
npm run check:production -- --strict
```

Before review, confirm the built beta HTML contains the crawler directives:

```bash
VITE_DEPLOY_ENV=beta \
VITE_EXPERT_CHAT_ROLLOUT=true \
VITE_SITE_URL=https://beta.aigro.io \
VITE_SUPABASE_URL=https://STAGING_PROJECT_REF.supabase.co \
VITE_SUPABASE_ANON_KEY=STAGING_PUBLISHABLE_KEY \
VITE_TURNSTILE_SITE_KEY=STAGING_TURNSTILE_SITE_KEY \
npm run build
rg 'noindex, nofollow, noarchive' dist/index.html
```

## Promotion rule

Never promote the beta artifact directly to `aigro.io`. Vite embeds its staging
URLs and rollout values at build time. After beta approval, rebuild the same
reviewed commit in the production project with production environment variables,
then repeat the authenticated Live Chat and CRM smoke tests before changing the
public rollout flag.

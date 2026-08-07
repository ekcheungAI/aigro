# AIGRO Master Admin & Backend Readiness

> Production review: 2026-08-08 (Asia/Hong_Kong). This replaces the former
> mock-era admin report. `Live` means the production read/write path was
> exercised; `Beta` means the screen is useful but one linked capability is
> incomplete; `Blocked` means required provider configuration is absent.

## Access model

Authorization comes from protected `account_access`, never user-editable profile
fields.

| App role | Scope |
| --- | --- |
| `member` | Own profile, conversations, messages and bookings |
| `expert` | Member scope plus the single linked expert workspace |
| `admin` | Operational CMS, CRM, content, members and reporting; cannot promote admins or change the super admin |
| `super_admin` | Highest platform role; inherits admin and VIP-equivalent product entitlements and can manage admin roles |

Billing tier (`free | pro | vip`) is separate from app role. A signup request
cannot grant itself a paid tier or elevated role. Production currently contains
exactly one super admin. The account page exposes a one-click `Master Admin`
entry only for that role.

## Production capability matrix

| Capability | Status | Verified / remaining work |
| --- | --- | --- |
| Password login | Live | Existing production login and `/account` hydration verified |
| Signup + profile provisioning | Live code + migration | Real `signUp`/anonymous upgrade; Auth trigger guarantees profile and member/free access; email delivery still needs acceptance testing |
| Member access management | Live | Admin changes member/expert tier; only super admin can manage admin roles; changes audited |
| Public intelligence | Live | argro sync has repeated successful scheduled runs; published `items` readable through RLS |
| argro admin health | Live | Private upstream key moved to GitHub/Vercel secrets; admin-only same-origin proxy returned live production health |
| Master Admin dashboard | Live | Production counts and activity queries |
| Backend readiness monitor | Live | Admin-only RPC reports Cron, Vault presence, private Storage, corpus/persona/booking counts and feature flags without returning secret values |
| Content management | Live | Real `items` review/publish controls |
| Sources | Beta | Source CRUD works; MCP output is not built |
| Experts | Beta | Reads are real; create/edit still has local-only controls |
| Members | Live | Profiles/access data and protected role/tier mutation |
| CRM | Beta | Real leads, atomic chat scoring, audited stage RPC; new flow depends on blocked AI chat |
| Engagement | Beta | Real conversation/message reads; new visitor chat flow is blocked |
| Emails | Beta | Waitlist capture and CSV export work; delivery/templates/campaign state do not |
| Skills | Beta | Static catalog only; no managed skills backend |
| Distillation Studio | Blocked | Schema/functions deployed; provider secrets, Vault worker dispatch and first approved corpus absent |
| Persona Compiler | Blocked | Function deployed; provider secret, evaluation set and first published persona absent |
| Instructor chat | Blocked | Function deployed and fail-closed; Anonymous Auth and model/Turnstile secrets absent |
| Human booking | Blocked | Transaction/RLS foundation exists; availability, enabled expert, webhook/Resend and end-to-end test absent |
| Submissions | Planned | No backend table/workflow |
| MCP server | Planned | No output endpoint |

Every incomplete Admin module displays `Beta` in navigation and explains why.
Admin Settings also separates `Live`, `Beta`, `Blocked` and `Planned`
integrations. Its live readiness panel currently confirms all five database
maintenance/dispatch schedules and the private `expert-kb` bucket are present.
It also confirms all four required Vault entries are still absent, so worker
dispatch remains blocked even though the Cron runs themselves succeed.

## Connected server workflows

### Auth → profile → access

1. `/join` creates a real email/password identity, or upgrades an existing
   anonymous visitor so owned conversations remain attached.
2. An `auth.users` trigger creates/updates `profiles` for email identities.
3. The existing profile trigger creates `account_access(member, free)`.
4. Role/tier/expert metadata supplied by a browser is ignored for authorization.
5. Admin access changes are constrained and recorded in `audit_events`.

### Instructor chat → CRM

1. `ask-answer` validates JWT, ownership, limits, persona and provider config.
2. Retrieval is restricted to the selected expert's published revisions.
3. A completed turn calls `persist_chat_round` once.
4. User message, assistant message, usage, citations, knowledge gap and lead are
   persisted in one transaction and one idempotency lock.
5. Price, booking and company/enterprise intent add normalized CRM signals and
   score; replaying a request does not add score twice.
6. Admin stage changes use `update_lead_stage`, lock the lead, append timeline
   history and create an audit event.

This path is implemented and database-tested but cannot produce a live answer
until the external chat configuration below is complete.

### News update

1. GitHub Actions runs every 30 minutes.
2. It fetches argro hot/stream/daily, normalizes HK Traditional Chinese,
   classifies, SHA-256 deduplicates and upserts published `items`.
3. The upstream key and Supabase server key are GitHub secrets; neither remains
   in repository code or the browser bundle.
4. The workflow runs a production read-path/function-guard audit after sync.

## External configuration still required

These are operational secrets/settings and must not be committed:

- Supabase Auth: enable Anonymous Sign-ins; verify signup confirmation, magic
  link, reset-password redirect and SMTP delivery.
- Chat: `MINIMAX_API_KEY`, `OPENAI_API_KEY`, `TURNSTILE_SECRET_KEY`, and Vercel
  `VITE_TURNSTILE_SITE_KEY`.
- CMS worker: `KNOWLEDGE_WORKER_SECRET`, `FIRECRAWL_API_KEY`,
  `YOUTUBE_TRANSCRIPT_API_KEY`, MiniMax and OpenAI keys.
- Persona Compiler: `PERSONA_COMPILER_SECRET` and MiniMax key.
- Booking: `BOOKING_WEBHOOK_SECRET`, `RESEND_API_KEY`, verified
  `RESEND_FROM_EMAIL`.
- Supabase Vault: project URL plus the three internal worker/webhook secrets,
  matching the Edge Function values.
- Supabase Auth security: enable leaked-password protection and require MFA for
  the super admin.

After configuration, seed/approve/publish expert knowledge and persona versions,
create at least 25 verified questions per expert, pass the retrieval/citation
release gates, then enable expert feature flags one at a time.

## Verification commands

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
npm run test:db
npm run test:functions
npm run check:production
```

CI repeats application, Playwright, pgTAP and Edge helper tests. The production
checker verifies the SPA route, public news, Auth settings, Edge Function guards
and the admin health proxy without printing secrets.

## Security notes

- Raw expert knowledge and Storage are private; browser clients do not receive a
  service key.
- `get_backend_readiness()` is restricted to admin JWTs and exposes only
  booleans/counts; ordinary members receive `admin_required` and Vault values
  never leave Postgres.
- Conversation, message and lead ownership is based on `auth.uid()`.
- `profiles.role/tier/expert_slug` are compatibility mirrors, not authorities.
- Anonymous callers cannot execute business RPCs; server-only chat persistence
  remains service-role only.
- Rotate credentials previously shared in chat or committed historically, even
  after removing them from current source.

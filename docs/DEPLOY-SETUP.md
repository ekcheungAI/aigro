# Deploy setup — aigro

Push to `main` now deploys automatically, but only after
`Verify application and backend contracts` passes on that exact commit.
Three secrets have to exist first. **This is the part only Elvin can do** —
it needs a Vercel login.

Until these are set, the deploy job runs and fails fast with
`VERCEL_TOKEN is not set`. Nothing else breaks: the site stays on whatever
was last deployed.

## Why this exists

`AGENTS.md` said "push to main → trigger a **manual** Vercel deploy (no
auto-deploy wired yet)". In practice that meant a commit could sit on `main`
looking shipped while the live site served day-old content. On 2026-08-21 a
content refresh did exactly that for a full day.

## What to do (about 3 minutes)

### 1. Create a Vercel token

<https://vercel.com/account/tokens> → **Create Token**

- Name: `github-actions-aigro`
- Scope: the account or team that owns the `aigro` project
- Expiration: your call; a shorter one means remembering to rotate it

Copy it now — Vercel shows it once.

### 2. Get the org and project ids

Easiest from the project settings page:

<https://vercel.com/> → `aigro` project → **Settings** → **General**

- **Project ID** is on that page
- **Team ID / Org ID** is under Team (or Account) → Settings → General

Or, from a machine logged into the Vercel CLI:

```bash
cd aigro
vercel link          # pick the existing aigro project, do NOT create a new one
cat .vercel/project.json   # { "orgId": "...", "projectId": "..." }
```

`.vercel/` is gitignored; do not commit it.

### 3. Add all three as GitHub secrets

<https://github.com/ekcheungAI/aigro/settings/secrets/actions> → **New repository secret**

| Name | Value |
|---|---|
| `VERCEL_TOKEN` | the token from step 1 |
| `VERCEL_ORG_ID` | `orgId` |
| `VERCEL_PROJECT_ID` | `projectId` |

Names must match exactly — a typo reads as "unset" and the job fails closed.

### 4. Prove it works

Do **not** test by pushing something you care about. Use the manual trigger:

Push any small change to `main` (a docs typo will do). The `deploy` job runs
as the last stage of **Verify application and backend contracts**, after both
test jobs go green.

Green run means the pipeline is live. The job's last step polls
`https://aigro.io/insights/daily` until it returns 200, so a green run is
evidence the origin actually answered — not just that the CLI exited 0.

## How it behaves afterwards

- Push to `main` → both test jobs run → `deploy` runs only if **both** pass.
- Either test job fails → `deploy` is skipped by the platform. The live site
  keeps serving the last good build.
- Pull requests never deploy: the job is gated on
  `github.ref == 'refs/heads/main' && github.event_name == 'push'`.

`deploy` is a job inside `ci.yml`, not a separate workflow. That was a
deliberate change on 2026-08-21 (it briefly lived in its own `deploy.yml`
chained by `workflow_run`). Keeping it in-run means GitHub enforces the
ordering with `needs:`, every job shares one commit SHA, and the deploy result
shows on the commit that caused it instead of in a second Actions entry.

## Alternative: Vercel's own Git integration

Connecting the repo in the Vercel dashboard also gives push-to-deploy, with
less YAML. It deploys on push **without waiting for CI**, so a red build ships
and gets rolled back after the fact. That trade was rejected here. If you turn
the Git integration on later, remove the `deploy` job from
`.github/workflows/ci.yml` — running both means two deploys per push, racing
each other.

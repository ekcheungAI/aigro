# Jimmy Growth with AI knowledge pack

The importer produces deterministic, metadata-only JSON. It does not write to Supabase
or mirror source Markdown into AIGRO. Clone the public repository separately, verify the
pinned checkout, then run:

```sh
git -C /path/to/growth-with-ai-guide checkout 2a592eb59398f97800cfe811847bb5f9d85a5668
npm run manifest:jimmy-knowledge -- --repo /path/to/growth-with-ai-guide --expected-sha 2a592eb59398f97800cfe811847bb5f9d85a5668 --output /tmp/jimmy-knowledge-manifest.json
```

The command verifies `HEAD` and reads only immutable blobs from the pinned Git commit;
dirty tracked files and untracked files cannot affect its output. It accepts only regular
Markdown blobs and rejects Git symlinks/submodules, oversized/binary Markdown, and
secret-like names or content. Each record includes SHA-256,
the pinned GitHub blob URL, stage/order/title, and heading-path line locators for citations.

`knowledge_sources.rights_status` is fail-closed: `unknown` (the default), `requested`,
`restricted`, `revoked`, expired, or explicitly revoked sources cannot publish or retrieve.
Only `granted` sources with a non-expired, non-revoked grant and an approved revision are
eligible. `rights_holder`, structured `rights_scope`, `rights_evidence_ref`, and authorization,
expiry, and revocation timestamps record the capability without storing external evidence.
No production grant is inserted by this migration.
Migration of an existing database clears every legacy publication pointer that does not
already have an explicit eligible grant; authorization must be recorded before republishing.

Changing a published source to a non-granted, revoked, or already-expired state atomically
clears `published_revision_id`. Future expiry is enforced immediately at retrieval time and
a minute-level database sweep clears the stale publication pointer.

## Database verification

Run `npm run test:db` with the local Supabase stack running. The pgTAP workflow covers
authorization-state retrieval, automatic unpublishing, and review/rollback publication gates.

## Full distillation run

After migrations and both Edge Functions are deployed, run the idempotent end-to-end
pipeline with a server-side Supabase credential:

```sh
SUPABASE_URL="..." SUPABASE_SECRET_KEY="..." npm run distill:jimmy -- \
  --repo /path/to/growth-with-ai-guide \
  --rights-holder "AIGRO / Jimmy Lau" \
  --rights-evidence-ref "ekos-intake:2026-08-11_jimmy-lau-growth-with-ai-guide" \
  --publish-persona
```

Never use the public anon key. The runner imports one stable source per chapter,
reuses identical SHA-256 revisions, drives the existing workers, approves only
rights-eligible revisions with distilled chunks, requires persona fidelity to pass,
publishes atomically, and then verifies that every pinned chapter has:

- an approved published revision;
- at least one embedded chunk;
- citation metadata matching the pinned commit and file path; and
- inclusion in the published persona version.

Success prints a JSON coverage report. A partial run is safe to rerun; a failed or
missing chapter, stale right, fidelity failure, or citation mismatch exits non-zero.

Production execution requires `SUPABASE_ACCESS_TOKEN` or database credentials to
apply migrations, plus `SUPABASE_SECRET_KEY` (or the legacy service-role key) to run
the service-only importer. Vercel's `VITE_SUPABASE_ANON_KEY` is intentionally
insufficient.

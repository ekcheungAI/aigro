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
The pinned repository does not itself supply a licence file, so public readability is
not treated as commercial RAG or persona-synthesis permission. Use the actual signed or
otherwise verifiable authorization record for `rights_holder` and `rights_evidence_ref`.

Changing a published source to a non-granted, revoked, or already-expired state atomically
clears `published_revision_id`. Future expiry is enforced immediately at retrieval time and
a minute-level database sweep clears the stale publication pointer.

## Database verification

Run `npm run test:db` with the local Supabase stack running. The pgTAP workflow covers
authorization-state retrieval, automatic unpublishing, and review/rollback publication gates.

## Full distillation run

After migrations and both Edge Functions are deployed, run the idempotent pipeline
with a server-side Supabase credential. The first pass stops at explicit knowledge
review:

```sh
SUPABASE_URL="..." SUPABASE_SECRET_KEY="..." npm run distill:jimmy -- \
  --repo /path/to/growth-with-ai-guide \
  --rights-holder "RIGHTS_HOLDER_FROM_SIGNED_RECORD" \
  --rights-evidence-ref "RIGHTS_EVIDENCE_REFERENCE"
```

Inspect every reference, distilled output and citation in Admin Studio, enter a
review note, and approve the revisions there with an authenticated admin account.
The service runner cannot approve knowledge. After the human decisions are stored,
rerun the same command to queue persona synthesis:

The review panel is `/admin/studio` for AIGRO admins and `/portal/kb` for
the instructor workspace. Before approval it exposes the signed/original file,
provenance and content hash, exact rights scopes, extracted text, full structured
summary/claims/evidence/methods/boundaries/questions, embedding coverage, job state,
and the recorded human-review state. Approval remains disabled until the original,
structured distillation, required rights, and a substantive review note are present.

```sh
SUPABASE_URL="..." SUPABASE_SECRET_KEY="..." npm run distill:jimmy -- \
  --repo /path/to/growth-with-ai-guide \
  --rights-holder "RIGHTS_HOLDER_FROM_SIGNED_RECORD" \
  --rights-evidence-ref "RIGHTS_EVIDENCE_REFERENCE"
```

The persona compiler stops at its own human-review gate. Review the evidence-linked
blueprint and fidelity report in Admin Studio, enter a review note, approve and publish
it there, then rerun the same command once more. The runner reuses the exact reviewed
job and only reports success for a current, human-reviewed published persona.
The persona panel shows every active evaluation question (25–50), all blueprint
sections, every evidence excerpt/revision/locator, the five-part fidelity breakdown,
strengths, risks, response count, and evaluation-set hash. Partial review payloads
cannot enable the approve action, and publication revalidates the same evidence and
evaluation snapshot transactionally.

Never use the public anon key. The runner imports one stable source per chapter,
reuses identical SHA-256 revisions, drives the existing workers, requires explicit
knowledge and persona review, and then verifies that every pinned chapter has:

- an approved published revision;
- at least one embedded chunk;
- citation metadata matching the pinned commit and file path; and
- inclusion in the published persona version.

Success is printed only after publication as a JSON coverage report. A review-stop or
partial run is safe to rerun; a failed or missing chapter, stale right, fidelity failure,
missing human review, or citation mismatch exits non-zero.

Production execution requires `SUPABASE_ACCESS_TOKEN` or database credentials to
apply migrations, plus `SUPABASE_SECRET_KEY` (or the legacy service-role key) to run
the service-only importer. Vercel's `VITE_SUPABASE_ANON_KEY` is intentionally
insufficient.

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

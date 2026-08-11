# Jimmy Growth with AI knowledge pack

The importer produces deterministic, metadata-only JSON. It does not write to Supabase
or mirror source Markdown into AIGRO. Clone the public repository separately, verify the
pinned checkout, then run:

```sh
git -C /path/to/growth-with-ai-guide checkout 2a592eb59398f97800cfe811847bb5f9d85a5668
npm run manifest:jimmy-knowledge -- --repo /path/to/growth-with-ai-guide --expected-sha 2a592eb59398f97800cfe811847bb5f9d85a5668 --output /tmp/jimmy-knowledge-manifest.json
```

The command verifies `HEAD`, accepts only regular Markdown files, and rejects symlinks,
oversized/binary Markdown, and secret-like names or content. Each record includes SHA-256,
the pinned GitHub blob URL, stage/order/title, and heading-path line locators for citations.

`knowledge_sources.rights_status` is fail-closed: `unknown` (the default), `requested`,
`restricted`, `revoked`, expired, or explicitly revoked sources cannot publish or retrieve.
Only `granted` sources with a non-expired, non-revoked grant and an approved revision are
eligible. `rights_holder`, structured `rights_scope`, `rights_evidence_ref`, and authorization,
expiry, and revocation timestamps record the capability without storing external evidence.
No production grant is inserted by this migration.

# MCP operations and launch gate

The AIGRO website currently describes the MCP as “封裝中・尚未公開”. The
Zeabur service is reachable, but its running image is not present in this
repository and the live endpoint is not yet an approved public product. Treat
the endpoint as an incident/diagnostic target until the gates below pass.

## Safe smoke test

`npm run check:mcp` runs a no-tool protocol check. It never calls search,
embedding, or an LLM. The default is intentionally a release gate:

```sh
MCP_URL=https://argro-mcp.zeabur.app/mcp \
MCP_TOKEN="$MCP_TOKEN" \
MCP_ORIGIN=https://aigro-blue.vercel.app \
npm run check:mcp
```

The check requires anonymous initialize to return `401` or `403`, rejects an
untrusted `Origin` with `403`, verifies initialize/tools-list, and (unless
`MCP_STRICT_CONTRACT=false`) requires bounded `limit` schemas and an
`outputSchema` for every tool. Keep the token in the CI secret store; never put
it in a browser bundle, URL, issue, or fixture.

For a temporary transport-only diagnosis of an intentionally anonymous local
server, set `MCP_EXPECT_AUTH=false` and provide `MCP_TOKEN` if the protocol
session should continue after the anonymous probe. This mode is not a launch
approval.

## Required before adding another MCP or opening this one

1. Put the MCP server source, lockfile, container definition, deployment
   manifests, and image-to-commit provenance in Git.
2. Decide the access model (OAuth/protected-resource metadata or scoped API
   keys), then enforce it at the server and edge with quotas, rate limits, and
   audit logs.
3. Validate `Origin` against an allow-list and expose a dependency-aware
   readiness/liveness check. TCP readiness alone is insufficient.
4. Return structured MCP output with stable error codes, provenance, and bounded
   cursors/limits; keep text as an agent-friendly fallback.
5. Gate release on upstream semantic health: provider authentication, source
   freshness, translation/classification coverage, summary/content completeness,
   and duplicate/relevance checks. A process-health `200` is not enough.
6. Add a canary source and rollback path before enabling additional sources.
   Connector URLs and auth references belong in the private `source_connectors`
   table, never the browser-readable `sources` columns.

The repo-side Insights and source-control changes implement the last point and
the pagination/editorial gates. Remote MCP and host hardening still require a
new SSH key and rotated provider/database credentials before any write action.

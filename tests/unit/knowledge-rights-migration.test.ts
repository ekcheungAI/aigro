import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260811120000_knowledge_source_rights.sql",
);

describe("knowledge source rights migration", () => {
  it("defaults closed and gates publishing plus retrieval on a live grant", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("default 'unknown'");
    expect(sql).toMatch(/rights_status\s*=\s*'granted'/g);
    expect(sql).toMatch(/expires_at is null or .*expires_at > now\(\)/s);
    expect(sql).toMatch(/revoked_at is null/);
    expect(sql).toContain("knowledge_rights_not_granted");
    expect(sql).toContain("revision_not_approved");
    expect(sql).toMatch(
      /update of published_revision_id, rights_status, expires_at, revoked_at/,
    );
    expect(sql).toContain("new.published_revision_id := null");
    expect(sql).toContain("unpublish_expired_knowledge_sources");
    expect(sql).toContain("aigro-unpublish-expired-knowledge");
  });
});

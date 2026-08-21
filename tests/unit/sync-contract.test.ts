import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = readFileSync(
  resolve(process.cwd(), "scripts/sync-argro-to-supabase.mjs"),
  "utf8",
);

describe("Argro sync release contract", () => {
  it("drains the cursor window instead of a single stream page", () => {
    expect(script).toContain("next_cursor");
    expect(script).toContain("ARGRO_STREAM_MAX_PAGES");
    expect(script).toContain("fetchStreamPages");
  });

  it("keeps new rows pending unless auto-publish is explicitly enabled", () => {
    expect(script).toContain('const AUTO_PUBLISH = process.env.ARGRO_AUTO_PUBLISH === "true"');
    expect(script).toContain('row.status = AUTO_PUBLISH ? "published" : "pending"');
  });

  it("does not overwrite editorial decisions on an existing fingerprint", () => {
    expect(script).toContain("delete row.status");
    expect(script).toContain("delete row.placement");
    expect(script).toContain("delete row.summary");
    expect(script).toContain("delete row.category");
    expect(script).toContain("if (!row.source_id) delete row.source_id");
  });

  it("keeps fingerprint lookup URLs below PostgREST's request-size limit", () => {
    expect(script).toContain("const EXISTING_LOOKUP_CHUNK = 100");
    expect(script).toContain("i += EXISTING_LOOKUP_CHUNK");
    expect(script).toContain("i + EXISTING_LOOKUP_CHUNK");
  });
});

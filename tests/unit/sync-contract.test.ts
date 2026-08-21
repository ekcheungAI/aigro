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

  it("only auto-publishes rows that pass the Hong Kong Chinese AI quality gate", () => {
    expect(script).toContain('const AUTO_PUBLISH = process.env.ARGRO_AUTO_PUBLISH === "true"');
    expect(script).toContain('from "./lib/news-quality.mjs"');
    expect(script).toContain("assessNewsQuality");
    expect(script).toContain("quality.readyForPublication");
    expect(script).toContain('row.lang = "zh-HK"');
  });

  it("preserves editorial decisions without creating mixed-shape upsert batches", () => {
    expect(script).toContain(
      "select=fingerprint,status,placement,source_id,summary,category",
    );
    expect(script).toContain("row.status = existing.status ?? \"pending\"");
    expect(script).toContain("row.placement = existing.placement ?? row.placement");
    expect(script).toContain(
      "row.source_id = existing.source_id ?? row.source_id ?? null",
    );
    expect(script).not.toContain("if (existing.summary?.trim()) row.summary = existing.summary");
    expect(script).toContain(
      "if (existing.category?.trim()) row.category = normalizeCategory(existing.category)",
    );
    expect(script).not.toContain("delete row.status");
    expect(script).not.toContain("delete row.placement");
    expect(script).not.toContain("delete row.summary");
    expect(script).not.toContain("delete row.category");
    expect(script).toContain("row.source_id = sourceId ?? null");
  });

  it("keeps fingerprint lookup URLs below PostgREST's request-size limit", () => {
    expect(script).toContain("const EXISTING_LOOKUP_CHUNK = 100");
    expect(script).toContain("i += EXISTING_LOOKUP_CHUNK");
    expect(script).toContain("i + EXISTING_LOOKUP_CHUNK");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260820130000_crm_score_dedup.sql"),
  "utf8",
);

describe("CRM scoring hardening", () => {
  it("deduplicates repeated intent signals and keeps a first-interaction baseline", () => {
    expect(migration).toContain("normalize_lead_interaction_score");
    expect(migration).toContain("greatest(0, next_intent_count - coalesce(prior_intent_count, 0)) * 20");
    expect(migration).toContain("case when prior_interaction_count = 0 then 5 else 0 end");
    expect(migration).toContain("recompute_lead_score_from_interactions");
  });

  it("serializes score calculation per lead", () => {
    expect(migration).toContain("aigro:lead-score:");
    expect(migration).toContain("pg_advisory_xact_lock");
  });
});

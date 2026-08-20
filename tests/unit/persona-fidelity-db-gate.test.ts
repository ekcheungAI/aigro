import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820310000_enforce_persona_fidelity_thresholds.sql",
  "utf8",
);

describe("database persona fidelity gate", () => {
  it("owns the same total and subscore thresholds as the worker", () => {
    expect(migration).toContain("p_score >= 80");
    expect(migration).toContain("edge_honesty >= 16");
    expect(migration).toContain("source_transparency >= 12");
    expect(migration).toContain("stance + style + edge_honesty + source_transparency + structural = p_score");
    expect(migration).toContain("persona_fidelity_threshold_not_met");
  });

  it("quarantines legacy false passes and binds the review payload to its authoritative run", () => {
    expect(migration).toMatch(/update public\.persona_evaluation_runs[\s\S]+set status = 'failed'/i);
    expect(migration).toContain("r.id = new.finalized_evaluation_run_id");
    expect(migration).toContain("r.synthesis_job_id = new.id");
    expect(migration).toContain("r.score = new.fidelity_score");
    expect(migration).toContain("r.report = new.fidelity_report");
    expect(migration).toContain("persona_job_evaluation_binding_mismatch");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hashMigration = readFileSync(
  "supabase/migrations/20260820240000_persona_evaluation_set_hash.sql",
  "utf8",
);
const atomicMigration = readFileSync(
  "supabase/migrations/20260820250000_atomic_persona_job_finalization.sql",
  "utf8",
);
const worker = readFileSync("supabase/functions/persona-compiler/index.ts", "utf8");

describe("atomic persona job finalization", () => {
  it("hashes the full active evaluation snapshot and compares it for currentness", () => {
    expect(hashMigration).toContain("evaluation_set_hash");
    expect(hashMigration).toContain("get_persona_evaluation_set_snapshot");
    expect(hashMigration).toContain("q.question");
    expect(hashMigration).toContain("q.expected");
    expect(hashMigration).toContain("q.source_revision_ids");
    expect(hashMigration).toContain("finalized_evaluation_run_id");
    expect(hashMigration).toContain("output_blueprint_hash");
    expect(hashMigration).toContain("all_runs.synthesis_job_id = j.id");
    expect(hashMigration).toContain("has_current_passed_persona_evaluation");
  });

  it("completes and fails only under the exact service-worker lease", () => {
    expect(atomicMigration).toContain("complete_persona_synthesis_job");
    expect(atomicMigration).toContain("fail_persona_synthesis_job");
    expect(atomicMigration).toContain("for update");
    expect(atomicMigration).toContain("job_row.locked_by is distinct from left(p_worker_id, 120)");
    expect(atomicMigration).toContain("for update of ks, kr");
    expect(atomicMigration.match(/for update of ks, kr/g)).toHaveLength(2);
    expect(atomicMigration).toContain("persona_source_snapshot_not_authorized");
    expect(atomicMigration).toContain("persona_evaluation_set_changed");
    expect(atomicMigration).toContain("persona_evaluation_history_ambiguous");
    expect(atomicMigration).toContain("finalized_evaluation_run_id = finalized_run_id");
    expect(atomicMigration).toContain("persona_review_notes_required");
    expect(atomicMigration).toContain("kr.approved_by is not null");
    expect(atomicMigration).toContain("to service_role");
    expect(atomicMigration).toContain(
      "before insert or update of status, persona_version_id, reviewed_by, reviewed_at, review_notes"
    );
  });

  it("routes snapshot loading, completion and failure through database RPCs", () => {
    const processing = worker.slice(worker.indexOf("async function loadQuestions"), worker.indexOf("Deno.serve"));
    expect(processing).toContain('"get_persona_evaluation_set_snapshot"');
    expect(processing).toContain('"complete_persona_synthesis_job"');
    expect(processing).toContain('"fail_persona_synthesis_job"');
    expect(processing).not.toContain('.from("persona_evaluation_runs").insert');
    expect(processing).not.toContain('.from("persona_synthesis_jobs").update');
  });
});

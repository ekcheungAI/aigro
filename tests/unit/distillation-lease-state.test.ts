import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820260000_serialize_distillation_content_hash.sql",
  "utf8",
);
const stageRightsMigration = readFileSync(
  "supabase/migrations/20260820330000_revalidate_distillation_stage_rights.sql",
  "utf8",
);
const worker = readFileSync("supabase/functions/knowledge-worker/index.ts", "utf8");

describe("lease-scoped distillation state transitions", () => {
  it("serializes instructor content hashes and repeats duplicate detection in SQL", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("source_row.expert_id::text || ':' || btrim(p_content_hash)");
    expect(migration).toContain("knowledge_content_duplicate");
    expect(migration).toContain("other_revision.content_hash = p_content_hash");
  });

  it("guards start and stage changes with the exact worker lease", () => {
    expect(migration).toContain("start_distillation_job");
    expect(migration).toContain("advance_distillation_job_stage");
    expect(migration).toContain("job_row.locked_by is distinct from left(p_worker_id, 120)");
    expect(migration).toContain("where id = stuck_job.revision_id");
    expect(migration).toContain("and status = 'processing'");
  });

  it("routes worker state changes through lease-scoped RPCs", () => {
    const processing = worker.slice(worker.indexOf("async function processJob"), worker.indexOf("async function failJob"));
    expect(processing).toContain('"start_distillation_job"');
    expect(processing).toContain('"advance_distillation_job_stage"');
    expect(processing).toContain('"complete_distillation_job"');
    expect(processing).not.toContain('.from("distillation_jobs").update');
    expect(processing).not.toContain('.from("knowledge_revisions").update');
  });

  it("revalidates exact current rights under canonical locks before each provider stage", () => {
    expect(stageRightsMigration).toContain("select * into source_row");
    expect(stageRightsMigration.indexOf("select * into source_row"))
      .toBeLessThan(stageRightsMigration.indexOf("select * into job_row"));
    expect(stageRightsMigration.indexOf("select * into job_row"))
      .toBeLessThan(stageRightsMigration.indexOf("select * into revision_row"));
    expect(stageRightsMigration).toContain("source_row.archived_at is not null");
    expect(stageRightsMigration).toContain("source_row.rights_status <> 'granted'");
    expect(stageRightsMigration).toContain("source_row.revoked_at is not null");
    expect(stageRightsMigration).toContain("source_row.expires_at <= now()");
    expect(stageRightsMigration).toContain("source_row.rights_scope -> 'distillation' is distinct from 'true'::jsonb");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820190000_lease_scoped_distillation_failure.sql",
  "utf8",
);
const worker = readFileSync("supabase/functions/knowledge-worker/index.ts", "utf8");

describe("lease-scoped distillation failure", () => {
  it("finalizes job and revision state in one service-only SQL function", () => {
    expect(migration).toContain("create or replace function public.fail_distillation_job");
    expect(migration).toContain("security definer");
    expect(migration).toContain("for update");
    expect(migration).toContain("job_row.locked_by is distinct from left(p_worker_id, 120)");
    expect(migration).toContain("grant execute on function public.fail_distillation_job");
    expect(migration).toContain("to service_role");
  });

  it("uses the atomic RPC instead of independent browser-style table updates", () => {
    const failureHandler = worker.slice(
      worker.indexOf("async function failJob"),
      worker.indexOf("Deno.serve"),
    );
    expect(failureHandler).toContain("client.rpc(");
    expect(failureHandler).toContain('"fail_distillation_job"');
    expect(failureHandler).not.toContain("Promise.all");
    expect(failureHandler).not.toContain('.from("distillation_jobs").update');
    expect(failureHandler).not.toContain('.from("knowledge_revisions").update');
  });
});

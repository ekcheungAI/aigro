import { buildPersonaFailurePlan, isPermanentPersonaFailure } from "./persona-job.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("persona failure retry plans preserve the exact worker lease", () => {
  const plan = buildPersonaFailurePlan(
    { id: "persona-job-1", attempts: 1 },
    "persona-worker-1",
    new Error("provider temporarily unavailable"),
    new Date("2026-08-20T00:00:00.000Z"),
  );

  assert(plan.retry, "transient first attempt should retry");
  assert(plan.args.p_job_id === "persona-job-1", "job id must be preserved");
  assert(plan.args.p_worker_id === "persona-worker-1", "worker lease must be preserved");
  assert(plan.args.p_next_retry_at === "2026-08-20T00:01:00.000Z", "retry time should be deterministic");
});

Deno.test("stale rights and evaluation snapshots are permanent persona failures", () => {
  assert(isPermanentPersonaFailure(new Error("persona_source_snapshot_not_authorized")), "rights loss must be terminal");
  assert(isPermanentPersonaFailure(new Error("persona_evaluation_set_changed")), "evaluation drift must be terminal");
  assert(isPermanentPersonaFailure(new Error("persona_evaluation_history_ambiguous")), "legacy duplicate runs must be terminal");

  const plan = buildPersonaFailurePlan(
    { id: "persona-job-2", attempts: 1 },
    "persona-worker-2",
    new Error("persona_evaluation_set_changed"),
  );
  assert(!plan.retry && !plan.args.p_retry, "stale evaluation output must not retry automatically");
});

Deno.test("persona failure messages are bounded", () => {
  const plan = buildPersonaFailurePlan(
    { id: "persona-job-3", attempts: 3 },
    "persona-worker-3",
    new Error("x".repeat(1_500)),
  );
  assert(!plan.retry, "the third attempt must be terminal");
  assert(plan.args.p_error_message.length === 1_000, "stored error must be capped");
});

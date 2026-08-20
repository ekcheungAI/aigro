import { buildDistillationFailurePlan } from "./distillation-failure.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("transient distillation failures retain the active lease retry policy", () => {
  const plan = buildDistillationFailurePlan(
    { id: "job-1", attempts: 1 },
    "worker-1",
    new Error("provider temporarily unavailable"),
    new Date("2026-08-20T00:00:00.000Z"),
  );

  assert(plan.retry, "the first transient failure should retry");
  assert(plan.args.p_job_id === "job-1", "the exact claimed job must be finalized");
  assert(plan.args.p_worker_id === "worker-1", "the exact worker lease must be supplied");
  assert(plan.args.p_next_retry_at === "2026-08-20T00:01:00.000Z", "retry delay should be deterministic");
});

Deno.test("exhausted attempts and permanent rights failures never retry", () => {
  const exhausted = buildDistillationFailurePlan(
    { id: "job-2", attempts: 3 },
    "worker-2",
    new Error("provider temporarily unavailable"),
  );
  const revoked = buildDistillationFailurePlan(
    { id: "job-3", attempts: 1 },
    "worker-3",
    new Error("knowledge_rights_revoked"),
  );

  assert(!exhausted.retry && exhausted.args.p_retry === false, "attempt three must be terminal");
  assert(!revoked.retry && revoked.args.p_retry === false, "revoked rights must be terminal");
});

Deno.test("failure payloads are bounded before entering the database", () => {
  const plan = buildDistillationFailurePlan(
    { id: "job-4", attempts: 1 },
    "worker-4",
    new Error("x".repeat(1_500)),
  );

  assert(plan.args.p_error_message.length === 1_000, "database error payload must be capped");
});

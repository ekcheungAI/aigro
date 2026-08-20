import {
  assertExactPersonaRevisionCoverage,
  callWithCurrentPersonaAuthorization,
} from "./persona-stage-rights.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function rejectsWithRightsCode(operation: () => Promise<unknown>): Promise<void> {
  let message = "";
  try {
    await operation();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(
    message === "persona_source_snapshot_not_authorized",
    `unexpected authorization failure: ${message}`,
  );
}

Deno.test("persona coverage requires exact unique equality", () => {
  assertExactPersonaRevisionCoverage(["r1", "r2"], ["r2", "r1"]);

  for (const authorized of [["r1"], ["r1", "r2", "r2"], ["r1", "r2", "r3"]]) {
    let rejected = false;
    try {
      assertExactPersonaRevisionCoverage(["r1", "r2"], authorized);
    } catch {
      rejected = true;
    }
    assert(rejected, `non-exact coverage should fail: ${authorized.join(",")}`);
  }
});

Deno.test("revocation after synthesis prevents probes and completion", async () => {
  const expected = ["r1", "r2"];
  let authorized = [...expected];
  let synthesisCalls = 0;
  let probeCalls = 0;
  let evaluatorCalls = 0;
  let completionCalls = 0;
  const loadCoverage = () => Promise.resolve(authorized);

  await callWithCurrentPersonaAuthorization(expected, loadCoverage, () => {
    synthesisCalls += 1;
    return Promise.resolve({});
  });
  authorized = ["r1"];

  await rejectsWithRightsCode(async () => {
    await callWithCurrentPersonaAuthorization(expected, loadCoverage, () => {
      probeCalls += 1;
      return Promise.resolve([]);
    });
    await callWithCurrentPersonaAuthorization(expected, loadCoverage, () => {
      evaluatorCalls += 1;
      return Promise.resolve({});
    });
    completionCalls += 1;
  });

  assert(synthesisCalls === 1, "authorized synthesis should run once");
  assert(probeCalls === 0, "revoked evidence must not reach the probe provider");
  assert(evaluatorCalls === 0, "revoked evidence must not reach the evaluator");
  assert(completionCalls === 0, "revoked pipeline must not complete");
});

Deno.test("revocation after probes prevents evaluator and completion", async () => {
  const expected = ["r1", "r2"];
  let authorized = [...expected];
  let evaluatorCalls = 0;
  let completionCalls = 0;
  const loadCoverage = () => Promise.resolve(authorized);

  await callWithCurrentPersonaAuthorization(expected, loadCoverage, () => Promise.resolve("blueprint"));
  await callWithCurrentPersonaAuthorization(expected, loadCoverage, () => Promise.resolve(["probe"]));
  authorized = ["r2"];

  await rejectsWithRightsCode(async () => {
    await callWithCurrentPersonaAuthorization(expected, loadCoverage, () => {
      evaluatorCalls += 1;
      return Promise.resolve("score");
    });
    completionCalls += 1;
  });

  assert(evaluatorCalls === 0, "revoked evidence must not reach the evaluator provider");
  assert(completionCalls === 0, "revoked evaluation must not be finalized");
});

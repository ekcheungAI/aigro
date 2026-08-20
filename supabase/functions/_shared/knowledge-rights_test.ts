import {
  assertDistillationAuthorized,
  isDistillationAuthorized,
  isPermanentKnowledgeRightsError,
} from "./knowledge-rights.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const granted = {
  rights_status: "granted",
  rights_scope: { distillation: true },
  revoked_at: null,
  expires_at: null,
  archived_at: null,
};

Deno.test("distillation authorization requires a current explicit grant", () => {
  assert(isDistillationAuthorized(granted), "current explicit grant should pass");
  assert(!isDistillationAuthorized({ ...granted, rights_status: "unknown" }), "unknown rights must fail");
  assert(!isDistillationAuthorized({ ...granted, rights_scope: { distillation: false } }), "missing distillation scope must fail");
  assert(!isDistillationAuthorized({ ...granted, revoked_at: "2026-08-20T00:00:00Z" }), "revoked rights must fail");
  assert(!isDistillationAuthorized({ ...granted, archived_at: "2026-08-20T00:00:00Z" }), "archived source must fail");
  assert(
    !isDistillationAuthorized(
      { ...granted, expires_at: "2026-08-20T00:00:00Z" },
      new Date("2026-08-20T00:00:01Z"),
    ),
    "expired rights must fail",
  );
});

Deno.test("authorization assertion uses a stable permanent error code", () => {
  let message = "";
  try {
    assertDistillationAuthorized({ ...granted, rights_status: "revoked" });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message === "knowledge_distillation_not_authorized", `unexpected error: ${message}`);
});

Deno.test("rights failures are terminal rather than retried", () => {
  assert(
    isPermanentKnowledgeRightsError(
      new Error("Cannot complete distillation atomically: knowledge_distillation_not_authorized"),
    ),
    "completion rights failure should be permanent",
  );
  assert(
    isPermanentKnowledgeRightsError(new Error("knowledge_rights_revoked")),
    "explicit revocation should be permanent",
  );
  assert(
    isPermanentKnowledgeRightsError(new Error("knowledge_content_duplicate")),
    "duplicate instructor content should be permanent",
  );
  assert(
    !isPermanentKnowledgeRightsError(new Error("OpenAI embeddings failed (503)")),
    "transient provider failures should still retry",
  );
});

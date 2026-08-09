import { buildKnowledgeDuplicateScope } from "./knowledge-dedupe.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("knowledge dedupe is scoped to the current instructor across sources", () => {
  const scope = buildKnowledgeDuplicateScope({
    contentHash: "same-content-hash",
    currentRevisionId: "revision-current",
    expertId: "expert-a",
  });

  assert(
    scope.select.includes(
      "knowledge_sources!knowledge_revisions_source_id_fkey!inner(expert_id)",
    ),
    "dedupe must inner-join the revision's source through the unambiguous foreign key",
  );
  assert(
    scope.expertFilterColumn === "knowledge_sources.expert_id",
    "dedupe must filter through the revision source's instructor",
  );
  assert(scope.expertId === "expert-a", "dedupe must retain the current instructor id");
  assert(scope.contentHash === "same-content-hash", "dedupe must retain the content hash");
  assert(
    scope.currentRevisionId === "revision-current",
    "dedupe must exclude only the revision currently being processed",
  );
  assert(
    !scope.expertFilterColumn.includes("source_id"),
    "dedupe must continue to detect matching content in another source owned by the same instructor",
  );
});

Deno.test("knowledge dedupe scopes identical content independently per instructor", () => {
  const first = buildKnowledgeDuplicateScope({
    contentHash: "same-content-hash",
    currentRevisionId: "revision-a",
    expertId: "expert-a",
  });
  const second = buildKnowledgeDuplicateScope({
    contentHash: "same-content-hash",
    currentRevisionId: "revision-b",
    expertId: "expert-b",
  });

  assert(first.contentHash === second.contentHash, "test precondition: hashes must match");
  assert(
    first.expertId !== second.expertId,
    "identical content owned by different instructors must use different dedupe scopes",
  );
});

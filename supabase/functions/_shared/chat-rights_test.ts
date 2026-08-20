import {
  BoundedChatBuffer,
  buildPersistedRetrievalLineage,
  chatProgressPayload,
  committedChatReleaseEvents,
  parseAuthorizedChatCommit,
  parseRightsSafeReplay,
} from "./chat-rights.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn: () => void, expectedMessage: string): void {
  try {
    fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`expected function to throw ${expectedMessage}`);
}

Deno.test("rights-safe replay parser accepts only a complete ready payload", () => {
  const answer = {
    id: "answer-id",
    content: "grounded answer",
    citations: [],
    answer_basis: "knowledge",
    coverage: "high",
  };
  assertEquals(parseRightsSafeReplay({ state: "ready", answer }), {
    state: "ready",
    answer,
  });
  assertEquals(parseRightsSafeReplay({ state: "ready" }), {
    state: "unavailable",
    answer: null,
  });
});

Deno.test("rights-safe replay parser preserves fail-closed server states", () => {
  for (const state of ["missing", "payload_mismatch", "sources_unavailable"] as const) {
    assertEquals(parseRightsSafeReplay({ state, answer: { content: "must not escape" } }), {
      state,
      answer: null,
    });
  }
  assertEquals(parseRightsSafeReplay({ state: "unexpected", answer: { content: "no" } }), {
    state: "unavailable",
    answer: null,
  });
});

Deno.test("a later answer persists transitive history revision lineage", () => {
  const firstRound = buildPersistedRetrievalLineage([
    { chunk_id: "chunk-a", revision_id: "revision-a", similarity: 0.9 },
  ], []);
  assertEquals(firstRound, [{
    chunk_id: "chunk-a",
    revision_id: "revision-a",
    similarity: 0.9,
    lineage_origin: "current",
  }]);

  const secondRound = buildPersistedRetrievalLineage([], [{
    role: "assistant",
    content: "answer based on A",
    revision_ids: ["revision-a"],
  }]);
  assertEquals(secondRound, [{
    revision_id: "revision-a",
    lineage_origin: "history",
  }]);

  const mixedRound = buildPersistedRetrievalLineage([
    { chunk_id: "chunk-b", revision_id: "revision-b", similarity: 0.8 },
  ], [{
    role: "assistant",
    content: "answer based on A",
    revision_ids: ["revision-a", "revision-b", "revision-a"],
  }]);
  assertEquals(mixedRound, [
    {
      chunk_id: "chunk-b",
      revision_id: "revision-b",
      similarity: 0.8,
      lineage_origin: "current",
    },
    { revision_id: "revision-a", lineage_origin: "history" },
  ]);
});

Deno.test("failed commit releases no buffered answer or retrieval metadata", () => {
  const events = committedChatReleaseEvents(false, {
    answer: "private generated answer",
    sources: [{ revision_id: "private-revision", similarity: 0.99 }],
    done: { citations: [{ title: "private citation" }] },
  });

  assertEquals(events.map((event) => event.event), ["error"]);
  const serialized = JSON.stringify(events);
  assertEquals(serialized.includes("private generated answer"), false);
  assertEquals(serialized.includes("private-revision"), false);
  assertEquals(serialized.includes("private citation"), false);
});

Deno.test("committed release is deterministic", () => {
  assertEquals(committedChatReleaseEvents(true, {
    answer: "authorised answer",
    sources: [{ marker: "S1" }],
    done: { message_id: "message-1" },
  }), [
    { event: "retrieved_sources", payload: { sources: [{ marker: "S1" }] } },
    { event: "delta", payload: { text: "authorised answer" } },
    { event: "done", payload: { message_id: "message-1" } },
  ]);
});

Deno.test("commit parser accepts only the authoritative persisted answer payload", () => {
  const persisted = {
    state: "committed",
    message_id: "message-1",
    answer: "persisted answer",
    citations: [{ revision_id: "revision-1", href: "" }],
    answer_basis: "knowledge",
    coverage: "high",
  };
  assertEquals(parseAuthorizedChatCommit(persisted), {
    messageId: "message-1",
    answer: "persisted answer",
    citations: [{ revision_id: "revision-1", href: "" }],
    answerBasis: "knowledge",
    coverage: "high",
  });

  for (const malformed of [
    { ...persisted, citations: null },
    { ...persisted, citations: ["not-an-object"] },
    { ...persisted, answer: "" },
    { ...persisted, state: "authorization_changed" },
  ]) {
    assertEquals(parseAuthorizedChatCommit(malformed), null);
  }
});

Deno.test("bounded buffer counts UTF-8 bytes and rejects oversized output", () => {
  const buffer = new BoundedChatBuffer(6);
  buffer.append("你");
  buffer.append("好");
  assertEquals(buffer.byteLength, 6);
  assertEquals(buffer.text(), "你好");
  assertThrows(
    () => buffer.append("!"),
    "exceeded the safe limit",
  );
});

Deno.test("progress heartbeat contains no content or evidence fields", () => {
  const progress = chatProgressPayload();
  assertEquals(progress, { phase: "generating" });
  const serialized = JSON.stringify(progress);
  for (const forbidden of ["text", "answer", "source", "revision", "citation"]) {
    assertEquals(serialized.includes(forbidden), false);
  }
});

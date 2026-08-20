import {
  citationPromptRules,
  citedChunkIndexes,
  createGeneralStreamFilter,
  createGroundedStreamGate,
  isGroundingAbstention,
  safeHttpsCitationHref,
  sanitizeCitationHrefs,
} from "./chat-grounding.ts";

function assertEquals(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function assertThrows(action: () => unknown, message: string): void {
  try {
    action();
  } catch (error) {
    if (error instanceof Error && error.message.includes(message)) return;
    throw error;
  }
  throw new Error(`expected function to throw: ${message}`);
}

Deno.test("accepts only in-range source markers and preserves locator indexes", () => {
  assertEquals(
    [...citedChunkIndexes("第一點 [S2]，另一點 [S1] [S2]。", 2)],
    [2, 1],
    "valid source markers",
  );
});

Deno.test("rejects fabricated, zero, negative, and malformed source markers", () => {
  assertThrows(
    () => citedChunkIndexes("[S0] [S3] [S-1] [source1]", 2),
    "invalid source marker",
  );
});

Deno.test("rejects a fabricated marker even when another marker is valid", () => {
  assertThrows(
    () => citedChunkIndexes("Supported [S1], fabricated [S99]", 6),
    "invalid source marker",
  );
});

Deno.test("does not confuse unmarked retrieval candidates with verified citations", () => {
  assertEquals(
    [...citedChunkIndexes("呢段答案冇任何來源標記。", 6)],
    [],
    "retrieval alone is not a citation",
  );
});

Deno.test("streams only marker-validated segments across provider deltas", () => {
  const emitted: string[] = [];
  const gate = createGroundedStreamGate(2, (text) => emitted.push(text));
  gate.push("第一個方法");
  assertEquals(emitted, [], "unmarked text remains buffered");
  gate.push("。[S");
  assertEquals(emitted, [], "split marker remains buffered");
  gate.push("1] 第二個方法。[S2]");
  const result = gate.finish();
  assertEquals(
    emitted,
    ["第一個方法。[S1]", " 第二個方法。[S2]"],
    "validated deltas",
  );
  assertEquals([...result.indexes], [1, 2], "validated marker indexes");
  assertEquals(result.abstained, false, "grounded answer is not an abstention");
});

Deno.test("accepts only the exact no-marker knowledge-gap abstention", () => {
  const emitted: string[] = [];
  const gate = createGroundedStreamGate(3, (text) => emitted.push(text));
  gate.push("現有知識庫未有足夠資料。");
  const result = gate.finish();
  assertEquals(result.abstained, true, "exact abstention is accepted");
  assertEquals(
    emitted,
    ["現有知識庫未有足夠資料。"],
    "abstention is emitted after validation",
  );
  assertEquals(
    isGroundingAbstention("我估知識不足"),
    false,
    "arbitrary text is not abstention",
  );
});

Deno.test("never emits a segment containing an invalid marker", () => {
  const emitted: string[] = [];
  const gate = createGroundedStreamGate(2, (text) => emitted.push(text));
  assertThrows(() => gate.push("不支持嘅講法 [S99]"), "invalid source marker");
  assertEquals(emitted, [], "invalid segment was withheld");
});

Deno.test("keeps only credential-free HTTPS citation destinations without query or fragment secrets", () => {
  assertEquals(
    safeHttpsCitationHref(
      "  https://example.com/source?X-Amz-Signature=secret&token=private#access_token  ",
    ),
    "https://example.com/source",
    "signed HTTPS URL is reduced to its public location",
  );
  for (
    const unsafe of [
      "http://example.com/source",
      "javascript:alert(1)",
      "data:text/html,unsafe",
      "//example.com/source",
      "https://user:secret@example.com/source",
      "/internal/source",
      "not a url",
    ]
  ) {
    assertEquals(safeHttpsCitationHref(unsafe), "", `unsafe URL ${unsafe}`);
  }
});

Deno.test("sanitizes citation hrefs replayed from legacy database rows", () => {
  assertEquals(
    sanitizeCitationHrefs([
      {
        marker: "S1",
        href: "https://example.com/source?signature=private#token",
        signed_url: "https://storage.example.com/file?token=private",
        source_url: "https://fetch.example.com/article?api_key=private",
        storage_path: "expert/private.pdf",
        provider_download_url: "https://provider.example.com/file?token=private",
        title: "Safe",
        page: 4,
      },
      { marker: "S2", href: "javascript:alert(1)", title: "Unsafe" },
      { marker: "S3", href: "http://example.com/source", title: "Old HTTP" },
      null,
    ]),
    [
      {
        marker: "S1",
        href: "https://example.com/source",
        title: "Safe",
        page: 4,
      },
      { marker: "S2", href: "", title: "Unsafe" },
      { marker: "S3", href: "", title: "Old HTTP" },
    ],
    "legacy citation hrefs",
  );
});

Deno.test("general streaming strips fabricated source markers across arbitrary deltas", () => {
  const emitted: string[] = [];
  const filter = createGeneralStreamFilter((text) => emitted.push(text));
  filter.push("一般知識答覆 [");
  filter.push("S9");
  filter.push("9]，仍然保留後文。");
  const answer = filter.finish();

  assertEquals(
    answer,
    "一般知識答覆 ，仍然保留後文。",
    "sanitized persisted answer",
  );
  assertEquals(emitted.join(""), answer, "stream and persisted answer match");
});

Deno.test("general streaming preserves incomplete bracket text that is not a citation marker", () => {
  const emitted: string[] = [];
  const filter = createGeneralStreamFilter((text) => emitted.push(text));
  filter.push("可以用 [SQL");
  filter.push(" 查詢");
  const answer = filter.finish();

  assertEquals(answer, "可以用 [SQL 查詢", "non-marker bracket text");
  assertEquals(
    emitted.join(""),
    answer,
    "non-marker stream matches persisted answer",
  );
});

Deno.test("prompt rules explicitly prohibit markers when no sources were retrieved", () => {
  const generalRules = citationPromptRules(false);
  const groundedRules = citationPromptRules(true);

  assertEquals(
    generalRules.includes("唔可以輸出 [S1]"),
    true,
    "general marker prohibition",
  );
  assertEquals(
    groundedRules.includes("句尾必須加"),
    true,
    "grounded marker instruction",
  );
});

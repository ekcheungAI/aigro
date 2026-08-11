import {
  chunkParagraphText,
  mergeCitationProvenance,
  normalizeSourceText,
  sha256Hex,
} from "./distillation.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("normalizes line endings, whitespace and source length", () => {
  const output = normalizeSourceText("  第一段\r\n\r\n\r\n第二\t 段  ", 12);
  assert(output === "第一段\n\n第二 段", `unexpected normalized text: ${output}`);
});

Deno.test("SHA-256 is stable for deduplication", async () => {
  const first = await sha256Hex("AIGRO knowledge");
  const second = await sha256Hex("AIGRO knowledge");
  assert(first === second, "same source must produce the same hash");
  assert(first.length === 64, "SHA-256 must be a 64-character hex digest");
});

Deno.test("paragraph chunking keeps bounded overlap and locators", () => {
  const chunks = chunkParagraphText("AAAA\n\nBBBB\n\nCCCC", 10, 2);
  assert(chunks.length === 2, `expected 2 chunks, got ${chunks.length}`);
  assert(chunks[0].citationMeta.start_paragraph === 0, "first locator must start at paragraph zero");
  assert(chunks[1].content.startsWith("BB"), "next chunk must include the configured overlap");
  assert(chunks[1].citationMeta.end_paragraph === 2, "last locator must point to the last paragraph");
});

Deno.test("invalid chunk settings are rejected", () => {
  let rejected = false;
  try {
    chunkParagraphText("content", 100, 100);
  } catch {
    rejected = true;
  }
  assert(rejected, "overlap equal to target must be rejected");
});

Deno.test("citation provenance keeps pinned knowledge-pack identity", () => {
  const citation = mergeCitationProvenance(
    { start_paragraph: 2, end_paragraph: 4 },
    { corpus: "growth-with-ai-guide", commit_sha: "abc", file_path: "stage/lesson.md", stage: 2 },
  );
  if (citation.commit_sha !== "abc" || citation.file_path !== "stage/lesson.md") {
    throw new Error("pinned provenance missing");
  }
  if (citation.start_paragraph !== 2 || citation.stage !== 2) {
    throw new Error("chunk locator missing");
  }
});

import {
  chunkParagraphText,
  mergeCitationProvenance,
  normalizeSourceText,
  sha256Hex,
  validateDistillationPayload,
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

Deno.test("distillation output must contain reviewable claims and evidence", () => {
  const output = validateDistillationPayload({
    summary: "呢份素材解釋由單次 AI 使用走到可重用工作流程嘅主要方法。",
    claims: [{
      claim: "先完成一件真實工作，再抽取可重用流程。",
      evidence: "作者以第一個完整任務作為學習階段起點。",
      locator: "第一章",
    }],
    methods: ["先做真實任務", "保存可重用 context"],
    boundaries: ["未經測試嘅步驟唔當成穩定流程"],
    suggested_questions: ["點樣揀第一個適合 AI 完成嘅真實任務？"],
  });
  assert(output.claims.length === 1, "valid evidence claim should be retained");
  assert(output.claims[0].locator === "第一章", "claim locator should be retained");
});

Deno.test("empty or evidence-free distillation output fails closed", () => {
  for (const payload of [
    {},
    {
      summary: "呢個摘要雖然夠長，但完全冇任何可以核對嘅 evidence claim。",
      claims: [],
      methods: ["方法"],
      boundaries: ["邊界"],
      suggested_questions: ["呢個方法應該點樣開始使用？"],
    },
    {
      summary: "呢個摘要夠長，而且聲稱有 claim，但 evidence 內容係空白。",
      claims: [{ claim: "一個聲稱", evidence: "" }],
      methods: ["方法"],
      boundaries: ["邊界"],
      suggested_questions: ["呢個方法應該點樣開始使用？"],
    },
  ]) {
    let rejected = false;
    try {
      validateDistillationPayload(payload);
    } catch {
      rejected = true;
    }
    assert(rejected, "incomplete distillation must be rejected");
  }
});

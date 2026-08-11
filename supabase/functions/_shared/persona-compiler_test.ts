import {
  buildEvidenceManifest,
  fidelityPassed,
  hasCompleteRevisionCoverage,
  parseFidelityReport,
  validatePersonaBlueprint,
} from "./persona-compiler.ts";

Deno.test("authorization coverage validates 501 revisions independently of evidence cap", () => {
  const expected = Array.from({ length: 501 }, (_, index) => `revision-${index}`);
  assert(hasCompleteRevisionCoverage(expected, expected), "all 501 authorized revisions should validate");
  assert(!hasCompleteRevisionCoverage(expected, expected.slice(0, 500)), "one missing authorization must fail closed");
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const refs = new Set(["a", "b", "c"]);
const blueprint = {
  mental_models: Array.from({ length: 3 }, (_, index) => ({
    name: `模型 ${index}`, description: "描述", when_to_use: "作決定時", evidence_refs: ["a", "b"],
  })),
  decision_heuristics: Array.from({ length: 5 }, (_, index) => ({
    trigger: `情境 ${index}`, rule: "先驗證", tradeoff: "速度與準確度", evidence_refs: ["a"],
  })),
  expression_dna: {
    tone: ["直接", "誠實"], pacing: "先結論後解釋", answer_structure: ["結論", "下一步"],
    signature_patterns: ["講清限制"], avoid: ["保證結果"],
    evidence_refs: ["a", "b"],
  },
  values: [{ value: "實證", behaviour: "先測試", evidence_refs: ["a"] }],
  anti_patterns: [{ pattern: "空泛建議", why: "不能執行", evidence_refs: ["b"] }],
  tensions: [{ tension: "快與準", side_a: "快試", side_b: "驗證", when_each_applies: "按風險", evidence_refs: ["a"] }],
  honest_boundaries: [
    { boundary: "無證據", response_strategy: "清楚講不知道", evidence_refs: ["a"] },
    { boundary: "私人資料", response_strategy: "拒絕推測", evidence_refs: ["b"] },
  ],
  timeline: [{ period: "近期", change: "更重視驗證", evidence_refs: ["c"] }],
};

Deno.test("valid persona blueprint requires cross-source mental model evidence", () => {
  const parsed = validatePersonaBlueprint(blueprint, refs, new Map([["a", "r1"], ["b", "r2"], ["c", "r2"]]));
  assert(parsed.mental_models.length === 3, "three mental models should pass");
});

Deno.test("mental models reject two chunks from the same source", () => {
  let rejected = false;
  try {
    validatePersonaBlueprint(blueprint, refs, new Map([["a", "r1"], ["b", "r1"], ["c", "r2"]]));
  } catch {
    rejected = true;
  }
  assert(rejected, "cross-validation requires two independent source revisions");
});

Deno.test("persona blueprint rejects fabricated evidence references", () => {
  let rejected = false;
  try {
    validatePersonaBlueprint({
      ...blueprint,
      mental_models: [{ ...blueprint.mental_models[0], evidence_refs: ["a", "invented"] }, ...blueprint.mental_models.slice(1)],
    }, refs);
  } catch {
    rejected = true;
  }
  assert(rejected, "unknown evidence must be rejected");
});

Deno.test("evidence manifest only exposes cited evidence", () => {
  const parsed = validatePersonaBlueprint(blueprint, refs);
  const manifest = buildEvidenceManifest(parsed, [
    { ref: "a", revisionId: "r1", sourceTitle: "文章", sourceType: "url", content: "A", locator: {}, dimension: "writings" },
    { ref: "b", revisionId: "r2", sourceTitle: "訪談", sourceType: "youtube", content: "B", locator: {}, dimension: "conversations" },
    { ref: "c", revisionId: "r2", sourceTitle: "訪談", sourceType: "youtube", content: "C", locator: {} },
  ]);
  assert(manifest.source_count === 2, "manifest should preserve independent source count");
});

Deno.test("fidelity gate requires total, honesty and transparency thresholds", () => {
  assert(fidelityPassed(82, {
    stance_consistency: 25, style_distinctiveness: 16, edge_honesty: 16,
    source_transparency: 12, structural_completeness: 13,
  }), "qualified report should pass");
  assert(!fidelityPassed(90, {
    stance_consistency: 30, style_distinctiveness: 20, edge_honesty: 15,
    source_transparency: 15, structural_completeness: 10,
  }), "weak edge honesty must fail even with a high total");
});

Deno.test("fidelity score is derived from bounded category scores", () => {
  const report = parseFidelityReport({
    breakdown: {
      stance_consistency: 25, style_distinctiveness: 17, edge_honesty: 18,
      source_transparency: 13, structural_completeness: 12,
    },
    strengths: ["有界線"], risks: ["樣本較少"],
  });
  assert(report.score === 85, `expected 85, got ${report.score}`);
});

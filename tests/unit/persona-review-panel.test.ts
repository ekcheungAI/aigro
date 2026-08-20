import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPersonaReviewInspectable } from "@/lib/personaReview";
import type { EvaluationQuestionRow, PersonaJobRow } from "@/pages/admin/AdminStudio";

const revisionId = "10000000-0000-0000-0000-000000000001";
const questions: EvaluationQuestionRow[] = Array.from({ length: 25 }, (_, index) => ({
  id: `question-${index}`,
  expert_id: "expert-1",
  category: "known_stance",
  question: `Grounded evaluation question ${index}`,
  expected: { criteria: `Evidence-backed criterion ${index}` },
  source_revision_ids: [revisionId],
  active: true,
  created_at: "2026-08-20T00:00:00Z",
}));

const job: PersonaJobRow = {
  id: "job-1",
  expert_id: "expert-1",
  status: "review",
  fidelity_score: 90,
  fidelity_status: "passed",
  fidelity_report: {
    breakdown: {
      stance_consistency: 27,
      style_distinctiveness: 18,
      edge_honesty: 18,
      source_transparency: 13,
      structural_completeness: 14,
    },
    evaluation: { question_count: 25, response_count: 25, evaluation_set_hash: "a".repeat(64) },
  },
  output_blueprint: {
    mental_models: Array.from({ length: 3 }, (_, index) => ({ name: `Model ${index}`, description: "Description", when_to_use: "When relevant", evidence_refs: [`ref-${index}`] })),
    decision_heuristics: Array.from({ length: 5 }, (_, index) => ({ trigger: `Trigger ${index}`, rule: "Rule", tradeoff: "Tradeoff", evidence_refs: [`ref-${index}`] })),
    expression_dna: { tone: ["direct", "specific"], pacing: "measured", answer_structure: ["context", "action"], signature_patterns: ["example"], avoid: ["hype"], evidence_refs: ["ref-1", "ref-2"] },
    values: [],
    anti_patterns: [],
    tensions: [],
    honest_boundaries: Array.from({ length: 2 }, (_, index) => ({ boundary: `Boundary ${index}`, response_strategy: "Say what is unknown", evidence_refs: [`ref-${index}`] })),
    timeline: [],
  },
  evidence_manifest: {
    source_count: 2,
    evidence_count: 1,
    evidence: [{ ref: "ref-1", revision_id: revisionId, source_title: "Source", excerpt: "Evidence" }],
  },
  source_revision_ids: [revisionId, "20000000-0000-0000-0000-000000000002"],
  error_message: null,
  created_at: "2026-08-20T00:00:00Z",
  experts: null,
};

describe("persona human-review panel", () => {
  it("enables approval only when the full blueprint, evidence, report and evaluation set are inspectable", () => {
    expect(isPersonaReviewInspectable(job, questions)).toBe(true);
    expect(isPersonaReviewInspectable({
      ...job,
      output_blueprint: { ...job.output_blueprint, timeline: undefined },
    }, questions)).toBe(false);
    expect(isPersonaReviewInspectable(job, questions.slice(0, 5))).toBe(false);
  });

  it("renders the complete evaluation set instead of hiding all but five questions", () => {
    const source = readFileSync("src/pages/admin/AdminStudio.tsx", "utf8");
    expect(source).toContain("selectedEvaluationQuestions.map");
    expect(source).not.toContain("selectedEvaluationQuestions.slice(0, 5)");
    for (const section of ["Expression DNA", "Values", "Anti-patterns", "Timeline", "Evidence manifest", "Fidelity report"]) {
      expect(source).toContain(section);
    }
    expect(source).toContain("distilled?.suggested_questions");
    expect(source).toContain('["Suggested questions", suggestedQuestions]');
  });
});

import { isGroundedEvaluationQuestion } from "@/lib/instructorRelease";

interface ReviewQuestion {
  expected: Record<string, unknown>;
  source_revision_ids: string[];
}

interface ReviewJob {
  status: string;
  output_blueprint: {
    mental_models?: unknown[];
    decision_heuristics?: unknown[];
    expression_dna?: { tone?: string[]; answer_structure?: string[] };
    values?: unknown[];
    anti_patterns?: unknown[];
    tensions?: unknown[];
    honest_boundaries?: unknown[];
    timeline?: unknown[];
  };
  evidence_manifest: {
    source_count?: number;
    evidence_count?: number;
    evidence?: unknown[];
  };
  fidelity_report?: {
    breakdown?: Record<string, number>;
    evaluation?: { question_count?: number; response_count?: number };
  };
}

export function isPersonaReviewInspectable(
  job: ReviewJob | undefined,
  questions: ReviewQuestion[],
): boolean {
  if (!job || job.status !== "review") return false;
  const grounded = questions.filter(isGroundedEvaluationQuestion);
  return (job.output_blueprint.mental_models?.length ?? 0) >= 3
    && (job.output_blueprint.decision_heuristics?.length ?? 0) >= 5
    && (job.output_blueprint.expression_dna?.tone?.length ?? 0) >= 2
    && (job.output_blueprint.expression_dna?.answer_structure?.length ?? 0) >= 2
    && (job.output_blueprint.honest_boundaries?.length ?? 0) >= 2
    && Array.isArray(job.output_blueprint.values)
    && Array.isArray(job.output_blueprint.anti_patterns)
    && Array.isArray(job.output_blueprint.tensions)
    && Array.isArray(job.output_blueprint.timeline)
    && (job.evidence_manifest.source_count ?? 0) >= 2
    && (job.evidence_manifest.evidence_count ?? 0) > 0
    && job.evidence_manifest.evidence?.length === job.evidence_manifest.evidence_count
    && Object.keys(job.fidelity_report?.breakdown ?? {}).length === 5
    && questions.length >= 25
    && questions.length <= 50
    && grounded.length === questions.length
    && job.fidelity_report?.evaluation?.question_count === questions.length
    && job.fidelity_report?.evaluation?.response_count === questions.length;
}

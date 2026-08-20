export interface ExpertReleaseReadiness {
  identity_verified: boolean;
  owner_assigned: boolean;
  published_persona: boolean;
  published_sources: number;
  published_chunks: number;
  evaluation_questions: number;
  evaluation_question_total: number;
  evaluation_passed: boolean;
  pending_jobs: number;
  failed_jobs: number;
  ready: boolean;
  chat_ready: boolean;
}

export const EMPTY_READINESS: ExpertReleaseReadiness = {
  identity_verified: false,
  owner_assigned: false,
  published_persona: false,
  published_sources: 0,
  published_chunks: 0,
  evaluation_questions: 0,
  evaluation_question_total: 0,
  evaluation_passed: false,
  pending_jobs: 0,
  failed_jobs: 0,
  ready: false,
  chat_ready: false,
};

export function normalizeReleaseReadiness(value: unknown): ExpertReleaseReadiness {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_READINESS;
  const record = value as Record<string, unknown>;
  const numberValue = (key: string) => {
    const parsed = Number(record[key]);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    identity_verified: record.identity_verified === true,
    owner_assigned: record.owner_assigned === true,
    published_persona: record.published_persona === true,
    published_sources: numberValue("published_sources"),
    published_chunks: numberValue("published_chunks"),
    evaluation_questions: numberValue("evaluation_questions"),
    evaluation_question_total: numberValue("evaluation_question_total"),
    evaluation_passed: record.evaluation_passed === true,
    pending_jobs: numberValue("pending_jobs"),
    failed_jobs: numberValue("failed_jobs"),
    ready: record.ready === true,
    chat_ready: record.chat_ready === true,
  };
}

export function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function isGroundedEvaluationQuestion(question: {
  expected: Record<string, unknown>;
  source_revision_ids: string[];
}): boolean {
  return Boolean(
    question.expected
      && typeof question.expected === "object"
      && !Array.isArray(question.expected)
      && Object.keys(question.expected).length > 0
      && Array.isArray(question.source_revision_ids)
      && question.source_revision_ids.length > 0
  );
}

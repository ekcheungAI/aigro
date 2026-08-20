export interface PersonaFailureJob {
  id: string;
  attempts: number;
}

export interface PersonaFailureRpcArgs {
  p_job_id: string;
  p_worker_id: string;
  p_error_message: string;
  p_retry: boolean;
  p_next_retry_at: string;
}

export interface PersonaFailurePlan {
  retry: boolean;
  args: PersonaFailureRpcArgs;
}

const PERMANENT_FAILURE_CODES = [
  "persona_source_snapshot_not_authorized",
  "persona_evaluation_set_invalid",
  "persona_evaluation_set_changed",
  "persona_evaluation_history_ambiguous",
] as const;

export function isPermanentPersonaFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return PERMANENT_FAILURE_CODES.some((code) => message.includes(code));
}

export function buildPersonaFailurePlan(
  job: PersonaFailureJob,
  workerId: string,
  error: unknown,
  now = new Date(),
): PersonaFailurePlan {
  const message = error instanceof Error ? error.message : String(error);
  const retry = job.attempts < 3 && !isPermanentPersonaFailure(error);
  const delayMinutes = Math.max(1, 2 ** Math.max(0, job.attempts - 1));

  return {
    retry,
    args: {
      p_job_id: job.id,
      p_worker_id: workerId,
      p_error_message: message.slice(0, 1_000),
      p_retry: retry,
      p_next_retry_at: new Date(now.getTime() + delayMinutes * 60_000).toISOString(),
    },
  };
}

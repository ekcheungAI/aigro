import { isPermanentKnowledgeRightsError } from "./knowledge-rights.ts";

export interface DistillationFailureJob {
  id: string;
  attempts: number;
}

export interface DistillationFailureRpcArgs {
  p_job_id: string;
  p_worker_id: string;
  p_error_message: string;
  p_retry: boolean;
  p_next_retry_at: string;
}

export interface DistillationFailurePlan {
  retry: boolean;
  args: DistillationFailureRpcArgs;
}

export function buildDistillationFailurePlan(
  job: DistillationFailureJob,
  workerId: string,
  error: unknown,
  now = new Date(),
): DistillationFailurePlan {
  const message = error instanceof Error ? error.message : String(error);
  const retry = job.attempts < 3 && !isPermanentKnowledgeRightsError(error);
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

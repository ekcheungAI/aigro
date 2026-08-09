import {
  assertSafePublicConnection,
  type NormalizedSocialContent,
  PublicSocialConnection,
  PublicSocialProvider,
  SocialSyncError,
} from "./social-sync.ts";

export const SOCIAL_SYNC_INVOCATION_DEADLINE_MS = 70_000;
const INVOCATION_LEASE_SECONDS = 120;
const MAX_JOBS_PER_INVOCATION = 1;

export interface ClaimedSocialSyncJob {
  id: string;
  connectionId: string;
  expertId: string;
  attempts: number;
}

export interface SocialConnectionRecord extends PublicSocialConnection {
  expertId: string;
  canonicalUrl: string | null;
  useForDistillation: boolean;
}

export interface SocialContentUpsert {
  connectionId: string;
  expertId: string;
  platform: "tiktok" | "instagram";
  providerContentId: string;
  canonicalUrl: string;
  contentType: string;
  title: string | null;
  textContent: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  publicMetrics: Record<string, number>;
  providerMeta: Record<string, unknown>;
}

export interface FinishSocialSyncJobInput {
  jobId: string;
  workerId: string;
  success: boolean;
  fetchedCount: number;
  providerRequestId: string | null;
  cursor: string | null;
  errorMessage: string | null;
  retryable: boolean;
}

export interface PersistSocialSyncResultInput {
  jobId: string;
  workerId: string;
  connectionId: string;
  expertId: string;
  providerAccountId: string;
  canonicalUrl: string;
  items: SocialContentUpsert[];
  providerRequestId: string | null;
  cursor: string | null;
}

export interface SocialSyncRepository {
  acquireInvocationLease(
    workerId: string,
    leaseSeconds: number,
  ): Promise<boolean>;
  releaseInvocationLease(workerId: string): Promise<void>;
  claimJobs(workerId: string, limit: number): Promise<ClaimedSocialSyncJob[]>;
  getConnection(connectionId: string): Promise<SocialConnectionRecord>;
  /**
   * One database transaction re-checks the job lease and active consent before
   * updating the profile, upserting content, staging distillation and completing
   * the job. This prevents an in-flight fetch from restoring revoked content.
   */
  persistResult(input: PersistSocialSyncResultInput): Promise<number>;
  finishJob(input: FinishSocialSyncJobInput): Promise<void>;
}

export interface SocialSyncRunResult {
  claimed: number;
  results: Array<{ id: string; status: string; error?: string }>;
  skipped?: "lease_busy";
}

function safeFailure(error: unknown): {
  code: string;
  requestId: string | null;
  retryable: boolean;
} {
  if (error instanceof SocialSyncError) {
    return {
      code: error.code,
      requestId: error.requestId,
      retryable: error.retryable,
    };
  }
  return { code: "social_sync_failed", requestId: null, retryable: true };
}

function contentUpsert(
  connection: SocialConnectionRecord,
  item: NormalizedSocialContent,
  providerRequestId: string | null,
  endpoint: string,
  observedAt: string,
): SocialContentUpsert {
  if (item.provider !== connection.platform) {
    throw new SocialSyncError("provider_platform_mismatch");
  }
  return {
    connectionId: connection.id,
    expertId: connection.expertId,
    platform: item.provider,
    providerContentId: item.providerContentId,
    canonicalUrl: item.canonicalUrl,
    contentType: item.contentType,
    title: item.title,
    textContent: item.textContent,
    thumbnailUrl: item.thumbnailUrl,
    publishedAt: item.publishedAt,
    publicMetrics: item.publicMetrics,
    providerMeta: {
      source: "tikhub_public",
      endpoint,
      provider_request_id: providerRequestId,
      observed_at: observedAt,
      schema_version: "social-sync-v1",
    },
  };
}

function throwIfDeadlineExpired(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new SocialSyncError("invocation_deadline_exceeded", {
      retryable: true,
    });
  }
}

export async function runSocialSyncJobs(
  input: {
    repository: SocialSyncRepository;
    provider: PublicSocialProvider;
    workerId: string;
    now?: () => Date;
    deadlineMs?: number;
  },
): Promise<SocialSyncRunResult> {
  const deadlineMs = Math.max(
    1,
    input.deadlineMs ?? SOCIAL_SYNC_INVOCATION_DEADLINE_MS,
  );
  const deadline = new AbortController();
  const deadlineTimer = setTimeout(() => deadline.abort(), deadlineMs);
  let leaseAcquired = false;
  try {
    leaseAcquired = await input.repository.acquireInvocationLease(
      input.workerId,
      INVOCATION_LEASE_SECONDS,
    );
    if (!leaseAcquired) {
      return { claimed: 0, results: [], skipped: "lease_busy" };
    }
    throwIfDeadlineExpired(deadline.signal);
    const jobs = (await input.repository.claimJobs(
      input.workerId,
      MAX_JOBS_PER_INVOCATION,
    )).slice(0, MAX_JOBS_PER_INVOCATION);
    const results: SocialSyncRunResult["results"] = [];

    for (const job of jobs) {
      try {
        throwIfDeadlineExpired(deadline.signal);
        const connection = await input.repository.getConnection(
          job.connectionId,
        );
        throwIfDeadlineExpired(deadline.signal);
        if (connection.expertId !== job.expertId) {
          throw new SocialSyncError("social_connection_expert_mismatch");
        }
        assertSafePublicConnection(connection);
        const sync = await input.provider.sync(connection, {
          signal: deadline.signal,
        });
        throwIfDeadlineExpired(deadline.signal);
        const observedAt = (input.now?.() ?? new Date()).toISOString();
        const upserts = sync.items.map((item) =>
          contentUpsert(
            connection,
            item,
            sync.requestId,
            sync.endpoint,
            observedAt,
          )
        );
        throwIfDeadlineExpired(deadline.signal);
        const savedCount = await input.repository.persistResult({
          jobId: job.id,
          workerId: input.workerId,
          connectionId: connection.id,
          expertId: connection.expertId,
          providerAccountId: sync.profile.providerAccountId,
          canonicalUrl: sync.profile.canonicalUrl,
          items: upserts,
          providerRequestId: sync.requestId,
          cursor: sync.cursor,
        });
        void savedCount;
        results.push({ id: job.id, status: "complete" });
      } catch (error) {
        const failure = deadline.signal.aborted
          ? {
            code: "invocation_deadline_exceeded",
            requestId: null,
            retryable: true,
          }
          : safeFailure(error);
        try {
          await input.repository.finishJob({
            jobId: job.id,
            workerId: input.workerId,
            success: false,
            fetchedCount: 0,
            providerRequestId: failure.requestId,
            cursor: null,
            errorMessage: failure.code,
            retryable: failure.retryable,
          });
          results.push({
            id: job.id,
            status: !failure.retryable || job.attempts >= 3
              ? "failed"
              : "retry",
            error: failure.code,
          });
        } catch {
          results.push({
            id: job.id,
            status: "lease_error",
            error: "finish_job_failed",
          });
        }
      }
    }
    return { claimed: jobs.length, results };
  } finally {
    clearTimeout(deadlineTimer);
    if (leaseAcquired) {
      await input.repository.releaseInvocationLease(input.workerId);
    }
  }
}

export function createSocialSyncHandler(input: {
  expectedSecret: () => string | undefined;
  run: () => Promise<SocialSyncRunResult>;
  waitUntil?: (promise: Promise<unknown>) => void;
  onBackgroundError?: () => void;
}): (request: Request) => Response {
  return (request: Request): Response => {
    if (request.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }
    const expected = input.expectedSecret();
    if (!expected) {
      return Response.json({ error: "worker_not_configured" }, { status: 503 });
    }
    const supplied = request.headers.get("x-worker-secret");
    if (!supplied || supplied !== expected) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!input.waitUntil) {
      return Response.json({ error: "background_runtime_unavailable" }, {
        status: 503,
      });
    }
    let startBackground!: () => void;
    const startGate = new Promise<void>((resolve) => {
      startBackground = resolve;
    });
    const background = startGate.then(input.run).then(
      () => undefined,
      () => {
        try {
          input.onBackgroundError?.();
        } catch {
          // Observability must not turn a handled background failure into an
          // unhandled promise rejection.
        }
      },
    );
    try {
      input.waitUntil(background);
    } catch {
      return Response.json({ error: "background_schedule_failed" }, {
        status: 503,
      });
    }
    startBackground();
    return Response.json({ accepted: true }, { status: 202 });
  };
}

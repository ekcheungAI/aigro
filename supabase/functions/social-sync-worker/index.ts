import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createTikHubPublicProvider,
  type SocialPlatform,
  SocialSyncError,
} from "../_shared/social-sync.ts";
import {
  type ClaimedSocialSyncJob,
  createSocialSyncHandler,
  type FinishSocialSyncJobInput,
  type PersistSocialSyncResultInput,
  runSocialSyncJobs,
  type SocialConnectionRecord,
  type SocialSyncRepository,
} from "../_shared/social-sync-worker.ts";

interface ClaimedJobRow {
  id: string;
  connection_id: string;
  expert_id: string;
  attempts: number;
}

interface ConnectionRow {
  id: string;
  expert_id: string;
  platform: string;
  source: string;
  account_identifier: string;
  provider_account_id: string | null;
  canonical_url: string | null;
  consent_status: string;
  sync_enabled: boolean;
  use_for_distillation: boolean;
}

function serverKey(): string {
  const key = Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new SocialSyncError("supabase_server_key_missing");
  return key;
}

function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new SocialSyncError("supabase_url_missing");
  return createClient(url, serverKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function repository(client: SupabaseClient): SocialSyncRepository {
  return {
    async acquireInvocationLease(
      workerId: string,
      leaseSeconds: number,
    ): Promise<boolean> {
      const { data, error } = await client.rpc(
        "acquire_social_sync_invocation_lease",
        {
          p_worker_id: workerId,
          p_lease_seconds: leaseSeconds,
        },
      );
      if (error || typeof data !== "boolean") {
        throw new SocialSyncError("social_sync_lease_acquire_failed", {
          retryable: true,
        });
      }
      return data;
    },

    async releaseInvocationLease(workerId: string): Promise<void> {
      const { error } = await client.rpc(
        "release_social_sync_invocation_lease",
        { p_worker_id: workerId },
      );
      if (error) {
        throw new SocialSyncError("social_sync_lease_release_failed", {
          retryable: true,
        });
      }
    },

    async claimJobs(
      workerId: string,
      limit: number,
    ): Promise<ClaimedSocialSyncJob[]> {
      const { data, error } = await client.rpc("claim_social_sync_jobs", {
        p_worker_id: workerId,
        p_limit: limit,
      });
      if (error) {
        throw new SocialSyncError("claim_social_sync_jobs_failed", {
          retryable: true,
        });
      }
      return ((data ?? []) as ClaimedJobRow[]).map((row) => ({
        id: row.id,
        connectionId: row.connection_id,
        expertId: row.expert_id,
        attempts: row.attempts,
      }));
    },

    async getConnection(connectionId: string): Promise<SocialConnectionRecord> {
      const { data, error } = await client
        .from("social_connections")
        .select(
          "id,expert_id,platform,source,account_identifier,provider_account_id,canonical_url,consent_status,sync_enabled,use_for_distillation",
        )
        .eq("id", connectionId)
        .single();
      if (error || !data) {
        throw new SocialSyncError("social_connection_unavailable", {
          retryable: true,
        });
      }
      const row = data as ConnectionRow;
      return {
        id: row.id,
        expertId: row.expert_id,
        platform: row.platform as SocialPlatform,
        source: row.source,
        accountIdentifier: row.account_identifier,
        providerAccountId: row.provider_account_id,
        canonicalUrl: row.canonical_url,
        consentStatus: row.consent_status,
        syncEnabled: row.sync_enabled,
        useForDistillation: row.use_for_distillation,
      };
    },

    async persistResult(input: PersistSocialSyncResultInput): Promise<number> {
      const { data, error } = await client.rpc("persist_social_sync_result", {
        p_job_id: input.jobId,
        p_worker_id: input.workerId,
        p_connection_id: input.connectionId,
        p_expert_id: input.expertId,
        p_provider_account_id: input.providerAccountId,
        p_canonical_url: input.canonicalUrl,
        p_items: input.items.map((item) => ({
          platform: item.platform,
          provider_content_id: item.providerContentId,
          canonical_url: item.canonicalUrl,
          content_type: item.contentType,
          title: item.title,
          text_content: item.textContent,
          thumbnail_url: item.thumbnailUrl,
          published_at: item.publishedAt,
          public_metrics: item.publicMetrics,
          provider_meta: item.providerMeta,
        })),
        p_provider_request_id: input.providerRequestId,
        p_cursor: input.cursor,
      });
      if (error || typeof data !== "number") {
        throw new SocialSyncError("social_result_persist_failed", {
          retryable: true,
        });
      }
      return data;
    },

    async finishJob(input: FinishSocialSyncJobInput): Promise<void> {
      const { error } = await client.rpc("finish_social_sync_job", {
        p_job_id: input.jobId,
        p_worker_id: input.workerId,
        p_success: input.success,
        p_fetched_count: input.fetchedCount,
        p_provider_request_id: input.providerRequestId,
        p_cursor: input.cursor,
        p_error_message: input.errorMessage,
        p_retryable: input.retryable,
      });
      if (error) {
        throw new SocialSyncError("finish_social_sync_job_failed", {
          retryable: true,
        });
      }
    },
  };
}

function runInvocation() {
  const apiKey = Deno.env.get("TIKHUB_API_KEY");
  if (!apiKey) throw new SocialSyncError("tikhub_api_key_missing");
  return runSocialSyncJobs({
    repository: repository(adminClient()),
    provider: createTikHubPublicProvider({ apiKey }),
    workerId: `social-${crypto.randomUUID()}`,
  });
}

interface EdgeRuntimeApi {
  waitUntil(promise: Promise<unknown>): void;
}

const edgeRuntime = (globalThis as typeof globalThis & {
  EdgeRuntime?: EdgeRuntimeApi;
}).EdgeRuntime;

Deno.serve(createSocialSyncHandler({
  expectedSecret: () => Deno.env.get("SOCIAL_SYNC_WORKER_SECRET"),
  run: runInvocation,
  waitUntil: edgeRuntime
    ? (promise) => edgeRuntime.waitUntil(promise)
    : undefined,
  onBackgroundError: () => console.error("social_sync_background_failed"),
}));

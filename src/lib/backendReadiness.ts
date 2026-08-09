import { supabase } from "@/lib/supabase";

export interface BackendReadiness {
  generated_at: string;
  workers: {
    knowledge_cron: boolean;
    persona_cron: boolean;
    distillation_requeue_cron: boolean;
    persona_requeue_cron: boolean;
    anonymous_purge_cron: boolean;
    social_cron: boolean;
  };
  vault: {
    project_url: boolean;
    knowledge_worker_secret: boolean;
    persona_compiler_secret: boolean;
    booking_webhook_secret: boolean;
    social_sync_worker_secret: boolean;
  };
  storage: { private_expert_kb: boolean };
  experts: {
    total: number;
    instructor_total: number;
    seat_used: number;
    seat_limit: number;
    archived: number;
    active: number;
    cms_enabled: number;
    rag_enabled: number;
    booking_enabled: number;
    social_sync_enabled: number;
    published_persona: number;
  };
  knowledge: {
    sources: number;
    approved_revisions: number;
    published_sources: number;
    chunks: number;
    queued_or_processing_jobs: number;
    failed_jobs: number;
  };
  persona: {
    versions: number;
    evaluation_questions: number;
    queued_or_processing_jobs: number;
    failed_jobs: number;
  };
  booking: { availability_rules: number; bookings: number };
  chat_crm: {
    conversations: number;
    messages: number;
    leads: number;
    knowledge_gaps: number;
    quota_reservations: number;
  };
  social: {
    active_connections: number;
    eligible_connections: number;
    recent_successful_connections: number;
    active_errors: number;
    completed_jobs: number;
    last_success_at: string | null;
    queued_or_processing_jobs: number;
    failed_jobs: number;
    content_items: number;
  };
}

export type ReadinessStatus = "live" | "beta" | "blocked";

export interface BackendReadinessRow {
  key: "dispatch" | "storage" | "knowledge" | "persona" | "booking" | "chat_crm" | "social";
  label: string;
  status: ReadinessStatus;
  detail: string;
}

function partialStatus(ready: boolean, configured: boolean): ReadinessStatus {
  if (ready) return "live";
  return configured ? "beta" : "blocked";
}

export function summarizeBackendReadiness(data: BackendReadiness): BackendReadinessRow[] {
  const workerChecks = [...Object.values(data.workers), ...Object.values(data.vault)];
  const dispatchReady = workerChecks.every(Boolean);
  const dispatchConfigured = workerChecks.some(Boolean);

  const knowledgeReady = data.experts.cms_enabled > 0
    && data.experts.rag_enabled > 0
    && data.knowledge.published_sources > 0
    && data.knowledge.chunks > 0;
  const knowledgeConfigured = data.experts.cms_enabled > 0
    || data.knowledge.sources > 0
    || data.knowledge.approved_revisions > 0;

  const personaReady = data.experts.published_persona > 0
    && data.persona.evaluation_questions >= 25;
  const personaConfigured = data.persona.versions > 0
    || data.persona.queued_or_processing_jobs > 0
    || data.persona.evaluation_questions > 0;

  const bookingReady = data.experts.booking_enabled > 0
    && data.booking.availability_rules > 0
    && data.vault.booking_webhook_secret;
  const bookingConfigured = data.experts.booking_enabled > 0
    || data.booking.availability_rules > 0
    || data.vault.booking_webhook_secret;

  const socialReady = data.workers.social_cron
    && data.vault.project_url
    && data.vault.social_sync_worker_secret
    && data.social.eligible_connections > 0
    && data.social.recent_successful_connections > 0
    && data.social.completed_jobs > 0
    && data.social.active_errors === 0;
  const socialConfigured = data.workers.social_cron
    || data.vault.project_url
    || data.vault.social_sync_worker_secret
    || data.social.active_connections > 0;

  return [
    {
      key: "dispatch",
      label: "Worker 排程與 Vault dispatch",
      status: partialStatus(dispatchReady, dispatchConfigured),
      detail: dispatchReady
        ? `${Object.values(data.workers).length} 個排程及 ${Object.values(data.vault).length} 個 Vault 連接項目齊備`
        : `排程 ${Object.values(data.workers).filter(Boolean).length}/${Object.values(data.workers).length} · Vault ${Object.values(data.vault).filter(Boolean).length}/${Object.values(data.vault).length}`,
    },
    {
      key: "storage",
      label: "導師知識 private Storage",
      status: data.storage.private_expert_kb ? "live" : "blocked",
      detail: data.storage.private_expert_kb ? "expert-kb bucket 已設為 private" : "未找到 private expert-kb bucket",
    },
    {
      key: "knowledge",
      label: "知識蒸餾與 RAG corpus",
      status: partialStatus(knowledgeReady, knowledgeConfigured),
      detail: `來源 ${data.knowledge.sources} · 已發佈 ${data.knowledge.published_sources} · chunks ${data.knowledge.chunks} · RAG 導師 ${data.experts.rag_enabled}`,
    },
    {
      key: "persona",
      label: "角色蒸餾與評估",
      status: partialStatus(personaReady, personaConfigured),
      detail: `版本 ${data.persona.versions} · 已發佈導師 ${data.experts.published_persona} · 驗證問題 ${data.persona.evaluation_questions}`,
    },
    {
      key: "booking",
      label: "真人預約 dispatch",
      status: partialStatus(bookingReady, bookingConfigured),
      detail: `啟用導師 ${data.experts.booking_enabled} · availability ${data.booking.availability_rules} · bookings ${data.booking.bookings}`,
    },
    {
      key: "chat_crm",
      label: "對話與 CRM 資料流",
      status: "beta",
      detail: `對話 ${data.chat_crm.conversations} · 訊息 ${data.chat_crm.messages} · leads ${data.chat_crm.leads} · gaps ${data.chat_crm.knowledge_gaps}`,
    },
    {
      key: "social",
      label: "公開社交資料同步",
      status: partialStatus(socialReady, socialConfigured),
      detail: `授權 ${data.social.active_connections} · 可同步 ${data.social.eligible_connections} · 48h 成功 ${data.social.recent_successful_connections} · completed ${data.social.completed_jobs} · active errors ${data.social.active_errors} · items ${data.social.content_items}`,
    },
  ];
}

export async function fetchBackendReadiness(): Promise<BackendReadiness> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data, error } = await supabase.rpc("get_backend_readiness");
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") throw new Error("後端 readiness 回應格式無效");
  return data as BackendReadiness;
}

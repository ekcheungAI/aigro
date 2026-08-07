import { describe, expect, it } from "vitest";
import {
  summarizeBackendReadiness,
  type BackendReadiness,
} from "@/lib/backendReadiness";

function readiness(overrides: Partial<BackendReadiness> = {}): BackendReadiness {
  return {
    generated_at: "2026-08-08T00:00:00.000Z",
    workers: {
      knowledge_cron: false,
      persona_cron: false,
      distillation_requeue_cron: false,
      persona_requeue_cron: false,
      anonymous_purge_cron: false,
    },
    vault: {
      project_url: false,
      knowledge_worker_secret: false,
      persona_compiler_secret: false,
      booking_webhook_secret: false,
    },
    storage: { private_expert_kb: false },
    experts: {
      total: 0,
      active: 0,
      cms_enabled: 0,
      rag_enabled: 0,
      booking_enabled: 0,
      published_persona: 0,
    },
    knowledge: {
      sources: 0,
      approved_revisions: 0,
      published_sources: 0,
      chunks: 0,
      queued_or_processing_jobs: 0,
      failed_jobs: 0,
    },
    persona: {
      versions: 0,
      evaluation_questions: 0,
      queued_or_processing_jobs: 0,
      failed_jobs: 0,
    },
    booking: { availability_rules: 0, bookings: 0 },
    chat_crm: { conversations: 0, messages: 0, leads: 0, knowledge_gaps: 0 },
    ...overrides,
  };
}

describe("backend readiness summary", () => {
  it("marks missing dispatch configuration and empty product data as blocked", () => {
    const rows = summarizeBackendReadiness(readiness());
    expect(Object.fromEntries(rows.map((row) => [row.key, row.status]))).toEqual({
      dispatch: "blocked",
      storage: "blocked",
      knowledge: "blocked",
      persona: "blocked",
      booking: "blocked",
      chat_crm: "beta",
    });
  });

  it("only marks a pipeline live when its real published data and switches exist", () => {
    const rows = summarizeBackendReadiness(readiness({
      workers: {
        knowledge_cron: true,
        persona_cron: true,
        distillation_requeue_cron: true,
        persona_requeue_cron: true,
        anonymous_purge_cron: true,
      },
      vault: {
        project_url: true,
        knowledge_worker_secret: true,
        persona_compiler_secret: true,
        booking_webhook_secret: true,
      },
      storage: { private_expert_kb: true },
      experts: {
        total: 3,
        active: 3,
        cms_enabled: 1,
        rag_enabled: 1,
        booking_enabled: 1,
        published_persona: 1,
      },
      knowledge: {
        sources: 1,
        approved_revisions: 1,
        published_sources: 1,
        chunks: 8,
        queued_or_processing_jobs: 0,
        failed_jobs: 0,
      },
      persona: {
        versions: 1,
        evaluation_questions: 25,
        queued_or_processing_jobs: 0,
        failed_jobs: 0,
      },
      booking: { availability_rules: 2, bookings: 0 },
      chat_crm: { conversations: 2, messages: 4, leads: 1, knowledge_gaps: 0 },
    }));

    expect(Object.fromEntries(rows.map((row) => [row.key, row.status]))).toEqual({
      dispatch: "live",
      storage: "live",
      knowledge: "live",
      persona: "live",
      booking: "live",
      chat_crm: "beta",
    });
  });
});

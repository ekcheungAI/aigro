import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isGroundedEvaluationQuestion,
  normalizeReleaseReadiness,
  safeHttpsUrl,
} from "@/lib/instructorRelease";

const migration = readFileSync(
  "supabase/migrations/20260820020000_instructor_reference_panel.sql",
  "utf8",
);

describe("instructor reference and release panel", () => {
  it("keeps its metadata RPC owner-scoped and removes broad execution", () => {
    expect(migration).toContain("if not public.owns_expert(p_expert_id)");
    expect(migration).toContain(
      "revoke all on function public.get_expert_reference_files(uuid)",
    );
    expect(migration).toContain(
      "grant execute on function public.get_expert_reference_files(uuid) to authenticated",
    );
  });

  it("aligns release counts with rights and actual embeddings", () => {
    expect(migration).toContain("ks.rights_status = 'granted'");
    expect(migration).toContain("ks.revoked_at is null");
    expect(migration).toContain("ks.expires_at > now()");
    expect(migration).toContain("kc.embedding is not null");
    expect(migration).toContain("source_chunk.embedding is not null");
    expect(migration).toContain("kr.approved_by is not null");
    expect(migration).toContain("rights_scope -> 'commercial_rag'");
    expect(migration).toContain("rights_scope -> 'persona_synthesis'");
    expect(migration).toContain("from unnest(epv.source_revision_ids)");
    expect(migration).toContain("create or replace function public.match_expert_knowledge");
    expect(migration).toContain("'chat_ready', public.is_expert_chat_ready(e.id)");
  });

  it("requires a persisted human review for the published persona", () => {
    expect(migration).toContain("reviewed_job.reviewed_by is not null");
    expect(migration).toContain("reviewed_job.reviewed_at is not null");
  });

  it("normalizes malformed readiness payloads without false-green status", () => {
    expect(normalizeReleaseReadiness(null).ready).toBe(false);
    expect(normalizeReleaseReadiness({ published_sources: "2", chat_ready: true }))
      .toMatchObject({ published_sources: 2, chat_ready: true, ready: false });
  });

  it("allows only HTTPS reference links", () => {
    expect(safeHttpsUrl("https://example.com/source")).toBe("https://example.com/source");
    expect(safeHttpsUrl("http://example.com/source")).toBeNull();
    expect(safeHttpsUrl("javascript:alert(1)")).toBeNull();
  });

  it("counts only evidence-linked evaluation questions toward release", () => {
    expect(isGroundedEvaluationQuestion({
      expected: { criteria: "答案要清楚分辨有來源立場同一般推論" },
      source_revision_ids: ["revision-1"],
    })).toBe(true);
    expect(isGroundedEvaluationQuestion({ expected: {}, source_revision_ids: [] }))
      .toBe(false);
    expect(migration).toContain("persona_evaluation_set_incomplete");
    expect(migration).toContain("persona_evaluation_set_invalid");
    expect(migration).toContain("q.expected <> '{}'::jsonb");
    expect(migration).toContain("cardinality(q.source_revision_ids) > 0");
    expect(migration).toContain("create or replace function public.is_expert_chat_ready");
  });
});

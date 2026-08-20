import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820140000_atomic_knowledge_rights_flow.sql",
  "utf8",
);
const portal = readFileSync("src/pages/portal/PortalKB.tsx", "utf8");
const worker = readFileSync("supabase/functions/knowledge-worker/index.ts", "utf8");
const failurePlan = readFileSync(
  "supabase/functions/_shared/distillation-failure.ts",
  "utf8",
);

describe("atomic knowledge rights flow", () => {
  it("creates rights, source, revision and job in one owner-scoped RPC", () => {
    expect(migration).toContain(
      "create or replace function public.create_authorized_knowledge_source",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = pg_catalog, public");
    expect(migration).toContain("rights_status");
    expect(migration).toContain("'granted'");
    expect(migration).toContain("insert into public.knowledge_revisions");
    expect(migration).toContain("insert into public.distillation_jobs");
    expect(migration).toContain("knowledge.rights_granted");
  });

  it("removes the legacy browser enqueue path and grants only the atomic RPC", () => {
    expect(migration).toContain(
      "revoke all on function public.create_knowledge_source",
    );
    expect(migration).toContain(
      "grant execute on function public.create_authorized_knowledge_source",
    );
    expect(migration).toContain("to authenticated");
    expect(portal).toContain(
      'supabase.rpc("create_authorized_knowledge_source"',
    );
    expect(portal).not.toContain('supabase.rpc("create_knowledge_source"');
    expect(portal).toContain("p_rights_holder");
    expect(portal).toContain("p_rights_evidence_ref");
    expect(portal).toContain("p_rights_scope");
  });

  it("fails closed at worker start, completion and revocation", () => {
    expect(worker).toContain(
      "rights_status,rights_scope,revoked_at,expires_at",
    );
    expect(worker).toContain("assertDistillationAuthorized");
    expect(worker).toContain("buildDistillationFailurePlan");
    expect(failurePlan).toContain("isPermanentKnowledgeRightsError");
    expect(migration).toContain("knowledge_distillation_not_authorized");
    expect(migration).toContain("knowledge_rights_revoked");
    expect(migration).toContain("('pending', 'retry', 'processing')");
  });
});

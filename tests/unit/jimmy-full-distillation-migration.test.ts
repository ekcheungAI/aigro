import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260811220000_full_knowledge_pack_distillation.sql",
  "utf8",
);

describe("full knowledge-pack migration", () => {
  it("provides idempotent service-only chapter import with explicit provenance", () => {
    expect(migration).toContain("external_key text");
    expect(migration).toContain("source_meta jsonb");
    expect(migration).toContain("source_sha256 text");
    expect(migration).toContain("source_commit_sha text");
    expect(migration).toContain("source_file_path text");
    expect(migration).toContain("source_blob_url text");
    expect(migration).toContain("upsert_authorized_knowledge_pack_chapter");
    expect(migration).toMatch(/grant execute on function public\.upsert_authorized_knowledge_pack_chapter[\s\S]+to service_role/i);
    expect(migration).toMatch(/unique[\s\S]+expert_id[\s\S]+external_key/i);
  });

  it("keeps rights and revision provenance immutable across safe reruns", () => {
    expect(migration).toContain("knowledge_rights_change_requires_explicit_grant");
    expect(migration).toContain("knowledge_pack.rights_granted");
    expect(migration).toMatch(/for update[\s\S]+source_sha256/i);
    expect(migration).toMatch(/source_id[\s\S]+source_commit_sha[\s\S]+source_sha256/i);
    expect(migration).toContain("pack_retry_count");
    expect(migration).toContain("knowledge_pack.retried");
  });

  it("serializes persona publication and validates complete cited output", () => {
    expect(migration).toMatch(/published_persona_version_id[\s\S]+return/i);
    expect(migration).toContain("knowledge_pack.persona_republished");
    expect(migration).toMatch(/from public\.experts[\s\S]+for update/i);
    expect(migration).toContain("persona_blueprint_empty");
    expect(migration).toContain("distilled_json <> '{}'::jsonb");
    expect(migration).toContain("bool_and");
    expect(migration).toContain("exactRevisionSet");
    expect(migration).toContain("coalesce(kr.source_blob_url, ks.source_url)");
  });

  it("keeps approval, persona publication and coverage service-only and fail-closed", () => {
    for (const name of [
      "approve_authorized_knowledge_pack_revisions",
      "queue_authorized_knowledge_pack_persona",
      "publish_authorized_knowledge_pack_persona",
      "authorized_knowledge_pack_coverage",
    ]) {
      expect(migration).toContain(name);
      expect(migration).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]+to service_role`, "i"));
    }
    expect(migration).toContain("persona_fidelity_gate_failed");
    expect(migration).toContain("knowledge_pack_incomplete");
  });
});

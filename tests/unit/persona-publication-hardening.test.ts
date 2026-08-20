import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820290000_harden_persona_publication.sql",
  "utf8",
);

describe("persona publication trust boundary", () => {
  it("revalidates human decisions, current rights, embeddings and evaluation output", () => {
    expect(migration).toContain("persona_publication_requires_human_review");
    expect(migration).toContain("char_length(btrim(coalesce(job.review_notes, ''))) < 5");
    expect(migration).toContain("kr.approved_by is not null");
    expect(migration).toContain("kr.approved_at is not null");
    expect(migration).toContain("ks.published_revision_id = kr.id");
    expect(migration).toContain("ks.rights_scope @>");
    expect(migration).toContain("kc.embedding is not null");
    expect(migration).toContain("job.finalized_evaluation_run_id");
    expect(migration).toContain("r.evaluation_set_hash = evaluation_snapshot ->> 'hash'");
    expect(migration).toContain("r.output_blueprint_hash = blueprint_hash");
  });

  it("serializes publication with source revocation and keeps it owner-only", () => {
    expect(migration).toMatch(/order by ks\.id, kr\.id\s+for update of ks, kr/i);
    expect(migration).toContain("not public.owns_expert(job.expert_id)");
    expect(migration).toContain(
      "revoke all on function public.publish_compiled_persona(uuid, text, jsonb)",
    );
    expect(migration).toContain(
      "grant execute on function public.publish_compiled_persona(uuid, text, jsonb)\nto authenticated",
    );
  });
});

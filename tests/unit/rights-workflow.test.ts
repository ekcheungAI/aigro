import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820110000_rights_grant_workflow.sql",
  "utf8",
);
const modelTrainingInvariant = readFileSync(
  "supabase/migrations/20260820350000_enforce_model_training_opt_out.sql",
  "utf8",
);
const portal = readFileSync("src/pages/portal/PortalKB.tsx", "utf8");

describe("rights grant workflow", () => {
  it("provides owner-scoped grant and revoke RPCs", () => {
    expect(migration).toContain("set_knowledge_source_rights");
    expect(migration).toContain("revoke_knowledge_source_rights");
    expect(migration).toContain("knowledge.rights_granted");
    expect(migration).toContain("knowledge.rights_revoked");
    expect(migration).toContain("persona_sources_not_rights_authorized");
    expect(migration).toContain("persona_version_rights_gate");
  });

  it("requires explicit rights evidence in the portal source form", () => {
    expect(portal).toContain("rightsHolder");
    expect(portal).toContain("rightsEvidenceRef");
    expect(portal).toContain("commercial_rag");
    expect(portal).toContain("set_knowledge_source_rights");
  });

  it("enforces the model-training opt-out below every RPC boundary", () => {
    expect(modelTrainingInvariant).toContain("knowledge_sources_model_training_opt_out");
    expect(modelTrainingInvariant).toContain("rights_scope -> 'model_training' is not distinct from 'false'::jsonb");
    expect(modelTrainingInvariant).toContain("set default '{\"model_training\":false}'::jsonb");
  });
});

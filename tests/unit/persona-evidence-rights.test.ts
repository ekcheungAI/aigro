import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820300000_harden_persona_evidence_reads.sql",
  "utf8",
);
const worker = readFileSync("supabase/functions/persona-compiler/index.ts", "utf8");
const stageGate = readFileSync(
  "supabase/functions/_shared/persona-stage-rights.ts",
  "utf8",
);

describe("persona provider evidence authorization", () => {
  it("filters evidence and revision coverage with the full current-rights predicate", () => {
    for (const predicate of [
      "kr.approved_by is not null",
      "kr.approved_at is not null",
      "ks.published_revision_id = kr.id",
      "ks.rights_status = 'granted'",
      "ks.revoked_at is null",
      "ks.rights_scope @>",
      "kc.embedding is not null",
    ]) {
      expect(migration).toContain(predicate);
    }
    expect(migration).toContain("persona_synthesis");
    expect(migration.match(/kc\.embedding is not null/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("revalidates the exact pinned corpus before every provider-facing stage", () => {
    const processJob = worker.slice(
      worker.indexOf("async function processJob"),
      worker.indexOf("async function failJob"),
    );
    expect(processJob.indexOf("await loadEvidence")).toBeGreaterThanOrEqual(0);
    expect(processJob.match(/callWithCurrentPersonaAuthorization\(/g)).toHaveLength(3);
    expect(
      processJob.match(
        /callWithCurrentPersonaAuthorization\(\s*job\.source_revision_ids/g,
      ),
    ).toHaveLength(3);
    for (const providerCall of [
      "() => callJsonModel(",
      "() => generateProbeResponses(",
      "() => evaluateFidelity(",
    ]) {
      expect(processJob).toContain(providerCall);
    }
    expect(stageGate.indexOf("assertExactPersonaRevisionCoverage(")).toBeLessThan(
      stageGate.indexOf("return await providerCall()"),
    );
    expect(processJob.lastIndexOf("callWithCurrentPersonaAuthorization(")).toBeLessThan(
      processJob.indexOf('"complete_persona_synthesis_job"'),
    );
    expect(worker).toContain('client.rpc("get_authorized_persona_revision_ids"');
  });

  it("keeps both read functions service-only", () => {
    for (const name of ["get_authorized_persona_evidence", "get_authorized_persona_revision_ids"]) {
      expect(migration).toContain(`revoke all on function public.${name}(uuid, uuid[])`);
      expect(migration).toMatch(new RegExp(`grant execute on function public\\.${name}\\(uuid, uuid\\[\\]\\)[\\s\\S]+to service_role`, "i"));
    }
  });
});

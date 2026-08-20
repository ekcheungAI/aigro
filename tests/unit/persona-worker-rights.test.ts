import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("persona compiler rights revalidation", () => {
  it("loads evidence through the rights-gated database RPC", async () => {
    const source = await readFile(join(process.cwd(), "supabase/functions/persona-compiler/index.ts"), "utf8");
    expect(source).toContain('.rpc("get_authorized_persona_evidence"');
    expect(source).toContain('.rpc("get_authorized_persona_revision_ids"');
    expect(source).toContain("assertExactPersonaRevisionCoverage");
    expect(source).not.toContain('.from("knowledge_sources")');
    expect(source).not.toContain('.from("knowledge_revisions")');
  });
});

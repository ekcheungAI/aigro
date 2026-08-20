import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/functions/ask-answer/index.ts", "utf8");

describe("chat evidence rights lifecycle", () => {
  it("routes replay and model history through current-rights RPCs", () => {
    expect(source).toContain('"get_rights_safe_chat_replay"');
    expect(source).toContain('"get_rights_safe_chat_history"');
    expect(source).not.toContain('admin.from("messages")');
  });

  it("rejects stored answers whose evidence is no longer available", () => {
    expect(source).toContain('previous.state === "sources_unavailable"');
    expect(source).toContain('code: "replay_sources_unavailable"');
  });

  it("persists complete current and transitive history lineage on every answer", () => {
    expect(source).toContain("buildPersistedRetrievalLineage(");
    expect(source).toContain("rights_lineage_complete: true");
    expect(source).toContain("p_retrieval: persistedRetrievalLineage");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820360000_enforce_public_citation_privacy.sql",
  "utf8",
);
const answerFunction = readFileSync(
  "supabase/functions/ask-answer/index.ts",
  "utf8",
);
const portalPanel = readFileSync("src/pages/portal/PortalKB.tsx", "utf8");
const adminPanel = readFileSync("src/pages/admin/AdminStudio.tsx", "utf8");

describe("human-reviewed public citation privacy", () => {
  it("stores a separate reviewed public URL and strips query or fragment secrets", () => {
    for (const field of [
      "public_citation_url",
      "public_citation_reviewed_by",
      "public_citation_reviewed_at",
      "public_citation_review_note",
    ]) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain("normalize_public_citation_url");
    expect(migration).toContain("regexp_replace(normalized, '[?#].*$', '')");
    expect(migration).toContain("normalized ~ '^https://[^/]*@'");
    expect(migration).toContain("char_length(normalized_note) < 5");
    expect(migration).toContain("public.set_knowledge_source_public_citation");
    expect(migration).toContain("if not public.owns_expert(source_row.expert_id)");
  });

  it("returns only the reviewed URL through retrieval and rebuilds replay citations", () => {
    expect(migration).toContain("ks.public_citation_url");
    expect(migration).toContain("public_citation_url text");
    expect(migration).not.toContain("coalesce(kr.source_blob_url, ks.source_url)");
    expect(migration).toContain("safe_citations");
    expect(migration).toContain("sanitize_public_chat_citations");
    expect(migration).toContain("messages_public_citation_privacy");
    expect(migration).toContain("update public.messages m");
    expect(migration).toContain("jsonb_build_object(");
    expect(answerFunction).toContain("public_citation_url: string | null");
    expect(answerFunction).toContain("chunk.public_citation_url");
    expect(answerFunction).not.toContain("chunk.source_url");
  });

  it("keeps the review workflow visible to instructors and release reviewers", () => {
    expect(portalPanel).toContain("set_knowledge_source_public_citation");
    expect(portalPanel).toContain("公開引用連結");
    expect(portalPanel).toContain("public_citation_reviewed_at");
    expect(adminPanel).toContain("public_citation_ready");
    expect(adminPanel).toContain("public citation");
  });

  it("keeps normalization and retrieval service-only", () => {
    expect(migration).toContain(
      "revoke all on function public.normalize_public_citation_url(text)",
    );
    expect(migration).toMatch(
      /grant execute on function public\.match_expert_knowledge\([\s\S]+?to service_role;/i,
    );
  });
});

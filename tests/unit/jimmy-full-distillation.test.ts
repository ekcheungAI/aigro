import { describe, expect, it } from "vitest";
import {
  assertCompleteDistillation,
  runFullDistillation,
} from "../../scripts/run-jimmy-full-distillation.mjs";

const chapters = [
  {
    path: "AI 學習階段地圖/01-AI User（AI使用者）/README.md",
    title: "AI User",
    sha256: "a".repeat(64),
    sourceUrl: "https://github.com/jimmylau-DOTAI/growth-with-ai-guide/blob/abc/AI%20User/README.md",
    stage: 1,
    chapter: null,
    order: 1,
    headings: [{ depth: 1, text: "AI User", path: "ai-user", line: 1 }],
    content: "# AI User\n\n完成第一件真工作。",
  },
  {
    path: "AI 學習階段地圖/02-AI Super User（AI熟練使用者）/README.md",
    title: "AI Super User",
    sha256: "b".repeat(64),
    sourceUrl: "https://github.com/jimmylau-DOTAI/growth-with-ai-guide/blob/abc/AI%20Super%20User/README.md",
    stage: 2,
    chapter: null,
    order: 2,
    headings: [{ depth: 1, text: "AI Super User", path: "ai-super-user", line: 1 }],
    content: "# AI Super User\n\n留下可重用 context。",
  },
];

function adapter({
  knowledgeStatus = "approved",
  personaStatus = "published",
  fidelityStatus = "passed",
  humanReviewed = true,
  evaluationCurrent = true,
} = {}) {
  const calls: string[] = [];
  return {
    calls,
    async importChapter(chapter: (typeof chapters)[number]) {
      calls.push(`import:${chapter.path}`);
      return { revisionId: `revision-${chapter.stage}`, status: "queued" };
    },
    async driveKnowledgeWorkers() { calls.push("drive:knowledge"); },
    async readKnowledgeState() {
      calls.push("read:knowledge");
      return chapters.map((chapter) => ({
        path: chapter.path,
        revisionId: `revision-${chapter.stage}`,
        status: knowledgeStatus,
        humanReviewed: knowledgeStatus === "approved" && humanReviewed,
        chunkCount: 2,
        distilled: true,
        citationCommit: "abc",
        citationPath: chapter.path,
      }));
    },
    async queuePersona(ids: string[]) {
      calls.push(`persona:queue:${ids.join(",")}`);
      return "persona-job";
    },
    async drivePersonaWorker() { calls.push("drive:persona"); },
    async readPersonaState() {
      calls.push("read:persona");
      return {
        jobId: "persona-job",
        status: personaStatus,
        fidelityStatus,
        sourceRevisionIds: ["revision-1", "revision-2"],
        personaVersionId: personaStatus === "published" ? "persona-version" : null,
        humanReviewed: personaStatus === "published" && humanReviewed,
        evaluationCurrent: personaStatus === "published" && evaluationCurrent,
      };
    },
    async readCoverage() {
      calls.push("read:coverage");
      return { sourceCount: 2, approvedRevisionCount: 2, chunkedRevisionCount: 2, pinnedCitationCount: 2, publishedPersonaRevisionCount: 2, rightsValidCount: 2, exactRevisionSet: true };
    },
  };
}

describe("Jimmy full distillation", () => {
  it("verifies an already human-reviewed knowledge pack and persona without impersonating approval", async () => {
    const api = adapter();
    const report = await runFullDistillation({
      adapter: api,
      chapters,
      commit: "abc",
      poll: { intervalMs: 0, maxAttempts: 2 },
      expectedSourceCount: 2,
    });

    expect(api.calls).toEqual([
      `import:${chapters[0].path}`,
      `import:${chapters[1].path}`,
      "drive:knowledge",
      "read:knowledge",
      "persona:queue:revision-1,revision-2",
      "drive:persona",
      "read:persona",
      "read:knowledge",
      "read:persona",
      "read:coverage",
    ]);
    expect(report.complete).toBe(true);
    expect(report.personaVersionId).toBe("persona-version");
  });

  it("stops at authenticated human knowledge review", async () => {
    const api = adapter({ knowledgeStatus: "review" });
    await expect(runFullDistillation({
      adapter: api,
      chapters,
      commit: "abc",
      poll: { intervalMs: 0, maxAttempts: 1 },
      expectedSourceCount: 2,
    })).rejects.toThrow(/authenticated human approval/i);
    expect(api.calls).not.toContain("persona:queue:revision-1,revision-2");
  });

  it.each([
    ["review", /human approval/i],
    ["approved", /authenticated publication/i],
  ])("stops at the %s persona state for an Admin Studio decision", async (personaStatus, message) => {
    const api = adapter({ personaStatus });
    await expect(runFullDistillation({
      adapter: api,
      chapters,
      commit: "abc",
      poll: { intervalMs: 0, maxAttempts: 1 },
      expectedSourceCount: 2,
    })).rejects.toThrow(message);
    expect(api.calls).not.toContain("persona:publish");
  });

  it("fails closed when any chapter has no pinned citation or distilled chunks", () => {
    expect(() => assertCompleteDistillation({
      expectedCount: 2,
      commit: "abc",
      knowledge: [
        { path: chapters[0].path, revisionId: "r1", status: "approved", humanReviewed: true, chunkCount: 1, distilled: true, citationCommit: "abc", citationPath: chapters[0].path },
        { path: chapters[1].path, revisionId: "r2", status: "approved", humanReviewed: true, chunkCount: 0, distilled: true, citationCommit: null, citationPath: null },
      ],
      persona: { status: "published", fidelityStatus: "passed", humanReviewed: true, evaluationCurrent: true, sourceRevisionIds: ["r1", "r2"] },
      coverage: { sourceCount: 2, approvedRevisionCount: 2, chunkedRevisionCount: 1, pinnedCitationCount: 1, publishedPersonaRevisionCount: 2, rightsValidCount: 2, exactRevisionSet: false },
    })).toThrow(/incomplete distillation/i);
  });

  it("does not publish a persona whose fidelity gate failed", async () => {
    const api = adapter({ personaStatus: "review", fidelityStatus: "failed" });
    await expect(runFullDistillation({ adapter: api, chapters, commit: "abc", expectedSourceCount: 2, poll: { intervalMs: 0, maxAttempts: 1 } }))
      .rejects.toThrow(/fidelity/i);
    expect(api.calls).not.toContain("persona:publish");
  });

  it("rejects an incomplete pinned corpus before the first external write", async () => {
    const api = adapter();
    await expect(runFullDistillation({
      adapter: api,
      chapters: chapters.slice(0, 1),
      commit: "abc",
      expectedSourceCount: 2,
      poll: { intervalMs: 0, maxAttempts: 1 },
    })).rejects.toThrow(/expected 2 pinned chapters/i);
    expect(api.calls).toEqual([]);
  });
});

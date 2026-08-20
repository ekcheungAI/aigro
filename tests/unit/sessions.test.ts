import { describe, expect, it } from "vitest";
import {
  appendRound,
  collectCitations,
  deleteSession,
  loadSessionStore,
  prepareSession,
  sessionTitle,
  type SessionStore,
} from "@/components/ask/sessions";

const emptyStore = (): SessionStore => ({ sessions: {}, active: {} });

describe("Ask session state", () => {
  it("creates a stable empty session before streaming", () => {
    const prepared = prepareSession(emptyStore(), "elvin-cheung", "點樣開始 vibe coding？");
    expect(prepared.session.messages).toEqual([]);
    expect(prepared.store.active["elvin-cheung"]).toBe(prepared.session.id);

    const repeated = prepareSession(prepared.store, "elvin-cheung", "另一條問題");
    expect(repeated.session.id).toBe(prepared.session.id);
  });

  it("appends a server-persisted round without remote logging", () => {
    const prepared = prepareSession(emptyStore(), "jimmy-lau", "語境工程係咩？");
    const result = appendRound(
      prepared.store,
      "jimmy-lau",
      "語境工程係咩？",
      {
        text: "語境工程係將任務所需背景有結構咁交俾 AI。",
        citations: [{ title: "導師筆記", href: "/experts/jimmy-lau" }],
        confidence: 0.9,
        source: "kb",
        answerBasis: "knowledge",
        coverage: "high",
      },
      null,
      true
    );
    const session = result.store.sessions["jimmy-lau"][0];
    expect(session.messages).toHaveLength(2);
    expect(session.messages[0].role).toBe("user");
    expect(session.messages[1].reply?.coverage).toBe("high");
  });

  it("appends an async answer to the session that started the request", () => {
    const first = prepareSession(emptyStore(), "elvin-cheung", "第一條問題");
    const switched = {
      ...first.store,
      active: { ...first.store.active, "elvin-cheung": null },
    };

    const result = appendRound(
      switched,
      "elvin-cheung",
      "第一條問題",
      {
        text: "第一條答案",
        citations: [],
        confidence: 0.8,
        source: "kb",
        answerBasis: "knowledge",
        coverage: "high",
      },
      null,
      true,
      first.session.id
    );

    expect(result.store.sessions["elvin-cheung"][0].id).toBe(first.session.id);
    expect(result.store.sessions["elvin-cheung"][0].messages.map((m) => m.text ?? m.reply?.text)).toEqual([
      "第一條問題",
      "第一條答案",
    ]);
    expect(result.store.active["elvin-cheung"]).toBeNull();
  });

  it("does not resurrect a session deleted while streaming", () => {
    const prepared = prepareSession(emptyStore(), "elvin-cheung", "刪除後唔應該返嚟");
    const deleted = {
      sessions: { "elvin-cheung": [] },
      active: { "elvin-cheung": null },
    } satisfies SessionStore;

    const result = appendRound(
      deleted,
      "elvin-cheung",
      "刪除後唔應該返嚟",
      {
        text: "唔應該重新出現",
        citations: [],
        confidence: 0,
        source: "fallback",
        answerBasis: "general",
        coverage: "none",
      },
      null,
      true,
      prepared.session.id,
    );

    expect(result.store.sessions["elvin-cheung"]).toEqual([]);
    expect(result.store.active["elvin-cheung"]).toBeNull();
  });

  it("drops sessions older than the local retention window when loading", () => {
    const now = Date.now();
    window.localStorage.setItem(
      "aigro-ask-sessions-v1",
      JSON.stringify({
        sessions: {
          platform: [
            {
              id: "fresh",
              title: "新對話",
              createdAt: now,
              updatedAt: now,
              messages: [],
            },
            {
              id: "expired",
              title: "舊對話",
              createdAt: now - 31 * 24 * 60 * 60 * 1000,
              updatedAt: now - 31 * 24 * 60 * 60 * 1000,
              messages: [],
            },
          ],
        },
        active: { platform: "expired" },
      })
    );

    const loaded = loadSessionStore();

    expect(loaded.sessions.platform.map((session) => session.id)).toEqual(["fresh"]);
    expect(loaded.active.platform).toBeNull();
  });

  it("removes a local session and clears its active selection", async () => {
    const prepared = prepareSession(emptyStore(), "platform", "刪除我");
    const result = await deleteSession(prepared.store, "platform", prepared.session.id);

    expect(result.status).toBe("local-only");
    expect(result.store.sessions.platform).toEqual([]);
    expect(result.store.active.platform).toBeNull();
  });

  it("keeps distinct private citations without public URLs", () => {
    const citations = collectCitations([
      {
        id: 1,
        role: "ai",
        reply: {
          text: "第一個私人來源 [S1]",
          citations: [{ marker: "S1", revision_id: "revision-1", title: "私人筆記 A", href: "", page: 2 }],
          confidence: 1,
          source: "kb",
          answerBasis: "knowledge",
          coverage: "high",
        },
      },
      {
        id: 2,
        role: "ai",
        reply: {
          text: "第二個私人來源 [S2]",
          citations: [{ marker: "S2", revision_id: "revision-2", title: "私人筆記 B", href: "", section: "第二章" }],
          confidence: 1,
          source: "kb",
          answerBasis: "knowledge",
          coverage: "high",
        },
      },
    ]);

    expect(citations).toHaveLength(2);
    expect(citations.map((citation) => citation.title)).toEqual(["私人筆記 A", "私人筆記 B"]);
    expect(citations[0]).toMatchObject({ revision_id: "revision-1", page: 2 });
  });

  it("normalizes and truncates long session titles", () => {
    const title = sessionTitle("  呢個係一條非常之長而且有好多空格嘅問題，想知道系統會點處理  ");
    expect(title).not.toMatch(/\s{2,}/);
    expect(title.endsWith("…")).toBe(true);
  });
});

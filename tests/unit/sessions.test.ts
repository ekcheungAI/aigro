import { describe, expect, it } from "vitest";
import {
  appendRound,
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

  it("normalizes and truncates long session titles", () => {
    const title = sessionTitle("  呢個係一條非常之長而且有好多空格嘅問題，想知道系統會點處理  ");
    expect(title).not.toMatch(/\s{2,}/);
    expect(title.endsWith("…")).toBe(true);
  });
});

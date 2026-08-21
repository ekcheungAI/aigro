import { describe, expect, it } from "vitest";

import { evaluateNewsRelease } from "../../scripts/lib/news-release-gate.mjs";

const NOW = Date.parse("2026-08-22T04:00:00Z");

function item(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `item-${index}`,
    title: `OpenAI 發布第 ${index + 1} 個推理模型`,
    summary: "新模型提升多步推理能力，並加入完整安全評估。",
    original_url: `https://example.com/news/${index}`,
    published_at: `2026-08-22T03:${String(index).padStart(2, "0")}:00Z`,
    source_id: index % 2 === 0 ? "source-a" : "source-b",
    source_name: index % 2 === 0 ? "OpenAI Blog" : "量子位",
    lang: "zh-HK",
    ...overrides,
  };
}

describe("production news release gate", () => {
  it("passes a fresh, complete and source-diverse Hong Kong Chinese feed", () => {
    const result = evaluateNewsRelease(
      Array.from({ length: 10 }, (_, index) => item(index)),
      { now: NOW, minItems: 10, maxAgeMinutes: 180 },
    );

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.metrics.language).toBe("zh-HK");
  });

  it("fails stale, English, unrelated and incomplete public rows", () => {
    const rows = Array.from({ length: 10 }, (_, index) => item(index));
    rows[0] = item(0, {
      title: "OpenAI releases a new model",
      summary: "The model improves reasoning.",
      lang: "en",
      published_at: "2026-08-21T12:00:00Z",
    });
    rows[1] = item(1, {
      title: "REDMI 推出新手機",
      summary: "新手機加入大容量電池與快速充電功能。",
      source_name: "IT之家",
    });
    rows[2] = item(2, { summary: null });

    const result = evaluateNewsRelease(rows, {
      now: NOW,
      minItems: 10,
      maxAgeMinutes: 180,
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining("freshness"),
        expect.stringContaining("language_not_zh_hk"),
        expect.stringContaining("not_ai_specific"),
        expect.stringContaining("missing_summary"),
      ]),
    );
  });

  it("fails when one source dominates the release sample", () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      item(index, { source_id: "source-a", source_name: "OpenAI Blog" }),
    );

    const result = evaluateNewsRelease(rows, {
      now: NOW,
      minItems: 10,
      maxSourceShare: 0.6,
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain("source_diversity:source-a:100%");
  });
});

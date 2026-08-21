import { describe, expect, it } from "vitest";

import {
  assessNewsQuality,
  selectPublicationCandidates,
} from "../../scripts/lib/news-quality.mjs";

const NOW = Date.parse("2026-08-22T02:00:00Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    fingerprint: "fingerprint",
    title: "OpenAI 發布全新推理模型",
    summary: "新模型提升多步推理能力，並加入完整安全評估。",
    original_url: "https://example.com/news",
    published_at: "2026-08-22T01:00:00Z",
    source_id: "source-id",
    source_name: "OpenAI Blog",
    lang: "zh-HK",
    ...overrides,
  };
}

describe("news publication quality policy", () => {
  it("accepts complete, recent, AI-specific Hong Kong Chinese news", () => {
    const result = assessNewsQuality(row(), { now: NOW });

    expect(result.readyForPublication).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("rejects English, unrelated consumer tech and incomplete rows", () => {
    expect(
      assessNewsQuality(
        row({
          title: "OpenAI releases a new reasoning model",
          summary: "The model improves multi-step reasoning.",
          lang: "en",
        }),
        { now: NOW },
      ).blockers,
    ).toContain("language_not_zh_hk");

    expect(
      assessNewsQuality(
        row({
          title: "REDMI 推出新手機",
          summary: "新手機加入大容量電池與快速充電功能。",
          source_name: "IT之家",
        }),
        { now: NOW },
      ).blockers,
    ).toContain("not_ai_specific");

    expect(
      assessNewsQuality(row({ summary: null, source_id: null }), { now: NOW }).blockers,
    ).toEqual(expect.arrayContaining(["missing_summary", "missing_source"]));
  });

  it("caps each source per Hong Kong day so one feed cannot dominate", () => {
    const candidates = Array.from({ length: 15 }, (_, index) =>
      row({
        fingerprint: `item-${index}`,
        published_at: `2026-08-22T01:${String(index).padStart(2, "0")}:00Z`,
      }),
    );

    const selected = selectPublicationCandidates(candidates, {
      now: NOW,
      maxPerSourcePerDay: 12,
    });

    expect(selected).toHaveLength(12);
    expect(selected[0]?.fingerprint).toBe("item-14");
    expect(selected.at(-1)?.fingerprint).toBe("item-3");
  });
});

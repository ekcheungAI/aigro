import { describe, expect, it } from "vitest";

import type { AihotInsight } from "@/data/aihot";
import {
  synthesizeDailyFromInsights,
  synthesizeWeeklyFromInsights,
} from "@/data/liveItems";

function insight(
  slug: string,
  overrides: Partial<AihotInsight> = {},
): AihotInsight {
  return {
    slug,
    category: "模型發布",
    title: "OpenAI 發布全新推理模型",
    summary: "新模型提升多步推理能力，並加入完整安全評估。",
    hkAngle: "",
    source: "OpenAI Blog",
    timeAgo: "剛剛",
    publishedAt: "2026-08-22T01:00:00Z",
    score: 90,
    readMinutes: 2,
    permalink: `https://example.com/${slug}`,
    canonical: `https://example.com/${slug}`,
    originalUrl: `https://example.com/${slug}`,
    titleEn: null,
    tags: ["OpenAI"],
    selected: true,
    external: true,
    ...overrides,
  };
}

describe("live digest quality", () => {
  const newest = insight("newest");
  const older = insight("older", {
    title: "Claude 推出企業級智能代理",
    summary: "新智能代理協助企業自動處理重複工作。",
    publishedAt: "2026-08-21T02:00:00Z",
    score: 99,
  });
  const unrelated = insight("phone", {
    category: "產品發布",
    title: "REDMI 推出新手機",
    summary: "新手機配備更大電池及快速充電功能。",
    source: "IT之家",
    score: 98,
  });
  const english = insight("english", {
    title: "OpenAI releases a new reasoning model",
    summary: "The model improves multi-step reasoning.",
    score: 97,
  });

  it("builds a daily digest from one Hong Kong day without English or unrelated tech", () => {
    const daily = synthesizeDailyFromInsights([older, unrelated, english, newest]);

    expect(daily.date).toBe("2026-08-22");
    expect(daily.itemCount).toBe(1);
    expect(daily.lead?.slug).toBe("newest");
  });

  it("keeps weekly picks Hong Kong Chinese and AI-specific", () => {
    const weekly = synthesizeWeeklyFromInsights([unrelated, english, newest]);

    expect(weekly?.itemCount).toBe(1);
    expect(weekly?.lead?.slug).toBe("newest");
    expect(weekly?.items).toHaveLength(0);
  });
});

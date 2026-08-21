import { describe, expect, it } from "vitest";

import {
  aihotAllInsights,
  aihotDaily,
  mapAihotCategory,
} from "@/data/aihot";

describe("AIHOT category normalization", () => {
  it.each([
    ["model_release", "模型發布"],
    ["模型發布", "模型發布"],
    ["模型發佈/更新", "模型發布"],
    ["product_update", "產品發布"],
    ["產品發布", "產品發布"],
    ["产品发布/更新", "產品發布"],
    ["industry_event", "行業動態"],
    ["行業動態", "行業動態"],
    ["行业动态", "行業動態"],
    ["research_paper", "論文研究"],
    ["論文研究", "論文研究"],
    ["论文研究", "論文研究"],
    ["opinion_tutorial", "觀點與技巧"],
    ["觀點與技巧", "觀點與技巧"],
    ["观点与技巧", "觀點與技巧"],
  ])("maps %s to %s", (raw, expected) => {
    expect(mapAihotCategory(raw)).toBe(expected);
  });

  it("keeps every public fallback news item in Traditional Chinese", () => {
    const cjk = /[\u3400-\u9fff]/;
    expect(aihotAllInsights.length).toBeGreaterThan(5);
    expect(
      aihotAllInsights.every(
        (item) => cjk.test(item.title) && cjk.test(item.summary),
      ),
    ).toBe(true);
  });

  it("maps every daily snapshot section to its real news category", () => {
    const categories = new Map(
      aihotDaily.sections.map((section) => [section.label, section.category]),
    );
    expect(categories.get("模型發佈/更新")).toBe("模型發布");
    expect(categories.get("產品發佈/更新")).toBe("產品發布");
    expect(categories.get("論文研究")).toBe("論文研究");
    expect(categories.get("技巧與觀點")).toBe("觀點與技巧");
  });
});

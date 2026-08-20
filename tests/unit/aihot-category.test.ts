import { describe, expect, it } from "vitest";

import { mapAihotCategory } from "@/data/aihot";

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
});

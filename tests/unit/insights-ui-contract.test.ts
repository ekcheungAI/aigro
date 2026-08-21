import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const insights = readFileSync("src/pages/Insights.tsx", "utf8");

describe("Insights latest-news UI contract", () => {
  it("describes the bounded live window honestly and exposes mobile tab navigation", () => {
    expect(insights).toContain('{ key: "all", label: "最新動態" }');
    expect(insights).toContain("左右滑動查看更多");
    expect(insights).toContain("text-error");
    expect(insights).not.toContain('text-[#A63A30]');
    expect(insights).not.toContain("情報庫載入失敗：");
    expect(insights).not.toContain("{serverFeed.error}");
  });
});

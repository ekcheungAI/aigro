import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checker = readFileSync("scripts/check-mcp.mjs", "utf8");

describe("MCP production smoke contract", () => {
  it("targets the version-controlled AIGRO endpoint and verifies live zh-HK news", () => {
    expect(checker).toContain('"https://aigro.io/api/mcp"');
    expect(checker).toContain('"get_latest_news"');
    expect(checker).toContain('structuredContent?.language === "zh-HK"');
    expect(checker).toContain("original_url");
    expect(checker).toContain("transport.invalid_origin");
    expect(checker).not.toContain('"https://argro-mcp.zeabur.app/mcp"');
  });
});

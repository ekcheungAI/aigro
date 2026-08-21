import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const developers = readFileSync("src/pages/Developers.tsx", "utf8");
const home = readFileSync("src/pages/Home.tsx", "utf8");
const footer = readFileSync("src/components/Footer.tsx", "utf8");
const partnership = readFileSync("src/pages/DataPartnership.tsx", "utf8");

describe("public MCP launch copy", () => {
  it("publishes one truthful endpoint and setup contract", () => {
    expect(developers).toContain("https://aigro.io/api/mcp");
    expect(developers).toContain("get_latest_news");
    expect(developers).toContain("get_daily_brief");
    expect(developers).toContain("只讀");
    expect(developers).not.toContain("公開 endpoint 尚未上線");
    expect(home).toContain("AI 情報 MCP 公開 Beta 已上線");
    expect(footer).toContain("AI 情報 MCP 已公開");
    expect(partnership).not.toContain("公開 endpoint 尚未上線");
  });
});

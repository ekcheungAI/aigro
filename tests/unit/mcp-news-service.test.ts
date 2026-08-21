import { describe, expect, it, vi } from "vitest";

import {
  createNewsService,
  isAllowedMcpOrigin,
} from "../../api/_mcp/news-service";

const goodRow = {
  id: "article-1",
  title: "OpenAI 發布全新推理模型",
  summary: "新模型提升多步推理能力，並加入完整安全評估。",
  original_url: "https://openai.com/example",
  category: "模型發布",
  tags: ["OpenAI"],
  score: 95,
  lang: "zh-HK",
  placement: "featured",
  published_at: "2026-08-22T01:00:00Z",
  sources: { name: "OpenAI Blog" },
};

describe("public MCP news service", () => {
  it("returns only complete Hong Kong Chinese AI news with evidence fields", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          { ...goodRow, category: "模型发布" },
          { ...goodRow, id: "english", lang: "en", title: "OpenAI releases GPT" },
          { ...goodRow, id: "incomplete", summary: null },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const service = createNewsService({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      fetchImpl,
      now: () => Date.parse("2026-08-22T02:00:00Z"),
    });

    const page = await service.latest({ limit: 100 });

    expect(page.language).toBe("zh-HK");
    expect(page.as_of).toBe("2026-08-22T02:00:00.000Z");
    expect(page.items).toEqual([
      expect.objectContaining({
        id: "article-1",
        title: goodRow.title,
        source: "OpenAI Blog",
        original_url: goodRow.original_url,
        published_at: goodRow.published_at,
        language: "zh-HK",
        category: "模型發布",
      }),
    ]);
    expect(page.next_cursor).toBe(goodRow.published_at);
    const requested = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(requested.searchParams.get("limit")).toBe("50");
    expect(requested.searchParams.get("lang")).toBe("eq.zh-HK");
    expect(requested.searchParams.get("status")).toBe("eq.published");
  });

  it("adds category, cursor and search filters at the database boundary", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([goodRow]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const service = createNewsService({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      fetchImpl,
    });

    await service.search({
      query: "OpenAI",
      category: "模型發布",
      cursor: "2026-08-22T01:00:00Z",
      limit: 10,
    });

    const requested = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(requested.searchParams.get("category")).toBe("eq.模型發布");
    expect(requested.searchParams.get("published_at")).toBe(
      "lt.2026-08-22T01:00:00Z",
    );
    expect(requested.searchParams.get("or")).toContain("title.ilike.*OpenAI*");
  });

  it("rejects untrusted browser origins while allowing CLI clients without Origin", () => {
    expect(isAllowedMcpOrigin(null)).toBe(true);
    expect(isAllowedMcpOrigin("https://aigro.io")).toBe(true);
    expect(isAllowedMcpOrigin("https://aigro-blue.vercel.app")).toBe(true);
    expect(isAllowedMcpOrigin("https://evil.example")).toBe(false);
  });
});

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
  it("ships a curated zh-HK fallback without requiring database credentials", async () => {
    const service = createNewsService({
      supabaseUrl: "",
      publishableKey: "",
    });

    const page = await service.latest({ limit: 5 });

    expect(page.items).toHaveLength(5);
    expect(page.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          language: "zh-HK",
          attribution: "AI HOT (aihot.virxact.com)・AI 生成摘要",
        }),
      ]),
    );
    expect(
      page.items.every(
        (item) =>
          item.original_url.startsWith("https://") &&
          item.canonical_url.startsWith("https://"),
      ),
    ).toBe(true);
  });

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
      snapshotItems: [],
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
      snapshotItems: [],
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

  it("keeps curated snapshot news available when the database is unavailable", async () => {
    const snapshotItem = {
      id: "snapshot-1",
      title: "Anthropic 發佈 AI 原生開發手冊",
      summary: "手冊整理如何將 Claude 應用於軟件開發生命週期。",
      category: "觀點與技巧" as const,
      tags: ["Claude"],
      score: 88,
      source: "Anthropic",
      original_url: "https://claude.com/example",
      canonical_url: "https://aihot.virxact.com/items/snapshot-1",
      attribution: "AI HOT (aihot.virxact.com)・AI 生成摘要",
      published_at: "2026-08-22T01:30:00Z",
      language: "zh-HK" as const,
      placement: "featured",
    };
    const service = createNewsService({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      snapshotItems: [snapshotItem],
      fetchImpl: vi.fn(async () => new Response("unavailable", { status: 503 })),
      now: () => Date.parse("2026-08-22T02:00:00Z"),
    });

    await expect(service.latest({ limit: 10 })).resolves.toEqual(
      expect.objectContaining({ items: [snapshotItem], language: "zh-HK" }),
    );
  });

  it("corrects unsupported release labels and bounds oversized summaries", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            ...goodRow,
            id: "mislabelled",
            title: "對 AI 牴觸情緒正在上升",
            summary: "調查顯示公眾對人工智能嘅態度正在轉變。".repeat(100),
            original_url: "https://example.com/ai-sentiment",
            category: "模型發布",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const service = createNewsService({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      snapshotItems: [],
      fetchImpl,
    });

    const page = await service.latest({ limit: 10 });

    expect(page.items[0]).toEqual(
      expect.objectContaining({
        category: "行業動態",
        canonical_url: "https://example.com/ai-sentiment",
        attribution: "AIGRO 情報管道",
      }),
    );
    expect(Array.from(page.items[0]?.summary ?? "")).toHaveLength(600);
    expect(page.items[0]?.summary.endsWith("…")).toBe(true);
  });

  it("uses title evidence to distinguish AI products from general industry news", async () => {
    const rows = [
      {
        ...goodRow,
        id: "sentiment",
        title: "對 AI 牴觸情緒正在上升",
        original_url: "https://example.com/sentiment",
        category: "模型發布",
      },
      {
        ...goodRow,
        id: "widget",
        title: "三星準備為手機引入 AI 小組件功能",
        original_url: "https://example.com/widget",
        category: "模型發布",
      },
      {
        ...goodRow,
        id: "glasses",
        title: "雷鳥發佈全天候主動式 AI 眼鏡",
        original_url: "https://example.com/glasses",
        category: "行業動態",
      },
    ];
    const service = createNewsService({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      snapshotItems: [],
      fetchImpl: vi.fn(async () =>
        new Response(JSON.stringify(rows), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    });

    const page = await service.search({ query: "AI", limit: 10 });
    const categories = Object.fromEntries(
      page.items.map((item) => [item.id, item.category]),
    );

    expect(categories).toEqual({
      sentiment: "行業動態",
      widget: "產品發布",
      glasses: "產品發布",
    });
  });

  it("prevents one publisher from dominating the latest-news response", async () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      ...goodRow,
      id: `same-source-${index}`,
      original_url: `https://openai.com/example-${index}`,
      published_at: `2026-08-22T0${index + 1}:00:00Z`,
    }));
    rows.push({
      ...goodRow,
      id: "second-source",
      original_url: "https://anthropic.com/example",
      published_at: "2026-08-22T00:30:00Z",
      sources: { name: "Anthropic" },
    });
    const service = createNewsService({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      snapshotItems: [],
      fetchImpl: vi.fn(async () =>
        new Response(JSON.stringify(rows), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    });

    const page = await service.latest({ limit: 10 });

    expect(page.items.filter((item) => item.source === "OpenAI Blog")).toHaveLength(3);
    expect(page.items.some((item) => item.source === "Anthropic")).toBe(true);
  });

  it("rejects untrusted browser origins while allowing CLI clients without Origin", () => {
    expect(isAllowedMcpOrigin(null)).toBe(true);
    expect(isAllowedMcpOrigin("https://aigro.io")).toBe(true);
    expect(isAllowedMcpOrigin("https://aigro-blue.vercel.app")).toBe(true);
    expect(isAllowedMcpOrigin("https://evil.example")).toBe(false);
  });
});

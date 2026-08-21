import { describe, expect, it, vi } from "vitest";

import { createAigroMcpHandler } from "../../api/mcp";

const newsRow = {
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

function rpcRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return new Request("https://aigro.io/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function rpcJson(response: Response) {
  const text = await response.text();
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const data = text
      .split("\n")
      .find((line) => line.startsWith("data:"))
      ?.slice(5)
      .trim();
    return data ? JSON.parse(data) : null;
  }
  return text ? JSON.parse(text) : null;
}

describe("AIGRO MCP HTTP handler", () => {
  const fetchImpl = vi.fn(async () =>
    new Response(JSON.stringify([newsRow]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  it("rejects an untrusted Origin with HTTP 403 before MCP dispatch", async () => {
    const handler = createAigroMcpHandler({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      fetchImpl,
    });
    const response = await handler.fetch(
      rpcRequest(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "test", version: "1" },
          },
        },
        { Origin: "https://evil.example" },
      ),
    );

    expect(response.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("lists bounded tools with output schemas", async () => {
    const handler = createAigroMcpHandler({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      fetchImpl,
    });
    const response = await handler.fetch(
      rpcRequest({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    );
    const body = await rpcJson(response);
    const latest = body?.result?.tools?.find(
      (tool: { name?: string }) => tool.name === "get_latest_news",
    );

    expect(response.status).toBe(200);
    expect(latest?.inputSchema?.properties?.limit?.maximum).toBe(50);
    expect(latest?.outputSchema).toBeTruthy();
    expect(body?.result?.tools?.map((tool: { name: string }) => tool.name)).toEqual(
      expect.arrayContaining([
        "get_latest_news",
        "search_news",
        "get_article_detail",
        "get_daily_brief",
      ]),
    );
  });

  it("returns machine-readable Hong Kong Chinese results", async () => {
    const handler = createAigroMcpHandler({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "public-key",
      fetchImpl,
      now: () => Date.parse("2026-08-22T02:00:00Z"),
    });
    const response = await handler.fetch(
      rpcRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "get_latest_news", arguments: { limit: 10 } },
      }),
    );
    const body = await rpcJson(response);

    expect(response.status).toBe(200);
    expect(body?.result?.structuredContent).toEqual(
      expect.objectContaining({
        language: "zh-HK",
        items: [expect.objectContaining({ id: "article-1", language: "zh-HK" })],
      }),
    );
  });
});

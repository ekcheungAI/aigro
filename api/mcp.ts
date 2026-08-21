import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import {
  createNewsService,
  isAllowedMcpOrigin,
  NEWS_CATEGORIES,
  type NewsServiceConfig,
} from "./_mcp/news-service.js";

interface AigroMcpConfig extends NewsServiceConfig {
  bearerToken?: string;
  allowedOrigins?: string[];
}

const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  category: z.enum(NEWS_CATEGORIES),
  tags: z.array(z.string()),
  score: z.number(),
  source: z.string(),
  original_url: z.string().url(),
  published_at: z.string(),
  language: z.literal("zh-HK"),
  placement: z.string(),
});
const NewsPageSchema = z.object({
  as_of: z.string(),
  language: z.literal("zh-HK"),
  items: z.array(NewsItemSchema),
  next_cursor: z.string().nullable(),
});
const CommonQuerySchema = {
  limit: z.number().int().min(1).max(50).default(20),
  category: z.enum(NEWS_CATEGORIES).optional(),
  cursor: z.string().datetime({ offset: true }).optional(),
};
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

function textResult<T extends object>(structuredContent: T) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent: structuredContent as Record<string, unknown>,
  };
}

function allowedHost(request: Request): boolean {
  const host = new URL(request.url).hostname.toLowerCase();
  return (
    host === "aigro.io" ||
    host === "www.aigro.io" ||
    host === "beta.aigro.io" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app")
  );
}

export function createAigroMcpHandler(config: AigroMcpConfig) {
  const service = createNewsService(config);
  const now = config.now ?? Date.now;
  const handler = createMcpHandler(
    () => {
      const server = new McpServer({
        name: "AIGRO 香港 AI 新聞",
        version: "1.0.0",
      });

      server.registerTool(
        "get_latest_news",
        {
          title: "取得最新 AI 新聞",
          description:
            "按發佈時間倒序取得已通過 AI 相關度、來源完整度及香港繁中品質閘門的最新新聞。",
          inputSchema: z.object(CommonQuerySchema),
          outputSchema: NewsPageSchema,
          annotations: READ_ONLY_ANNOTATIONS,
        },
        async (input) => textResult(await service.latest(input)),
      );

      server.registerTool(
        "search_news",
        {
          title: "搜尋 AI 新聞",
          description:
            "搜尋已發佈的香港繁中 AI 新聞；結果包含來源、原文連結、發佈時間及下一頁游標。",
          inputSchema: z.object({
            query: z.string().trim().min(2).max(120),
            ...CommonQuerySchema,
          }),
          outputSchema: NewsPageSchema,
          annotations: READ_ONLY_ANNOTATIONS,
        },
        async (input) => textResult(await service.search(input)),
      );

      server.registerTool(
        "get_article_detail",
        {
          title: "取得新聞詳情",
          description:
            "按文章 ID 取得完整摘要、來源、原文連結、語言及發佈時間；找不到時會明確回傳 null。",
          inputSchema: z.object({ id: z.string().trim().min(1).max(120) }),
          outputSchema: z.object({
            as_of: z.string(),
            language: z.literal("zh-HK"),
            item: NewsItemSchema.nullable(),
          }),
          annotations: READ_ONLY_ANNOTATIONS,
        },
        async ({ id }) =>
          textResult({
            as_of: new Date(now()).toISOString(),
            language: "zh-HK",
            item: await service.detail(id),
          }),
      );

      server.registerTool(
        "get_daily_brief",
        {
          title: "取得每日 AI 簡報",
          description:
            "從同一個香港日期的合格新聞中，按編輯評分整理最多 12 則每日重點。",
          inputSchema: z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            limit: z.number().int().min(1).max(12).default(9),
          }),
          outputSchema: z.object({
            as_of: z.string(),
            language: z.literal("zh-HK"),
            date: z.string().nullable(),
            source_item_count: z.number().int(),
            items: z.array(NewsItemSchema),
          }),
          annotations: READ_ONLY_ANNOTATIONS,
        },
        async (input) => textResult(await service.daily(input)),
      );
      return server;
    },
    { legacy: "stateless", responseMode: "json" },
  );

  return {
    ...handler,
    async fetch(request: Request): Promise<Response> {
      if (!allowedHost(request)) {
        return Response.json({ error: "不受信任的 Host" }, { status: 403 });
      }
      const origin = request.headers.get("origin");
      if (!isAllowedMcpOrigin(origin, config.allowedOrigins)) {
        return Response.json({ error: "不受信任的 Origin" }, { status: 403 });
      }
      if (config.bearerToken) {
        const expected = `Bearer ${config.bearerToken}`;
        if (request.headers.get("authorization") !== expected) {
          return Response.json(
            { error: "需要有效的 MCP 存取權杖" },
            {
              status: 401,
              headers: { "WWW-Authenticate": 'Bearer realm="AIGRO MCP"' },
            },
          );
        }
      }
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: origin
            ? {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
                "Access-Control-Allow-Headers":
                  "Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id",
              }
            : {},
        });
      }
      const response = await handler.fetch(request);
      if (!origin) return response;
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  };
}

const defaultHandler = createAigroMcpHandler({
  supabaseUrl:
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  publishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    "",
  bearerToken: process.env.AIGRO_MCP_BEARER_TOKEN?.trim() || undefined,
  allowedOrigins: (process.env.AIGRO_MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});

export const GET = defaultHandler.fetch;
export const POST = defaultHandler.fetch;
export const DELETE = defaultHandler.fetch;
export const OPTIONS = defaultHandler.fetch;
export default defaultHandler;

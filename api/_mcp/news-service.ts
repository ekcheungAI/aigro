export const NEWS_CATEGORIES = [
  "模型發布",
  "產品發布",
  "行業動態",
  "論文研究",
  "觀點與技巧",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, NewsCategory> = {
  model_release: "模型發布",
  model: "模型發布",
  模型发布: "模型發布",
  模型發佈: "模型發布",
  "模型發佈/更新": "模型發布",
  product_update: "產品發布",
  product_release: "產品發布",
  product: "產品發布",
  产品发布: "產品發布",
  產品發佈: "產品發布",
  "產品發佈/更新": "產品發布",
  industry_event: "行業動態",
  policy: "行業動態",
  industry: "行業動態",
  行业动态: "行業動態",
  research_paper: "論文研究",
  paper: "論文研究",
  论文研究: "論文研究",
  opinion_tutorial: "觀點與技巧",
  tips: "觀點與技巧",
  技巧与观点: "觀點與技巧",
  技巧與觀點: "觀點與技巧",
};

function normalizeCategory(value: string | null): NewsCategory {
  const category = value?.trim() ?? "";
  if (NEWS_CATEGORIES.includes(category as NewsCategory)) {
    return category as NewsCategory;
  }
  return CATEGORY_ALIASES[category] ?? "行業動態";
}

interface SupabaseNewsRow {
  id: string;
  title: string | null;
  summary: string | null;
  original_url: string | null;
  category: string | null;
  tags: string[] | null;
  score: number | null;
  lang: string | null;
  placement: string | null;
  published_at: string | null;
  sources?: { name?: string | null } | null;
}

export interface PublicNewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  score: number;
  source: string;
  original_url: string;
  published_at: string;
  language: "zh-HK";
  placement: string;
}

export interface PublicNewsPage {
  as_of: string;
  language: "zh-HK";
  items: PublicNewsItem[];
  next_cursor: string | null;
}

export interface NewsQuery {
  limit?: number;
  category?: NewsCategory;
  cursor?: string;
}

export interface NewsSearchQuery extends NewsQuery {
  query: string;
}

export interface NewsServiceConfig {
  supabaseUrl: string;
  publishableKey: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const CJK = /[\u3400-\u9fff]/;
const AI_TITLE_SIGNAL = /(?:\bAI\b|\bAIGC\b|\bAGI\b|人工智(?:能|慧)|生成式|大模型|語言模型|機器學習|机器学习|深度學習|深度学习|神經網絡|神经网络|智能體|智能体|具身智能|多模態|多模态|推理模型|模型訓練|模型训练|OpenAI|ChatGPT|GPT-?\d|Anthropic|Claude|Gemini|DeepMind|Llama|Qwen|DeepSeek|Kimi|Mistral|Grok|Sora|Copilot|Hugging\s*Face|英偉達|英伟达|NVIDIA|人形機器人|人形机器人|AI\s*Agent|Agentic)/i;
const SPECIALIST_SOURCES = [
  "OpenAI",
  "Anthropic",
  "DeepMind",
  "HuggingFace",
  "TechCrunch AI",
  "量子位",
  "The Decoder",
];
const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://aigro.io",
  "https://www.aigro.io",
  "https://aigro-blue.vercel.app",
  "https://beta.aigro.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const HK_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(50, Math.trunc(value ?? 20)));
}

function isAiSpecific(title: string, source: string): boolean {
  return (
    AI_TITLE_SIGNAL.test(title) ||
    SPECIALIST_SOURCES.some((name) =>
      source.toLowerCase().includes(name.toLowerCase()),
    )
  );
}

function normalizeRow(row: SupabaseNewsRow): PublicNewsItem | null {
  const title = row.title?.trim() ?? "";
  const summary = row.summary?.trim() ?? "";
  const url = row.original_url?.trim() ?? "";
  const source = row.sources?.name?.trim() ?? "";
  const publishedAt = row.published_at?.trim() ?? "";
  if (
    !row.id ||
    !title ||
    !summary ||
    !url ||
    !source ||
    !publishedAt ||
    row.lang !== "zh-HK" ||
    !CJK.test(title) ||
    !CJK.test(summary) ||
    !isAiSpecific(title, source) ||
    Number.isNaN(Date.parse(publishedAt))
  ) {
    return null;
  }
  return {
    id: row.id,
    title,
    summary,
    category: normalizeCategory(row.category),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    score: Number.isFinite(row.score) ? Number(row.score) : 0,
    source,
    original_url: url,
    published_at: publishedAt,
    language: "zh-HK",
    placement: row.placement?.trim() || "normal",
  };
}

function escapePostgrestSearch(value: string): string {
  return value.replace(/[\\*%_,()]/g, (character) => `\\${character}`);
}

export function isAllowedMcpOrigin(
  origin: string | null,
  extraAllowedOrigins: string[] = [],
): boolean {
  if (!origin) return true;
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...extraAllowedOrigins]);
  return allowed.has(origin.replace(/\/+$/, ""));
}

export function createNewsService(config: NewsServiceConfig) {
  const base = config.supabaseUrl.replace(/\/+$/, "");
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? Date.now;

  async function queryRows(
    query: NewsQuery & { search?: string; id?: string },
  ): Promise<PublicNewsPage> {
    const limit = clampLimit(query.limit);
    const url = new URL(`${base}/rest/v1/items`);
    url.searchParams.set(
      "select",
      "id,title,summary,original_url,category,tags,score,lang,placement,published_at,sources(name)",
    );
    url.searchParams.set("status", "eq.published");
    url.searchParams.set("lang", "eq.zh-HK");
    url.searchParams.set("order", "published_at.desc");
    url.searchParams.set("limit", String(limit));
    if (query.category) url.searchParams.set("category", `eq.${query.category}`);
    if (query.cursor && !Number.isNaN(Date.parse(query.cursor))) {
      url.searchParams.set("published_at", `lt.${query.cursor}`);
    }
    if (query.id) url.searchParams.set("id", `eq.${query.id}`);
    if (query.search?.trim()) {
      const escaped = escapePostgrestSearch(query.search.trim());
      url.searchParams.set(
        "or",
        `(title.ilike.*${escaped}*,summary.ilike.*${escaped}*)`,
      );
    }

    const response = await fetchImpl(url, {
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`新聞資料暫時無法讀取（HTTP ${response.status}）`);
    }
    const rows = (await response.json()) as SupabaseNewsRow[];
    const items = rows.map(normalizeRow).filter((item) => item !== null);
    return {
      as_of: new Date(now()).toISOString(),
      language: "zh-HK",
      items,
      next_cursor: items.length > 0 ? items[items.length - 1].published_at : null,
    };
  }

  return {
    latest: (query: NewsQuery = {}) => queryRows(query),
    search: ({ query, ...filters }: NewsSearchQuery) =>
      queryRows({ ...filters, search: query }),
    async detail(id: string) {
      const page = await queryRows({ id: id.trim(), limit: 1 });
      return page.items[0] ?? null;
    },
    async daily(options: { date?: string; limit?: number } = {}) {
      const page = await queryRows({ limit: 50 });
      const date =
        options.date?.trim() ||
        (page.items[0] ? HK_DAY.format(new Date(page.items[0].published_at)) : null);
      const limit = Math.max(1, Math.min(12, Math.trunc(options.limit ?? 9)));
      const candidates = date
        ? page.items.filter(
            (item) => HK_DAY.format(new Date(item.published_at)) === date,
          )
        : [];
      const items = [...candidates]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return {
        as_of: page.as_of,
        language: "zh-HK" as const,
        date,
        source_item_count: candidates.length,
        items,
      };
    },
  };
}

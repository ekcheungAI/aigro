import bundledSnapshotJson from "../../src/data/aihot-snapshot.json" with { type: "json" };

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
  models: "模型發布",
  ai_models: "模型發布",
  模型发布: "模型發布",
  模型發佈: "模型發布",
  "模型發佈/更新": "模型發布",
  product_update: "產品發布",
  product_release: "產品發布",
  product: "產品發布",
  products: "產品發布",
  ai_products: "產品發布",
  产品发布: "產品發布",
  產品發佈: "產品發布",
  "產品發佈/更新": "產品發布",
  industry_event: "行業動態",
  policy: "行業動態",
  industry: "行業動態",
  行业动态: "行業動態",
  research_paper: "論文研究",
  paper: "論文研究",
  papers: "論文研究",
  research: "論文研究",
  论文研究: "論文研究",
  opinion_tutorial: "觀點與技巧",
  tip: "觀點與技巧",
  tips: "觀點與技巧",
  技巧与观点: "觀點與技巧",
  技巧與觀點: "觀點與技巧",
};

function normalizeCategory(value: string | null): NewsCategory {
  const category = value?.trim() ?? "";
  if (NEWS_CATEGORIES.includes(category as NewsCategory)) {
    return category as NewsCategory;
  }
  const normalized = category.toLowerCase().replace(/[\s-]+/g, "_");
  return CATEGORY_ALIASES[category] ?? CATEGORY_ALIASES[normalized] ?? "行業動態";
}

function hasKnownCategory(value: string | null): boolean {
  const category = value?.trim() ?? "";
  const normalized = category.toLowerCase().replace(/[\s-]+/g, "_");
  return (
    NEWS_CATEGORIES.includes(category as NewsCategory) ||
    Boolean(CATEGORY_ALIASES[category] ?? CATEGORY_ALIASES[normalized])
  );
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

interface BundledSnapshotItem {
  id: string;
  title: string;
  url: string | null;
  permalink: string;
  source: string;
  publishedAt: string;
  summary: string;
  category: string;
  score: number;
  selected: boolean;
  attribution?: { canonical?: string | null } | null;
}

interface BundledSnapshot {
  items: BundledSnapshotItem[];
}

export interface PublicNewsItem {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  tags: string[];
  score: number;
  source: string;
  original_url: string;
  canonical_url: string;
  attribution: string;
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
  snapshotItems?: PublicNewsItem[];
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const CJK = /[\u3400-\u9fff]/;
const AI_TITLE_SIGNAL = /(?:\bAI\b|\bAIGC\b|\bAGI\b|人工智(?:能|慧)|生成式|大模型|語言模型|機器學習|机器学习|深度學習|深度学习|神經網絡|神经网络|智能體|智能体|具身智能|多模態|多模态|推理模型|模型訓練|模型训练|OpenAI|ChatGPT|GPT-?\d|Anthropic|Claude|Gemini|DeepMind|Llama|Qwen|DeepSeek|Kimi|Mistral|Grok|Sora|Copilot|Hugging\s*Face|英偉達|英伟达|NVIDIA|人形機器人|人形机器人|AI\s*Agent|Agentic)/i;
const RESEARCH_SIGNAL = /(?:論文|研究|技術報告|基準(?:測試|評測|優化)?|評測|測量|實驗|科學研究|蛋白質|數學研究|paper|research|benchmark)/i;
const GUIDANCE_SIGNAL = /(?:指南|手冊|教學|教程|實戰|如何|方法論|最佳實踐|規則|觀點|評論|深度思考|提示詞|Prompt|洞見|解析|解讀|playbook)/i;
const MODEL_SIGNAL = /(?:\b(?:GPT|Claude|Gemini|Llama|Qwen|DeepSeek|Kimi|Mistral|Grok|LFM|GLM|MOSS)[-\w.]*\b|大模型|語言模型|推理模型|視覺語言模型|模型家族|模型系列)/i;
const PRODUCT_SIGNAL = /(?:產品|工具|功能|平台|API|應用|服務|框架|資料集|數據集|系統|軟件|套件|插件|儀表盤|瀏覽器|代碼託管|開發工具|智能體|手機|眼鏡|硬件|驅動)/i;
const RELEASE_SIGNAL = /(?:發佈|發布|推出|上線|更新|升級|開源|問世|新增|加入|引入|開發出|支援|支持|release|launch|ship|introduc)/i;
const MAX_TITLE_LENGTH = 300;
const MAX_SUMMARY_LENGTH = 600;
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

function conciseText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(normalized);
  if (characters.length <= maxLength) return normalized;
  return `${characters.slice(0, Math.max(1, maxLength - 1)).join("").trimEnd()}…`;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function inferDatabaseCategory(
  title: string,
  rawCategory: string | null,
): NewsCategory {
  if (RESEARCH_SIGNAL.test(title)) return "論文研究";
  if (GUIDANCE_SIGNAL.test(title)) return "觀點與技巧";

  const normalized = normalizeCategory(rawCategory);
  const hasReleaseSignal = RELEASE_SIGNAL.test(title);
  if (MODEL_SIGNAL.test(title) && hasReleaseSignal) return "模型發布";
  if (
    PRODUCT_SIGNAL.test(title) &&
    (hasReleaseSignal || normalized === "產品發布")
  ) {
    return "產品發布";
  }

  // Historical automatic labels were frequently over-broad. Model/product
  // labels need title evidence; otherwise the neutral industry category is
  // more truthful than claiming a release that did not happen.
  if (normalized === "模型發布" || normalized === "產品發布") {
    return "行業動態";
  }
  return normalized;
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
  const title = conciseText(row.title ?? "", MAX_TITLE_LENGTH);
  const summary = conciseText(row.summary ?? "", MAX_SUMMARY_LENGTH);
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
    !isHttpsUrl(url) ||
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
    category: inferDatabaseCategory(title, row.category),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    score: Number.isFinite(row.score) ? Number(row.score) : 0,
    source,
    original_url: url,
    canonical_url: url,
    attribution: "AIGRO 情報管道",
    published_at: publishedAt,
    language: "zh-HK",
    placement: row.placement?.trim() || "normal",
  };
}

function buildBundledNewsItems(snapshot: BundledSnapshot): PublicNewsItem[] {
  return snapshot.items
    .filter((item) => item.selected && hasKnownCategory(item.category))
    .map((item): PublicNewsItem | null => {
      const title = conciseText(item.title ?? "", MAX_TITLE_LENGTH);
      const summary = conciseText(item.summary ?? "", MAX_SUMMARY_LENGTH);
      const originalUrl = item.url?.trim() ?? "";
      const canonicalUrl =
        item.attribution?.canonical?.trim() ||
        item.permalink?.trim() ||
        originalUrl;
      const source = item.source?.trim() ?? "";
      const publishedAt = item.publishedAt?.trim() ?? "";
      if (
        !item.id ||
        !title ||
        !summary ||
        !source ||
        !isHttpsUrl(originalUrl) ||
        !isHttpsUrl(canonicalUrl) ||
        !CJK.test(title) ||
        !CJK.test(summary) ||
        Number.isNaN(Date.parse(publishedAt))
      ) {
        return null;
      }
      return {
        id: item.id,
        title,
        summary,
        category: normalizeCategory(item.category),
        tags: [],
        score: Number.isFinite(item.score) ? item.score : 0,
        source,
        original_url: originalUrl,
        canonical_url: canonicalUrl,
        attribution: "AI HOT (aihot.virxact.com)・AI 生成摘要",
        published_at: publishedAt,
        language: "zh-HK",
        placement: "featured",
      };
    })
    .filter((item): item is PublicNewsItem => item !== null)
    .sort(
      (a, b) =>
        Date.parse(b.published_at) - Date.parse(a.published_at) ||
        b.score - a.score,
    );
}

export const BUNDLED_NEWS_ITEMS = buildBundledNewsItems(
  bundledSnapshotJson as BundledSnapshot,
);

function matchesQuery(
  item: PublicNewsItem,
  query: NewsQuery & { search?: string; id?: string },
): boolean {
  if (query.id && item.id !== query.id.trim()) return false;
  if (query.category && item.category !== query.category) return false;
  if (
    query.cursor &&
    !Number.isNaN(Date.parse(query.cursor)) &&
    Date.parse(item.published_at) >= Date.parse(query.cursor)
  ) {
    return false;
  }
  const search = query.search?.trim().toLocaleLowerCase("zh-HK");
  if (
    search &&
    !`${item.title}\n${item.summary}`.toLocaleLowerCase("zh-HK").includes(search)
  ) {
    return false;
  }
  return true;
}

function dedupeAndSort(items: PublicNewsItem[]): PublicNewsItem[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  return items
    .filter((item) => {
      const urlKey = item.original_url.toLowerCase().replace(/\/+$/, "");
      if (seenIds.has(item.id) || seenUrls.has(urlKey)) return false;
      seenIds.add(item.id);
      seenUrls.add(urlKey);
      return true;
    })
    .sort(
      (a, b) =>
        Date.parse(b.published_at) - Date.parse(a.published_at) ||
        b.score - a.score,
    );
}

function capItemsPerSource(
  items: PublicNewsItem[],
  maximum: number | undefined,
): PublicNewsItem[] {
  if (!maximum) return items;
  const counts = new Map<string, number>();
  return items.filter((item) => {
    const source = item.source.trim().toLocaleLowerCase("zh-HK");
    const count = counts.get(source) ?? 0;
    if (count >= maximum) return false;
    counts.set(source, count + 1);
    return true;
  });
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
    query: NewsQuery & {
      search?: string;
      id?: string;
      maxPerSource?: number;
    },
  ): Promise<PublicNewsPage> {
    const limit = clampLimit(query.limit);
    const snapshotItems = (config.snapshotItems ?? BUNDLED_NEWS_ITEMS).filter(
      (item) => matchesQuery(item, query),
    );
    let databaseItems: PublicNewsItem[] = [];
    let databaseError: Error | null = null;

    if (base && config.publishableKey) {
      try {
        const url = new URL(`${base}/rest/v1/items`);
        url.searchParams.set(
          "select",
          "id,title,summary,original_url,category,tags,score,lang,placement,published_at,sources(name)",
        );
        url.searchParams.set("status", "eq.published");
        url.searchParams.set("lang", "eq.zh-HK");
        url.searchParams.set("order", "published_at.desc");
        url.searchParams.set("limit", String(query.id ? 1 : 50));
        if (query.category) {
          url.searchParams.set("category", `eq.${query.category}`);
        }
        if (query.cursor && !Number.isNaN(Date.parse(query.cursor))) {
          url.searchParams.set("published_at", `lt.${query.cursor}`);
        }
        if (query.id) url.searchParams.set("id", `eq.${query.id.trim()}`);
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
        const payload = (await response.json()) as unknown;
        if (!Array.isArray(payload)) {
          throw new Error("新聞資料格式不正確");
        }
        databaseItems = (payload as SupabaseNewsRow[])
          .map(normalizeRow)
          .filter((item): item is PublicNewsItem => item !== null)
          .filter((item) => matchesQuery(item, query));
      } catch (error) {
        databaseError =
          error instanceof Error ? error : new Error("新聞資料暫時無法讀取");
      }
    }

    if (databaseError && snapshotItems.length === 0) throw databaseError;

    // Snapshot rows go first so the curated version wins when both stores have
    // the same article; chronological ordering is restored after deduplication.
    const merged = dedupeAndSort([...snapshotItems, ...databaseItems]);
    const items = capItemsPerSource(merged, query.maxPerSource).slice(0, limit);
    return {
      as_of: new Date(now()).toISOString(),
      language: "zh-HK",
      items,
      next_cursor: items.length > 0 ? items[items.length - 1].published_at : null,
    };
  }

  return {
    latest: (query: NewsQuery = {}) =>
      queryRows({ ...query, maxPerSource: 3 }),
    search: ({ query, ...filters }: NewsSearchQuery) =>
      queryRows({ ...filters, search: query }),
    async detail(id: string) {
      const page = await queryRows({ id: id.trim(), limit: 1 });
      return page.items[0] ?? null;
    },
    async daily(options: { date?: string; limit?: number } = {}) {
      const page = await queryRows({ limit: 50, maxPerSource: 4 });
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

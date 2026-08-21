import { FALLBACK_PUBLIC_APIS } from "@/data/publicApiDirectoryFallback";
import { supabase } from "@/lib/supabase";
import type {
  AdminPublicApiEntry,
  AdminPublicApiInput,
  ApiCorsStatus,
  ApiDirectoryStatus,
  ApiHkRelevance,
  ApiReviewState,
  ApiSourceKind,
  PublicApiCategory,
  PublicApiEntry,
  PublicApiFilters,
  PublicApiPage,
  PublicApiRpcArgs,
} from "@/types/publicApiDirectory";

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\uFE0F/gu;
const CORS_VALUES = new Set<ApiCorsStatus>(["yes", "no", "unknown"]);
const STATUS_VALUES = new Set<ApiDirectoryStatus>(["draft", "published", "hidden"]);
const SOURCE_VALUES = new Set<ApiSourceKind>(["public-apis", "manual", "data-gov-hk"]);
const REVIEW_VALUES = new Set<ApiReviewState>([
  "upstream_listed",
  "aigro_reviewed",
  "live_check_passed",
]);
const RELEVANCE_VALUES = new Set<ApiHkRelevance>(["high", "medium", "low"]);

type UnknownRow = Record<string, unknown>;

function asRecord(value: unknown): UnknownRow | null {
  return typeof value === "object" && value !== null ? (value as UnknownRow) : null;
}

function cleanText(value: unknown, maxLength = 800): string {
  return typeof value === "string"
    ? value.replace(EMOJI_PATTERN, "").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item, 80)).filter(Boolean))].slice(0, 8);
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

export function stripApiDirectoryEmoji(value: string): string {
  return value.replace(EMOJI_PATTERN, "");
}

export function isSafeHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === "" &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function normalizePublicApiRow(value: unknown): PublicApiEntry | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = cleanText(row.id, 80);
  const name = cleanText(row.name, 120);
  const docsUrl = cleanText(row.docs_url, 2_000);
  const updatedAt = cleanText(row.updated_at, 80);
  if (!id || !name || !isSafeHttpsUrl(docsUrl) || !updatedAt) return null;

  const rawSourceUrl = cleanText(row.source_url, 2_000);
  const sourceUrl = rawSourceUrl && isSafeHttpsUrl(rawSourceUrl) ? rawSourceUrl : null;

  return {
    id,
    name,
    descriptionEn: cleanText(row.description_en),
    editorialSummaryZhHk: cleanText(row.editorial_summary_zh_hk),
    category: cleanText(row.category, 80),
    useCases: stringArray(row.use_cases),
    authType: cleanText(row.auth_type, 80) || "No",
    httpsSupported: row.https_supported === true,
    corsStatus: enumValue(row.cors_status, CORS_VALUES, "unknown"),
    docsUrl,
    hkRelevance: enumValue(row.hk_relevance, RELEVANCE_VALUES, "medium"),
    sourceKind: enumValue(row.source_kind, SOURCE_VALUES, "manual"),
    sourceUrl,
    upstreamRef: cleanText(row.upstream_ref, 120) || null,
    reviewState: enumValue(row.review_state, REVIEW_VALUES, "upstream_listed"),
    lastReviewedAt: cleanText(row.last_reviewed_at, 40) || null,
    updatedAt,
  };
}

export function normalizeAdminPublicApiRow(value: unknown): AdminPublicApiEntry | null {
  const row = asRecord(value);
  const publicEntry = normalizePublicApiRow(value);
  if (!row || !publicEntry) return null;

  return {
    ...publicEntry,
    sourceKey: cleanText(row.source_key, 180),
    status: enumValue(row.status, STATUS_VALUES, "draft"),
    hiddenAt: cleanText(row.hidden_at, 80) || null,
    hiddenBy: cleanText(row.hidden_by, 80) || null,
    createdAt: cleanText(row.created_at, 80),
  };
}

export function buildPublicApiRpcArgs(filters: PublicApiFilters = {}): PublicApiRpcArgs {
  return {
    p_query: cleanText(filters.query, 120) || null,
    p_category: cleanText(filters.category, 80) || null,
    p_auth_type: cleanText(filters.authType, 80) || null,
    p_cors_status: filters.corsStatus ?? null,
    p_https: filters.httpsOnly ? true : null,
    p_limit: Math.max(1, Math.min(Math.trunc(filters.limit ?? 24), 100)),
    p_offset: Math.max(0, Math.trunc(filters.offset ?? 0)),
  };
}

function matchesFallback(entry: PublicApiEntry, args: PublicApiRpcArgs): boolean {
  const query = args.p_query?.toLocaleLowerCase("zh-HK");
  if (query) {
    const haystack = [
      entry.name,
      entry.descriptionEn,
      entry.editorialSummaryZhHk,
      ...entry.useCases,
    ]
      .join(" ")
      .toLocaleLowerCase("zh-HK");
    if (!haystack.includes(query)) return false;
  }
  if (args.p_category && entry.category !== args.p_category) return false;
  if (args.p_auth_type && entry.authType.toLowerCase() !== args.p_auth_type.toLowerCase()) {
    return false;
  }
  if (args.p_cors_status && entry.corsStatus !== args.p_cors_status) return false;
  if (args.p_https === true && !entry.httpsSupported) return false;
  return true;
}

export function filterFallbackPublicApis(filters: PublicApiFilters = {}): PublicApiPage {
  const args = buildPublicApiRpcArgs(filters);
  const matching = FALLBACK_PUBLIC_APIS.filter((entry) => matchesFallback(entry, args));
  return {
    entries: matching.slice(args.p_offset, args.p_offset + args.p_limit),
    total: matching.length,
  };
}

export function normalizePublicApiPageRows(value: unknown): PublicApiPage {
  if (!Array.isArray(value)) return { entries: [], total: 0 };
  const entries = value
    .map((row) => normalizePublicApiRow(row))
    .filter((entry): entry is PublicApiEntry => entry !== null);
  const first = asRecord(value[0]);
  const parsedTotal = Number(first?.total_count ?? 0);
  return {
    entries,
    total: Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : entries.length,
  };
}

export async function fetchPublicApiDirectory(
  filters: PublicApiFilters = {}
): Promise<PublicApiPage> {
  if (!supabase) return filterFallbackPublicApis(filters);
  const { data, error } = await supabase.rpc(
    "list_public_api_entries",
    buildPublicApiRpcArgs(filters)
  );
  if (error) throw new Error(error.message);
  return normalizePublicApiPageRows(data);
}

export async function fetchPublicApiCategories(): Promise<PublicApiCategory[]> {
  if (!supabase) {
    const counts = new Map<string, number>();
    for (const entry of FALLBACK_PUBLIC_APIS) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return [...counts]
      .map(([category, entryCount]) => ({ category, entryCount }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  const { data, error } = await supabase.rpc("list_public_api_categories");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return data.flatMap((value) => {
    const row = asRecord(value);
    const category = cleanText(row?.category, 80);
    const entryCount = Number(row?.entry_count ?? 0);
    return category && Number.isFinite(entryCount) ? [{ category, entryCount }] : [];
  });
}

const ADMIN_SELECT = [
  "id",
  "name",
  "description_en",
  "editorial_summary_zh_hk",
  "category",
  "use_cases",
  "auth_type",
  "https_supported",
  "cors_status",
  "docs_url",
  "hk_relevance",
  "source_kind",
  "source_key",
  "source_url",
  "upstream_ref",
  "review_state",
  "last_reviewed_at",
  "status",
  "hidden_at",
  "hidden_by",
  "created_at",
  "updated_at",
].join(",");

const ADMIN_FETCH_PAGE_SIZE = 500;

interface AdminDirectoryPageChunk<T> {
  rows: T[];
  total: number | null;
}

/**
 * PostgREST installations commonly cap a response at 1,000 rows. Walk
 * deterministic server-side ranges until the exact count is satisfied so an
 * admin can still find and unpublish older entries after a full import.
 */
export async function collectAdminPublicApiPages<T>(
  fetchPage: (from: number, to: number) => Promise<AdminDirectoryPageChunk<T>>,
  pageSize = ADMIN_FETCH_PAGE_SIZE
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1_000) {
    throw new Error("Admin API directory page size must be between 1 and 1000");
  }

  const rows: T[] = [];
  let exactTotal: number | null = null;

  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    if (
      exactTotal === null
      && typeof page.total === "number"
      && Number.isInteger(page.total)
      && page.total >= 0
    ) {
      exactTotal = page.total;
    }
    rows.push(...page.rows);

    if (
      page.rows.length < pageSize
      || page.rows.length === 0
      || (exactTotal !== null && rows.length >= exactTotal)
    ) {
      return exactTotal === null ? rows : rows.slice(0, exactTotal);
    }
  }
}

export async function fetchAdminPublicApiDirectory(): Promise<AdminPublicApiEntry[]> {
  const client = supabase;
  if (!client) throw new Error("Supabase 未連接，管理操作暫不可用。");
  const data = await collectAdminPublicApiPages(async (from, to) => {
    const response = await client
      .from("api_directory_entries")
      .select(ADMIN_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    if (response.error) throw new Error(response.error.message);
    return {
      rows: Array.isArray(response.data) ? response.data : [],
      total: typeof response.count === "number" ? response.count : null,
    };
  });

  return data
    .map((row) => normalizeAdminPublicApiRow(row))
    .filter((entry): entry is AdminPublicApiEntry => entry !== null);
}

function assertNoEmoji(label: string, value: string): void {
  if (stripApiDirectoryEmoji(value) !== value) {
    throw new Error(`${label}唔可以包含 emoji。`);
  }
}

export function validatePublicApiInput(input: AdminPublicApiInput): AdminPublicApiInput {
  const name = input.name.trim();
  const descriptionEn = input.descriptionEn.trim();
  const editorialSummaryZhHk = input.editorialSummaryZhHk.trim();
  const category = input.category.trim();
  const authType = input.authType.trim();
  const docsUrl = input.docsUrl.trim();
  const useCases = [...new Set(input.useCases.map((item) => item.trim()).filter(Boolean))];

  for (const [label, value] of [
    ["API 名稱", name],
    ["英文描述", descriptionEn],
    ["香港中文摘要", editorialSummaryZhHk],
    ["分類", category],
    ["認證方式", authType],
    ["使用場景", useCases.join(" ")],
  ] as const) {
    assertNoEmoji(label, value);
  }

  if (!name || name.length > 120) throw new Error("API 名稱必須為 1 至 120 個字元。");
  if (descriptionEn.length > 800) throw new Error("英文描述最多 800 個字元。");
  if (!editorialSummaryZhHk || editorialSummaryZhHk.length > 800) {
    throw new Error("發佈前必須提供 1 至 800 個字元嘅香港中文摘要。");
  }
  if (!/[\u3400-\u9fff]/u.test(editorialSummaryZhHk)) {
    throw new Error("香港中文摘要需要包含中文內容。");
  }
  if (!category || category.length > 80) throw new Error("分類必須為 1 至 80 個字元。");
  if (!authType || authType.length > 80) throw new Error("認證方式必須為 1 至 80 個字元。");
  if (useCases.length > 8 || useCases.some((item) => item.length > 80)) {
    throw new Error("使用場景最多 8 個，每個最多 80 個字元。");
  }
  if (!isSafeHttpsUrl(docsUrl)) {
    throw new Error("官方文件必須係無帳密嘅 HTTPS 網址。");
  }

  return {
    name,
    descriptionEn,
    editorialSummaryZhHk,
    category,
    useCases,
    authType,
    httpsSupported: input.httpsSupported,
    corsStatus: enumValue(input.corsStatus, CORS_VALUES, "unknown"),
    docsUrl,
    hkRelevance: enumValue(input.hkRelevance, RELEVANCE_VALUES, "medium"),
  };
}

function manualSourceKey(): string {
  const suffix = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `manual:${suffix}`;
}

export async function addPublicApiEntry(input: AdminPublicApiInput): Promise<void> {
  if (!supabase) throw new Error("Supabase 未連接，未能新增 API。");
  const clean = validatePublicApiInput(input);
  const { error } = await supabase.from("api_directory_entries").insert({
    name: clean.name,
    description_en: clean.descriptionEn,
    editorial_summary_zh_hk: clean.editorialSummaryZhHk,
    category: clean.category,
    use_cases: clean.useCases,
    auth_type: clean.authType,
    https_supported: clean.httpsSupported,
    cors_status: clean.corsStatus,
    docs_url: clean.docsUrl,
    hk_relevance: clean.hkRelevance,
    source_kind: "manual",
    source_key: manualSourceKey(),
    source_url: null,
    upstream_ref: null,
    review_state: "aigro_reviewed",
    last_reviewed_at: new Date().toISOString().slice(0, 10),
    status: "published",
  });
  if (error) throw new Error(error.message);
}

/**
 * Turn an imported draft into an explicitly reviewed, published entry while
 * preserving its upstream source key and provenance. The editor can only
 * change presentation and classification fields here; importer identity stays
 * immutable so a future sync cannot create a duplicate row.
 */
export async function updatePublicApiEntry(
  id: string,
  input: AdminPublicApiInput
): Promise<void> {
  if (!supabase) throw new Error("Supabase 未連接，未能更新 API。");
  const clean = validatePublicApiInput(input);
  const { error } = await supabase
    .from("api_directory_entries")
    .update({
      name: clean.name,
      description_en: clean.descriptionEn,
      editorial_summary_zh_hk: clean.editorialSummaryZhHk,
      category: clean.category,
      use_cases: clean.useCases,
      auth_type: clean.authType,
      https_supported: clean.httpsSupported,
      cors_status: clean.corsStatus,
      docs_url: clean.docsUrl,
      hk_relevance: clean.hkRelevance,
      review_state: "aigro_reviewed",
      last_reviewed_at: new Date().toISOString().slice(0, 10),
      status: "published",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function setPublicApiStatus(
  id: string,
  status: Extract<ApiDirectoryStatus, "published" | "hidden">
): Promise<void> {
  if (!supabase) throw new Error("Supabase 未連接，未能更新 API。");
  const { error } = await supabase
    .from("api_directory_entries")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hidePublicApiEntry(id: string): Promise<void> {
  return setPublicApiStatus(id, "hidden");
}

export async function restorePublicApiEntry(id: string): Promise<void> {
  return setPublicApiStatus(id, "published");
}

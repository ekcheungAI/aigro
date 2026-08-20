import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  KeyRound,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import QueryState from "@/components/QueryState";
import Reveal from "@/components/Reveal";
import { useAdminQuery } from "@/components/admin/adminData";
import {
  fetchPublicApiCategories,
  fetchPublicApiDirectory,
} from "@/lib/publicApiDirectory";
import type {
  ApiCorsStatus,
  PublicApiEntry,
} from "@/types/publicApiDirectory";

const PAGE_SIZE = 12;

const AUTH_OPTIONS = [
  { value: "", label: "全部認證" },
  { value: "No", label: "免 API key" },
  { value: "apiKey", label: "API key" },
  { value: "OAuth", label: "OAuth" },
];

const CORS_OPTIONS: Array<{ value: "" | ApiCorsStatus; label: string }> = [
  { value: "", label: "全部 CORS" },
  { value: "yes", label: "CORS 可用" },
  { value: "no", label: "CORS 不可用" },
  { value: "unknown", label: "CORS 未知" },
];

function authLabel(authType: string): string {
  if (authType.toLowerCase() === "no") return "免 Key";
  if (authType.toLowerCase() === "apikey") return "API Key";
  return authType;
}

function corsLabel(status: ApiCorsStatus): string {
  if (status === "yes") return "CORS 可用";
  if (status === "no") return "CORS 不可用";
  return "CORS 未知";
}

function reviewLabel(entry: PublicApiEntry): string {
  if (entry.reviewState === "live_check_passed") return "最近連線檢查通過";
  if (entry.reviewState === "aigro_reviewed") return "AIGRO 已審閱";
  return "上游收錄";
}

function ApiCard({ entry }: { entry: PublicApiEntry }) {
  return (
    <article className="card-hover flex h-full min-w-0 flex-col bg-bg p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-ink-soft px-2.5 py-1 text-overline font-sans uppercase text-ink">
          {entry.category}
        </span>
        {entry.hkRelevance === "high" ? (
          <span className="inline-flex items-center gap-1 rounded-sm border border-border-strong px-2.5 py-1 text-overline text-text-secondary">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            香港相關
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 font-display text-h3 text-text-primary">{entry.name}</h3>
      <p className="mt-3 text-body-sm text-text-secondary">
        {entry.editorialSummaryZhHk}
      </p>
      {entry.descriptionEn ? (
        <p lang="en" className="mt-2 text-caption text-text-muted">
          {entry.descriptionEn}
        </p>
      ) : null}

      {entry.useCases.length > 0 ? (
        <div className="mt-4 border-l-2 border-ink pl-3">
          <p className="text-overline font-sans uppercase text-ink">適合工作流</p>
          <p className="mt-1 text-body-sm text-text-secondary">
            {entry.useCases.join(" · ")}
          </p>
        </div>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-px border-y bg-border text-caption">
        <div className="bg-bg px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-text-muted">
            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            認證
          </dt>
          <dd className="mt-1 text-text-primary">{authLabel(entry.authType)}</dd>
        </div>
        <div className="bg-bg px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-text-muted">
            <Globe2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            Browser
          </dt>
          <dd className="mt-1 text-text-primary">{corsLabel(entry.corsStatus)}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <div className="flex items-center gap-2 text-caption text-text-muted">
          <ShieldCheck className="h-4 w-4 text-ink" strokeWidth={1.5} aria-hidden="true" />
          <span>{reviewLabel(entry)}</span>
          {entry.lastReviewedAt ? (
            <time dateTime={entry.lastReviewedAt} className="font-mono">
              {entry.lastReviewedAt}
            </time>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <a
            href={entry.docsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-label text-ink link-underline"
          >
            官方文件
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          </a>
          {entry.sourceUrl ? (
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-label text-text-secondary link-underline"
            >
              目錄來源
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function PublicApiDirectory() {
  const [query, setQuery] = useState("");
  const [settledQuery, setSettledQuery] = useState("");
  const [category, setCategory] = useState("");
  const [authType, setAuthType] = useState("");
  const [corsStatus, setCorsStatus] = useState<"" | ApiCorsStatus>("");
  const [httpsOnly, setHttpsOnly] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledQuery(query), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filters = useMemo(
    () => ({
      query: settledQuery,
      category: category || null,
      authType: authType || null,
      corsStatus: corsStatus || null,
      httpsOnly,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [settledQuery, category, authType, corsStatus, httpsOnly, page]
  );

  const directory = useAdminQuery(
    () => fetchPublicApiDirectory(filters),
    [settledQuery, category, authType, corsStatus, httpsOnly, page]
  );
  const categories = useAdminQuery(fetchPublicApiCategories, []);
  const total = directory.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearFilters = () => {
    setQuery("");
    setSettledQuery("");
    setCategory("");
    setAuthType("");
    setCorsStatus("");
    setHttpsOnly(true);
    setPage(0);
  };

  return (
    <section
      data-ui="public-api-directory"
      aria-labelledby="public-api-results-title"
      className="mx-auto max-w-container px-6 pb-24 max-md:pb-16"
    >
      <Reveal>
        <div className="border-y py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,auto))_auto] lg:items-center">
            <label className="relative block">
              <span className="sr-only">搜尋公開 API</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder="搜尋 API、用途、描述…"
                className="h-11 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none"
              />
            </label>

            <label className="sr-only" htmlFor="api-category-filter">API 分類</label>
            <select
              id="api-category-filter"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(0);
              }}
              className="h-11 rounded-md border border-border-strong bg-surface px-3 text-label text-text-primary focus:border-ink focus:outline-none"
            >
              <option value="">全部分類</option>
              {(categories.data ?? []).map((item) => (
                <option key={item.category} value={item.category}>
                  {item.category} ({item.entryCount})
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="api-auth-filter">API 認證方式</label>
            <select
              id="api-auth-filter"
              value={authType}
              onChange={(event) => {
                setAuthType(event.target.value);
                setPage(0);
              }}
              className="h-11 rounded-md border border-border-strong bg-surface px-3 text-label text-text-primary focus:border-ink focus:outline-none"
            >
              {AUTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <label className="sr-only" htmlFor="api-cors-filter">API CORS 狀態</label>
            <select
              id="api-cors-filter"
              value={corsStatus}
              onChange={(event) => {
                setCorsStatus(event.target.value as "" | ApiCorsStatus);
                setPage(0);
              }}
              className="h-11 rounded-md border border-border-strong bg-surface px-3 text-label text-text-primary focus:border-ink focus:outline-none"
            >
              {CORS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <button
              type="button"
              aria-pressed={httpsOnly}
              onClick={() => {
                setHttpsOnly((value) => !value);
                setPage(0);
              }}
              className={
                httpsOnly
                  ? "press h-11 rounded-md bg-ink-solid px-4 text-label text-on-accent"
                  : "press h-11 rounded-md border border-border-strong px-4 text-label text-text-secondary hover:border-ink hover:text-ink"
              }
            >
              只顯示 HTTPS
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p id="public-api-results-title" className="font-mono text-caption uppercase tracking-wider text-text-muted">
              {directory.loading ? "載入中" : `${total} 個已發佈 API`}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="press inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-label text-ink hover:bg-ink-soft"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              清除篩選
            </button>
          </div>
          {categories.error ? (
            <p role="status" className="mt-2 text-caption text-warning">
              分類統計暫時未能載入，搜尋同其他篩選仍然可用。
            </p>
          ) : null}
        </div>
      </Reveal>

      <div className="mt-8">
        <QueryState
          loading={directory.loading}
          error={directory.error ? "API 目錄暫時未能載入，請稍後再試。" : null}
          retry={directory.refetch}
          skeletonRows={6}
          empty={
            directory.data && directory.data.entries.length === 0 ? (
              <div className="border-y py-16 text-center">
                <p className="font-mono text-caption uppercase tracking-wider text-text-muted">
                  0 個 API
                </p>
                <p className="mt-3 text-body text-text-secondary">
                  搵唔到符合條件嘅 API，試下放寬分類、認證或 CORS 篩選。
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="press mt-5 inline-flex h-10 items-center rounded-md border border-border-strong px-5 text-label text-ink hover:border-ink"
                >
                  清除篩選
                </button>
              </div>
            ) : null
          }
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-px border-y bg-border md:grid-cols-2 lg:grid-cols-3">
            {(directory.data?.entries ?? []).map((entry, index) => (
              <Reveal key={entry.id} delay={(index % 3) * 0.08} className="min-w-0">
                <ApiCard entry={entry} />
              </Reveal>
            ))}
          </div>
        </QueryState>
      </div>

      {total > PAGE_SIZE ? (
        <nav className="mt-8 flex items-center justify-between border-y py-3" aria-label="API 目錄分頁">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="press inline-flex h-10 items-center gap-1.5 rounded-md border border-border-strong px-4 text-label text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            上一頁
          </button>
          <p className="font-mono text-caption text-text-muted">
            {page + 1} / {pageCount}
          </p>
          <button
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            className="press inline-flex h-10 items-center gap-1.5 rounded-md border border-border-strong px-4 text-label text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一頁
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </nav>
      ) : null}

      <Reveal>
        <aside className="mt-10 border-y py-6 text-body-sm text-text-secondary">
          <p>
            資料以 AIGRO 編輯審閱為主，部分條目源自 public-apis/public-apis（MIT）。「已審閱」唔代表生產環境認證；接入前請核對供應商最新條款、價格、配額同資料處理要求。
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <a
              href="https://github.com/public-apis/public-apis"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-label text-ink link-underline"
            >
              public-apis 原始目錄
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            </a>
            <a
              href="https://github.com/public-apis/public-apis/blob/master/LICENSE"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-label text-ink link-underline"
            >
              MIT 授權
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>
        </aside>
      </Reveal>
    </section>
  );
}

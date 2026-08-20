import { useMemo, useState } from "react";
import {
  Archive,
  ExternalLink,
  Plus,
  RotateCcw,
  Search,
  Undo2,
} from "lucide-react";
import QueryState from "@/components/QueryState";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminQuery } from "@/components/admin/adminData";
import {
  addPublicApiEntry,
  fetchAdminPublicApiDirectory,
  hidePublicApiEntry,
  restorePublicApiEntry,
} from "@/lib/publicApiDirectory";
import { cn } from "@/lib/utils";
import type {
  AdminPublicApiInput,
  ApiCorsStatus,
  ApiDirectoryStatus,
  ApiHkRelevance,
} from "@/types/publicApiDirectory";

const EMPTY_FORM: AdminPublicApiInput = {
  name: "",
  descriptionEn: "",
  editorialSummaryZhHk: "",
  category: "",
  useCases: [],
  authType: "No",
  httpsSupported: true,
  corsStatus: "unknown",
  docsUrl: "",
  hkRelevance: "medium",
};

type StatusFilter = "all" | ApiDirectoryStatus;

function statusLabel(status: ApiDirectoryStatus): string {
  if (status === "published") return "已發佈";
  if (status === "hidden") return "已下架";
  return "草稿";
}

function statusClass(status: ApiDirectoryStatus): string {
  if (status === "published") return "bg-lime-soft text-lime-text";
  if (status === "hidden") return "bg-card text-error";
  return "bg-card text-warning";
}

export default function AdminPublicApiDirectory() {
  const toast = useAdminToast();
  const directory = useAdminQuery(fetchAdminPublicApiDirectory, []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<AdminPublicApiInput>(EMPTY_FORM);
  const [useCasesText, setUseCasesText] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("zh-HK");
    return (directory.data ?? []).filter((entry) => {
      if (status !== "all" && entry.status !== status) return false;
      if (!needle) return true;
      return [
        entry.name,
        entry.category,
        entry.editorialSummaryZhHk,
        entry.descriptionEn,
        ...entry.useCases,
      ]
        .join(" ")
        .toLocaleLowerCase("zh-HK")
        .includes(needle);
    });
  }, [directory.data, query, status]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setUseCasesText("");
    setFormError("");
  };

  const closePanel = () => {
    if (submitting) return;
    setPanelOpen(false);
    resetForm();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError("");
    try {
      await addPublicApiEntry({
        ...form,
        useCases: useCasesText.split(",").map((item) => item.trim()).filter(Boolean),
      });
      toast(`已新增並發佈 ${form.name.trim()}`);
      setPanelOpen(false);
      resetForm();
      directory.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "新增 API 失敗。");
    } finally {
      setSubmitting(false);
    }
  };

  const hide = async (id: string, name: string) => {
    if (!window.confirm(`確認將「${name}」下架？公開目錄會即時隱藏，但可喺後台恢復上架。`)) {
      return;
    }
    setMutatingId(id);
    try {
      await hidePublicApiEntry(id);
      toast(`已下架 ${name}`);
      directory.refetch();
    } catch (error) {
      toast(error instanceof Error ? error.message : "下架失敗。");
    } finally {
      setMutatingId(null);
    }
  };

  const restore = async (id: string, name: string) => {
    setMutatingId(id);
    try {
      await restorePublicApiEntry(id);
      toast(`已恢復上架 ${name}`);
      directory.refetch();
    } catch (error) {
      toast(error instanceof Error ? error.message : "恢復上架失敗。");
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <section data-ui="admin-public-api-directory" aria-labelledby="admin-api-directory-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            API Radar
          </p>
          <h2 id="admin-api-directory-title" className="mt-1 font-display text-[26px] font-medium text-text-primary">
            公開 API 目錄管理
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            新增條目、下架公開內容，並保留來源同審閱紀錄。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="press inline-flex h-10 items-center gap-2 rounded-md bg-lime px-4 text-sm font-medium text-on-accent hover:bg-lime-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          新增 API
        </button>
      </div>

      <div className="mt-6 grid gap-3 border-y py-4 sm:grid-cols-[minmax(220px,1fr)_180px_auto] sm:items-center">
        <label className="relative block">
          <span className="sr-only">搜尋 API 目錄</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋名稱、分類、摘要…"
            className="h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-lime-text focus:outline-none"
          />
        </label>
        <label className="sr-only" htmlFor="admin-api-status-filter">目錄狀態</label>
        <select
          id="admin-api-status-filter"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          className="h-10 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary focus:border-lime-text focus:outline-none"
        >
          <option value="all">全部狀態</option>
          <option value="published">已發佈</option>
          <option value="draft">草稿</option>
          <option value="hidden">已下架</option>
        </select>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted sm:text-right">
          {filtered.length} / {directory.data?.length ?? 0}
        </p>
      </div>

      <div className="mt-5">
        <QueryState
          loading={directory.loading}
          error={directory.error}
          retry={directory.refetch}
          skeletonRows={5}
          empty={
            !directory.loading && !directory.error && filtered.length === 0 ? (
              <div className="rounded-md border border-dashed border-border-strong px-5 py-12 text-center">
                <p className="text-sm text-text-secondary">呢個篩選暫時冇 API 條目。</p>
              </div>
            ) : null
          }
        >
          <ul className="space-y-2">
            {filtered.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border bg-surface px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-sm px-2 py-1 text-[11px] font-medium", statusClass(entry.status))}>
                        {statusLabel(entry.status)}
                      </span>
                      <span className="rounded-sm bg-card px-2 py-1 font-mono text-[11px] text-text-muted">
                        {entry.category}
                      </span>
                      <span className="rounded-sm bg-card px-2 py-1 font-mono text-[11px] text-text-muted">
                        {entry.sourceKind === "public-apis" ? "public-apis" : "AIGRO 手動"}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-text-primary">{entry.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {entry.editorialSummaryZhHk || "未有香港中文編輯摘要，唔可以發佈。"}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-text-muted">
                      {entry.authType} · HTTPS {entry.httpsSupported ? "Yes" : "No"} · CORS {entry.corsStatus}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <a
                      href={entry.docsUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="press inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-text-secondary hover:border-border-strong hover:text-text-primary"
                    >
                      文件
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    </a>
                    {entry.status === "published" ? (
                      <button
                        type="button"
                        disabled={mutatingId === entry.id}
                        onClick={() => void hide(entry.id, entry.name)}
                        className="press inline-flex h-9 items-center gap-1.5 rounded-md border border-error/50 px-3 text-xs text-error hover:bg-card disabled:opacity-50"
                      >
                        <Archive className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        {mutatingId === entry.id ? "處理中" : "下架"}
                      </button>
                    ) : null}
                    {entry.status === "hidden" ? (
                      <button
                        type="button"
                        disabled={mutatingId === entry.id}
                        onClick={() => void restore(entry.id, entry.name)}
                        className="press inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong px-3 text-xs text-lime-text hover:bg-lime-soft disabled:opacity-50"
                      >
                        <Undo2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        {mutatingId === entry.id ? "處理中" : "恢復上架"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </QueryState>
      </div>

      <AdminSlideOver
        open={panelOpen}
        onClose={closePanel}
        title="新增公開 API"
        subtitle="手動條目會標示為 AIGRO 編輯內容，不會冒充 public-apis 來源。"
        width={560}
      >
        <form onSubmit={submit} className="space-y-5 p-6">
          <label className="block text-sm font-medium text-text-primary">
            API 名稱
            <input
              required
              maxLength={120}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1.5 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-sm font-normal focus:border-lime-text focus:outline-none"
            />
          </label>

          <label className="block text-sm font-medium text-text-primary">
            官方文件 HTTPS 網址
            <input
              required
              type="url"
              inputMode="url"
              placeholder="https://example.com/docs"
              value={form.docsUrl}
              onChange={(event) => setForm((current) => ({ ...current, docsUrl: event.target.value }))}
              className="mt-1.5 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-sm font-normal focus:border-lime-text focus:outline-none"
            />
          </label>

          <label className="block text-sm font-medium text-text-primary">
            香港中文編輯摘要
            <textarea
              required
              maxLength={800}
              rows={4}
              value={form.editorialSummaryZhHk}
              onChange={(event) => setForm((current) => ({ ...current, editorialSummaryZhHk: event.target.value }))}
              className="mt-1.5 w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm font-normal leading-relaxed focus:border-lime-text focus:outline-none"
            />
            <span className="mt-1 block text-xs font-normal text-text-muted">
              必填；唔接受 emoji。審閱唔代表生產環境認證。
            </span>
          </label>

          <label className="block text-sm font-medium text-text-primary">
            英文描述
            <textarea
              maxLength={800}
              rows={2}
              value={form.descriptionEn}
              onChange={(event) => setForm((current) => ({ ...current, descriptionEn: event.target.value }))}
              className="mt-1.5 w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm font-normal leading-relaxed focus:border-lime-text focus:outline-none"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-primary">
              分類
              <input
                required
                maxLength={80}
                placeholder="Development"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-sm font-normal focus:border-lime-text focus:outline-none"
              />
            </label>
            <label className="block text-sm font-medium text-text-primary">
              認證方式
              <select
                value={form.authType}
                onChange={(event) => setForm((current) => ({ ...current, authType: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-sm font-normal focus:border-lime-text focus:outline-none"
              >
                <option value="No">免 API key</option>
                <option value="apiKey">API key</option>
                <option value="OAuth">OAuth</option>
                <option value="other">其他</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-text-primary">
              CORS
              <select
                value={form.corsStatus}
                onChange={(event) => setForm((current) => ({ ...current, corsStatus: event.target.value as ApiCorsStatus }))}
                className="mt-1.5 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-sm font-normal focus:border-lime-text focus:outline-none"
              >
                <option value="unknown">未知</option>
                <option value="yes">可用</option>
                <option value="no">不可用</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-text-primary">
              香港相關度
              <select
                value={form.hkRelevance}
                onChange={(event) => setForm((current) => ({ ...current, hkRelevance: event.target.value as ApiHkRelevance }))}
                className="mt-1.5 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-sm font-normal focus:border-lime-text focus:outline-none"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium text-text-primary">
            使用場景
            <input
              value={useCasesText}
              onChange={(event) => setUseCasesText(event.target.value)}
              placeholder="市場研究, 自動化, 內容工作流"
              className="mt-1.5 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-sm font-normal focus:border-lime-text focus:outline-none"
            />
            <span className="mt-1 block text-xs font-normal text-text-muted">用半形逗號分隔，最多 8 個。</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={form.httpsSupported}
              onChange={(event) => setForm((current) => ({ ...current, httpsSupported: event.target.checked }))}
              className="h-4 w-4 accent-lime"
            />
            API 本身支援 HTTPS
          </label>

          {formError ? (
            <p role="alert" className="rounded-md border border-error/40 bg-card px-3 py-2 text-sm text-error">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <button
              type="button"
              onClick={closePanel}
              className="press inline-flex h-10 items-center rounded-md border border-border-strong px-4 text-sm text-text-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="press inline-flex h-10 items-center gap-2 rounded-md bg-lime px-4 text-sm font-medium text-on-accent hover:bg-lime-hover disabled:opacity-50"
            >
              {submitting ? (
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
              {submitting ? "新增中" : "新增並發佈"}
            </button>
          </div>
        </form>
      </AdminSlideOver>
    </section>
  );
}

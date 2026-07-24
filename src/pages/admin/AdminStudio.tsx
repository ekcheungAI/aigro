import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  FlaskConical,
  Link2,
  Loader2,
  MessagesSquare,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import { studioExperts } from "@/data/admin-mock";
import type {
  StudioExpert,
  StudioResource,
  StudioResourceType,
} from "@/data/admin-mock";

const RESOURCE_TABS: StudioResourceType[] = ["文件", "研究", "連結", "逐字稿"];
const LINK_KINDS = ["YouTube", "Podcast", "文章", "社交貼文"] as const;

const FIELD =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none";

const fmtSize = (bytes: number) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/* ---------------- Section 1 — 素材上載 ---------------- */

interface UploadRow {
  id: string;
  name: string;
  size: string;
  status: "待處理";
}

interface LinkRow {
  id: string;
  url: string;
  kind: (typeof LINK_KINDS)[number];
  status: "抓取中" | "已轉換文字";
}

function UploadSection({ expert }: { expert: StudioExpert }) {
  const toast = useAdminToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<(typeof LINK_KINDS)[number]>("YouTube");

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const rows: UploadRow[] = Array.from(files).map((f) => ({
      id: `up-${expert.slug}-${++idRef.current}`,
      name: f.name,
      size: fmtSize(f.size),
      status: "待處理",
    }));
    setUploads((list) => [...list, ...rows]);
    toast(`已加入 ${rows.length} 個檔案 — 待處理(mock)`);
  };

  const addLink = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast("請先輸入連結 URL");
      return;
    }
    const id = `lk-${expert.slug}-${++idRef.current}`;
    setLinks((list) => [...list, { id, url: trimmed, kind, status: "抓取中" }]);
    setUrl("");
    toast(`已加入${kind}連結 — Firecrawl 抓取中(mock)`);
    window.setTimeout(() => {
      setLinks((list) =>
        list.map((l) => (l.id === id ? { ...l, status: "已轉換文字" } : l))
      );
      toast("連結已轉換文字 — 可加入知識庫(mock)");
    }, 2200);
  };

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          01 · Upload
        </p>
        <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
          素材上載
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">
          交出已有素材即得 — 平台代做抓取、轉錄同切塊,專家唔使重新錄製。
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver
              ? "border-lime bg-lime-soft/50"
              : "border-border-strong bg-card/40 hover:border-lime hover:bg-card"
          )}
        >
          <UploadCloud
            className={cn(
              "h-8 w-8",
              dragOver ? "text-lime-text" : "text-text-muted"
            )}
          />
          <p className="text-sm font-medium text-text-primary">
            拖放檔案或撳嚟上載
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
            PDF / DOCX / TXT / MD / MP3 逐字稿
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.mp3"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* 由連結加入 */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={cn(FIELD, "flex-1")}
            placeholder="https:// — YouTube / Podcast / 文章 / 社交貼文連結"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addLink();
            }}
          />
          <div className="flex gap-2">
            <select
              className={cn(FIELD, "w-auto")}
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as (typeof LINK_KINDS)[number])
              }
            >
              {LINK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addLink}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
            >
              <Plus className="h-4 w-4" />
              加入
            </button>
          </div>
        </div>

        {/* Staged rows */}
        {(uploads.length > 0 || links.length > 0) && (
          <div className="divide-y divide-border rounded-md border border-border">
            {uploads.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1 truncate text-text-primary">
                  {u.name}
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {u.size}
                </span>
                <span className="rounded-sm bg-card px-2 py-0.5 text-xs font-medium text-[#A36A0F]">
                  {u.status}
                </span>
              </div>
            ))}
            {links.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <Link2 className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1 truncate text-text-primary">
                  {l.url}
                </span>
                <span className="rounded-sm bg-card px-1.5 py-0.5 text-[11px] text-text-secondary">
                  {l.kind}
                </span>
                {l.status === "抓取中" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-card px-2 py-0.5 text-xs font-medium text-[#A36A0F]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    抓取中
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-lime-soft px-2 py-0.5 text-xs font-medium text-lime-text">
                    <CheckCircle2 className="h-3 w-3" />
                    已轉換文字
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Section 2 — 資源庫 ---------------- */

function ResourcesSection({
  expert,
  resources,
  setResources,
}: {
  expert: StudioExpert;
  resources: StudioResource[];
  setResources: (next: StudioResource[]) => void;
}) {
  const toast = useAdminToast();
  const [tab, setTab] = useState<StudioResourceType>("文件");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = resources.filter(
    (r) =>
      r.type === tab &&
      (query.trim() === "" ||
        r.name.toLowerCase().includes(query.trim().toLowerCase()))
  );

  const allChecked =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) filtered.forEach((r) => next.delete(r.id));
      else filtered.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const batchAddKb = () => {
    if (selected.size === 0) return toast("請先勾選資源");
    setResources(
      resources.map((r) => (selected.has(r.id) ? { ...r, inKb: true } : r))
    );
    toast(`已將 ${selected.size} 項資源加入知識庫 — 等待下次蒸餾(mock)`);
    setSelected(new Set());
  };

  const batchDelete = () => {
    if (selected.size === 0) return toast("請先勾選資源");
    setResources(resources.filter((r) => !selected.has(r.id)));
    toast(`已刪除 ${selected.size} 項資源(mock)`);
    setSelected(new Set());
  };

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            02 · Resources
          </p>
          <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
            資源庫 — {expert.displayName}
          </h2>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            className={cn(FIELD, "w-56 pl-9")}
            placeholder="搜尋資源名稱…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs + batch actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div className="flex gap-1">
          {RESOURCE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setSelected(new Set());
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t
                  ? "bg-lime text-on-accent"
                  : "text-text-secondary hover:bg-card"
              )}
            >
              {t}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                {resources.filter((r) => r.type === t).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={batchAddKb}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
          >
            <Database className="h-3.5 w-3.5" />
            加入知識庫
          </button>
          <button
            type="button"
            onClick={batchDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-error hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
            刪除
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="全選"
                  className="h-4 w-4 accent-[#43F50E]"
                />
              </th>
              <th className="px-4 py-3 font-medium">名稱</th>
              <th className="px-4 py-3 font-medium">類型 / 來源</th>
              <th className="px-4 py-3 font-medium">加入日期</th>
              <th className="px-4 py-3 text-right font-medium">已入知識庫</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-card/60">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                    aria-label={`選取 ${r.name}`}
                    className="h-4 w-4 accent-[#43F50E]"
                  />
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <p className="truncate font-medium text-text-primary">
                    {r.name}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-sm bg-card px-1.5 py-0.5 text-[11px] text-text-secondary">
                    {r.detail}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                  {r.addedAt}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={cn(
                        "text-xs",
                        r.inKb ? "text-lime-text" : "text-text-muted"
                      )}
                    >
                      {r.inKb ? "已入庫" : "未入庫"}
                    </span>
                    <AdminToggle
                      checked={r.inKb}
                      label={`${r.name} 知識庫開關`}
                      onChange={(next) => {
                        setResources(
                          resources.map((x) =>
                            x.id === r.id ? { ...x, inKb: next } : x
                          )
                        );
                        toast(
                          next
                            ? `「${r.name}」已標記入知識庫(mock)`
                            : `「${r.name}」已移出知識庫(mock)`
                        );
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-text-muted"
                >
                  冇符合嘅資源 — 試下其他分頁或關鍵字。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- Section 3 — 蒸餾管線 ---------------- */

function PipelineSection({ expert }: { expert: StudioExpert }) {
  const toast = useAdminToast();
  const [running, setRunning] = useState(false);
  const [pct, setPct] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set([1]));
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(
      () => setPct((p) => Math.min(100, p + 2)),
      90
    );
    return () => window.clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (pct >= 55) setActiveStep(3);
    else if (pct >= 8) setActiveStep(2);
    if (pct >= 40) setDoneSteps((s) => new Set(s).add(2));
    if (pct >= 100) {
      setDoneSteps(new Set([1, 2, 3]));
      setActiveStep(0);
      setRunning(false);
      toast(`蒸餾完成 — ${expert.promptVersions[1]?.version ?? "新版本"} 待審批`);
    }
  }, [pct, running, expert, toast]);

  const startRun = () => {
    if (running) return;
    setApproved(false);
    setDoneSteps(new Set([1]));
    setActiveStep(1);
    setPct(0);
    setRunning(true);
    toast(`開始蒸餾 ${expert.displayName} 嘅知識庫(mock)`);
  };

  const steps = [
    {
      n: 1,
      zh: "素材收集",
      en: "Collect",
      desc: `${expert.collectedCount} 項已收集`,
    },
    {
      n: 2,
      zh: "轉換與切塊",
      en: "Firecrawl + Chunking",
      desc: "Firecrawl 抓取 → 文本切塊",
    },
    {
      n: 3,
      zh: "建立知識庫",
      en: "Embedding",
      desc: `embedding 入庫 · ${expert.kbChunks.toLocaleString()} 片段`,
    },
    {
      n: 4,
      zh: "專家審批",
      en: "Review",
      desc: "Demo 對話測試 + approved 開關",
    },
  ];

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            03 · Distillation
          </p>
          <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
            蒸餾管線
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            素材 → Firecrawl 抓取 → 切塊 embedding → RAG 知識庫 → 專家審批上線。
          </p>
        </div>
        <button
          type="button"
          onClick={startRun}
          disabled={running}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            running
              ? "cursor-not-allowed bg-card text-text-muted"
              : "bg-lime text-on-accent hover:bg-lime-hover"
          )}
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running ? "蒸餾中…" : "開始蒸餾"}
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* Steps */}
        <div className="grid gap-2 md:grid-cols-4 md:gap-0">
          {steps.map((s, i) => {
            const isDone = doneSteps.has(s.n) || (s.n === 4 && approved);
            const isActive = activeStep === s.n;
            return (
              <div key={s.n} className="flex items-center">
                <div
                  className={cn(
                    "flex-1 rounded-md border px-3.5 py-3 transition-colors",
                    isActive
                      ? "border-lime bg-lime-soft/40"
                      : isDone
                        ? "border-border bg-card/60"
                        : "border-border bg-surface"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold",
                        isDone
                          ? "bg-lime text-on-accent"
                          : isActive
                            ? "bg-lime text-on-accent"
                            : "border border-border-strong text-text-muted"
                      )}
                    >
                      {isDone ? "✓" : s.n}
                    </span>
                    <p className="text-sm font-medium text-text-primary">
                      {s.zh}
                    </p>
                    {isActive && (
                      <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-lime" />
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    {s.en}
                  </p>
                  <p className="mt-1.5 text-xs text-text-secondary">{s.desc}</p>
                  <p
                    className={cn(
                      "mt-1 text-[11px] font-medium",
                      s.n === 4
                        ? approved
                          ? "text-lime-text"
                          : "text-[#A36A0F]"
                        : isDone
                          ? "text-lime-text"
                          : isActive
                            ? "text-lime-text"
                            : "text-text-muted"
                    )}
                  >
                    {s.n === 4
                      ? approved
                        ? "已審批 · 準予上線"
                        : "待審批"
                      : isDone
                        ? "完成"
                        : isActive
                          ? "處理中"
                          : "待命"}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="mx-1 hidden h-4 w-4 shrink-0 text-border-strong md:block" />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {(running || pct >= 100) && (
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">
                {running
                  ? activeStep === 3
                    ? "建立知識庫 — embedding 寫入中…"
                    : "轉換與切塊 — Firecrawl + chunking…"
                  : "蒸餾完成"}
              </span>
              <span className="font-mono text-text-primary">{pct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-lime transition-transform duration-150 ease-linear"
                style={{
                  transform: `scaleX(${pct / 100})`,
                  transformOrigin: "left",
                  width: "100%",
                }}
              />
            </div>
          </div>
        )}

        {/* KB stats */}
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
          <div className="bg-surface px-4 py-3">
            <p className="text-xs text-text-muted">知識庫片段</p>
            <p className="mt-1 font-mono text-[22px] font-semibold text-text-primary">
              {expert.kbChunks.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="text-xs text-text-muted">最後蒸餾</p>
            <p className="mt-1 font-mono text-[22px] font-semibold text-text-primary">
              {expert.lastDistilled}
            </p>
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="text-xs text-text-muted">覆蓋主題</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {expert.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-sm bg-lime-soft px-1.5 py-0.5 text-[11px] font-medium text-lime-text"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Approval + version history */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-card/50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  專家審批 — approved_by_expert
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  專家喺「測試分身」確認回答貼近其觀點後,先可以開啟。
                </p>
              </div>
              <AdminToggle
                checked={approved}
                label="本人已審批,準予上線"
                onChange={(next) => {
                  setApproved(next);
                  toast(
                    next
                      ? "本人已審批,準予上線 — v1.1 已標記上線(mock)"
                      : "已撤回審批 — v1.1 回復待審批(mock)"
                  );
                }}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                approved ? "text-lime-text" : "text-[#A36A0F]"
              )}
            >
              {approved
                ? "本人已審批,準予上線"
                : "本人已審批,準予上線 — 未勾選,分身維持 v1.0"}
            </p>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-card/50 text-xs text-text-muted">
                  <th className="px-4 py-2.5 font-medium">版本</th>
                  <th className="px-4 py-2.5 font-medium">日期</th>
                  <th className="px-4 py-2.5 text-right font-medium">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expert.promptVersions.map((v) => {
                  const live =
                    v.status === "已上線" ||
                    (v.status === "待審批" && approved);
                  return (
                    <tr key={v.version}>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-text-primary">
                        {v.version}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                        {v.date}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={cn(
                            "rounded-sm px-2 py-0.5 text-xs font-medium",
                            live
                              ? "bg-lime-soft text-lime-text"
                              : "bg-card text-[#A36A0F]"
                          )}
                        >
                          {live ? "已上線" : "待審批"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section 4 — 測試分身 ---------------- */

interface ChatMsg {
  id: number;
  from: "me" | "ai";
  text: string;
}

function TestChatSection({ expert }: { expert: StudioExpert }) {
  const toast = useAdminToast();
  const idRef = useRef(0);
  const replyIdx = useRef(0);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: ++idRef.current,
      from: "ai",
      text: `你好,我係 ${expert.displayName} 嘅 AI 分身(Prompt ${expert.promptVersions[0]?.version ?? "v1.0"})。試問我任何問題,睇下蒸餾成果貼唔貼我嘅觀點。`,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setMsgs((m) => [...m, { id: ++idRef.current, from: "me", text }]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      const reply =
        expert.personaReplies[replyIdx.current % expert.personaReplies.length];
      replyIdx.current += 1;
      setMsgs((m) => [...m, { id: ++idRef.current, from: "ai", text: reply.a }]);
      setThinking(false);
    }, 900);
  };

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            04 · Test Persona
          </p>
          <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
            測試分身
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            試問分身 — 審批前驗證蒸餾成果,回答以 {expert.shortName} 嘅授權知識庫生成(mock)。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMsgs([]);
            replyIdx.current = 0;
            toast("已清除測試對話(mock)");
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
        >
          清除對話
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        {/* Suggested prompts */}
        <div className="flex flex-wrap gap-1.5">
          {expert.personaReplies.map((r) => (
            <button
              key={r.q}
              type="button"
              onClick={() => send(r.q)}
              className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
            >
              {r.q}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="max-h-[340px] space-y-3 overflow-y-auto rounded-md border border-border bg-card/40 p-4">
          {msgs.length === 0 && (
            <p className="py-6 text-center text-sm text-text-muted">
              對話已清除 — 撳上面建議問題或直接輸入。
            </p>
          )}
          {msgs.map((m) =>
            m.from === "ai" ? (
              <div key={m.id} className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime font-mono text-[10px] font-semibold text-on-accent">
                  {expert.shortName.slice(0, 1)}
                </span>
                <div className="max-w-[85%] rounded-lg rounded-tl-none bg-lime-soft px-3.5 py-2.5 text-sm leading-relaxed text-text-primary">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg rounded-tr-none border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-text-primary">
                  {m.text}
                </div>
              </div>
            )
          )}
          {thinking && (
            <div className="flex gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime font-mono text-[10px] font-semibold text-on-accent">
                {expert.shortName.slice(0, 1)}
              </span>
              <div className="inline-flex items-center gap-1.5 rounded-lg rounded-tl-none bg-lime-soft px-3.5 py-2.5 text-sm text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                分身諗緊…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            className={cn(FIELD, "flex-1")}
            placeholder={`問吓 ${expert.shortName} 嘅分身…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={thinking || input.trim() === ""}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              thinking || input.trim() === ""
                ? "cursor-not-allowed bg-card text-text-muted"
                : "bg-lime text-on-accent hover:bg-lime-hover"
            )}
          >
            <Send className="h-4 w-4" />
            送出
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */

export default function AdminStudio() {
  const [slug, setSlug] = useState(studioExperts[0].slug);
  const expert =
    studioExperts.find((e) => e.slug === slug) ?? studioExperts[0];

  // 資源庫 local state(每位專家獨立,switch 時重置為 mock 初值)
  const [resByExpert, setResByExpert] = useState<
    Record<string, StudioResource[]>
  >(() =>
    Object.fromEntries(studioExperts.map((e) => [e.slug, e.resources]))
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header + expert selector */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            Instructor Studio
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            專家工作室
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            領航專家上載素材、管理資源庫,並蒸餾屬於自己嘅 AI 分身。
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface p-1">
          {studioExperts.map((e) => (
            <button
              key={e.slug}
              type="button"
              onClick={() => setSlug(e.slug)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                slug === e.slug
                  ? "bg-lime text-on-accent"
                  : "text-text-secondary hover:bg-card"
              )}
            >
              {e.shortName}
              <span className="ml-1.5 hidden font-mono text-[10px] uppercase tracking-wider opacity-70 sm:inline">
                {e.slug === "jimmy-lau" ? "DotAI" : "ekcheungAI"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* key={slug} — 切換專家時重置上載/管線/對話狀態 */}
      <UploadSection key={`up-${slug}`} expert={expert} />
      <ResourcesSection
        expert={expert}
        resources={resByExpert[slug] ?? []}
        setResources={(next) =>
          setResByExpert((m) => ({ ...m, [slug]: next }))
        }
      />
      <PipelineSection key={`pipe-${slug}`} expert={expert} />
      <TestChatSection key={`chat-${slug}`} expert={expert} />

      <p className="flex items-center gap-1.5 pb-2 text-xs text-text-muted">
        <FlaskConical className="h-3.5 w-3.5" />
        蒸餾流程為原型模擬 — Firecrawl / embedding / RAG 由後端接入後取代。
        <MessagesSquare className="ml-2 h-3.5 w-3.5" />
        分身回答為 scripted mock。
      </p>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Download,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import {
  mcpInstances,
  pipelineStatus,
  sourceItems,
  sources,
} from "@/data/admin-mock2";
import type { Source, SourceType } from "@/data/admin-mock2";

const FIELD =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none";

const INDUSTRIES = ["全部", "AI", "科技"] as const;
const STATUS_FILTERS = [
  { key: "全部", label: "全部" },
  { key: "active", label: "啟用" },
  { key: "paused", label: "暫停" },
  { key: "待驗證", label: "待驗證" },
] as const;

function healthDot(health: Source["health"]) {
  if (health === "ok") return "bg-lime";
  if (health === "warn") return "bg-[#A36A0F]";
  return "bg-[#A63A30]";
}

function healthLabel(health: Source["health"]) {
  if (health === "ok") return "正常";
  if (health === "warn") return "注意";
  return "中斷";
}

function typeChip(type: SourceType) {
  if (type === "RSS") return "bg-lime-soft text-lime-text";
  if (type === "API") return "bg-card text-text-secondary";
  return "bg-card text-[#A36A0F]";
}

/** 健康歷史 mini bars — 1 ok / 0.5 warn / 0 fail,舊 → 新 */
function HealthBars({ history, large = false }: { history: number[]; large?: boolean }) {
  return (
    <div className="flex items-end gap-1" aria-label="最近 7 次抓取健康">
      {history.map((v, i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 rounded-sm",
            v === 1 ? "bg-lime" : v === 0.5 ? "bg-[#A36A0F]" : "bg-[#A63A30]"
          )}
          style={{ height: large ? 8 + v * 20 : 6 + v * 14, opacity: 0.45 + (i / history.length) * 0.55 }}
        />
      ))}
    </div>
  );
}

export default function AdminSources() {
  const toast = useAdminToast();

  /* ---- 來源列表 state ---- */
  const [sourceList, setSourceList] = useState<Source[]>(sources);
  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>("全部");
  const [statusFilter, setStatusFilter] = useState<string>("全部");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Source | null>(null);

  /* ---- 新增來源 ---- */
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState<SourceType>("RSS");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIndustry, setNewIndustry] = useState("AI");
  const [newLang, setNewLang] = useState("EN");
  const [newWeight, setNewWeight] = useState(5);
  const [newFreq, setNewFreq] = useState("每 2 小時");

  /* ---- MCP instances ---- */
  const [mcps, setMcps] = useState(mcpInstances);
  const [quotas, setQuotas] = useState<Record<string, string>>(() =>
    Object.fromEntries(mcpInstances.map((m) => [m.id, String(m.freeQuota)]))
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      sourceList.filter((s) => {
        if (industry !== "全部" && s.industry !== industry) return false;
        if (statusFilter !== "全部" && s.status !== statusFilter) return false;
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            s.domain.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [sourceList, industry, statusFilter, query]
  );

  const toggleSource = (s: Source) => {
    if (s.status === "待驗證") return;
    const next = s.status === "active" ? "paused" : "active";
    setSourceList((list) =>
      list.map((it) =>
        it.id === s.id
          ? {
              ...it,
              status: next,
              health: next === "paused" ? "down" : "ok",
              lastFetch: next === "paused" ? it.lastFetch : "剛剛",
            }
          : it
      )
    );
    setDetail((d) =>
      d && d.id === s.id
        ? { ...d, status: next, health: next === "paused" ? "down" : "ok" }
        : d
    );
    toast(
      next === "paused"
        ? `已暫停「${s.name}」(mock)— 下次 cron 會跳過`
        : `已重啟「${s.name}」(mock)— 排入下次抓取`
    );
  };

  const fetchNow = (s: Source) => {
    toast(`已觸發「${s.name}」即時抓取(mock)— 結果約 1 分鐘後入佇列`);
  };

  const deleteSource = (s: Source) => {
    setSourceList((list) => list.filter((it) => it.id !== s.id));
    setDetail(null);
    toast(`已刪除來源「${s.name}」(mock)`);
  };

  const resetAddForm = () => {
    setNewType("RSS");
    setNewName("");
    setNewUrl("");
    setNewIndustry("AI");
    setNewLang("EN");
    setNewWeight(5);
    setNewFreq("每 2 小時");
  };

  const addSource = () => {
    if (!newName.trim() || !newUrl.trim()) {
      toast("請填寫來源名稱與 URL");
      return;
    }
    const domain = newUrl
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    const item: Source = {
      id: `src-new-${Date.now()}`,
      name: newName.trim(),
      domain: domain || newUrl.trim(),
      type: newType,
      industry: newIndustry,
      language: newLang,
      weight: newWeight,
      status: "待驗證",
      health: "warn",
      lastFetch: "未抓取",
      todayItems: 0,
      frequency: newFreq,
      healthHistory: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    };
    setSourceList((list) => [item, ...list]);
    setAddOpen(false);
    resetAddForm();
    toast("已加入 — 下次抓取時驗證");
  };

  const copyEndpoint = async (id: string, endpoint: string) => {
    try {
      await navigator.clipboard.writeText(`https://${endpoint}`);
    } catch {
      /* clipboard 不可用時仍顯示已複製(mock) */
    }
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
    toast("已複製");
  };

  const toggleMcp = (id: string) => {
    const m = mcps.find((x) => x.id === id);
    if (!m || m.planned) return;
    setMcps((list) =>
      list.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x))
    );
    toast(
      m.enabled
        ? `已關閉 ${m.name}(mock)— 外部 agent 連接會收到 503`
        : `已開啟 ${m.name}(mock)— endpoint 即時生效`
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Sources &amp; MCP
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          來源與 MCP 管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          情報管道控制室 — 由來源抓取,到蒸餾,到 Feed / 日報 / MCP 輸出。
        </p>
      </div>

      {/* ==================== 1. Pipeline map ==================== */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {pipelineStatus.map((step, i) => (
            <div
              key={step.key}
              className="relative rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-text-muted">
                  0{i + 1}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium",
                    step.status === "ok"
                      ? "bg-lime-soft text-lime-text"
                      : "bg-card text-[#A36A0F]"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      step.status === "ok" ? "bg-lime" : "bg-[#A36A0F]"
                    )}
                  />
                  {step.status === "ok" ? "正常" : "注意"}
                </span>
              </div>
              <p className="mt-3 font-display text-[18px] font-medium text-text-primary">
                {step.zh}
                <span className="ml-2 font-mono text-[11px] font-normal uppercase tracking-wider text-text-muted">
                  {step.en}
                </span>
              </p>
              <p className="mt-1 font-mono text-[11px] text-text-muted">
                {step.detail}
              </p>
              {i < pipelineStatus.length - 1 && (
                <ArrowRight className="absolute -right-[13px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full border border-border bg-surface p-0.5 text-text-muted lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 2. 來源管理 ==================== */}
      <section className="mb-8 rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-[17px] font-medium text-text-primary">
              來源管理
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              {sourceList.filter((s) => s.status === "active").length} 個啟用
              · {sourceList.filter((s) => s.status === "paused").length} 個暫停
              · {sourceList.filter((s) => s.status === "待驗證").length} 個待驗證
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent hover:bg-lime-hover"
          >
            <Plus className="h-4 w-4" />
            新增來源
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋來源或網域…"
              className="w-52 rounded-md border border-border-strong bg-surface py-1.5 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => setIndustry(ind)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                  industry === ind
                    ? "bg-lime text-on-accent"
                    : "bg-card text-text-secondary hover:text-text-primary"
                )}
              >
                {ind}
              </button>
            ))}
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                  statusFilter === f.key
                    ? "bg-lime text-on-accent"
                    : "bg-card text-text-secondary hover:text-text-primary"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wider text-text-muted">
                <th className="px-5 py-3 font-medium">來源</th>
                <th className="px-3 py-3 font-medium">類型</th>
                <th className="px-3 py-3 font-medium">行業</th>
                <th className="px-3 py-3 font-medium">語言</th>
                <th className="px-3 py-3 font-medium">權重</th>
                <th className="px-3 py-3 font-medium">狀態</th>
                <th className="px-3 py-3 font-medium">健康</th>
                <th className="px-3 py-3 text-right font-medium">今日 items</th>
                <th className="px-5 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setDetail(s)}
                  className="cursor-pointer transition-colors hover:bg-card"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-text-primary">{s.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                      {s.domain}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium",
                        typeChip(s.type)
                      )}
                    >
                      {s.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-text-secondary">{s.industry}</td>
                  <td className="px-3 py-3 font-mono text-xs text-text-secondary">
                    {s.language}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-text-primary">
                    {s.weight}/10
                  </td>
                  <td className="px-3 py-3">
                    {s.status === "待驗證" ? (
                      <span className="rounded-sm bg-card px-2 py-0.5 text-[11px] font-medium text-[#A36A0F]">
                        待驗證
                      </span>
                    ) : (
                      <span
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2"
                      >
                        <AdminToggle
                          checked={s.status === "active"}
                          onChange={() => toggleSource(s)}
                          label={`${s.name} 啟用開關`}
                        />
                        <span className="text-xs text-text-muted">
                          {s.status === "active" ? "啟用" : "暫停"}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn("h-2 w-2 rounded-full", healthDot(s.health))}
                        aria-label={healthLabel(s.health)}
                      />
                      <span className="font-mono text-[11px] text-text-muted">
                        {s.lastFetch}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-text-primary">
                    {s.todayItems}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-label={`立即抓取 ${s.name}`}
                        onClick={() => fetchNow(s)}
                        className="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-border-strong hover:text-text-primary"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`查看 ${s.name} 詳情`}
                        onClick={() => setDetail(s)}
                        className="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-border-strong hover:text-text-primary"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-sm text-text-muted"
                  >
                    冇符合條件嘅來源 — 試下清除篩選。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ==================== 3. MCP servers ==================== */}
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="font-display text-[17px] font-medium text-text-primary">
            MCP servers 管理
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            情報管道嘅對外出口 — 每個行業一個 MCP instance。
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {mcps.map((m) => {
            const maxCalls = Math.max(...m.weeklyCalls, 1);
            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-lg border bg-surface p-5",
                  m.planned ? "border-border opacity-60" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[16px] font-medium text-text-primary">
                      {m.name}
                    </p>
                    <span
                      className={cn(
                        "mt-1.5 inline-block rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium",
                        m.planned
                          ? "bg-card text-text-muted"
                          : "bg-lime-soft text-lime-text"
                      )}
                    >
                      {m.phase}
                    </span>
                  </div>
                  <span onClick={(e) => e.stopPropagation()}>
                    <AdminToggle
                      checked={m.enabled}
                      onChange={() => toggleMcp(m.id)}
                      disabled={m.planned}
                      label={`${m.name} 開關`}
                    />
                  </span>
                </div>

                {/* endpoint + copy */}
                <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-text-secondary">
                    {m.endpoint}
                  </code>
                  <button
                    type="button"
                    disabled={m.planned}
                    onClick={() => copyEndpoint(m.id, m.endpoint)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copiedId === m.id ? (
                      <>
                        <Check className="h-3 w-3 text-lime-text" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        複製
                      </>
                    )}
                  </button>
                </div>

                {/* tools */}
                <ul className="mt-4 space-y-1.5">
                  {m.tools.map((t) => (
                    <li key={t.name} className="flex items-baseline gap-2 text-xs">
                      <code className="shrink-0 rounded-sm bg-card px-1.5 py-0.5 font-mono text-[11px] text-lime-text">
                        {t.name}
                      </code>
                      <span className="text-text-muted">{t.desc}</span>
                    </li>
                  ))}
                </ul>

                {/* quota + usage */}
                <div className="mt-4 flex items-end justify-between gap-4 border-t border-border pt-4">
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-text-muted">
                      免費額度(tokens/日)
                    </span>
                    <input
                      type="number"
                      value={quotas[m.id] ?? ""}
                      disabled={m.planned || !m.enabled}
                      onChange={(e) =>
                        setQuotas((q) => ({ ...q, [m.id]: e.target.value }))
                      }
                      className={cn(
                        "w-28 rounded-md border bg-surface px-2.5 py-1.5 font-mono text-sm focus:outline-none",
                        m.planned || !m.enabled
                          ? "cursor-not-allowed border-border text-text-muted opacity-50"
                          : "border-border-strong text-text-primary focus:border-lime"
                      )}
                    />
                  </label>
                  <div className="text-right">
                    <span className="mb-1 block text-[11px] text-text-muted">
                      使用統計(7 日 calls)
                    </span>
                    <div className="flex items-end justify-end gap-1">
                      {m.weeklyCalls.map((v, i) => (
                        <span
                          key={i}
                          className={cn(
                            "w-2.5 rounded-sm",
                            m.planned ? "bg-border-strong" : "bg-lime"
                          )}
                          style={{
                            height: 6 + (v / maxCalls) * 26,
                            opacity: m.planned ? 0.4 : 0.4 + (i / 7) * 0.6,
                          }}
                          title={`${v} calls`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={m.planned}
                  onClick={() =>
                    toast(`SKILL.md 已開始下載(mock)— ${m.name} 接入指引`)
                  }
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-lime hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  SKILL.md 下載
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-lime/50 bg-lime-soft px-4 py-3">
          <p className="text-xs text-text-secondary">
            外部 agent(Claude Code / Cursor / Kimi)連接呢啲 endpoint
            就可以用自然語言查情報 — 免費額度用盡會導回網站。
          </p>
        </div>
      </section>

      {/* ==================== 4. 輸出預覽 ==================== */}
      <section className="mb-2">
        <div className="mb-3">
          <h2 className="font-display text-[17px] font-medium text-text-primary">
            輸出預覽
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* 即時動態 */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
              即時動態 Feed
            </p>
            <ul className="mt-3 divide-y divide-border">
              <li className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium leading-snug text-text-primary">
                    DeepSeek V4 實測:推理成本再降一半
                  </p>
                  <span className="shrink-0 rounded-sm bg-lime-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-lime-text">
                    95
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-text-muted">
                  量子位 · 今日 09:47
                </p>
              </li>
              <li className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium leading-snug text-text-primary">
                    GPT-5.1 發佈:推理速度提升 40%
                  </p>
                  <span className="shrink-0 rounded-sm bg-lime-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-lime-text">
                    94
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-text-muted">
                  OpenAI Blog · 今日 08:14
                </p>
              </li>
            </ul>
          </div>

          {/* 每日日報 */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
              每日日報 Daily
            </p>
            <div className="mt-3 rounded-md border border-border bg-card p-3">
              <div className="border-b border-border pb-2 text-center">
                <p className="font-display text-[15px] font-medium uppercase tracking-[0.08em] text-text-primary">
                  AIGRO 日報
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                  2026-07-23 · 星期四 · No.128
                </p>
              </div>
              <p className="mt-2 text-[12px] font-medium leading-snug text-text-primary">
                頭條:Kimi K3 開源,長文本再突破
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-text-secondary">
                今日焦點:Veo 4 企業 API · HN 熱議 AI 落地失敗
              </p>
            </div>
          </div>

          {/* MCP response */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
              MCP Response · get_hot
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-[#0D0D0C] p-3 font-mono text-[10.5px] leading-relaxed text-[#C6C1B8]">
{`{
  "tool": "get_hot",
  "date": "2026-07-23",
  "items": [
    { "rank": 1, "score": 95,
      "title": "DeepSeek V4 實測…",
      "source": "量子位" },
    { "rank": 2, "score": 94,
      "title": "GPT-5.1 發佈…",
      "source": "OpenAI Blog" }
  ],
  "quota_left": 6498
}`}
            </pre>
          </div>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          呢三個就係 sources 嘅完成品 — 前台 feed、日報、同對外 MCP。
        </p>
      </section>

      {/* ==================== 來源詳情 slide-over ==================== */}
      <AdminSlideOver
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name}
        subtitle={
          detail ? (
            <span className="font-mono text-xs">{detail.domain}</span>
          ) : undefined
        }
      >
        {detail && (
          <div className="px-6 py-5">
            {/* 來源資訊 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-border bg-card p-4 text-sm">
              <div>
                <p className="text-[11px] text-text-muted">類型</p>
                <p className="mt-0.5">
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium",
                      typeChip(detail.type)
                    )}
                  >
                    {detail.type}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">狀態</p>
                <p className="mt-0.5 text-text-primary">
                  {detail.status === "active"
                    ? "啟用"
                    : detail.status === "paused"
                      ? "暫停"
                      : "待驗證"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">行業</p>
                <p className="mt-0.5 text-text-primary">{detail.industry}</p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">語言</p>
                <p className="mt-0.5 font-mono text-xs text-text-primary">
                  {detail.language}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">權重</p>
                <p className="mt-0.5 font-mono text-xs text-text-primary">
                  {detail.weight}/10
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">更新頻率</p>
                <p className="mt-0.5 text-text-primary">{detail.frequency}</p>
              </div>
            </div>

            {/* 健康歷史 */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  健康歷史(最近 7 次抓取)
                </h3>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
                  <span
                    className={cn("h-2 w-2 rounded-full", healthDot(detail.health))}
                  />
                  {healthLabel(detail.health)} · {detail.lastFetch}
                </span>
              </div>
              <div className="mt-2 rounded-md border border-border bg-card p-3">
                <HealthBars history={detail.healthHistory} large />
                <div className="mt-1.5 flex justify-between font-mono text-[10px] text-text-muted">
                  <span>7 次前</span>
                  <span>最近</span>
                </div>
              </div>
            </div>

            {/* 最近抓取 items */}
            <div className="mt-5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
                最近抓取 items
              </h3>
              {(sourceItems[detail.id] ?? []).length > 0 ? (
                <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card px-3">
                  {(sourceItems[detail.id] ?? []).slice(0, 5).map((item) => (
                    <li key={item.id} className="py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] leading-snug text-text-primary">
                          {item.title}
                        </p>
                        <span className="shrink-0 rounded-sm bg-lime-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-lime-text">
                          {item.score}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-text-muted">
                        {item.time}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-md border border-border bg-card px-3 py-4 text-center text-xs text-text-muted">
                  未有抓取記錄 — 來源待驗證,下次 cron 會試行抓取。
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => fetchNow(detail)}
                className="inline-flex items-center gap-1.5 rounded-md bg-lime px-3.5 py-2 text-sm font-medium text-on-accent hover:bg-lime-hover"
              >
                <RefreshCw className="h-4 w-4" />
                立即抓取
              </button>
              {detail.status !== "待驗證" && (
                <button
                  type="button"
                  onClick={() => toggleSource(detail)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3.5 py-2 text-sm font-medium text-text-secondary hover:border-lime hover:text-text-primary"
                >
                  {detail.status === "active" ? (
                    <>
                      <Pause className="h-4 w-4" />
                      暫停
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      重啟
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => deleteSource(detail)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-[#A63A30] hover:border-[#A63A30]/50"
              >
                <Trash2 className="h-4 w-4" />
                刪除
              </button>
            </div>
          </div>
        )}
      </AdminSlideOver>

      {/* ==================== 新增來源 slide-over ==================== */}
      <AdminSlideOver
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新增來源"
        subtitle="加入後會喺下次抓取時自動驗證。"
      >
        <div className="space-y-5 px-6 py-5">
          <div>
            <span className="mb-1.5 block text-xs text-text-muted">
              來源類型
            </span>
            <div className="flex gap-1.5">
              {(
                [
                  { key: "RSS", label: "RSS" },
                  { key: "API", label: "API endpoint" },
                  { key: "Scraper", label: "Firecrawl 目標" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setNewType(t.key)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                    newType === t.key
                      ? "bg-lime text-on-accent"
                      : "bg-card text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">來源名稱</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例:機器之心"
              className={FIELD}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">
              {newType === "Scraper" ? "目標 URL" : newType === "API" ? "API endpoint" : "Feed URL"}
            </span>
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder={
                newType === "RSS"
                  ? "https://example.com/feed.xml"
                  : newType === "API"
                    ? "https://api.example.com/v1/posts"
                    : "https://example.com/trending"
              }
              className={cn(FIELD, "font-mono text-[13px]")}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">行業</span>
              <select
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                className={FIELD}
              >
                <option>AI</option>
                <option>科技</option>
                <option>Beauty</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">語言</span>
              <select
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
                className={FIELD}
              >
                <option>EN</option>
                <option>繁中</option>
                <option>簡中</option>
              </select>
            </label>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-text-muted">權重</span>
              <span className="font-mono text-xs text-text-primary">
                {newWeight}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={newWeight}
              onChange={(e) => setNewWeight(Number(e.target.value))}
              className="w-full accent-lime"
              aria-label="權重"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              權重越高,蒸餾評分時該來源加權越大。
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">更新頻率</span>
            <select
              value={newFreq}
              onChange={(e) => setNewFreq(e.target.value)}
              className={FIELD}
            >
              <option>每小時</option>
              <option>每 2 小時</option>
              <option>每 4 小時</option>
              <option>每日 2 次</option>
              <option>每日 1 次</option>
            </select>
          </label>

          <div className="flex gap-2 border-t border-border pt-5">
            <button
              type="button"
              onClick={addSource}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-lime-hover"
            >
              <Plus className="h-4 w-4" />
              新增來源
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              取消
            </button>
          </div>
        </div>
      </AdminSlideOver>
    </div>
  );
}

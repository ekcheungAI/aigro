import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Save, Star, X } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import {
  adminCases,
  contentQueue,
  expertPosts,
} from "@/data/admin-mock";
import type { ExpertPost, QueueItem } from "@/data/admin-mock";

type ContentTab = "情報佇列" | "專家文章" | "案例管理";
const TABS: ContentTab[] = ["情報佇列", "專家文章", "案例管理"];

const FIELD =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none";

function statusChip(status: QueueItem["status"] | ExpertPost["status"]) {
  if (status === "已通過" || status === "已發佈")
    return "bg-lime-soft text-lime-text";
  if (status === "已拒絕") return "bg-card text-text-muted line-through";
  return "bg-card text-[#A36A0F]";
}

export default function AdminContent() {
  const toast = useAdminToast();
  const [tab, setTab] = useState<ContentTab>("情報佇列");

  /* ---- 情報佇列 ---- */
  const [queue, setQueue] = useState<QueueItem[]>(contentQueue);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pendingCount = useMemo(
    () => queue.filter((q) => q.status === "待審核").length,
    [queue]
  );

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setStatus = (ids: string[], status: QueueItem["status"]) => {
    setQueue((q) => q.map((item) => (ids.includes(item.id) ? { ...item, status } : item)));
    setSelected(new Set());
    toast(
      status === "已通過"
        ? `已通過 ${ids.length} 條情報(mock)`
        : `已拒絕 ${ids.length} 條情報(mock)`
    );
  };

  const toggleFeatured = (id: string) => {
    const item = queue.find((q) => q.id === id);
    setQueue((q) =>
      q.map((it) => (it.id === id ? { ...it, featured: !it.featured } : it))
    );
    if (item) toast(item.featured ? "已取消精選" : "已標記為精選情報");
  };

  /* ---- 專家文章 ---- */
  const [posts, setPosts] = useState<ExpertPost[]>(expertPosts);
  const [editing, setEditing] = useState<ExpertPost | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openEditor = (post: ExpertPost, isNewPost: boolean) => {
    setEditing({ ...post });
    setIsNew(isNewPost);
  };

  const savePost = () => {
    if (!editing) return;
    if (isNew) {
      setPosts((p) => [editing, ...p]);
      toast(`已新增文章「${editing.title}」(mock)`);
    } else {
      setPosts((p) => p.map((x) => (x.id === editing.id ? editing : x)));
      toast(`已儲存「${editing.title}」(mock)`);
    }
    setEditing(null);
  };

  /* ---- 案例 ---- */
  const [cases, setCases] = useState(adminCases);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Content
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          內容管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          情報審核佇列、專家文章與案例精選。
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "bg-lime text-on-accent"
                : "border border-border bg-surface text-text-secondary hover:border-border-strong"
            )}
          >
            {t}
            {t === "情報佇列" && pendingCount > 0 && (
              <span className="ml-1.5 font-mono text-xs">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ================= 情報佇列 ================= */}
      {tab === "情報佇列" && (
        <div>
          {selected.size > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-lime bg-lime-soft px-3 py-2 text-sm">
              <span className="font-mono text-xs text-lime-text">
                已選 {selected.size} 條
              </span>
              <button
                type="button"
                onClick={() => setStatus([...selected], "已通過")}
                className="ml-auto inline-flex items-center gap-1 rounded-sm bg-lime px-2.5 py-1 text-xs font-medium text-on-accent hover:bg-lime-hover"
              >
                <Check className="h-3 w-3" />
                批次通過
              </button>
              <button
                type="button"
                onClick={() => setStatus([...selected], "已拒絕")}
                className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary hover:border-border-strong"
              >
                <X className="h-3 w-3" />
                批次拒絕
              </button>
            </div>
          )}
          <ul className="space-y-2">
            {queue.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-lg border bg-surface p-4 transition-colors",
                  selected.has(item.id) ? "border-lime" : "border-border",
                  item.status === "已拒絕" && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    aria-label={`選擇 ${item.title}`}
                    className="mt-1 h-4 w-4 accent-[#43F50E]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                        {item.category}
                      </span>
                      <span
                        className={cn(
                          "rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
                          statusChip(item.status)
                        )}
                      >
                        {item.status}
                      </span>
                      {item.featured && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-lime-soft px-1.5 py-0.5 text-[11px] font-medium text-lime-text">
                          <Star className="h-3 w-3 fill-current" />
                          精選
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[11px] text-text-muted">
                        {item.source} · {item.fetchedAt}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-text-primary">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {item.summary}
                    </p>
                    {item.status === "待審核" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStatus([item.id], "已通過")}
                          className="inline-flex items-center gap-1 rounded-md bg-lime px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-lime-hover"
                        >
                          <Check className="h-3 w-3" />
                          通過
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus([item.id], "已拒絕")}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-border-strong"
                        >
                          <X className="h-3 w-3" />
                          拒絕
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFeatured(item.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-lime hover:text-lime-text"
                        >
                          <Star
                            className={cn(
                              "h-3 w-3",
                              item.featured && "fill-current text-lime-text"
                            )}
                          />
                          精選
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ================= 專家文章 ================= */}
      {tab === "專家文章" && (
        <div>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                openEditor(
                  {
                    id: `p-${Date.now()}`,
                    title: "",
                    expert: "Jimmy Lau 劉泰麟",
                    expertSlug: "jimmy-lau",
                    status: "草稿",
                    date: new Date().toISOString().slice(0, 10),
                    summary: "",
                    body: "",
                  },
                  true
                )
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent hover:bg-lime-hover"
            >
              <Plus className="h-4 w-4" />
              新增文章
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="px-4 py-3 font-medium">標題</th>
                  <th className="px-4 py-3 font-medium">專家</th>
                  <th className="px-4 py-3 font-medium">狀態</th>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openEditor(p, false)}
                    className="cursor-pointer transition-colors hover:bg-card/60"
                  >
                    <td className="max-w-[320px] px-4 py-3">
                      <p className="truncate font-medium text-text-primary">{p.title}</p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">{p.summary}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{p.expert}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-sm px-2 py-0.5 text-xs font-medium",
                          statusChip(p.status)
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {p.date}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditor(p, false);
                        }}
                        className="rounded-md border border-border p-1.5 text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
                        aria-label={`編輯 ${p.title}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 案例管理 ================= */}
      {tab === "案例管理" && (
        <ul className="space-y-2">
          {cases.map((c) => (
            <li
              key={c.slug}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <span className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                {c.industry}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{c.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                  /cases/{c.slug} · 刊登 {c.publishedAt}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <Star
                  className={cn(
                    "h-3.5 w-3.5",
                    c.featured ? "fill-current text-lime-text" : "text-text-muted"
                  )}
                />
                精選
                <AdminToggle
                  checked={c.featured}
                  onChange={(v) => {
                    setCases((list) =>
                      list.map((x) => (x.slug === c.slug ? { ...x, featured: v } : x))
                    );
                    toast(v ? `「${c.title.slice(0, 12)}…」已設為精選案例` : "已取消精選");
                  }}
                  label={`精選 ${c.title}`}
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      {/* 文章編輯 drawer */}
      <AdminSlideOver
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={isNew ? "新增專家文章" : "編輯文章"}
        subtitle={editing ? `${editing.expert} · ${editing.status}` : ""}
      >
        {editing && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-5 px-6 py-5">
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">標題</span>
                <input
                  className={FIELD}
                  value={editing.title}
                  placeholder="文章標題"
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">專家</span>
                <select
                  className={FIELD}
                  value={editing.expertSlug}
                  onChange={(e) => {
                    const slug = e.target.value;
                    setEditing({
                      ...editing,
                      expertSlug: slug,
                      expert:
                        slug === "jimmy-lau" ? "Jimmy Lau 劉泰麟" : "Elvin Cheung",
                    });
                  }}
                >
                  <option value="jimmy-lau">Jimmy Lau 劉泰麟</option>
                  <option value="elvin-cheung">Elvin Cheung</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">摘要</span>
                <textarea
                  className={cn(FIELD, "min-h-[72px] resize-y")}
                  value={editing.summary}
                  placeholder="一句摘要,顯示於列表"
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">正文</span>
                <textarea
                  className={cn(FIELD, "min-h-[200px] resize-y leading-relaxed")}
                  value={editing.body}
                  placeholder="文章正文…"
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                />
              </label>
              <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">發佈狀態</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {editing.status === "已發佈" ? "對外公開" : "草稿 — 僅後台可見"}
                  </p>
                </div>
                <AdminToggle
                  checked={editing.status === "已發佈"}
                  onChange={(v) =>
                    setEditing({ ...editing, status: v ? "已發佈" : "草稿" })
                  }
                  label="發佈狀態"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:border-border-strong"
              >
                取消
              </button>
              <button
                type="button"
                onClick={savePost}
                disabled={!editing.title.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent hover:bg-lime-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                儲存
              </button>
            </div>
          </div>
        )}
      </AdminSlideOver>
    </div>
  );
}

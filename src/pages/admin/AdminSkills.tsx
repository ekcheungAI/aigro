import { useState } from "react";
import { ExternalLink, Info, Pencil, Plus, Save, Trash2 } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import { SKILL_TAGS, skills } from "@/data/skills";
import type { SkillTag } from "@/data/skills";

type AdminSkillStatus = "已發佈" | "草稿" | "優先名單";

interface AdminSkillRow {
  id: string;
  name: string;
  value: string;
  tags: SkillTag[];
  install: string;
  url: string;
  status: AdminSkillStatus;
}

const FIELD =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none";

/* 後台 mock:由 src/data/skills.ts 嘅目錄數據複製一份,修改唔會寫返前台 */
const initialRows: AdminSkillRow[] = skills.map((s) => ({
  id: s.id,
  name: s.name,
  value: s.value,
  tags: s.tags,
  install: s.install,
  url: s.url,
  status: s.status === "優先名單" ? "優先名單" : "已發佈",
}));

function statusChip(status: AdminSkillStatus) {
  if (status === "已發佈") return "bg-lime-soft text-lime-text";
  if (status === "優先名單") return "bg-card text-[#A36A0F]";
  return "bg-card text-text-muted";
}

function emptyRow(): AdminSkillRow {
  return {
    id: `sk-${Date.now()}`,
    name: "",
    value: "",
    tags: [],
    install: "",
    url: "",
    status: "草稿",
  };
}

export default function AdminSkills() {
  const toast = useAdminToast();
  const [rows, setRows] = useState<AdminSkillRow[]>(initialRows);
  const [editing, setEditing] = useState<AdminSkillRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openEditor = (row: AdminSkillRow, isNewRow: boolean) => {
    setEditing({ ...row, tags: [...row.tags] });
    setIsNew(isNewRow);
  };

  const toggleEditTag = (t: SkillTag) => {
    if (!editing) return;
    setEditing({
      ...editing,
      tags: editing.tags.includes(t)
        ? editing.tags.filter((x) => x !== t)
        : [...editing.tags, t],
    });
  };

  const save = () => {
    if (!editing) return;
    if (isNew) {
      setRows((r) => [editing, ...r]);
      toast(`已新增技能「${editing.name}」(mock)`);
    } else {
      setRows((r) => r.map((x) => (x.id === editing.id ? editing : x)));
      toast(`已儲存「${editing.name}」(mock)`);
    }
    setEditing(null);
  };

  const toggleListed = (row: AdminSkillRow, v: boolean) => {
    const next: AdminSkillStatus = v ? "已發佈" : "草稿";
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, status: next } : x)));
    toast(
      v
        ? `「${row.name}」已上架,前台目錄可見(mock)`
        : `「${row.name}」已下架為草稿(mock)`
    );
  };

  const remove = (row: AdminSkillRow) => {
    setRows((r) => r.filter((x) => x.id !== row.id));
    toast(`已刪除「${row.name}」(mock)`);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Skills
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          技能管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          /skills 目錄嘅技能列表 — 新增、編輯、上下架同刪除。
        </p>
      </div>

      {/* 數據源提示 */}
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-lime-text" />
        <p className="text-xs leading-relaxed text-text-secondary">
          前台 /skills 目錄由{" "}
          <code className="font-mono text-[11px] text-text-primary">
            src/data/skills.ts
          </code>{" "}
          驅動 — 後台接入 Supabase 後,呢度嘅修改會即時同步。
        </p>
      </div>

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => openEditor(emptyRow(), true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent hover:bg-lime-hover"
        >
          <Plus className="h-4 w-4" />
          新增技能
        </button>
      </div>

      {/* 技能表格 */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted">
              <th className="px-4 py-3 font-medium">名稱</th>
              <th className="px-4 py-3 font-medium">標籤</th>
              <th className="px-4 py-3 font-medium">狀態</th>
              <th className="px-4 py-3 font-medium">安裝指令</th>
              <th className="px-4 py-3 font-medium">來源</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-card/60">
                <td className="max-w-[260px] px-4 py-3">
                  <p className="truncate font-medium text-text-primary">{s.name}</p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">{s.value}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 text-xs font-medium",
                      statusChip(s.status)
                    )}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  <code className="block truncate font-mono text-[11px] text-text-secondary">
                    {s.install}
                  </code>
                </td>
                <td className="px-4 py-3">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-lime-text"
                    >
                      來源
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-text-muted">未公開</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditor(s, false)}
                      className="rounded-md border border-border p-1.5 text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
                      aria-label={`編輯 ${s.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <AdminToggle
                      checked={s.status === "已發佈"}
                      onChange={(v) => toggleListed(s, v)}
                      label={`上架 / 下架 ${s.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => remove(s)}
                      className="rounded-md border border-border p-1.5 text-text-secondary transition-colors hover:border-[#C23B22] hover:text-[#C23B22]"
                      aria-label={`刪除 ${s.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-text-muted">
                  冇技能 — 撳「新增技能」建立第一個。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 編輯 drawer */}
      <AdminSlideOver
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={isNew ? "新增技能" : "編輯技能"}
        subtitle={editing ? editing.status : ""}
      >
        {editing && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-5 px-6 py-5">
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">名稱</span>
                <input
                  className={FIELD}
                  value={editing.name}
                  placeholder="技能名稱"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">一句價值</span>
                <textarea
                  className={cn(FIELD, "min-h-[72px] resize-y")}
                  value={editing.value}
                  placeholder="一句講清楚呢個 skill 嘅價值"
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                />
              </label>
              <div>
                <span className="mb-1 block text-xs text-text-muted">標籤(可多選)</span>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleEditTag(t)}
                      aria-pressed={editing.tags.includes(t)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        editing.tags.includes(t)
                          ? "bg-lime text-on-accent"
                          : "border border-border bg-surface text-text-secondary hover:border-border-strong"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">安裝指令</span>
                <input
                  className={cn(FIELD, "font-mono text-[13px]")}
                  value={editing.install}
                  placeholder="npx skills add owner/repo"
                  onChange={(e) => setEditing({ ...editing, install: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">來源 URL</span>
                <input
                  className={cn(FIELD, "font-mono text-[13px]")}
                  value={editing.url}
                  placeholder="https://github.com/owner/repo(可留空)"
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">狀態</span>
                <select
                  className={FIELD}
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as AdminSkillStatus,
                    })
                  }
                >
                  <option value="已發佈">已發佈</option>
                  <option value="草稿">草稿</option>
                  <option value="優先名單">優先名單</option>
                </select>
              </label>
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
                onClick={save}
                disabled={!editing.name.trim() || !editing.install.trim()}
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

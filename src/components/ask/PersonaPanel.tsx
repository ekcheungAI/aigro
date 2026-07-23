import { MessageSquarePlus, Sparkles } from "lucide-react";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import QuotaMeter from "@/components/ask/QuotaMeter";
import type { ChatSession } from "@/components/ask/sessions";
import { expertHasPhoto } from "@/data/experts";
import type { Persona } from "@/data/personas";
import { personaInitials } from "@/data/personas";
import { cn } from "@/lib/utils";

interface PersonaPanelProps {
  personas: Persona[];
  activePersona: Persona;
  onSelectPersona: (key: string) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (sameDay) return hm;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

/**
 * Ask 左欄 — 分身選擇(radio-style)+ 對話紀錄 + 額度 meter。
 * Panel header hairline 用當前分身 accent 色。
 */
export default function PersonaPanel({
  personas,
  activePersona,
  onSelectPersona,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
}: PersonaPanelProps) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-surface">
      {/* 分身選擇 */}
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-overline text-text-muted">分身選擇</p>
          <span
            aria-hidden="true"
            className="h-px w-10 transition-colors duration-200"
            style={{ backgroundColor: activePersona.accent }}
          />
        </div>
        <div className="mt-3 flex flex-col gap-1" role="radiogroup" aria-label="選擇 AI 分身">
          {personas.map((p) => {
            const active = p.key === activePersona.key;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelectPersona(p.key)}
                className={cn(
                  "press flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors duration-150",
                  active
                    ? "border-border-strong bg-card"
                    : "border-transparent hover:bg-card"
                )}
              >
                {p.kind === "platform" ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-soft">
                    <Sparkles className="h-3.5 w-3.5 text-ink" strokeWidth={1.5} />
                  </span>
                ) : p.expert && expertHasPhoto(p.expert) ? (
                  <PhotoAvatar src={p.expert.image} alt={p.name} size={28} />
                ) : (
                  <MonogramAvatar
                    initials={personaInitials(p)}
                    color={p.accent}
                    size={28}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="truncate text-label text-text-primary">{p.name}</span>
                    {p.kind === "expert" && <VerifiedBadge size={16} />}
                  </span>
                  <span className="block truncate text-caption text-text-muted">
                    {p.domainCaption}
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-text-secondary">
                    {p.signature}
                  </span>
                </span>
                {/* radio 指示點 */}
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border transition-colors duration-150"
                  style={{
                    borderColor: active ? p.accent : "hsl(var(--border-strong))",
                  }}
                >
                  {active && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: p.accent }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 對話紀錄 */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-border px-4 pb-3 pt-3">
        <div className="flex shrink-0 items-center justify-between">
          <p className="text-overline text-text-muted">對話紀錄</p>
          <button
            type="button"
            onClick={onNewSession}
            className="press inline-flex items-center gap-1 rounded-sm border border-border-strong px-2 py-1 text-caption text-ink transition-colors duration-150 hover:bg-ink-soft"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            新對話
          </button>
        </div>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
          {sessions.length === 0 ? (
            <p className="pt-2 text-caption text-text-muted">
              呢個分身暫時未有對話 — 送出第一條問題就會自動記低。
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5 pb-2">
              {sessions.map((s) => {
                const active = s.id === activeSessionId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onSelectSession(s.id)}
                      aria-current={active}
                      className={cn(
                        "press flex w-full flex-col gap-0.5 rounded-md border-l-2 px-2.5 py-2 text-left transition-colors duration-150",
                        active ? "bg-card" : "border-transparent hover:bg-card"
                      )}
                      style={
                        active
                          ? { borderLeftColor: activePersona.accent }
                          : undefined
                      }
                    >
                      <span className="w-full truncate text-caption text-text-primary">
                        {s.title}
                      </span>
                      <span className="text-caption text-text-muted">
                        {formatTimestamp(s.updatedAt)}・{s.messages.filter((m) => m.role === "user").length} 條問題
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* 額度 meter */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <QuotaMeter variant="panel" />
      </div>
    </aside>
  );
}

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { Persona } from "@/data/personas";
import { lastUserQuestion } from "@/components/ask/sessions";
import { useMember } from "@/hooks/useMember";
import { ensureAuthenticatedUser, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Slot {
  starts_at: string;
  ends_at: string;
}

function slotLabel(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

/** Real 45-minute instructor booking. The create_booking RPC is the final
 * authority for VIP entitlement, availability, monthly quota and conflicts. */
export default function ClubBookingCapture({
  persona,
  idPrefix,
  className,
  onSubmitted,
}: {
  persona: Persona;
  idPrefix: string;
  className?: string;
  onSubmitted?: () => void;
}) {
  const { member } = useMember();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!supabase || persona.kind !== "expert") {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        await ensureAuthenticatedUser();
        const today = new Date();
        const until = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const { data, error: slotError } = await supabase.rpc("list_available_slots", {
          p_expert_slug: persona.key,
          p_from_date: today.toISOString().slice(0, 10),
          p_to_date: until.toISOString().slice(0, 10),
        });
        if (slotError) throw slotError;
        if (!cancelled) setSlots((data ?? []) as Slot[]);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "未能載入時段");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [persona.key, persona.kind]);

  const visibleSlots = useMemo(() => slots.slice(0, 12), [slots]);
  const requestBooking = async () => {
    if (!supabase || !selected || saving) return;
    setSaving(true);
    setError(null);
    const { error: bookingError } = await supabase.rpc("create_booking", {
      p_expert_slug: persona.key,
      p_starts_at: selected,
      p_source_conversation_id: null,
      p_source_question: lastUserQuestion(persona.key),
      p_member_note: null,
    });
    setSaving(false);
    if (bookingError) {
      const labels: Record<string, string> = {
        vip_required: "真人預約係 VIP 會員權益。",
        monthly_entitlement_used: "你今個月嘅包括預約已經使用。",
        slot_taken: "呢個時段啱啱被預約，請揀另一個。",
        booking_unavailable: "導師目前未開放預約。",
      };
      const key = Object.keys(labels).find((item) => bookingError.message.includes(item));
      setError(key ? labels[key] : bookingError.message);
      return;
    }
    setDone(true);
    window.setTimeout(() => onSubmitted?.(), 900);
  };

  if (done) {
    return (
      <p className={cn("flex items-center gap-2 rounded-sm border bg-surface px-3 py-3 text-sm text-lime-text", className)}>
        <Check className="h-4 w-4" strokeWidth={1.5} /> 預約申請已送出，等導師確認。
      </p>
    );
  }

  return (
    <div className={cn("rounded-sm border bg-surface px-3 py-3", className)}>
      <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <CalendarDays className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
        預約 {persona.shortName} 真人時段
      </p>
      <p className="mt-1 text-caption text-text-muted">45 分鐘 · 香港時間 · 導師確認後提供會面連結</p>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-text-muted">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> 載入時段…
        </p>
      ) : visibleSlots.length > 0 ? (
        <div className="mt-3 grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto" id={`${idPrefix}-slots`}>
          {visibleSlots.map((slot) => (
            <button
              key={slot.starts_at}
              type="button"
              onClick={() => setSelected(slot.starts_at)}
              className={cn(
                "press rounded-sm border px-2 py-2 text-left text-[11px] transition-colors",
                selected === slot.starts_at
                  ? "border-lime bg-lime-soft text-lime-text"
                  : "border-border text-text-secondary"
              )}
            >
              {slotLabel(slot.starts_at)}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-text-muted">未有可預約時段，請稍後再睇。</p>
      )}

      {member?.tier !== "vip" && (
        <p className="mt-3 text-caption text-text-muted">
          預約包含喺 VIP 方案。<Link to="/pricing" className="text-lime-text underline-offset-2 hover:underline">查看方案</Link>
        </p>
      )}
      {error && <p role="alert" className="mt-2 text-caption text-error">{error}</p>}
      <button
        type="button"
        disabled={!selected || saving}
        onClick={() => void requestBooking()}
        className="press mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-ink-solid px-3 text-caption text-on-accent disabled:pointer-events-none disabled:opacity-40"
      >
        {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
        送出預約申請
      </button>
    </div>
  );
}

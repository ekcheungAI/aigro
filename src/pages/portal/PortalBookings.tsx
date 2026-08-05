import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, Check, Clock3, Plus, X } from "lucide-react";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminQuery } from "@/components/admin/adminData";
import QueryState from "@/components/QueryState";
import { supabase } from "@/lib/supabase";

interface BookingRow {
  id: string;
  member_id: string;
  source_question: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  meeting_url: string | null;
  member_note: string | null;
  expert_note: string | null;
}

interface RuleRow {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  active: boolean;
}

interface BookingData {
  expertId: string;
  bookings: BookingRow[];
  rules: RuleRow[];
}

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function hkDate(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

async function fetchBookings(slug: string): Promise<BookingData> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data: expert, error: expertError } = await supabase.from("experts")
    .select("id").eq("slug", slug).single();
  if (expertError || !expert) throw new Error(expertError?.message ?? "專家身份未建立");
  const [bookings, rules] = await Promise.all([
    supabase.from("bookings")
      .select("id,member_id,source_question,starts_at,ends_at,status,meeting_url,member_note,expert_note")
      .eq("expert_id", expert.id)
      .order("starts_at", { ascending: true }),
    supabase.from("availability_rules")
      .select("id,weekday,start_time,end_time,slot_minutes,active")
      .eq("expert_id", expert.id)
      .order("weekday"),
  ]);
  if (bookings.error) throw new Error(bookings.error.message);
  if (rules.error) throw new Error(rules.error.message);
  return {
    expertId: expert.id,
    bookings: (bookings.data ?? []) as BookingRow[],
    rules: (rules.data ?? []) as RuleRow[],
  };
}

export default function PortalBookings() {
  const { slug } = usePortalExpert();
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(() => fetchBookings(slug), [slug]);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("17:00");
  const [busy, setBusy] = useState<string | null>(null);
  const [meetingUrls, setMeetingUrls] = useState<Record<string, string>>({});
  const [renderedAt] = useState(() => Date.now());
  const upcoming = useMemo(
    () => (data?.bookings ?? []).filter((booking) => new Date(booking.ends_at).getTime() >= renderedAt),
    [data, renderedAt]
  );

  const addRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !data || startTime >= endTime) return;
    setBusy("rule");
    const { error: insertError } = await supabase.from("availability_rules").insert({
      expert_id: data.expertId,
      weekday,
      start_time: startTime,
      end_time: endTime,
      timezone: "Asia/Hong_Kong",
      slot_minutes: 45,
      active: true,
    });
    setBusy(null);
    if (insertError) toast(`新增時段失敗：${insertError.message}`);
    else { toast("每週可預約時段已加入"); refetch(); }
  };

  const removeRule = async (id: string) => {
    if (!supabase) return;
    setBusy(id);
    const { error: deleteError } = await supabase.from("availability_rules").delete().eq("id", id);
    setBusy(null);
    if (deleteError) toast(`移除失敗：${deleteError.message}`);
    else refetch();
  };

  const updateBooking = async (booking: BookingRow, status: string) => {
    if (!supabase) return;
    setBusy(booking.id);
    const { error: updateError } = await supabase.rpc("update_booking_status", {
      p_booking_id: booking.id,
      p_status: status,
      p_meeting_url: meetingUrls[booking.id] || booking.meeting_url,
      p_expert_note: booking.expert_note,
    });
    setBusy(null);
    if (updateError) toast(`預約更新失敗：${updateError.message}`);
    else { toast("預約狀態已更新"); refetch(); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">Bookings</p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">真人預約</h1>
        <p className="mt-1 text-sm text-text-muted">設定香港時間可用時段，確認會員申請同提供會面連結。</p>
      </div>

      <QueryState loading={loading} error={error ? `載入失敗：${error}` : null} retry={refetch}>
        {data && (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
                <h2 className="font-display text-lg text-text-primary">每週可用時間</h2>
              </div>
              <form onSubmit={(event) => void addRule(event)} className="mt-4 space-y-3">
                <select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary">
                  {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary" aria-label="開始時間" />
                  <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary" aria-label="結束時間" />
                </div>
                <button type="submit" disabled={busy === "rule" || startTime >= endTime} className="press inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime px-3 py-2 text-sm font-medium text-on-accent disabled:opacity-40">
                  <Plus className="h-4 w-4" /> 加入 45 分鐘時段
                </button>
              </form>
              <div className="mt-5 space-y-2 border-t border-border pt-4">
                {data.rules.length === 0 && <p className="text-xs text-text-muted">未設定可預約時間。</p>}
                {data.rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2">
                    <p className="text-xs text-text-secondary">{WEEKDAYS[rule.weekday]} · {rule.start_time.slice(0, 5)}–{rule.end_time.slice(0, 5)}</p>
                    <button type="button" disabled={busy === rule.id} onClick={() => void removeRule(rule.id)} aria-label="移除時段" className="press text-text-muted hover:text-text-primary disabled:opacity-40"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
                  <h2 className="font-display text-lg text-text-primary">預約申請</h2>
                </div>
                <span className="font-mono text-xs text-text-muted">{upcoming.length} upcoming</span>
              </div>
              <div className="mt-4 space-y-3">
                {upcoming.length === 0 && <p className="text-xs text-text-muted">暫時冇即將進行嘅預約。</p>}
                {upcoming.map((booking) => (
                  <article key={booking.id} className="rounded-md border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{hkDate(booking.starts_at)}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">{booking.status} · member {booking.member_id.slice(0, 8)}</p>
                      </div>
                      {booking.status === "confirmed" && <span className="inline-flex items-center gap-1 text-xs text-lime-text"><Check className="h-3.5 w-3.5" /> 已確認</span>}
                    </div>
                    {booking.source_question && <p className="mt-3 rounded-md bg-surface px-3 py-2 text-xs leading-relaxed text-text-secondary">「{booking.source_question}」</p>}
                    {booking.status === "requested" && (
                      <div className="mt-3 space-y-2">
                        <input type="url" value={meetingUrls[booking.id] ?? booking.meeting_url ?? ""} onChange={(event) => setMeetingUrls((current) => ({ ...current, [booking.id]: event.target.value }))} placeholder="https:// 會面連結（確認時必填）" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary" />
                        <div className="flex gap-2">
                          <button type="button" disabled={busy === booking.id} onClick={() => void updateBooking(booking, "confirmed")} className="press inline-flex items-center gap-1 rounded-md bg-lime px-3 py-1.5 text-xs font-medium text-on-accent disabled:opacity-40"><Check className="h-3.5 w-3.5" /> 確認</button>
                          <button type="button" disabled={busy === booking.id} onClick={() => void updateBooking(booking, "declined")} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40"><X className="h-3.5 w-3.5" /> 拒絕</button>
                        </div>
                      </div>
                    )}
                    {booking.status === "confirmed" && booking.meeting_url && <a href={booking.meeting_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-lime-text underline-offset-2 hover:underline">打開會面連結</a>}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </QueryState>
    </div>
  );
}

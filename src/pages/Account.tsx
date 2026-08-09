import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Lock,
  LogOut,
  MailCheck,
  MessageSquare,
  PenLine,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Toast, { useToast } from "@/components/auth/Toast";
import QueryState from "@/components/QueryState";
import ProfileEditor from "@/components/auth/ProfileEditor";
import useMember from "@/hooks/useMember";
import {
  clearMember,
  adminEntryPath,
  greeting,
  hasFullPlatformAccess,
  isFoundingTier,
  memberInitial,
  milestonesFor,
  profileCompletion,
  referralLabel,
  ROLE_LABELS,
  saveMember,
  teamSizeLabel,
  TIER_LABEL,
  unlockedMilestones,
} from "@/components/auth/member";
import type { AigroMember, MemberRole } from "@/components/auth/member";
import { loadSessionStore } from "@/components/ask/sessions";
import { getPersona } from "@/data/personas";
import { ensureAuthenticatedUser, supabase, supabaseReady } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const MCP_KEY = "aigro-mcp-signup";

interface SessionRow {
  key: string;
  personaName: string;
  id: string;
  title: string;
  updatedAt: number;
  to: string;
}

interface MemberBookingRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  meeting_url: string | null;
  experts: { display_name: string; slug: string } | null;
}

interface AvailableSlot {
  starts_at: string;
  ends_at: string;
}

interface ExpertInvitationRow {
  id: string;
  expert_id: string;
  expert_name: string;
  expert_slug: string;
  expires_at: string;
}

function bookingTime(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

/** 跨分身合併 sessions,按 updatedAt 倒序 */
function collectSessions(): SessionRow[] {
  const store = loadSessionStore();
  const rows: SessionRow[] = [];
  for (const [key, list] of Object.entries(store.sessions)) {
    const persona = getPersona(key === "platform" ? null : key);
    for (const s of list) {
      rows.push({
        key,
        personaName: persona.shortName,
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        to: key === "platform" ? "/ask" : `/ask?expert=${key}`,
      });
    }
  }
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-HK", {
    month: "short",
    day: "numeric",
  });
}

/**
 * 角色 chip(4 級制度)— founding = lime;expert = VerifiedBadge 同族
 * (near-black disc + 1.5px lime ring);admin = 深色;free = 髮絲邊框。
 */
function RoleChip({ role }: { role: MemberRole }) {
  if (role === "expert") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-caption"
        style={{
          boxShadow: "inset 0 0 0 1.5px hsl(var(--lime))",
          backgroundColor: "hsl(var(--on-accent))",
          color: "hsl(45 29% 97%)",
        }}
      >
        {ROLE_LABELS.expert}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption",
        role === "founding" && "bg-lime text-on-accent",
        (role === "admin" || role === "super_admin") && "bg-ink-solid text-on-accent",
        role === "free" && "border border-border-strong text-text-muted"
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

/** 檔案欄位總覽(完成度卡)— 空值顯示「未填寫」一 click 編輯 anchor */
const PROFILE_ROWS: {
  key: string;
  label: string;
  value: (m: AigroMember) => string | null;
}[] = [
  { key: "company", label: "公司/團隊", value: (m) => m.company ?? null },
  { key: "roleTitle", label: "職位", value: (m) => m.roleTitle ?? null },
  {
    key: "teamSize",
    label: "團隊規模",
    value: (m) => (m.teamSize ? teamSizeLabel(m.teamSize) : null),
  },
  { key: "city", label: "城市", value: (m) => m.city ?? null },
  {
    key: "goals",
    label: "想達成嘅目標",
    value: (m) => (m.goals && m.goals.length > 0 ? m.goals.join("、") : null),
  },
  { key: "social", label: "主要社交平台", value: (m) => m.social ?? null },
  {
    key: "referral",
    label: "點知我哋",
    value: (m) => (m.referral ? referralLabel(m.referral) : null),
  },
];

/**
 * Account `/account` — 會員專區(示範模式)。
 * 問候 + 方案卡(升級 CTA → /pricing)+ 檔案完成度(里程碑解鎖 +
 * 完善檔案 inline editor)+ 用量統計 + 我的對話
 * (讀 aigro-ask-sessions-v1)+ 設定(email 通知 toggles + 登出)。
 * 未登入 → 引導去 /login /join。
 */
export default function Account() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduced = useReducedMotion();
  const { toast, showToast } = useToast();
  // 會員態 — useMember 響應式(saveMember/clearMember 廣播即時更新)
  const { member } = useMember();
  const [editing, setEditing] = useState(false);
  const [bookings, setBookings] = useState<MemberBookingRow[]>([]);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingBusy, setBookingBusy] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [expertInvitations, setExpertInvitations] = useState<ExpertInvitationRow[]>([]);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [invitationBusy, setInvitationBusy] = useState<string | null>(null);
  const sessions = useMemo(collectSessions, []);
  const mcpSignedUp = useMemo(() => {
    try {
      return window.localStorage.getItem(MCP_KEY) !== null;
    } catch {
      return false;
    }
  }, []);

  const loadBookings = async () => {
    if (!supabase || !member) return;
    try {
      const uid = await ensureAuthenticatedUser();
      if (!uid) return;
      const { data, error } = await supabase.from("bookings")
        .select("id,starts_at,ends_at,status,meeting_url,experts(display_name,slug)")
        .eq("member_id", uid)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      setBookings((data ?? []) as unknown as MemberBookingRow[]);
      setBookingsError(null);
    } catch (caught) {
      setBookingsError(caught instanceof Error ? caught.message : "未能載入預約");
    }
  };

  useEffect(() => {
    void loadBookings();
    // member identity is the relevant subscription boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.email]);

  useEffect(() => {
    if (!supabase || !member) return;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user || sessionData.session.user.is_anonymous) return;
      const { data, error } = await supabase.rpc("list_my_expert_invitations");
      if (error) {
        setInvitationError(error.message);
        return;
      }
      setExpertInvitations((data ?? []) as ExpertInvitationRow[]);
      setInvitationError(null);
    })();
  }, [member]);

  const acceptExpertInvitation = async (invitationId: string) => {
    if (!supabase || invitationBusy) return;
    setInvitationBusy(invitationId);
    const { error } = await supabase.rpc("accept_expert_invitation", {
      p_invitation_id: invitationId,
    });
    setInvitationBusy(null);
    if (error) {
      setInvitationError(error.message);
      showToast(`接受邀請失敗：${error.message}`);
      return;
    }
    showToast("導師邀請已接受，正在開啟你嘅專家 CRM");
    window.setTimeout(() => window.location.assign("/portal"), 600);
  };

  const cancelBooking = async (id: string) => {
    if (!supabase) return;
    setBookingBusy(id);
    const { error } = await supabase.rpc("cancel_booking", { p_booking_id: id });
    setBookingBusy(null);
    if (error) {
      showToast(error.message.includes("cancellation_window_closed")
        ? "距離預約少於 48 小時，請直接聯絡導師。"
        : `取消失敗：${error.message}`);
    } else {
      showToast("預約已取消");
      void loadBookings();
    }
  };

  const openReschedule = async (booking: MemberBookingRow) => {
    if (!supabase || !booking.experts?.slug) return;
    setBookingBusy(booking.id);
    const { data, error } = await supabase.rpc("list_available_slots", {
      p_expert_slug: booking.experts.slug,
      p_from_date: new Date().toISOString().slice(0, 10),
      p_to_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    setBookingBusy(null);
    if (error) {
      showToast(`未能載入時段：${error.message}`);
      return;
    }
    setRescheduleSlots((data ?? []) as AvailableSlot[]);
    setRescheduleId(booking.id);
  };

  const rescheduleBooking = async (id: string, startsAt: string) => {
    if (!supabase) return;
    setBookingBusy(id);
    const { error } = await supabase.rpc("reschedule_booking", {
      p_booking_id: id,
      p_starts_at: startsAt,
    });
    setBookingBusy(null);
    if (error) {
      showToast(error.message.includes("reschedule_window_closed")
        ? "距離原預約少於 48 小時，請直接聯絡導師。"
        : `改期失敗：${error.message}`);
      return;
    }
    setRescheduleId(null);
    setRescheduleSlots([]);
    showToast("已送出新時段，等候導師重新確認");
    void loadBookings();
  };

  /* ---------------- 未登入態 ---------------- */
  if (!member) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-6 py-24 text-center md:py-32">
        <h1 className="font-display text-h2 text-text-primary">會員專區</h1>
        <p className="mt-3 max-w-md text-body-sm text-text-secondary">
          你未登入。登入或加入 Club,先可以管理你嘅對話、收藏與通知設定。
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            to="/login"
            className="press inline-flex h-12 items-center rounded-md border border-border-strong px-6 text-label text-text-primary hover:border-ink hover:text-ink"
          >
            登入
          </Link>
          <Link
            to="/join"
            className="press inline-flex h-12 items-center rounded-md bg-lime px-6 text-label text-on-accent hover:bg-lime-hover"
          >
            加入 Club
          </Link>
        </div>
      </div>
    );
  }

  const toggleNotification = (key: keyof AigroMember["notifications"]) => {
    const next: AigroMember = {
      ...member,
      notifications: { ...member.notifications, [key]: !member.notifications[key] },
    };
    saveMember(next); // 廣播 → useMember 自動更新
  };

  const logout = () => {
    clearMember();
    showToast("已登出");
    window.setTimeout(() => navigate("/"), 700);
  };

  /** 完善檔案儲存:persist + 重算完成度,新解鎖里程碑逐一 toast */
  const handleProfileSave = (next: AigroMember) => {
    const before = new Set(unlockedMilestones(member).map((ms) => ms.title));
    saveMember(next); // 廣播 → useMember 自動更新
    setEditing(false);
    const newly = unlockedMilestones(next).filter((ms) => !before.has(ms.title));
    showToast("檔案已儲存");
    newly.forEach((ms, i) => {
      window.setTimeout(
        () => showToast(`已解鎖:${ms.title}`),
        1800 * (i + 1)
      );
    });
  };

  const completion = profileCompletion(member);
  const founding = isFoundingTier(member);
  const fullPlatformAccess = hasFullPlatformAccess(member);
  const masterAdminPath = adminEntryPath(member);
  const milestones = milestonesFor(member);

  const stats = [
    { label: "對話數", value: String(sessions.length) },
    { label: "收藏情報", value: "0", note: "即將開放" },
    mcpSignedUp
      ? { label: "MCP 名單狀態", value: "已登記 AI 情報 ✓" }
      : { label: "MCP 名單狀態", value: "未登記", note: "去 /developers 登記" },
  ];

  const NOTIFICATION_ROWS: { key: keyof AigroMember["notifications"]; label: string; desc: string }[] = [
    { key: "daily", label: "每日情報摘要", desc: "每日 5 條精選,朝早 8 點送上" },
    { key: "weekly", label: "每週精選 Newsletter", desc: "編輯部一週深度回顧" },
    { key: "product", label: "產品更新", desc: "新功能與 MCP Network 動向" },
  ];

  return (
    <div className="mx-auto max-w-container px-6 py-16 md:py-20">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* ---- 問候 ---- */}
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-lime-soft font-display text-[22px] font-medium text-ink"
          >
            {memberInitial(member.name)}
          </span>
          <div>
            <h1 className="font-display text-h2 text-text-primary">
              {member.name},{greeting()}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-body-sm text-text-muted">{member.email}</p>
              <RoleChip role={member.role} />
            </div>
          </div>
        </div>

        {(expertInvitations.length > 0 || invitationError) && (
          <section className="mt-8 rounded-md border border-lime/50 bg-lime-soft p-5">
            <p className="flex items-center gap-2 text-label text-text-primary">
              <MailCheck className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
              領航導師邀請
            </p>
            {invitationError && (
              <p className="mt-2 text-caption text-error">{invitationError}</p>
            )}
            <div className="mt-3 space-y-3">
              {expertInvitations.map((invitation) => {
                const linked = searchParams.get("expert_invitation") === invitation.id;
                return (
                  <div
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {invitation.expert_name}
                        {linked && <span className="ml-2 text-xs text-lime-text">電郵連結已核對</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        接受後會取得 {invitation.expert_slug} 專屬 Portal、CMS、CRM 同預約管理權限。
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={invitationBusy !== null}
                      onClick={() => void acceptExpertInvitation(invitation.id)}
                      className="press rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {invitationBusy === invitation.id ? "接受中…" : "接受邀請"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---- 方案卡 ---- */}
        <section className="mt-10 flex flex-col gap-4 rounded-md border bg-surface p-6 sm:flex-row sm:items-center md:p-8">
          <div className="flex-1">
            <p className="text-overline uppercase tracking-[0.12em] text-text-muted">
              目前方案
            </p>
            <p className="mt-2 font-display text-h3 text-text-primary">
              {fullPlatformAccess ? "全平台存取" : TIER_LABEL[member.tier]}
            </p>
            <p className="mt-1 text-body-sm text-text-secondary">
              {fullPlatformAccess &&
                "最高管理員擁有所有會員方案、Admin、專家 Portal、CMS、AI 對話及真人預約權限。"}
              {!fullPlatformAccess && member.tier === "free" &&
                "每日情報任讀;升級創始會員解鎖無限分身對話與完整案例拆解。"}
              {!fullPlatformAccess && member.tier === "pro" &&
                "無限分身對話、完整案例拆解、MCP 優先接入、專家活動優先席。"}
              {!fullPlatformAccess && member.tier === "vip" && "真人導師一對一,新功能優先體驗。"}
            </p>
            {fullPlatformAccess && (
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-lime-text">
                Platform owner · Effective access: unrestricted
              </p>
            )}
          </div>
          {masterAdminPath && (
            <Link
              to={masterAdminPath}
              className="press inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-md bg-ink-solid px-6 text-label text-on-accent hover:bg-ink-solid/90 sm:self-center"
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              Master Admin 管理後台
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          )}
          {!masterAdminPath && !fullPlatformAccess && member.tier !== "vip" && (
            <Link
              to="/pricing"
              className="press inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-md bg-lime px-6 text-label text-on-accent hover:bg-lime-hover sm:self-center"
            >
              {member.tier === "free" ? "升級方案" : "睇 VIP"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          )}
        </section>

        {/* ---- 檔案完成度 + 解鎖里程碑 ---- */}
        <section className="mt-6 rounded-md border bg-surface p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-overline uppercase tracking-[0.12em] text-text-muted">
                檔案完成度
              </p>
              <p className="mt-2 font-mono text-metric text-ink">
                {completion}%
              </p>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-border-strong px-5 text-label text-text-primary hover:border-ink hover:text-ink"
              >
                <PenLine className="h-4 w-4" strokeWidth={1.5} />
                完善檔案
              </button>
            )}
          </div>

          {/* hairline progress bar */}
          <div className="mt-5 h-[2px] w-full rounded-full bg-lime-soft">
            <div
              className="h-full rounded-full bg-lime transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="mt-2 text-caption text-text-muted">
            完成更多,解鎖更多
          </p>

          {founding && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 text-caption text-ink">
              <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />
              創始會員加成 — 創始會員專屬加速,門檻降至 40 / 60 / 80%
            </p>
          )}

          {/* 里程碑階梯 */}
          <ul className="mt-6">
            {milestones.map((ms, i) => {
              const unlocked = completion >= ms.pct;
              return (
                <li
                  key={ms.title}
                  className={cn(
                    "flex items-center gap-4 py-3",
                    i > 0 && "border-t"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      unlocked
                        ? "bg-lime text-on-accent"
                        : "border border-border-strong text-text-muted"
                    )}
                  >
                    {unlocked ? (
                      <Check className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                  </span>
                  <div className="flex-1">
                    <p
                      className={cn(
                        "text-label",
                        unlocked ? "text-text-primary" : "text-text-muted"
                      )}
                    >
                      {ms.title}
                    </p>
                    <p className="mt-0.5 text-caption text-text-muted">
                      {ms.desc}
                    </p>
                  </div>
                  {unlocked ? (
                    <span className="shrink-0 text-caption text-ink">
                      已解鎖
                    </span>
                  ) : (
                    <span className="shrink-0 font-mono text-caption text-text-muted">
                      {ms.pct}%
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* 欄位總覽 ⇄ inline editor */}
          <AnimatePresence mode="wait" initial={false}>
            {editing ? (
              <motion.div
                key="profile-editor"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="mt-6 border-t pt-6"
              >
                <ProfileEditor
                  member={member}
                  onSave={handleProfileSave}
                  onCancel={() => setEditing(false)}
                />
              </motion.div>
            ) : (
              <motion.dl
                key="profile-summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-6 grid grid-cols-1 gap-x-8 border-t sm:grid-cols-2"
              >
                {PROFILE_ROWS.map((row) => {
                  const v = row.value(member);
                  return (
                    <div
                      key={row.key}
                      className="flex items-baseline justify-between gap-4 border-b py-3"
                    >
                      <dt className="shrink-0 text-caption text-text-muted">
                        {row.label}
                      </dt>
                      <dd className="text-right text-body-sm text-text-primary">
                        {v ?? (
                          <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="press text-body-sm text-text-muted underline decoration-dotted underline-offset-4 hover:text-ink"
                          >
                            未填寫
                          </button>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </motion.dl>
            )}
          </AnimatePresence>
        </section>

        {/* ---- 用量統計 ----
            F7 QueryState exemplar:而家 stats 係 sync 衍生(loading 恆 false),
            接 Supabase 後將 loading/error/retry 駁去真 query — 見 docs/QueryState.md */}
        <section className="mt-6 overflow-hidden rounded-md border bg-surface">
          <QueryState loading={false} error={null}>
            <div className="grid grid-cols-1 sm:grid-cols-3">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={cn("p-6", i > 0 && "border-t sm:border-l sm:border-t-0")}
                >
                  <p className="text-caption text-text-muted">{s.label}</p>
                  <p className="mt-2 font-display text-h3 text-text-primary">{s.value}</p>
                  {"note" in s && s.note && (
                    <p className="mt-1 text-caption text-text-muted">{s.note}</p>
                  )}
                </div>
              ))}
            </div>
          </QueryState>
        </section>

        {/* ---- 我的對話 ---- */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-h3 text-text-primary">我的對話</h2>
            <Link to="/ask" className="link-underline text-label text-ink">
              開新對話
            </Link>
          </div>
          {sessions.length === 0 ? (
            <div className="mt-6 rounded-md border bg-surface p-8 text-center">
              <p className="text-body-sm text-text-secondary">
                仲未有對話。去 Ask 問下 AI 編輯部,對話會自動存喺呢度。
              </p>
              <Link
                to="/ask"
                className="press mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-lime px-5 text-label text-on-accent hover:bg-lime-hover"
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                開始第一個對話
              </Link>
            </div>
          ) : (
            <ul className="mt-6 overflow-hidden rounded-md border bg-surface">
              {sessions.slice(0, 5).map((s, i) => (
                <li key={s.id} className={cn(i > 0 && "border-t")}>
                  <Link
                    to={s.to}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-card"
                  >
                    <span className="flex-1 truncate text-body-sm text-text-primary">
                      {s.title}
                    </span>
                    <span className="shrink-0 text-caption text-text-muted">
                      {s.personaName} · {formatTime(s.updatedAt)}
                    </span>
                    <ArrowRight
                      className="nudge-x h-4 w-4 shrink-0 text-text-muted transition-transform duration-180 group-hover:text-ink"
                      strokeWidth={1.5}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- 真人導師預約 ---- */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-h3 text-text-primary">真人導師預約</h2>
            <Link to="/experts" className="link-underline text-label text-ink">查看導師</Link>
          </div>
          {bookingsError && <p className="mt-4 text-xs text-error">{bookingsError}</p>}
          {bookings.length === 0 ? (
            <div className="mt-6 rounded-md border bg-surface p-8 text-center">
              <CalendarDays className="mx-auto h-5 w-5 text-text-muted" strokeWidth={1.5} />
              <p className="mt-3 text-body-sm text-text-secondary">未有預約。當 AI 分身知識覆蓋不足時，你可以直接揀真人時段。</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {bookings.map((booking) => (
                <article key={booking.id} className="rounded-md border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-label text-text-primary">{booking.experts?.display_name ?? "AIGRO 導師"}</p>
                      <p className="mt-1 text-caption text-text-muted">{bookingTime(booking.starts_at)} · {booking.status}</p>
                    </div>
                    {(booking.status === "requested" || booking.status === "confirmed") && (
                      <div className="flex gap-2">
                        <button type="button" disabled={bookingBusy === booking.id} onClick={() => void openReschedule(booking)} className="press rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40">改期</button>
                        <button type="button" disabled={bookingBusy === booking.id} onClick={() => void cancelBooking(booking.id)} className="press rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40">取消預約</button>
                      </div>
                    )}
                  </div>
                  {rescheduleId === booking.id && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-medium text-text-primary">選擇新時段</p>
                      {rescheduleSlots.length === 0 ? (
                        <p className="mt-2 text-caption text-text-muted">未來 30 日暫無可用時段。</p>
                      ) : (
                        <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                          {rescheduleSlots.slice(0, 40).map((slot) => (
                            <button key={slot.starts_at} type="button" disabled={bookingBusy === booking.id} onClick={() => void rescheduleBooking(booking.id, slot.starts_at)} className="press rounded-md border border-border px-2.5 py-1.5 text-xs text-text-secondary disabled:opacity-40">
                              {bookingTime(slot.starts_at)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {booking.meeting_url && booking.status === "confirmed" && (
                    <a href={booking.meeting_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-lime-text underline-offset-2 hover:underline">打開會面連結</a>
                  )}
                  <p className="mt-3 text-caption text-text-muted">開始前 48 小時內不設自助取消或改期。</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ---- 設定 ---- */}
        <section className="mt-12">
          <h2 className="font-display text-h3 text-text-primary">設定</h2>
          <div className="mt-6 overflow-hidden rounded-md border bg-surface">
            {NOTIFICATION_ROWS.map((row, i) => {
              const on = member.notifications[row.key];
              return (
                <div
                  key={row.key}
                  className={cn("flex items-center gap-4 px-5 py-4", i > 0 && "border-t")}
                >
                  <div className="flex-1">
                    <p className="text-label text-text-primary">{row.label}</p>
                    <p className="mt-0.5 text-caption text-text-muted">{row.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={row.label}
                    onClick={() => toggleNotification(row.key)}
                    className={cn(
                      "press relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150",
                      on ? "bg-lime" : "bg-border-strong"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-[left] duration-150",
                        on ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-4 border-t px-5 py-4">
              <div>
                <p className="text-label text-text-primary">登出</p>
                <p className="mt-0.5 text-caption text-text-muted">
                  清除此裝置嘅會員資料(示範模式)
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="press inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border-strong px-4 text-label text-error hover:border-error"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                登出
              </button>
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-caption text-text-muted">
            <Check className="h-3.5 w-3.5 text-ink" strokeWidth={2} />
            {supabaseReady
              ? "已連接 Supabase — 檔案改動會同步到你嘅帳號"
              : "資料只存喺你嘅瀏覽器 — 未設定 Supabase env(示範模式)"}
          </p>
        </section>
      </motion.div>

      <Toast message={toast} />
    </div>
  );
}

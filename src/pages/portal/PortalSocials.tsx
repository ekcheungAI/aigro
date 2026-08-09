import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Instagram,
  Plug,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import QueryState from "@/components/QueryState";
import { useAdminQuery } from "@/components/admin/adminData";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  normalizeSocialAccountIdentifier,
  socialConnectionCapability,
  type SocialPlatform,
} from "@/lib/socialConnections";

interface SocialConnectionRow {
  id: string;
  expert_id: string;
  platform: SocialPlatform;
  source: "tikhub_public" | "official_oauth";
  account_identifier: string;
  canonical_url: string | null;
  consent_status: "active" | "revoked";
  consent_version: string;
  consented_at: string;
  revoked_at: string | null;
  use_for_distillation: boolean;
  sync_enabled: boolean;
  last_synced_at: string | null;
  next_sync_at: string | null;
  last_error: string | null;
}

interface SocialPageData {
  expertId: string;
  socialSyncEnabled: boolean;
  connections: SocialConnectionRow[];
}

interface PlatformDefinition {
  key: SocialPlatform;
  label: string;
  icon: LucideIcon;
  hint: string;
}

const PLATFORMS: PlatformDefinition[] = [
  {
    key: "tiktok",
    label: "TikTok",
    icon: Plug,
    hint: "公開個人檔案及最新公開影片",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    hint: "公開個人檔案、貼文及 Reels",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    hint: "只會使用官方 OAuth／YouTube Data API；尚未接通",
  },
];

async function fetchSocialPage(expertId: string): Promise<SocialPageData> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data: expert, error: expertError } = await supabase
    .from("experts")
    .select("id,feature_flags")
    .eq("id", expertId)
    .maybeSingle();
  if (expertError) throw new Error(expertError.message);
  if (!expert) throw new Error("搵唔到已連結嘅導師身份");
  const { data, error } = await supabase
    .from("social_connections")
    .select(
      "id,expert_id,platform,source,account_identifier,canonical_url,consent_status,consent_version,consented_at,revoked_at,use_for_distillation,sync_enabled,last_synced_at,next_sync_at,last_error"
    )
    .eq("expert_id", expert.id)
    .order("created_at");
  if (error) throw new Error(error.message);
  const flags = expert.feature_flags as Record<string, unknown> | null;
  return {
    expertId: expert.id as string,
    socialSyncEnabled: flags?.social_sync_enabled === true,
    connections: (data ?? []) as SocialConnectionRow[],
  };
}

function formatTimestamp(value: string | null): string {
  if (!value) return "未同步";
  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

/**
 * PortalSocials `/portal/socials` — 真實 consented social connections。
 * TikHub 並非 OAuth；只接受公開 TikTok/Instagram identifiers。YouTube 保留官方 OAuth。
 */
export default function PortalSocials() {
  const { expertId } = usePortalExpert();
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(
    () => fetchSocialPage(expertId),
    [expertId]
  );
  const [drafting, setDrafting] = useState<SocialPlatform | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [consented, setConsented] = useState(false);
  const [useForDistillation, setUseForDistillation] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeConnections = useMemo(
    () => new Map(
      (data?.connections ?? [])
        .filter((connection) => connection.consent_status === "active")
        .map((connection) => [connection.platform, connection])
    ),
    [data]
  );

  const resetDraft = () => {
    setDrafting(null);
    setIdentifier("");
    setConsented(false);
    setUseForDistillation(true);
  };

  const connect = async (platform: SocialPlatform) => {
    if (!supabase || !data || saving || !consented) return;
    if (platform === "youtube") {
      toast("YouTube 只會經官方 OAuth 連接；目前仍然係規劃中");
      return;
    }
    let accountIdentifier: string;
    try {
      accountIdentifier = normalizeSocialAccountIdentifier(platform, identifier);
    } catch (connectError) {
      toast(connectError instanceof Error ? connectError.message : "公開帳號格式無效");
      return;
    }
    setSaving(true);
    const { error: connectError } = await supabase.rpc("upsert_social_connection", {
      p_expert_id: data.expertId,
      p_platform: platform,
      p_account_identifier: accountIdentifier,
      p_use_for_distillation: useForDistillation,
    });
    setSaving(false);
    if (connectError) {
      toast(`連接失敗：${connectError.message}`);
      return;
    }
    resetDraft();
    refetch();
    toast("公開資料授權已記錄；同步會按導師 feature flag 啟用");
  };

  const revoke = async (connection: SocialConnectionRow) => {
    if (!supabase || saving) return;
    setSaving(true);
    const { error: revokeError } = await supabase.rpc("revoke_social_connection", {
      p_connection_id: connection.id,
    });
    setSaving(false);
    if (revokeError) {
      toast(`撤回失敗：${revokeError.message}`);
      return;
    }
    refetch();
    toast("授權已撤回；待處理工作已取消，相關蒸餾內容已移除");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            Social Connections
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            社交資料授權
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-muted">
            TikTok／Instagram 只會同步你授權嘅公開個人檔案同最新公開內容；
            唔會要求密碼、cookies、私人訊息或私人 analytics。
          </p>
        </div>
        <span className="rounded-sm border border-border bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Beta
        </span>
      </div>

      <QueryState
        loading={loading}
        error={error ? `載入失敗：${error}` : null}
        retry={refetch}
      >
        {data && (
          <div className="space-y-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const capability = socialConnectionCapability(platform.key);
              const connection = activeConnections.get(platform.key);
              const isDrafting = drafting === platform.key;
              const automaticSync = Boolean(
                connection?.sync_enabled && data.socialSyncEnabled
              );
              return (
                <section
                  key={platform.key}
                  className="rounded-lg border border-border bg-surface"
                >
                  <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
                        connection ? "border-lime/50 bg-lime-soft" : "border-border bg-card/60"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", connection ? "text-lime-text" : "text-text-muted")} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-primary">
                        {platform.label}
                        <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
                          {capability.status === "planned" ? "Planned" : "Beta"}
                        </span>
                      </p>
                      {connection ? (
                        <div className="mt-1 space-y-1 text-xs text-text-muted">
                          <p className="flex flex-wrap items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-lime-text" />
                            <span className="font-mono text-text-primary">@{connection.account_identifier}</span>
                            <span>· consent {connection.consent_version}</span>
                          </p>
                          <p className="flex flex-wrap items-center gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" />
                            {automaticSync
                              ? `每日同步已啟用 · 上次 ${formatTimestamp(connection.last_synced_at)}`
                              : "授權已記錄；自動同步尚未由管理員啟用"}
                          </p>
                          {connection.last_error && (
                            <p className="text-error">上次同步：{connection.last_error}</p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-0.5 text-xs text-text-muted">
                          {platform.hint} · {capability.source === "tikhub_public" ? "TikHub 公開資料 adapter" : "官方 adapter"}
                        </p>
                      )}
                    </div>
                    {connection ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void revoke(connection)}
                        className="press inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-xs text-text-secondary hover:border-error hover:text-error disabled:opacity-50"
                      >
                        <Unplug className="h-3.5 w-3.5" />
                        撤回授權
                      </button>
                    ) : capability.connectable ? (
                      <button
                        type="button"
                        disabled={drafting !== null}
                        onClick={() => {
                          resetDraft();
                          setDrafting(platform.key);
                        }}
                        className="press inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plug className="h-4 w-4" />
                        授權公開資料
                      </button>
                    ) : (
                      <span className="rounded-md border border-border px-3 py-2 text-xs text-text-muted">
                        官方 OAuth 尚未接通
                      </span>
                    )}
                  </div>

                  {!connection && isDrafting && platform.key !== "youtube" && (
                    <form
                      className="space-y-4 border-t border-border px-5 py-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void connect(platform.key);
                      }}
                    >
                      <label className="block">
                        <span className="mb-1 block text-xs text-text-secondary">
                          {platform.label} 公開 handle 或個人檔案連結
                        </span>
                        <input
                          autoFocus
                          value={identifier}
                          onChange={(event) => setIdentifier(event.target.value)}
                          placeholder="例：@yourname 或公開 profile URL"
                          className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
                        />
                      </label>
                      <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-xs leading-relaxed text-text-muted">
                        <p className="flex items-center gap-1.5 font-medium text-text-primary">
                          <ShieldCheck className="h-4 w-4 text-lime-text" />
                          授權範圍
                        </p>
                        <p className="mt-1.5">
                          AIGRO 會每日透過第三方 TikHub 讀取呢個帳號嘅公開 profile
                          同最新公開內容，保存最少必要欄位，並可用於你嘅 AI 分身蒸餾。
                          呢個唔係平台 OAuth；平台條款同第三方處理條款仍然適用。你可以隨時撤回。
                        </p>
                      </div>
                      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-text-secondary">
                        <input
                          type="checkbox"
                          checked={useForDistillation}
                          onChange={(event) => setUseForDistillation(event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--lime))]"
                        />
                        將同步到嘅公開內容送入審批前蒸餾流程（未批准內容唔會用於聊天）
                      </label>
                      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-text-secondary">
                        <input
                          type="checkbox"
                          checked={consented}
                          onChange={(event) => setConsented(event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--lime))]"
                        />
                        我確認有權授權 AIGRO 處理以上公開資料，並同意上述每日擷取及第三方處理。
                      </label>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={resetDraft}
                          className="press rounded-md border border-border px-4 py-2 text-sm text-text-secondary"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          disabled={!identifier.trim() || !consented || saving}
                          className="press rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving ? "記錄中…" : "確認授權"}
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </QueryState>

      <p className="rounded-md border border-border bg-card/60 px-4 py-3 text-xs leading-relaxed text-text-muted">
        自動同步完成後只會建立待審批 knowledge revision；導師或管理員批准前，
        內容唔會進入 live chat。YouTube 因平台政策只保留官方 OAuth／Data API 路線。
      </p>
    </div>
  );
}

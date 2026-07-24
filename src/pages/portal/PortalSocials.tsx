import { useState } from "react";
import {
  AtSign,
  CheckCircle2,
  Instagram,
  Linkedin,
  Loader2,
  Plug,
  Podcast,
  RefreshCw,
  Twitter,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { HairlineBars } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";
import { portalSocials } from "@/data/portal-mock";
import type { PortalPlatform, PortalSocial } from "@/data/portal-mock";

const PLATFORM_ICONS: Record<PortalPlatform, LucideIcon> = {
  YouTube: Youtube,
  Instagram: Instagram,
  X: Twitter,
  Threads: AtSign,
  LinkedIn: Linkedin,
  Podcast: Podcast,
};

const PLATFORM_HINT: Record<PortalPlatform, string> = {
  YouTube: "訂閱數 · 影片主題 → 分身語料",
  Instagram: "追蹤數 · Reels 內容 → 語料",
  X: "追蹤數 · 貼文觀點 → 語料",
  Threads: "追蹤數 · 串文觀點 → 語料",
  LinkedIn: "追蹤數 · 長文 → 語料",
  Podcast: "收聽數 · 逐字稿 → 語料",
};

/**
 * PortalSocials `/portal/socials` — 社交連結。
 * 每平台一 row:icon + 連接按鈕 → connected 態(lime check + handle +
 * reach + 同步狀態);已連接顯示數據卡(subscribers + 30 日增長 hairline bars)。
 */
export default function PortalSocials() {
  const { slug } = usePortalExpert();
  const toast = useAdminToast();
  const [list, setList] = useState<PortalSocial[]>(
    () => (portalSocials[slug] ?? []).map((s) => ({ ...s }))
  );
  const [connecting, setConnecting] = useState<PortalPlatform | null>(null);

  const connectedCount = list.filter((s) => s.connected).length;

  const connect = (platform: PortalPlatform) => {
    if (connecting) return;
    setConnecting(platform);
    // 示範模式:模擬 OAuth 往返 → connected
    window.setTimeout(() => {
      setList((ls) =>
        ls.map((s) =>
          s.platform === platform
            ? {
                ...s,
                connected: true,
                handle: s.handle ?? "@your-handle",
                reach: s.reach ?? "1.2K 追蹤",
                subscribers: s.subscribers ?? 1200,
                growth30d:
                  s.growth30d ?? [8, 12, 10, 15, 13, 18, 16, 21, 19, 24, 22, 27],
                syncNote: "每 6 小時更新",
              }
            : s
        )
      );
      setConnecting(null);
      toast(`${platform} 已連接(mock)— 首次同步完成,語料已排入下次蒸餾`);
    }, 1400);
  };

  const disconnect = (platform: PortalPlatform) => {
    setList((ls) =>
      ls.map((s) =>
        s.platform === platform
          ? { platform, connected: false }
          : s
      )
    );
    toast(`${platform} 已解除連接(mock)`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            Social Connections
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            社交連結
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            連接你嘅公開平台 — 內容自動轉成蒸餾語料,數據反映分身热度。
          </p>
        </div>
        <p className="font-mono text-xs text-text-muted">
          已連接{" "}
          <span className="text-lime-text">{connectedCount}</span>/{list.length}{" "}
          個平台
        </p>
      </div>

      {/* Platform rows */}
      <div className="space-y-4">
        {list.map((s) => {
          const Icon = PLATFORM_ICONS[s.platform];
          const isConnecting = connecting === s.platform;
          return (
            <section
              key={s.platform}
              className="rounded-lg border border-border bg-surface"
            >
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
                    s.connected
                      ? "border-lime/50 bg-lime-soft"
                      : "border-border bg-card/60"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      s.connected ? "text-lime-text" : "text-text-muted"
                    )}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {s.platform}
                  </p>
                  {s.connected ? (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
                      <span className="inline-flex items-center gap-1 text-lime-text">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        已連接
                      </span>
                      <span className="font-mono">{s.handle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-text-secondary">
                        {s.reach}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        {s.syncNote}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-text-muted">
                      {PLATFORM_HINT[s.platform]}
                    </p>
                  )}
                </div>
                {s.connected ? (
                  <button
                    type="button"
                    onClick={() => disconnect(s.platform)}
                    className="rounded-md border border-border px-3.5 py-2 text-xs text-text-secondary transition-colors hover:border-error hover:text-error"
                  >
                    解除連接
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={connecting !== null}
                    onClick={() => connect(s.platform)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      connecting !== null
                        ? "cursor-not-allowed bg-card text-text-muted"
                        : "bg-lime text-on-accent hover:bg-lime-hover"
                    )}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plug className="h-4 w-4" />
                    )}
                    {isConnecting ? "連接中…" : "連接"}
                  </button>
                )}
              </div>

              {/* 數據卡(已連接先顯示) */}
              {s.connected && s.growth30d && (
                <div className="grid gap-px border-t border-border bg-border sm:grid-cols-[200px_1fr]">
                  <div className="bg-surface px-5 py-4">
                    <p className="text-xs text-text-muted">
                      {s.platform === "YouTube" || s.platform === "Podcast"
                        ? "訂閱"
                        : "追蹤者"}
                    </p>
                    <p className="mt-1 font-mono text-[24px] font-semibold leading-none text-text-primary">
                      {(s.subscribers ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] text-lime-text">
                      +{s.growth30d
                        .reduce((a, b) => a + b, 0)
                        .toLocaleString()}{" "}
                      / 30 日
                    </p>
                  </div>
                  <div className="bg-surface px-5 py-4">
                    <p className="text-xs text-text-muted">30 日增長</p>
                    <HairlineBars
                      values={s.growth30d}
                      height={44}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Explainer */}
      <p className="rounded-md border border-border bg-card/60 px-4 py-3 text-xs leading-relaxed text-text-muted">
        <span className="font-medium text-lime-text">
          連接越多,分身數據越準 —
        </span>{" "}
        每個已連接平台嘅公開內容都會轉成蒸餾語料,令分身回答更貼近你嘅最新觀點;
        數據每 6 小時同步一次,絕不讀取私人訊息。
      </p>
    </div>
  );
}

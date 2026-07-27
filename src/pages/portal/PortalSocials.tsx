import { useState } from "react";
import {
  AtSign,
  CheckCircle2,
  Instagram,
  Linkedin,
  Plug,
  Podcast,
  RefreshCw,
  Twitter,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { cn } from "@/lib/utils";

type PortalPlatform = "YouTube" | "Instagram" | "X" | "Threads" | "LinkedIn" | "Podcast";

interface SocialConnection {
  platform: PortalPlatform;
  connected: boolean;
  handle?: string;
}

const PLATFORMS: PortalPlatform[] = [
  "YouTube",
  "Instagram",
  "X",
  "Threads",
  "LinkedIn",
  "Podcast",
];

const PLATFORM_ICONS: Record<PortalPlatform, LucideIcon> = {
  YouTube: Youtube,
  Instagram: Instagram,
  X: Twitter,
  Threads: AtSign,
  LinkedIn: Linkedin,
  Podcast: Podcast,
};

const PLATFORM_HINT: Record<PortalPlatform, string> = {
  YouTube: "影片主題 → 分身語料",
  Instagram: "Reels 內容 → 語料",
  X: "貼文觀點 → 語料",
  Threads: "串文觀點 → 語料",
  LinkedIn: "長文 → 語料",
  Podcast: "逐字稿 → 語料",
};

/** 本機持久化 — 社交同步後端未接之前,handle 只存呢個瀏覽器 */
function storageKey(slug: string) {
  return `aigro-portal-socials-${slug}`;
}

function loadConnections(slug: string): SocialConnection[] {
  let saved: SocialConnection[] = [];
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) saved = parsed as SocialConnection[];
    }
  } catch {
    /* private mode */
  }
  return PLATFORMS.map((p) => {
    const hit = saved.find((s) => s.platform === p);
    return hit && hit.connected && hit.handle
      ? { platform: p, connected: true, handle: hit.handle }
      : { platform: p, connected: false };
  });
}

function persistConnections(slug: string, list: SocialConnection[]) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(list));
  } catch {
    /* noop */
  }
}

/** 用戶輸入嘅 handle / 公開連結 — 原樣顯示,唔會虛構追蹤數 */
function normalizeHandle(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v) || v.startsWith("@")) return v;
  return `@${v.replace(/^@+/, "")}`;
}

/**
 * PortalSocials `/portal/socials` — 社交連結。
 * 全部平台預設未連接(冇假 handle、冇假追蹤數);
 * 連接 = 記低你嘅 handle(localStorage),數據同步開放後先顯示真實指標。
 */
export default function PortalSocials() {
  const { slug } = usePortalExpert();
  const toast = useAdminToast();
  const [list, setList] = useState<SocialConnection[]>(() => loadConnections(slug));
  const [drafting, setDrafting] = useState<PortalPlatform | null>(null);
  const [handleDraft, setHandleDraft] = useState("");

  const connectedCount = list.filter((s) => s.connected).length;

  const update = (next: SocialConnection[]) => {
    setList(next);
    persistConnections(slug, next);
  };

  const startConnect = (platform: PortalPlatform) => {
    setDrafting(platform);
    setHandleDraft("");
  };

  const confirmConnect = (platform: PortalPlatform) => {
    const handle = normalizeHandle(handleDraft);
    if (!handle) return;
    update(
      list.map((s) =>
        s.platform === platform ? { platform, connected: true, handle } : s
      )
    );
    setDrafting(null);
    setHandleDraft("");
    toast(`${platform} 已記低 handle — 數據同步即將開放,開放後會顯示你嘅真實數據`);
  };

  const disconnect = (platform: PortalPlatform) => {
    update(
      list.map((s) => (s.platform === platform ? { platform, connected: false } : s))
    );
    toast(`${platform} 已解除連接`);
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
            記低你嘅公開平台 handle — 蒸餾語料同數據同步會喺 pipeline 就位後開放。
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
                        已記低 handle
                      </span>
                      <span className="font-mono">{s.handle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        數據同步即將開放
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
                    disabled={drafting !== null}
                    onClick={() => startConnect(s.platform)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      drafting !== null
                        ? "cursor-not-allowed bg-card text-text-muted"
                        : "bg-lime text-on-accent hover:bg-lime-hover"
                    )}
                  >
                    <Plug className="h-4 w-4" />
                    連接
                  </button>
                )}
              </div>

              {/* 連接 = 話我哋知你嘅 handle / 公開連結(唔係假 OAuth,唔虛構數據) */}
              {!s.connected && drafting === s.platform && (
                <form
                  className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    confirmConnect(s.platform);
                  }}
                >
                  <label
                    htmlFor={`handle-${s.platform}`}
                    className="text-xs text-text-secondary"
                  >
                    你嘅 {s.platform} handle 或公開連結:
                  </label>
                  <input
                    id={`handle-${s.platform}`}
                    autoFocus
                    value={handleDraft}
                    onChange={(e) => setHandleDraft(e.target.value)}
                    placeholder="例:@yourname 或 https://…"
                    className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-muted"
                  />
                  <button
                    type="submit"
                    disabled={!handleDraft.trim()}
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      handleDraft.trim()
                        ? "bg-lime text-on-accent hover:bg-lime-hover"
                        : "cursor-not-allowed bg-card text-text-muted"
                    )}
                  >
                    確認連接
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDrafting(null);
                      setHandleDraft("");
                    }}
                    className="text-xs text-text-muted transition-colors hover:text-text-secondary"
                  >
                    取消
                  </button>
                  <p className="w-full text-[11px] text-text-muted">
                    只會用公開內容做蒸餾語料;追蹤數等數據喺同步功能開放後先顯示,
                    而家唔會虛構任何數字。
                  </p>
                </form>
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
        每個已記低平台嘅公開內容,會喺 distillation pipeline 就位後轉成蒸餾語料,
        令分身回答更貼近你嘅最新觀點;追蹤數等指標會喺同步功能開放後先顯示真實數字,
        絕不讀取私人訊息。
      </p>
    </div>
  );
}

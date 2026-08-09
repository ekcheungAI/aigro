export type SocialPlatform = "tiktok" | "instagram" | "youtube";

export interface SocialConnectionCapability {
  connectable: boolean;
  source: "tikhub_public" | "official_oauth";
  status: "beta" | "planned";
}

export function socialConnectionCapability(
  platform: SocialPlatform
): SocialConnectionCapability {
  return platform === "youtube"
    ? { connectable: false, source: "official_oauth", status: "planned" }
    : { connectable: true, source: "tikhub_public", status: "beta" };
}

/**
 * Converts a public profile URL or handle into the minimal identifier sent to
 * the server. Passwords and private credentials are rejected. A TikTok content
 * URL is reduced to its public profile handle; Instagram content URLs reject.
 */
export function normalizeSocialAccountIdentifier(
  platform: Exclude<SocialPlatform, "youtube">,
  raw: string
): string {
  const value = raw.trim();
  if (!value) throw new Error("請輸入公開帳號 handle 或個人檔案連結");
  let handle = value;

  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("公開個人檔案連結格式無效");
    }
    if (url.username || url.password) throw new Error("連結唔可以包含帳號密碼");
    const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
    if (host !== `${platform}.com`) {
      const label = platform === "tiktok" ? "TikTok" : "Instagram";
      throw new Error(`請輸入 ${label} 官方網域嘅公開個人檔案`);
    }
    const [first] = url.pathname.split("/").filter(Boolean);
    if (!first) throw new Error("請輸入公開個人檔案，而唔係平台首頁");
    if (platform === "tiktok") {
      if (!first.startsWith("@")) throw new Error("請輸入公開個人檔案，而唔係影片連結");
      handle = first.slice(1);
    } else {
      if (["p", "reel", "reels", "stories", "explore"].includes(first.toLowerCase())) {
        throw new Error("請輸入公開個人檔案，而唔係貼文或 Reels 連結");
      }
      handle = first;
    }
  }

  try {
    handle = decodeURIComponent(handle).replace(/^@/, "").trim();
  } catch {
    throw new Error("公開帳號 handle 格式無效");
  }
  if (!/^[A-Za-z0-9._-]{2,64}$/.test(handle)) {
    throw new Error("公開帳號 handle 格式無效");
  }
  return handle;
}

import { useEffect } from "react";
import {
  DEFAULT_DESC,
  DEFAULT_TITLE,
  formatPageTitle,
  SITE_NAME,
  SITE_URL,
} from "@/lib/routeMeta";

const DEFAULT_OG_IMAGE = "/og-image.png";
const DEFAULT_OG_IMAGE_ALT = "AIGRO 香港 AI Builder 社群";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** 相對路徑 → 絕對 URL（OG / canonical 規範要絕對 URL） */
function absolutize(url: string): string {
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

export interface PageMetaOptions {
  /** 頁面 canonical 路徑（相對或絕對）— 詳情頁必傳 */
  canonical?: string;
  /** og:type,預設 "website";文章頁用 "article"、專家頁用 "profile" */
  ogType?: string;
  /** Open Graph / Twitter 分享標題；不傳則使用完整頁面標題 */
  ogTitle?: string;
  /** 自訂 og:image(相對或絕對);不傳則使用全站預設分享圖 */
  ogImage?: string;
  /** 分享圖替代文字 */
  ogImageAlt?: string;
}

/**
 * 每頁 SEO meta — 設置 <title>、description、OG tags;可選 canonical /
 * og:type / og:image(F9 per-article OG)。
 * 卸載後回復預設標題,並移除本 hook 加嘅 canonical link。
 */
export default function usePageMeta(
  title?: string,
  description?: string,
  options: PageMetaOptions = {}
) {
  const {
    canonical,
    ogType = "website",
    ogTitle,
    ogImage = DEFAULT_OG_IMAGE,
    ogImageAlt = DEFAULT_OG_IMAGE_ALT,
  } = options;

  useEffect(() => {
    const fullTitle = title
      ? formatPageTitle(title)
      : DEFAULT_TITLE;
    const shareTitle = ogTitle ?? fullTitle;
    const shareImage = absolutize(ogImage);
    const desc = description ?? DEFAULT_DESC;

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", shareTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:locale", "zh_HK");
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", shareImage);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:alt", ogImageAlt);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", shareTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", shareImage);
    setMeta("name", "twitter:image:alt", ogImageAlt);

    let canonicalEl: HTMLLinkElement | null = null;
    if (canonical) {
      canonicalEl = document.head.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]'
      );
      if (!canonicalEl) {
        canonicalEl = document.createElement("link");
        canonicalEl.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute("href", absolutize(canonical));
      setMeta("property", "og:url", absolutize(canonical));
    }

    return () => {
      document.title = DEFAULT_TITLE;
      canonicalEl?.remove();
    };
  }, [title, description, canonical, ogType, ogTitle, ogImage, ogImageAlt]);
}

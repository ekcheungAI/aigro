import { useEffect } from "react";
import {
  DEFAULT_DESC,
  DEFAULT_TITLE,
  formatPageTitle,
  SITE_NAME,
  SITE_URL,
} from "@/lib/routeMeta";

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
  /** 自訂 og:image(相對或絕對);不傳則沿用 index.html 靜態預設 */
  ogImage?: string;
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
  const { canonical, ogType = "website", ogImage } = options;

  useEffect(() => {
    const fullTitle = title
      ? formatPageTitle(title)
      : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESC;

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:type", ogType);
    setMeta("name", "twitter:card", "summary_large_image");

    if (ogImage) setMeta("property", "og:image", absolutize(ogImage));

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
  }, [title, description, canonical, ogType, ogImage]);
}

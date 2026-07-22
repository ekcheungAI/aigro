import { useEffect } from "react";

const SITE_NAME = "AIGRO";
const DEFAULT_DESC =
  "香港最值得信賴的 AI・增長・商業情報平台 — 每日精選情報、實戰案例、認證導師 AI 分身，香港視角。";

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

/**
 * 每頁 SEO meta — 設置 <title>、description、OG tags。
 * 卸載後回復預設標題。
 */
export default function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} — ${SITE_NAME} 香港 AI × Growth 情報平台`
      : `${SITE_NAME} — 香港 AI × Growth 情報平台`;
    const desc = description ?? DEFAULT_DESC;

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", "summary_large_image");

    return () => {
      document.title = `${SITE_NAME} — 香港 AI × Growth 情報平台`;
    };
  }, [title, description]);
}

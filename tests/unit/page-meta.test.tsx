import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import usePageMeta from "@/hooks/usePageMeta";

const HOME_OG_TITLE = "香港 #1 AI Builder 社群｜AIGRO";
const HOME_DESCRIPTION =
  "香港 #1 AI Builder 社群，匯聚最好嘅 AI 資源、每日精選情報同領航專家，陪你由學習走到實踐。";
const HOME_URL = "https://aigro.io/";
const HOME_IMAGE = "https://aigro.io/og-image.png";

function meta(selector: string): string | null {
  return document.head.querySelector<HTMLMetaElement>(selector)?.content ?? null;
}

describe("site metadata", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("sets complete Open Graph and Twitter metadata for the homepage", () => {
    renderHook(() =>
      usePageMeta("香港 #1 AI Builder 社群", HOME_DESCRIPTION, {
        canonical: "/",
        ogTitle: HOME_OG_TITLE,
        ogImage: "/og-image.png",
        ogImageAlt: "AIGRO 香港 #1 AI Builder 社群",
      })
    );

    expect(meta('meta[property="og:title"]')).toBe(HOME_OG_TITLE);
    expect(meta('meta[property="og:description"]')).toBe(HOME_DESCRIPTION);
    expect(meta('meta[property="og:url"]')).toBe(HOME_URL);
    expect(meta('meta[property="og:image"]')).toBe(HOME_IMAGE);
    expect(meta('meta[property="og:image:width"]')).toBe("1200");
    expect(meta('meta[property="og:image:height"]')).toBe("630");
    expect(meta('meta[property="og:image:alt"]')).toBe("AIGRO 香港 #1 AI Builder 社群");
    expect(meta('meta[name="twitter:title"]')).toBe(HOME_OG_TITLE);
    expect(meta('meta[name="twitter:description"]')).toBe(HOME_DESCRIPTION);
    expect(meta('meta[name="twitter:image"]')).toBe(HOME_IMAGE);
    expect(meta('meta[name="twitter:image:alt"]')).toBe("AIGRO 香港 #1 AI Builder 社群");
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      HOME_URL
    );
  });

  it("ships crawler-readable homepage metadata before React runs", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain(`<meta property="og:title" content="${HOME_OG_TITLE}" />`);
    expect(html).toContain(`<meta property="og:description" content="${HOME_DESCRIPTION}" />`);
    expect(html).toContain(`<meta property="og:url" content="${HOME_URL}" />`);
    expect(html).toContain(`<meta property="og:image" content="${HOME_IMAGE}" />`);
    expect(html).toContain(`<meta name="twitter:title" content="${HOME_OG_TITLE}" />`);
    expect(html).toContain(`<meta name="twitter:description" content="${HOME_DESCRIPTION}" />`);
    expect(html).toContain(`<meta name="twitter:image" content="${HOME_IMAGE}" />`);
    expect(html).toContain(`<link rel="canonical" href="${HOME_URL}" />`);
  });
});

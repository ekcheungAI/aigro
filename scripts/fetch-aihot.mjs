#!/usr/bin/env node
/**
 * fetch-aihot.mjs — 從 AIHOT 公共 API 拉取真實情報數據，寫入本地 snapshot。
 *
 * 用法：node scripts/fetch-aihot.mjs
 * 輸出：src/data/aihot-snapshot.json（typed snapshot，構建自包含）
 *
 * AIHOT API 規則：
 * - 必須帶特定 User-Agent（瀏覽器 UA 會被擋）
 * - 公共匿名 API，無需 key；請勿頻繁請求
 * - 展示時須保留 attribution 與 canonical 連結
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://aihot.virxact.com/api/public";
const UA = "aihot-skill/0.3.6 (+https://aihot.virxact.com/aihot-skill/)";
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/data/aihot-snapshot.json"
);

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`AIHOT ${path} → HTTP ${res.status}`);
  }
  return res.json();
}

const [itemsRes, daily, hotTopics] = await Promise.all([
  get("/items?mode=selected&take=50"),
  get("/daily"),
  get("/hot-topics"),
]);

const items = (itemsRes.items ?? []).map((it) => ({
  id: it.id,
  title: it.title,
  title_en: it.title_en ?? null,
  url: it.url ?? null,
  permalink: it.permalink,
  source: it.source ?? "",
  publishedAt: it.publishedAt,
  summary: it.summary ?? "",
  category: it.category ?? "",
  score: typeof it.score === "number" ? it.score : 0,
  attribution: it.attribution ?? null,
}));

const snapshot = {
  fetchedAt: new Date().toISOString(),
  api: { base: BASE, itemsCount: items.length, hasNext: !!itemsRes.hasNext },
  items,
  daily: {
    date: daily.date ?? null,
    attribution: daily.attribution ?? null,
    lead: daily.lead ?? null,
    sections: (daily.sections ?? []).map((s) => ({
      label: s.label ?? "",
      items: (s.items ?? []).map((it) => ({
        title: it.title ?? "",
        summary: it.summary ?? "",
        sourceUrl: it.sourceUrl ?? null,
        sourceName: it.sourceName ?? "",
        permalink: it.permalink ?? "",
        attribution: it.attribution ?? null,
      })),
    })),
  },
  hotTopics: (hotTopics.items ?? []).map((t) => ({
    id: t.id,
    title: t.title ?? "",
    url: t.url ?? null,
    permalink: t.permalink ?? "",
    source: t.source ?? "",
    sourceCount: t.sourceCount ?? 0,
    latestAt: t.latestAt ?? null,
  })),
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

const cats = {};
for (const it of items) cats[it.category] = (cats[it.category] ?? 0) + 1;
const dailyCount = snapshot.daily.sections.reduce(
  (n, s) => n + s.items.length,
  0
);

console.log("AIHOT snapshot written →", OUT);
console.log(`  items:      ${items.length} (categories: ${JSON.stringify(cats)})`);
console.log(
  `  daily:      ${snapshot.daily.date} — ${snapshot.daily.sections.length} sections, ${dailyCount} items`
);
console.log(`  hot-topics: ${snapshot.hotTopics.length}`);

#!/usr/bin/env node
/**
 * fetch-argro.mjs — 從自家 argro-mcp API (Zeabur) 拉取情報，寫入本地 snapshot。
 *
 * 用法：node scripts/fetch-argro.mjs
 * 輸出：src/data/aihot-snapshot.json（同 aihot.ts loader 兼容嘅形狀）
 *
 * 取代 AIHOT 第三方來源 — 數據 100% 自家管道 (argro-mcp on Zeabur)。
 * API key 只喺 build-time 使用，唔會入 client bundle。
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Converter } from "opencc-js/cn2t";

const toHK = Converter({ from: "cn", to: "hk" });
const tc = (s) =>
  typeof s === "string" && s
    ? toHK(s)
        .replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\uFE0F]/gu, "")
        .replace(/[ \t]+\n/g, "\n")
        .trim()
    : s;

const BASE = process.env.ARGRO_API_BASE ?? "https://argro-api.zeabur.app";
const KEY = process.env.ARGRO_API_KEY;
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/data/aihot-snapshot.json"
);

if (!KEY) {
  console.error("ARGRO_API_KEY is required (server-side only).");
  process.exit(1);
}

/** argro topic key → AIGRO 分類（feed chips 同主題地圖用） */
const CATEGORY_MAP = {
  model_release: "模型發布",
  product_update: "產品發布",
  industry_event: "行業動態",
  policy: "行業動態",
  research_paper: "論文研究",
  opinion_tutorial: "觀點與技巧",
};
const toCategory = (topics) =>
  (Array.isArray(topics) && topics.length > 0 && CATEGORY_MAP[topics[0]]) ||
  null;

/** LLM enrichment 未開(冇 Moonshot key)時嘅本地關鍵詞分類 */
const KEYWORD_CATEGORY = [
  ["論文研究", /paper|arxiv|benchmark|study|research|propose|evaluat|論文|研究|基準/i],
  ["觀點與技巧", /how to|guide|tutorial|tips|opinion|why|教學|教程|技巧|觀點|點樣|點解/i],
  ["模型發布", /gpt|claude|gemini|llama|qwen|deepseek|kimi|glm|mistral|grok|model|模型/i],
  ["產品發布", /launch|release|introduc|announce|app|feature|api|product|發佈|推出|上線|產品/i],
  ["行業動態", /funding|raise|acqui|policy|regulat|ban|invest|融資|收購|政策|監管|制裁/i],
];
const classify = (it) => {
  const viaTopics = toCategory(it.topics);
  if (viaTopics) return viaTopics;
  const hay = `${it.title ?? ""} ${it.summary ?? ""}`;
  for (const [cat, re] of KEYWORD_CATEGORY) if (re.test(hay)) return cat;
  return "行業動態";
};

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-API-Key": KEY, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`argro ${path} → HTTP ${res.status}`);
  return res.json();
}

const [hot, stream, daily, topicsRes] = await Promise.all([
  get("/news/hot?limit=50"),
  get("/news/stream?limit=100"),
  get("/insights/daily").catch(() => null),
  get("/meta/topics"),
]);

const mapItem = (it, selected) => ({
  id: it.id,
  title: tc(it.title ?? ""),
  title_en: null,
  url: it.url ?? null,
  permalink: it.url ?? "",
  source: tc(it.source?.name ?? ""),
  publishedAt: it.published_at,
  summary: tc(it.summary ?? ""),
  category: classify(it),
  score:
    typeof it.hot_score === "number"
      ? Math.min(99, Math.round(it.hot_score * 100))
      : 0,
  selected,
  attribution: null,
});

const items = (hot.items ?? []).map((it) => mapItem(it, true));
const allItems = (stream.items ?? []).map((it) => mapItem(it, false));

// 日報：用 argro /insights/daily;冇就由高分 items 按分類合成
let dailyOut;
if (daily?.sections?.length) {
  // argro daily 嘅 articles 係 id 陣列 — 對返 stream 入面嘅完整資料
  const byId = new Map(allItems.map((i) => [i.id, i]));
  const sections = daily.sections
    .map((s) => ({
      label: tc(s.section_title ?? "精選"),
      items: (s.articles ?? [])
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((it) => ({
          title: it.title,
          summary: it.summary,
          sourceUrl: it.url,
          sourceName: it.source,
          permalink: it.permalink,
          attribution: null,
        })),
    }))
    .filter((s) => s.items.length > 0);
  dailyOut = { date: daily.date ?? null, attribution: null, lead: null, sections };
}
const dailyItemCount = dailyOut ? dailyOut.sections.reduce((n, s) => n + s.items.length, 0) : 0;
if (!dailyOut || dailyOut.sections.length === 0 || dailyItemCount < 5) {
  const top = [...allItems].sort((a, b) => b.score - a.score).slice(0, 9);
  const groups = {};
  for (const it of top) (groups[it.category] ??= []).push(it);
  dailyOut = {
    date: new Date().toISOString().slice(0, 10),
    attribution: null,
    lead: null,
    sections: Object.entries(groups).map(([label, arr]) => ({
      label,
      items: arr.map((it) => ({
        title: it.title,
        summary: it.summary,
        sourceUrl: it.url,
        sourceName: it.source,
        permalink: it.permalink,
        attribution: null,
      })),
    })),
  };
}

// 熱門主題：按關鍵詞群組聚合(LLM topic 未開時嘅 fallback)
const topicNames = Object.fromEntries(
  (topicsRes.topics ?? []).map((t) => [t.key, tc(t.name)])
);
const TOPIC_GROUPS = [
  ["OpenAI", /openai|gpt|chatgpt/i],
  ["Anthropic / Claude", /anthropic|claude/i],
  ["Google / Gemini", /google|gemini|deepmind/i],
  ["開源模型", /open.?source|llama|qwen|deepseek|mistral|開源/i],
  ["AI Agent", /agent|agentic|代理|智能體/i],
  ["AI 基建與算力", /gpu|nvidia|data center|算力|基建|chip/i],
];
const hotTopics = TOPIC_GROUPS.map(([name, re]) => [name, allItems.filter((i) => re.test(`${i.title} ${i.summary}`))])
  .filter(([, arr]) => arr.length >= 2)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 5)
  .map(([name, arr]) => ({
    id: name,
    title: name,
    url: arr[0]?.url ?? null,
    permalink: arr[0]?.url ?? "",
    source: arr[0]?.source ?? "",
    sourceCount: arr.length,
    sourceNames: [...new Set(arr.map((i) => i.source))].slice(0, 4),
    latestAt: arr[0]?.publishedAt ?? null,
  }));
const hotTopicsLegacy = Object.entries(
  allItems.reduce((acc, it) => {
    for (const t of it.topics ?? []) (acc[t] ??= []).push(it);
    return acc;
  }, {})
)
  .filter(([, arr]) => arr.length >= 2)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 5)
  .map(([key, arr]) => ({
    id: key,
    title: topicNames[key] ?? tc(key),
    url: arr[0]?.url ?? null,
    permalink: arr[0]?.url ?? "",
    source: arr[0]?.source ?? "",
    sourceCount: arr.length,
    sourceNames: [...new Set(arr.map((i) => i.source))].slice(0, 4),
    latestAt: arr[0]?.publishedAt ?? null,
  }));

const snapshot = {
  fetchedAt: new Date().toISOString(),
  api: { base: BASE, itemsCount: items.length, allItemsCount: allItems.length, hasNext: false },
  items,
  allItems,
  daily: dailyOut,
  hotTopics,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

const cats = {};
for (const it of items) cats[it.category] = (cats[it.category] ?? 0) + 1;
const dailyCount = dailyOut.sections.reduce((n, s) => n + s.items.length, 0);
console.log("argro snapshot written →", OUT);
console.log(`  items(hot): ${items.length} (categories: ${JSON.stringify(cats)})`);
console.log(`  all items:    ${allItems.length}`);
console.log(`  daily:        ${dailyOut.date} — ${dailyOut.sections.length} sections, ${dailyCount} items`);
console.log(`  hot-topics:   ${hotTopics.length}`);

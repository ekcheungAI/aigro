#!/usr/bin/env node
/**
 * sync-argro-to-supabase.mjs — argro 管道 (Zeabur) → Supabase `items` 持續同步。
 *
 * 用途：令 Supabase 成為情報嘅 live serving layer(前端 runtime 讀 published items),
 * 取代 build-time snapshot 做真實數據源。由 GitHub Actions 每 30 分鐘行一次
 * (.github/workflows/sync-supabase.yml),亦可手動:
 *
 *   SUPABASE_SECRET_KEY=sb_secret_... node scripts/sync-argro-to-supabase.mjs
 *
 * 需要 env:
 *   SUPABASE_URL         (預設 https://mxjgavuzzpcvazxdnuzg.supabase.co)
 *   SUPABASE_SECRET_KEY  (service/secret key — server-side only,絕唔可以入 client)
 *   ARGRO_API_BASE       (預設 https://argro-api.zeabur.app)
 *   ARGRO_API_KEY        (required; server-side only)
 *
 * 行為:
 *   1. 拉 argro /news/hot + /news/stream + /insights/daily
 *   2. 關鍵詞分類 + OpenCC cn→hk(同 fetch-argro.mjs 一致)
 *   3. fingerprint = sha256(url || title) 去重;placement: daily > featured > normal
 *   4. upsert 入 public.items(status=published)— fingerprint 衝突時 merge
 * 冇 secret key → 即時 exit 1(fail loud,唔會靜默 skip)。
 */

import { createHash } from "node:crypto";
import { Converter } from "opencc-js/cn2t";

const toHK = Converter({ from: "cn", to: "hk" });
const tc = (s) =>
  typeof s === "string" && s
    ? toHK(s)
        .replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\uFE0F]/gu, "")
        .replace(/[ \t]+\n/g, "\n")
        .trim()
    : s;

const ARGRO_BASE = process.env.ARGRO_API_BASE ?? "https://argro-api.zeabur.app";
const ARGRO_KEY = process.env.ARGRO_API_KEY;
const SUPA_URL =
  process.env.SUPABASE_URL ?? "https://mxjgavuzzpcvazxdnuzg.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPA_KEY || !ARGRO_KEY) {
  console.error("SUPABASE_SECRET_KEY and ARGRO_API_KEY are required server-side.");
  process.exit(1);
}

/* ---------------- argro fetch ---------------- */

async function aget(path) {
  const res = await fetch(`${ARGRO_BASE}${path}`, {
    headers: { "X-API-Key": ARGRO_KEY, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`argro ${path} → HTTP ${res.status}`);
  return res.json();
}

/* ---------------- 分類(同 fetch-argro.mjs 一致) ---------------- */

const CATEGORY_MAP = {
  model_release: "模型發布",
  product_update: "產品發布",
  industry_event: "行業動態",
  policy: "行業動態",
  research_paper: "論文研究",
  opinion_tutorial: "觀點與技巧",
};
const KEYWORD_CATEGORY = [
  ["論文研究", /paper|arxiv|benchmark|study|research|propose|evaluat|論文|研究|基準/i],
  ["觀點與技巧", /how to|guide|tutorial|tips|opinion|why|教學|教程|技巧|觀點|點樣|點解/i],
  ["模型發布", /gpt|claude|gemini|llama|qwen|deepseek|kimi|glm|mistral|grok|model|模型/i],
  ["產品發布", /launch|release|introduc|announce|app|feature|api|product|發佈|推出|上線|產品/i],
  ["行業動態", /funding|raise|acqui|policy|regulat|ban|invest|融資|收購|政策|監管|制裁/i],
];
const classify = (it) => {
  const viaTopics =
    Array.isArray(it.topics) && it.topics.length > 0 && CATEGORY_MAP[it.topics[0]];
  if (viaTopics) return viaTopics;
  const hay = `${it.title ?? ""} ${it.summary ?? ""}`;
  for (const [cat, re] of KEYWORD_CATEGORY) if (re.test(hay)) return cat;
  return "行業動態";
};

const hasCJK = (s) => /[\u4e00-\u9fff]/.test(s ?? "");
const fingerprint = (it) =>
  createHash("sha256")
    .update(it.url ?? `${it.title ?? ""}::${it.source?.name ?? ""}`)
    .digest("hex");

/* ---------------- main ---------------- */

const [hot, stream, daily] = await Promise.all([
  aget("/news/hot?limit=50"),
  aget("/news/stream?limit=100"),
  aget("/insights/daily").catch(() => null),
]);

const hotItems = hot.items ?? [];
const streamItems = stream.items ?? [];

// daily 文章 id 集合(argro daily 嘅 articles 係 id 陣列)
const dailyIds = new Set();
for (const s of daily?.sections ?? []) for (const id of s.articles ?? []) dailyIds.add(id);

// featured = hot 入面分數最高嘅頭 10 則
const featuredIds = new Set(
  [...hotItems]
    .sort((a, b) => (b.hot_score ?? 0) - (a.hot_score ?? 0))
    .slice(0, 10)
    .map((it) => it.id)
);

// 合併 hot + stream,以 fingerprint 去重;placement 優先級:daily > featured > normal
const rows = new Map();
const upsertRow = (it, placement) => {
  const fp = fingerprint(it);
  const rank = { normal: 0, featured: 1, daily: 2 };
  const existing = rows.get(fp);
  if (existing && rank[existing.placement] >= rank[placement]) return;
  const title = tc(it.title ?? "");
  rows.set(fp, {
    title,
    summary: tc(it.summary ?? "") || null,
    original_url: it.url ?? null,
    category: classify(it),
    tags: Array.isArray(it.topics) ? it.topics.slice(0, 5) : [],
    score:
      typeof it.hot_score === "number"
        ? Math.min(99, Math.round(it.hot_score * 100))
        : 0,
    lang: hasCJK(it.title) ? "zh" : "en",
    status: "published",
    placement,
    fingerprint: fp,
    published_at: it.published_at ?? null,
  });
};

for (const it of streamItems) upsertRow(it, "normal");
for (const it of hotItems) upsertRow(it, featuredIds.has(it.id) ? "featured" : "normal");
for (const it of streamItems) if (dailyIds.has(it.id)) upsertRow(it, "daily");
for (const it of hotItems) if (dailyIds.has(it.id)) upsertRow(it, "daily");

const payload = [...rows.values()];
console.log(
  `argro: ${hotItems.length} hot + ${streamItems.length} stream → ${payload.length} unique items ` +
    `(${payload.filter((r) => r.placement === "daily").length} daily, ` +
    `${payload.filter((r) => r.placement === "featured").length} featured)`
);

if (payload.length === 0) {
  console.error("argro returned 0 items — aborting without touching Supabase.");
  process.exit(1);
}

// sources 名 → id(盡量對返 seed 嘅 12 個來源;對唔到就 null)
const srcRes = await fetch(`${SUPA_URL}/rest/v1/sources?select=id,name`, {
  headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
});
if (!srcRes.ok) throw new Error(`supabase sources → HTTP ${srcRes.status}`);
const srcRows = await srcRes.json();
const srcIdByName = new Map(srcRows.map((s) => [s.name.toLowerCase(), s.id]));
const matchSource = (name) => {
  const n = (name ?? "").toLowerCase();
  if (!n) return null;
  if (srcIdByName.has(n)) return srcIdByName.get(n);
  for (const [key, id] of srcIdByName) if (n.includes(key) || key.includes(n)) return id;
  return null;
};
for (const row of payload) {
  const argroItem = [...streamItems, ...hotItems].find(
    (it) => fingerprint(it) === row.fingerprint
  );
  row.source_id = matchSource(argroItem?.source?.name);
}

// upsert(on_conflict=fingerprint)— 分批 100
let written = 0;
for (let i = 0; i < payload.length; i += 100) {
  const batch = payload.slice(i, i + 100);
  const res = await fetch(`${SUPA_URL}/rest/v1/items?on_conflict=fingerprint`, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(batch),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`supabase upsert batch ${i} → HTTP ${res.status}: ${body}`);
  }
  written += batch.length;
}

console.log(`supabase: upserted ${written} items (status=published). Done.`);

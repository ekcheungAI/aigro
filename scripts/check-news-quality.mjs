#!/usr/bin/env node

import { evaluateNewsRelease } from "./lib/news-release-gate.mjs";

const SUPABASE_URL = (
  process.env.SUPABASE_URL ?? "https://zpdwalqnhkbxhmaagkfc.supabase.co"
).replace(/\/$/, "");
const PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "sb_publishable_Xn88bpmbDRFzX-OWb0gaAw_77vPej_b";
const sampleSize = Number.parseInt(process.env.NEWS_GATE_SAMPLE_SIZE ?? "30", 10);
const maxAgeMinutes = Number.parseInt(
  process.env.NEWS_GATE_MAX_AGE_MINUTES ?? "180",
  10,
);

const url = new URL(`${SUPABASE_URL}/rest/v1/items`);
url.searchParams.set(
  "select",
  "id,title,summary,original_url,published_at,source_id,lang,sources(name)",
);
url.searchParams.set("status", "eq.published");
url.searchParams.set("order", "published_at.desc");
url.searchParams.set("limit", String(sampleSize));

let response;
try {
  response = await fetch(url, {
    headers: { apikey: PUBLISHABLE_KEY },
  });
} catch (error) {
  console.error(
    `FAIL news.release — 無法連接公開新聞資料：${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}

if (!response.ok) {
  console.error(
    `FAIL news.release — 公開新聞查詢回傳 HTTP ${response.status}: ${await response.text()}`,
  );
  process.exit(1);
}

const payload = await response.json();
const rows = (Array.isArray(payload) ? payload : []).map((row) => ({
  ...row,
  source_name: Array.isArray(row.sources)
    ? row.sources[0]?.name
    : row.sources?.name,
}));
const result = evaluateNewsRelease(rows, {
  minItems: Math.min(10, sampleSize),
  maxAgeMinutes,
  maxSourceShare: 0.6,
});

console.log(
  `${result.ok ? "PASS" : "FAIL"} news.release — ` +
    `${result.metrics.sampleSize} 則；最新 ${
      result.metrics.ageMinutes ?? "未知"
    } 分鐘前；${result.metrics.language}；${result.metrics.sourceCount} 個來源`,
);

for (const failure of result.failures) {
  console.error(`  - ${failure}`);
}

if (!result.ok) process.exit(1);

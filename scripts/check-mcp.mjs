#!/usr/bin/env node

import { toTraditionalChinese } from "./lib/traditional-chinese.mjs";

/**
 * MCP Streamable HTTP launch gate.
 *
 * The public tool call is read-only and verifies the same curated rows that
 * power /insights. Set MCP_EXPECT_AUTH=true only for a private deployment.
 */

const endpoint = process.env.MCP_URL ?? "https://aigro.io/api/mcp";
const origin = process.env.MCP_ORIGIN ?? "https://aigro.io";
const token = process.env.MCP_TOKEN?.trim() ?? "";
const expectAuth = process.env.MCP_EXPECT_AUTH === "true";
const strictTools = process.env.MCP_STRICT_CONTRACT !== "false";
const maxAgeMinutes = Number.parseInt(process.env.MCP_MAX_AGE_MINUTES ?? "180", 10);

const failures = [];
const record = (name, ok, detail) => {
  const line = `${ok ? "PASS" : "FAIL"} ${name}: ${detail}`;
  console.log(line);
  if (!ok) failures.push(line);
};

function jsonHeaders(extra = {}) {
  return {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    Origin: origin,
    ...extra,
  };
}

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readPayload(response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Streamable HTTP servers may return one or more SSE `data:` frames.
    const frames = text
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    for (let i = frames.length - 1; i >= 0; i -= 1) {
      try {
        return JSON.parse(frames[i]);
      } catch {
        // Keep searching for the final JSON-RPC frame.
      }
    }
  }
  return null;
}

async function postRpc(method, params, sessionId) {
  const headers = jsonHeaders({ ...authHeaders() });
  if (sessionId) headers["MCP-Session-Id"] = sessionId;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const payload = await readPayload(response);
  return { response, payload };
}

if (!/^https:\/\//i.test(endpoint)) {
  record("config.endpoint", false, "MCP_URL must use HTTPS");
  process.exit(1);
}

if (expectAuth && !token) {
  record("config.auth", false, "MCP_EXPECT_AUTH=true requires MCP_TOKEN for protocol checks");
  process.exit(1);
}

// The unauthenticated probe is the first launch gate. It must be rejected when
// the endpoint is meant for members/clients with an entitlement.
const anonymous = await fetch(endpoint, {
  method: "POST",
  headers: jsonHeaders(),
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "aigro-mcp-check", version: "1.0.0" },
    },
  }),
});
await readPayload(anonymous);
record(
  "auth.anonymous_initialize",
  expectAuth ? [401, 403].includes(anonymous.status) : anonymous.ok,
  `HTTP ${anonymous.status}${expectAuth ? " (expected 401/403)" : ""}`,
);

// Origin is an explicit SSRF/browser-confusion boundary in the MCP transport.
const invalidOrigin = await fetch(endpoint, {
  method: "POST",
  headers: { ...jsonHeaders({ ...authHeaders() }), Origin: "https://evil.example" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "aigro-mcp-check", version: "1.0.0" },
    },
  }),
});
await readPayload(invalidOrigin);
record("transport.invalid_origin", invalidOrigin.status === 403, `HTTP ${invalidOrigin.status} (expected 403)`);

if (failures.length > 0) {
  process.exit(1);
}

const initialized = await postRpc(
  "initialize",
  {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "aigro-mcp-check", version: "1.0.0" },
  },
);
const sessionId = initialized.response.headers.get("mcp-session-id");
record("protocol.initialize", initialized.response.status === 200 && Boolean(initialized.payload), `HTTP ${initialized.response.status}`);

if (sessionId) {
  const initializedNotification = await postRpc("notifications/initialized", {}, sessionId);
  record(
    "protocol.initialized_notification",
    [200, 202, 204].includes(initializedNotification.response.status),
    `HTTP ${initializedNotification.response.status}`,
  );
}

const listed = await postRpc("tools/list", {}, sessionId);
const tools = listed.payload?.result?.tools;
record("protocol.tools_list", listed.response.status === 200 && Array.isArray(tools), `HTTP ${listed.response.status}`);

if (Array.isArray(tools)) {
  for (const tool of tools) {
    const schema = tool?.inputSchema;
    const properties = schema?.properties ?? {};
    const boundedLimits = Object.entries(properties)
      .filter(([name]) => name === "limit")
      .every(([, value]) => Number.isFinite(value?.minimum) && Number.isFinite(value?.maximum));
    const hasOutputSchema = Boolean(tool?.outputSchema);
    record(`contract.${tool?.name ?? "unknown"}`, strictTools ? schema?.type === "object" && boundedLimits && hasOutputSchema : schema?.type === "object", strictTools
      ? "object input, bounded limit, outputSchema"
      : "object input");
  }
}

const latest = await postRpc(
  "tools/call",
  { name: "get_latest_news", arguments: { limit: 3 } },
  sessionId,
);
const structuredContent = latest.payload?.result?.structuredContent;
const items = structuredContent?.items;
const CJK = /[\u3400-\u9fff]/;
record(
  "data.language",
  latest.response.status === 200 && structuredContent?.language === "zh-HK",
  `HTTP ${latest.response.status}; ${structuredContent?.language ?? "missing"}`,
);
record(
  "data.latest_items",
  Array.isArray(items) && items.length > 0,
  `${Array.isArray(items) ? items.length : 0} item(s)`,
);
if (Array.isArray(items) && items.length > 0) {
  const complete = items.every(
    (item) =>
      item?.language === "zh-HK" &&
      CJK.test(item?.title ?? "") &&
      CJK.test(item?.summary ?? "") &&
      /^https:\/\//.test(item?.original_url ?? "") &&
      /^https:\/\//.test(item?.canonical_url ?? "") &&
      Boolean(item?.attribution) &&
      Boolean(item?.source) &&
      Array.from(item?.title ?? "").length <= 300 &&
      Array.from(item?.summary ?? "").length <= 1_200 &&
      !Number.isNaN(Date.parse(item?.published_at ?? "")),
  );
  record(
    "data.evidence_fields",
    complete,
    complete
      ? "繁體標題、精簡摘要、來源、原文、canonical 連結及時間齊全"
      : "有項目缺少香港繁體內容或來源證據",
  );
  const fullyTraditional = items.every(
    (item) =>
      item?.title === toTraditionalChinese(item?.title ?? "") &&
      item?.summary === toTraditionalChinese(item?.summary ?? ""),
  );
  record(
    "data.traditional_chinese",
    fullyTraditional,
    fullyTraditional ? "標題及摘要通過全繁體字形檢查" : "偵測到未轉換的簡體字形",
  );
  const latestMs = Date.parse(items[0]?.published_at ?? "");
  const ageMinutes = Number.isNaN(latestMs)
    ? null
    : Math.round((Date.now() - latestMs) / 60_000);
  record(
    "data.freshness",
    ageMinutes !== null && ageMinutes >= -360 && ageMinutes <= maxAgeMinutes,
    `${ageMinutes ?? "unknown"} minute(s); limit ${maxAgeMinutes}`,
  );
}

if (failures.length > 0) {
  console.error(`MCP check failed with ${failures.length} gate(s).`);
  process.exit(1);
}
console.log("MCP check passed.");

#!/usr/bin/env node

/**
 * MCP Streamable HTTP launch gate.
 *
 * This deliberately does not call a data tool: a protocol smoke must be safe
 * to run in CI and must not spend embedding/LLM quota. Set MCP_EXPECT_AUTH=true
 * (the default) for a release gate; use MCP_EXPECT_AUTH=false only while
 * diagnosing an intentionally anonymous development endpoint.
 */

const endpoint = process.env.MCP_URL ?? "https://argro-mcp.zeabur.app/mcp";
const origin = process.env.MCP_ORIGIN ?? "https://aigro-blue.vercel.app";
const token = process.env.MCP_TOKEN?.trim() ?? "";
const expectAuth = process.env.MCP_EXPECT_AUTH !== "false";
const strictTools = process.env.MCP_STRICT_CONTRACT !== "false";

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

if (expectAuth || !token) {
  // A failed anonymous probe is sufficient for the auth path; without a
  // token there is no safe way to continue into the data-bearing session.
  if (failures.length > 0 || !token) {
    process.exit(failures.length > 0 ? 1 : 0);
  }
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

if (failures.length > 0) {
  console.error(`MCP check failed with ${failures.length} gate(s).`);
  process.exit(1);
}
console.log("MCP check passed.");

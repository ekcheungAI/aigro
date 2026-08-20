const json = (response, status, body) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(body));
};

const SOURCE_TYPES = new Set(["rss", "api", "scraper"]);
const MAX_NAME_LENGTH = 160;
const MAX_ENDPOINT_LENGTH = 2_000;

function requestBody(request) {
  if (!request.body) return {};
  if (typeof request.body === "object") return request.body;
  try {
    return JSON.parse(request.body);
  } catch {
    return null;
  }
}

function secretKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function supabaseHeaders(key, authorization) {
  return {
    apikey: key,
    Authorization: authorization ?? `Bearer ${key}`,
    Accept: "application/json",
  };
}

async function requireAdmin(request) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = request.headers.authorization;
  if (!supabaseUrl || !publishableKey) return { error: "integration_not_configured", status: 503 };
  if (!authorization?.startsWith("Bearer ")) return { error: "missing_authorization", status: 401 };

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: authorization },
  });
  if (!userResponse.ok) return { error: "invalid_session", status: 401 };
  const user = await userResponse.json();

  const accessResponse = await fetch(
    `${supabaseUrl}/rest/v1/account_access?select=app_role&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    { headers: { apikey: publishableKey, Authorization: authorization, Accept: "application/json" } },
  );
  if (!accessResponse.ok) return { error: "access_check_failed", status: 403 };
  const accessRows = await accessResponse.json();
  const role = accessRows[0]?.app_role;
  if (role !== "admin" && role !== "super_admin") return { error: "admin_required", status: 403 };
  return { authorization, supabaseUrl };
}

function validateSource(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) return { error: "invalid_name" };
  if (!SOURCE_TYPES.has(type)) return { error: "unsupported_source_type" };
  if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) return { error: "invalid_endpoint" };

  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { error: "invalid_endpoint" };
  }
  if (parsed.protocol !== "https:") return { error: "endpoint_requires_https" };
  if (parsed.username || parsed.password) return { error: "endpoint_must_not_contain_credentials" };

  const lang = typeof body.lang === "string" && body.lang.trim() ? body.lang.trim().slice(0, 12) : "en";
  const vertical = typeof body.vertical === "string" && body.vertical.trim()
    ? body.vertical.trim().slice(0, 80)
    : "ai";
  const weight = Number.isFinite(Number(body.weight))
    ? Math.max(0, Math.min(100, Number(body.weight)))
    : 5;
  const isActive = body.isActive === true;
  return {
    value: {
      name,
      type,
      endpoint,
      lang,
      vertical,
      weight,
      isActive,
      homepageUrl: `${parsed.protocol}//${parsed.host}`,
    },
  };
}

async function upstreamSource({ base, apiKey, source }) {
  const response = await fetch(`${base}/admin/sources/upsert`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: source.name,
      type: source.type,
      lang: source.lang,
      homepage_url: source.homepageUrl,
      feed_url: source.endpoint,
      priority_weight: source.weight,
      is_active: source.isActive,
    }),
  });
  if (!response.ok) {
    return { error: "argro_source_update_failed", status: response.status };
  }
  return { payload: await response.json().catch(() => ({})) };
}

async function upsertLocalSource(supabaseUrl, key, source) {
  const response = await fetch(`${supabaseUrl}/rest/v1/sources?on_conflict=name`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(key),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      name: source.name,
      type: source.type,
      domain: new URL(source.endpoint).hostname,
      endpoint: null,
      vertical: source.vertical,
      lang: source.lang,
      weight: source.weight,
      status: source.isActive ? "active" : "pending",
    }),
  });
  if (!response.ok) return { error: "local_source_update_failed", status: response.status };
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row?.id) return { error: "local_source_id_missing", status: 502 };
  return { row };
}

async function upsertPrivateConnector(supabaseUrl, key, sourceId, source) {
  const response = await fetch(`${supabaseUrl}/rest/v1/source_connectors?on_conflict=source_id`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(key),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      source_id: sourceId,
      endpoint: source.endpoint,
      auth_secret_ref: null,
      config: { upstream_type: source.type },
    }),
  });
  if (!response.ok) return { error: "private_connector_update_failed", status: response.status };
  return {};
}

async function setLocalStatus(supabaseUrl, key, sourceId, status) {
  const response = await fetch(`${supabaseUrl}/rest/v1/sources?id=eq.${encodeURIComponent(sourceId)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(key), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) return { error: "local_source_status_update_failed", status: response.status };
  return {};
}

async function loadSourceConfig(supabaseUrl, key, sourceId) {
  const [sourceResponse, connectorResponse] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/sources?id=eq.${encodeURIComponent(sourceId)}&select=id,name,type,lang,weight`, {
      headers: supabaseHeaders(key),
    }),
    fetch(`${supabaseUrl}/rest/v1/source_connectors?source_id=eq.${encodeURIComponent(sourceId)}&select=endpoint&limit=1`, {
      headers: supabaseHeaders(key),
    }),
  ]);
  if (!sourceResponse.ok || !connectorResponse.ok) return { error: "source_config_lookup_failed", status: 502 };
  const sources = await sourceResponse.json();
  const connectors = await connectorResponse.json();
  const source = sources[0];
  const endpoint = connectors[0]?.endpoint;
  if (!source?.id || !endpoint) return { error: "source_connector_missing", status: 409 };
  return { source: { ...source, endpoint, homepageUrl: new URL(endpoint).origin } };
}

/**
 * Admin-only source control plane. Browser clients never send an upstream key
 * and never write connector URLs into the public sources table.
 */
export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "method_not_allowed" });
  }

  const auth = await requireAdmin(request).catch(() => ({ error: "auth_check_failed", status: 502 }));
  if (auth.error) return json(response, auth.status, { error: auth.error });

  const key = secretKey();
  const argroKey = process.env.ARGRO_API_KEY;
  const argroBase = process.env.ARGRO_API_BASE ?? "https://argro-api.zeabur.app";
  if (!key || !argroKey) return json(response, 503, { error: "integration_not_configured" });

  const body = requestBody(request);
  if (!body || typeof body !== "object") return json(response, 400, { error: "invalid_json" });

  const action = body.action ?? "upsert";
  if (action === "archive" || action === "set_active") {
    const sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
    if (!sourceId) return json(response, 400, { error: "source_identity_required" });
    const config = await loadSourceConfig(auth.supabaseUrl, key, sourceId);
    if (config.error) return json(response, config.status, { error: config.error });
    const isActive = action === "set_active" ? body.isActive === true : false;
    const upstream = await upstreamSource({
      base: argroBase,
      apiKey: argroKey,
      source: { ...config.source, isActive },
    });
    if (upstream.error) return json(response, 502, upstream);
    const local = await setLocalStatus(auth.supabaseUrl, key, sourceId, isActive ? "active" : "paused");
    if (local.error) return json(response, 502, local);
    return json(response, 200, { ok: true, action, sourceId, isActive });
  }

  if (action !== "upsert") return json(response, 400, { error: "unsupported_action" });
  const parsed = validateSource(body);
  if (parsed.error) return json(response, 422, { error: parsed.error });
  const upstream = await upstreamSource({ base: argroBase, apiKey: argroKey, source: parsed.value });
  if (upstream.error) return json(response, 502, upstream);
  const local = await upsertLocalSource(auth.supabaseUrl, key, parsed.value);
  if (local.error) return json(response, 502, local);
  const connector = await upsertPrivateConnector(auth.supabaseUrl, key, local.row.id, parsed.value);
  if (connector.error) return json(response, 502, connector);
  return json(response, 200, { ok: true, action, source: { ...local.row, endpoint: undefined } });
}

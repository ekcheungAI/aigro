const json = (response, status, body) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(body));
};

/**
 * Admin-only proxy for the private argro health endpoint. The browser sends its
 * Supabase JWT; this function verifies the identity and protected access row
 * before attaching the upstream API key server-side.
 */
export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "method_not_allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_ANON_KEY;
  const argroKey = process.env.ARGRO_API_KEY;
  if (!supabaseUrl || !publishableKey || !argroKey) {
    return json(response, 503, { error: "integration_not_configured" });
  }

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return json(response, 401, { error: "missing_authorization" });
  }

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
    if (!authResponse.ok) return json(response, 401, { error: "invalid_session" });
    const user = await authResponse.json();

    const accessResponse = await fetch(
      `${supabaseUrl}/rest/v1/account_access?select=app_role&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: authorization,
          Accept: "application/json",
        },
      }
    );
    if (!accessResponse.ok) return json(response, 403, { error: "access_check_failed" });
    const accessRows = await accessResponse.json();
    const role = accessRows[0]?.app_role;
    if (role !== "admin" && role !== "super_admin") {
      return json(response, 403, { error: "admin_required" });
    }

    const upstream = await fetch("https://argro-api.zeabur.app/meta/health", {
      headers: { "X-API-Key": argroKey, Accept: "application/json" },
    });
    if (!upstream.ok) {
      return json(response, 502, { error: "argro_unavailable", status: upstream.status });
    }
    return json(response, 200, await upstream.json());
  } catch {
    return json(response, 502, { error: "health_proxy_failed" });
  }
}

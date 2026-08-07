#!/usr/bin/env node

const SITE = process.env.AIGRO_SITE_URL ?? "https://aigro-blue.vercel.app";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://mxjgavuzzpcvazxdnuzg.supabase.co";
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  ?? "sb_publishable_pDAjZdCOEbhQ6_0Dlzy3Tg_AYQQmrOT";
const strict = process.argv.includes("--strict");

const results = [];
const record = (key, ok, detail, blocking = false) => {
  results.push({ key, status: ok ? "pass" : blocking ? "blocked" : "fail", detail });
};

async function responseCheck(key, url, expectedStatus, init, detail) {
  try {
    const response = await fetch(url, init);
    record(key, response.status === expectedStatus, `${detail}; HTTP ${response.status}`);
    return response;
  } catch (error) {
    record(key, false, `${detail}; ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

await responseCheck("site.account", `${SITE}/account`, 200, undefined, "SPA account route");
await responseCheck(
  "site.argro_proxy_guard",
  `${SITE}/api/argro-health`,
  401,
  undefined,
  "admin health proxy rejects missing JWT"
);

try {
  const auth = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: PUBLISHABLE_KEY },
  });
  const settings = await auth.json();
  record("auth.email", Boolean(settings.external?.email), "email/password provider enabled", true);
  record(
    "auth.anonymous",
    Boolean(settings.external?.anonymous_users),
    settings.external?.anonymous_users
      ? "anonymous JWT sign-in enabled"
      : "anonymous JWT sign-in disabled; visitor chat cannot start",
    true
  );
} catch (error) {
  record("auth.settings", false, error instanceof Error ? error.message : String(error), true);
}

try {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/items?select=id,fetched_at&status=eq.published&order=fetched_at.desc&limit=1`,
    { headers: { apikey: PUBLISHABLE_KEY, Prefer: "count=exact" } }
  );
  const rows = response.ok ? await response.json() : [];
  const latest = rows[0]?.fetched_at;
  const ageMinutes = latest ? Math.round((Date.now() - Date.parse(latest)) / 60_000) : null;
  record(
    "news.items",
    response.ok && rows.length > 0,
    latest ? `latest published fetch ${ageMinutes} minutes ago` : `HTTP ${response.status}; no rows`,
    true
  );
} catch (error) {
  record("news.items", false, error instanceof Error ? error.message : String(error), true);
}

await responseCheck(
  "function.ask_answer",
  `${SUPABASE_URL}/functions/v1/ask-answer`,
  200,
  { method: "OPTIONS", headers: { Origin: SITE } },
  "chat function CORS preflight"
);

for (const slug of ["knowledge-worker", "persona-compiler", "booking-notify"]) {
  await responseCheck(
    `function.${slug}`,
    `${SUPABASE_URL}/functions/v1/${slug}`,
    401,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    "internal function rejects missing secret"
  );
}

for (const row of results) {
  const label = row.status.toUpperCase().padEnd(7);
  console.log(`${label} ${row.key} — ${row.detail}`);
}

const failures = results.filter((row) => row.status === "fail");
const blocked = results.filter((row) => row.status === "blocked");
console.log(`\nSummary: ${results.length - failures.length - blocked.length} pass, ${blocked.length} blocked, ${failures.length} fail`);
if (failures.length > 0 || (strict && blocked.length > 0)) process.exit(1);

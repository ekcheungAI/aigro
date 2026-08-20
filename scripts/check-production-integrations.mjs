#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { scopedSiteProtectionHeaders } from "./site-protection.mjs";

const SITE = process.env.AIGRO_SITE_URL ?? "https://aigro.io";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://zpdwalqnhkbxhmaagkfc.supabase.co";
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  ?? "sb_publishable_Xn88bpmbDRFzX-OWb0gaAw_77vPej_b";
const strict = process.argv.includes("--strict");
const TARGET_EXPERT_SLUG = process.env.AIGRO_EXPERT_SLUG?.trim() ?? "";
const CHAT_E2E_REPORT = process.env.AIGRO_E2E_REPORT_PATH?.trim() ?? "";
const SITE_PROTECTION_BYPASS = process.env.AIGRO_E2E_PROTECTION_BYPASS?.trim() ?? "";

const results = [];
const record = (key, ok, detail, blocking = false) => {
  results.push({ key, status: ok ? "pass" : blocking ? "blocked" : "fail", detail });
};

async function responseCheck(key, url, expectedStatus, init, detail, blocking = false) {
  try {
    const response = await fetch(url, init);
    record(key, response.status === expectedStatus, `${detail}; HTTP ${response.status}`, blocking);
    return response;
  } catch (error) {
    record(
      key,
      false,
      `${detail}; ${error instanceof Error ? error.message : String(error)}`,
      blocking
    );
    return null;
  }
}

function siteRequestInit(url, init = {}) {
  const headers = new Headers(init.headers);
  const protectionHeaders = scopedSiteProtectionHeaders(url, SITE, SITE_PROTECTION_BYPASS);
  for (const [key, value] of Object.entries(protectionHeaders)) headers.set(key, value);
  return { ...init, headers };
}

const accountUrl = `${SITE}/account`;
await responseCheck(
  "site.account",
  accountUrl,
  200,
  siteRequestInit(accountUrl),
  "SPA account route",
);
const argroHealthUrl = `${SITE}/api/argro-health`;
await responseCheck(
  "site.argro_proxy_guard",
  argroHealthUrl,
  401,
  siteRequestInit(argroHealthUrl),
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

try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ask-answer`, {
    method: "OPTIONS",
    headers: { Origin: SITE },
  });
  const allowOrigin = response.headers.get("access-control-allow-origin");
  record(
    "function.ask_answer.cors",
    response.status === 200 && allowOrigin === SITE,
    `chat CORS preflight HTTP ${response.status}; ACAO ${allowOrigin ?? "missing"}`,
    true,
  );
} catch (error) {
  record("function.ask_answer.cors", false, error instanceof Error ? error.message : String(error), true);
}

for (const slug of [
  "knowledge-worker",
  "persona-compiler",
  "booking-notify",
  "social-sync-worker",
]) {
  await responseCheck(
    `function.${slug}`,
    `${SUPABASE_URL}/functions/v1/${slug}`,
    401,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    "internal function rejects missing secret",
    slug === "social-sync-worker"
  );
}

await responseCheck(
  "function.invite_expert_owner",
  `${SUPABASE_URL}/functions/v1/invite-expert-owner`,
  401,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  "expert invitation function rejects missing JWT",
  true
);

await responseCheck(
  "function.admin_send_invite",
  `${SUPABASE_URL}/functions/v1/admin-send-invite`,
  401,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  "member invitation function rejects missing JWT after validating email configuration",
  true
);

await responseCheck(
  "function.resend_webhook",
  `${SUPABASE_URL}/functions/v1/resend-webhook`,
  401,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  "Resend webhook rejects an unsigned request",
  true
);

let instructors = [];
let releaseInstructors = [];
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_public_instructors`, {
    method: "POST",
    headers: {
      apikey: PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const payload = response.ok ? await response.json() : [];
  instructors = Array.isArray(payload) ? payload : [];
  const readyInstructors = instructors.filter((row) =>
    row?.public_profile_enabled === true && row?.verified === true && row?.chat_ready === true
  );
  releaseInstructors = TARGET_EXPERT_SLUG
    ? readyInstructors.filter((row) => row?.slug === TARGET_EXPERT_SLUG)
    : readyInstructors;
  const ready = releaseInstructors.length > 0;
  record(
    "rpc.public_instructors",
    response.ok && instructors.length > 0,
    `HTTP ${response.status}; ${instructors.length} public instructor(s) returned`,
    true,
  );
  record(
    "release.chat_readiness",
    ready,
    ready
      ? `${releaseInstructors.length} verified release instructor(s) are chat-ready`
      : TARGET_EXPERT_SLUG
        ? `${TARGET_EXPERT_SLUG} is not verified and chat-ready`
        : "no public instructor has verified chat_ready=true",
    true,
  );
} catch (error) {
  record("rpc.public_instructors", false, error instanceof Error ? error.message : String(error), true);
  record("release.chat_readiness", false, "instructor readiness could not be established", true);
}

for (const instructor of releaseInstructors) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_instructor_stats`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_slug: instructor.slug }),
    });
    const payload = response.ok ? await response.json() : null;
    const row = Array.isArray(payload) ? payload[0] : payload;
    const knowledge = Number(row?.knowledge ?? row?.knowledge_count ?? 0);
    record(
      `rpc.instructor_stats.${instructor.slug}`,
      response.ok && Number.isFinite(knowledge) && knowledge > 0,
      `HTTP ${response.status}; knowledge=${Number.isFinite(knowledge) ? knowledge : "unknown"}`,
      true,
    );
  } catch (error) {
    record(`rpc.instructor_stats.${instructor.slug}`, false, error instanceof Error ? error.message : String(error), true);
  }
}

try {
  if (!CHAT_E2E_REPORT) throw new Error("AIGRO_E2E_REPORT_PATH is not set");
  const report = JSON.parse(readFileSync(CHAT_E2E_REPORT, "utf8"));
  const checkedAt = Date.parse(report?.checkedAt ?? "");
  const ageMs = Date.now() - checkedAt;
  const expectedChecks = [
    "grounded_stream",
    "citations",
    "atomic_messages",
    "lead_interaction",
    "contact_consent",
    "contact_withdrawal",
    "idempotent_deletion",
  ];
  const reportChecks = Array.isArray(report?.checks) ? report.checks : [];
  const reportMatches = report?.schemaVersion === 1
    && report?.passed === true
    && report?.siteUrl === SITE.replace(/\/$/, "")
    && report?.supabaseUrl === SUPABASE_URL.replace(/\/$/, "")
    && (!TARGET_EXPERT_SLUG || report?.expertSlug === TARGET_EXPERT_SLUG)
    && releaseInstructors.some((instructor) => instructor?.slug === report?.expertSlug)
    && Number.isFinite(checkedAt)
    && ageMs >= -60_000
    && ageMs <= 15 * 60_000
    && expectedChecks.every((check) => reportChecks.includes(check));
  record(
    "release.authenticated_chat_e2e",
    reportMatches,
    reportMatches
      ? `fresh authenticated acceptance passed for ${report.expertSlug}`
      : "authenticated acceptance report is stale, incomplete, or targets a different environment",
    true,
  );
} catch (error) {
  record(
    "release.authenticated_chat_e2e",
    false,
    `authenticated acceptance evidence unavailable: ${error instanceof Error ? error.message : String(error)}`,
    true,
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

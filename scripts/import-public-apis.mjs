#!/usr/bin/env node
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const DEFAULT_PUBLIC_APIS_REF = "c045a2eb505f0f8b7992bb4af53cc020f25003fd";
export const PUBLIC_APIS_SOURCE_URL = "https://github.com/public-apis/public-apis";

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\uFE0F/gu;
const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/i;

export function isPinnedPublicApisRef(value) {
  return FULL_SHA_PATTERN.test(String(value ?? ""));
}

export function stripPublicApisEmoji(value) {
  return String(value ?? "").replace(EMOJI_PATTERN, "");
}

function cleanMarkdownText(value, maxLength = 800) {
  return stripPublicApisEmoji(value)
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function splitMarkdownRow(line) {
  const source = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cell = "";
  let escaped = false;
  for (const character of source) {
    if (escaped) {
      cell += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function safeHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname) {
      return null;
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function canonicalDocsUrl(value) {
  const url = safeHttpsUrl(value);
  if (!url) return null;
  const parsed = new URL(url);
  parsed.hostname = parsed.hostname.toLowerCase();
  for (const key of [...parsed.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) parsed.searchParams.delete(key);
  }
  parsed.searchParams.sort();
  const normalized = parsed.toString();
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function parseMarkdownLink(value) {
  const match = value.trim().match(/^\[([^\]]+)]\((https?:\/\/[^)\s]+)\)$/i);
  if (!match) return null;
  const docsUrl = safeHttpsUrl(match[2]);
  const name = cleanMarkdownText(match[1], 120);
  return name && docsUrl ? { name, docsUrl } : null;
}

function normalizeCors(value) {
  const normalized = cleanMarkdownText(value, 20).toLowerCase();
  if (normalized === "yes") return "yes";
  if (normalized === "no") return "no";
  return "unknown";
}

export function sourceKeyForPublicApi({ docsUrl }) {
  const canonical = canonicalDocsUrl(docsUrl);
  if (!canonical) throw new Error("A public-apis source key requires a safe HTTPS docs URL");

  // The upstream catalogue has no stable row ID. Its canonical documentation
  // URL is the least volatile identity available: editorial category/title
  // changes must not create a second draft for the same provider.
  return `public-apis:${createHash("sha256")
    .update(canonical.toLowerCase())
    .digest("hex")}`;
}

/**
 * Parse only five-column category tables after `## Index`. This deliberately
 * excludes the APILayer promotional preamble and every non-catalogue table.
 */
export function parsePublicApisMarkdown(markdown, upstreamRef = DEFAULT_PUBLIC_APIS_REF) {
  const indexOffset = markdown.indexOf("## Index");
  if (indexOffset < 0) throw new Error("public-apis README is missing the ## Index marker");

  const lines = markdown.slice(indexOffset).split(/\r?\n/);
  const entries = [];
  const seenUrls = new Set();
  const rejected = [];
  let category = "";
  let inFiveColumnTable = false;

  for (const line of lines) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      category = cleanMarkdownText(heading[1], 80);
      inFiveColumnTable = false;
      continue;
    }

    if (category && /^\|?\s*API\s*\|\s*Description\s*\|\s*Auth\s*\|\s*HTTPS\s*\|\s*CORS\s*\|?\s*$/i.test(line.trim())) {
      inFiveColumnTable = true;
      continue;
    }
    if (!inFiveColumnTable) continue;
    if (/^\|?\s*:?-{3,}/.test(line)) continue;
    if (!line.trim().startsWith("|")) {
      inFiveColumnTable = false;
      continue;
    }

    const cells = splitMarkdownRow(line);
    if (cells.length < 5) {
      rejected.push({ reason: "malformed_columns", line: line.slice(0, 180) });
      continue;
    }
    const linked = parseMarkdownLink(cells[0]);
    if (!linked) {
      rejected.push({ reason: "invalid_or_non_https_docs", line: line.slice(0, 180) });
      continue;
    }
    const canonical = canonicalDocsUrl(linked.docsUrl);
    if (!canonical) {
      rejected.push({ reason: "invalid_or_non_https_docs", line: line.slice(0, 180) });
      continue;
    }
    if (seenUrls.has(canonical)) {
      rejected.push({ reason: "duplicate_docs_url", line: line.slice(0, 180) });
      continue;
    }
    seenUrls.add(canonical);

    const description = cleanMarkdownText(cells[1]);
    const authType = cleanMarkdownText(cells[2], 80) || "No";
    const httpsSupported = cleanMarkdownText(cells[3], 20).toLowerCase() === "yes";
    const corsStatus = normalizeCors(cells[4]);
    const base = {
      category,
      name: linked.name,
      docsUrl: linked.docsUrl,
    };

    entries.push({
      name: linked.name,
      description_en: description,
      editorial_summary_zh_hk: "",
      category,
      use_cases: [],
      auth_type: authType,
      https_supported: httpsSupported,
      cors_status: corsStatus,
      docs_url: linked.docsUrl,
      hk_relevance: "low",
      source_kind: "public-apis",
      source_key: sourceKeyForPublicApi(base),
      source_url: PUBLIC_APIS_SOURCE_URL,
      upstream_ref: upstreamRef,
      last_seen_at: new Date().toISOString(),
      review_state: "upstream_listed",
      last_reviewed_at: null,
      status: "draft",
    });
  }

  return {
    entries,
    rejected,
    stats: {
      parsed: entries.length,
      categories: new Set(entries.map((entry) => entry.category)).size,
      rejected: rejected.length,
      duplicates: rejected.filter((item) => item.reason === "duplicate_docs_url").length,
    },
  };
}

async function fetchExistingSourceStates(baseUrl, secretKey) {
  const url = new URL("/rest/v1/api_directory_entries", baseUrl);
  url.searchParams.set("select", "source_key,status");
  url.searchParams.set("source_kind", "eq.public-apis");
  const response = await fetch(url, {
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
      "Accept-Profile": "public",
    },
  });
  if (!response.ok) throw new Error(`Existing-entry lookup failed (${response.status})`);
  return response.json();
}

async function insertDraftBatch(baseUrl, secretKey, rows) {
  const url = new URL("/rest/v1/api_directory_entries", baseUrl);
  url.searchParams.set("on_conflict", "source_key");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "Content-Profile": "public",
      // Atomic DO NOTHING semantics: an admin can publish or hide an entry
      // between the state lookup and this request without the importer ever
      // downgrading or resurrecting it.
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Draft insert failed (${response.status}): ${detail}`);
  }
}

async function runCli() {
  const apply = process.argv.includes("--apply");
  const upstreamRef = process.env.PUBLIC_APIS_REF || DEFAULT_PUBLIC_APIS_REF;
  if (apply && !isPinnedPublicApisRef(upstreamRef)) {
    throw new Error("--apply requires PUBLIC_APIS_REF to be a pinned 40-character Git SHA");
  }

  const rawUrl = `https://raw.githubusercontent.com/public-apis/public-apis/${encodeURIComponent(upstreamRef)}/README.md`;
  const response = await fetch(rawUrl, {
    headers: { "User-Agent": "aigro-api-directory-import/1.0" },
  });
  if (!response.ok) throw new Error(`Upstream fetch failed (${response.status})`);
  const result = parsePublicApisMarkdown(await response.text(), upstreamRef);

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", upstreamRef, ...result.stats }, null, 2));
    return;
  }

  const baseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!baseUrl || !secretKey) {
    throw new Error("--apply requires SUPABASE_URL and SUPABASE_SECRET_KEY");
  }

  const existing = await fetchExistingSourceStates(baseUrl, secretKey);
  const existingStates = new Map(existing.map((row) => [row.source_key, row.status]));
  const writable = result.entries.filter((entry) => !existingStates.has(entry.source_key));
  const draftSkipped = result.entries.filter(
    (entry) => existingStates.get(entry.source_key) === "draft"
  ).length;
  const hiddenSkipped = result.entries.filter(
    (entry) => existingStates.get(entry.source_key) === "hidden"
  ).length;
  const publishedSkipped = result.entries.filter(
    (entry) => existingStates.get(entry.source_key) === "published"
  ).length;

  for (let offset = 0; offset < writable.length; offset += 200) {
    await insertDraftBatch(baseUrl, secretKey, writable.slice(offset, offset + 200));
  }

  console.log(JSON.stringify({
    mode: "apply",
    upstreamRef,
    ...result.stats,
    submittedDrafts: writable.length,
    draftSkipped,
    hiddenSkipped,
    publishedSkipped,
  }, null, 2));
}

const isDirectExecution = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isDirectExecution) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

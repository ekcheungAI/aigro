#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  EXPECTED_JIMMY_COMMIT,
  readPinnedGitKnowledgePack,
} from "./generate-jimmy-knowledge-manifest.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const EXPECTED_JIMMY_SOURCE_COUNT = 126;

function exactSet(left, right) {
  return left.length === right.length && new Set(left).size === left.length &&
    left.every((value) => right.includes(value));
}

export function assertCompleteDistillation({ expectedCount, commit, knowledge, persona, coverage }) {
  const revisionIds = knowledge.map((row) => row.revisionId);
  const knowledgeComplete = knowledge.length === expectedCount && knowledge.every((row) =>
    row.status === "approved" && row.chunkCount > 0 && row.distilled === true &&
    row.citationCommit === commit && row.citationPath === row.path
  );
  const coverageComplete = coverage.sourceCount === expectedCount &&
    coverage.approvedRevisionCount === expectedCount &&
    coverage.chunkedRevisionCount === expectedCount &&
    coverage.pinnedCitationCount === expectedCount &&
    coverage.publishedPersonaRevisionCount === expectedCount &&
    coverage.rightsValidCount === expectedCount && coverage.exactRevisionSet === true;
  const personaComplete = persona.status === "published" && persona.fidelityStatus === "passed" &&
    exactSet(revisionIds, persona.sourceRevisionIds);
  if (!knowledgeComplete || !coverageComplete || !personaComplete) {
    throw new Error("Incomplete distillation: sources, citations, chunks, approvals, fidelity, or persona coverage do not match");
  }
  return true;
}

async function poll({ drive, read, done, failed, intervalMs, maxAttempts, label }) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await drive();
    const state = await read();
    const error = failed(state);
    if (error) throw new Error(`${label} failed: ${error}`);
    if (done(state)) return state;
    if (intervalMs) await sleep(intervalMs);
  }
  throw new Error(`${label} timed out after ${maxAttempts} attempts`);
}

export async function runFullDistillation({ adapter, chapters, commit, publishPersona, poll: polling, expectedSourceCount = EXPECTED_JIMMY_SOURCE_COUNT }) {
  if (chapters.length !== expectedSourceCount) {
    throw new Error(`Expected ${expectedSourceCount} pinned chapters, received ${chapters.length}`);
  }
  const imported = [];
  for (const chapter of chapters) imported.push(await adapter.importChapter(chapter));
  const expectedRevisionIds = imported.map((row) => row.revisionId);
  const reviewState = await poll({
    drive: () => adapter.driveKnowledgeWorkers(),
    read: () => adapter.readKnowledgeState(expectedRevisionIds),
    done: (rows) => rows.length === chapters.length && rows.every((row) => ["review", "approved"].includes(row.status)),
    failed: (rows) => rows.find((row) => ["failed", "rejected", "archived"].includes(row.status))?.path,
    ...polling,
    label: "knowledge distillation",
  });
  const reviewIds = reviewState.filter((row) => row.status === "review").map((row) => row.revisionId);
  if (reviewIds.length) await adapter.approveRevisions(reviewIds);
  const jobId = await adapter.queuePersona(expectedRevisionIds);
  const personaReview = await poll({
    drive: () => adapter.drivePersonaWorker(),
    read: () => adapter.readPersonaState(jobId),
    done: (row) => ["review", "approved", "published"].includes(row.status),
    failed: (row) => ["failed", "rejected"].includes(row.status) ? row.status : null,
    ...polling,
    label: "persona distillation",
  });
  if (personaReview.fidelityStatus !== "passed") throw new Error("Persona fidelity gate did not pass");
  let personaVersionId = personaReview.personaVersionId ?? null;
  if (publishPersona && personaReview.status !== "published") personaVersionId = await adapter.publishPersona(jobId);
  const knowledge = await adapter.readKnowledgeState(expectedRevisionIds);
  const persona = await adapter.readPersonaState(jobId);
  const coverage = await adapter.readCoverage();
  assertCompleteDistillation({ expectedCount: chapters.length, commit, knowledge, persona, coverage });
  return { complete: true, commit, chapterCount: chapters.length, personaVersionId, coverage };
}

function required(name, aliases = []) {
  for (const key of [name, ...aliases]) if (process.env[key]) return process.env[key];
  throw new Error(`Missing required environment variable: ${name}`);
}

function rpcAdapter(client, options) {
  const rpc = async (name, args = {}) => {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(`${name}: ${error.message}`);
    return data;
  };
  return {
    async importChapter(chapter) {
      const data = await rpc("upsert_authorized_knowledge_pack_chapter", {
        p_expert_slug: "jimmy-lau",
        p_external_key: `growth-with-ai-guide:${chapter.path}`,
        p_title: chapter.title,
        p_source_url: chapter.sourceUrl,
        p_raw_text: chapter.content,
        p_source_sha256: chapter.sha256,
        p_source_meta: {
          corpus: "growth-with-ai-guide",
          repository: "https://github.com/jimmylau-DOTAI/growth-with-ai-guide",
          commit_sha: options.commit,
          file_path: chapter.path,
          stage: chapter.stage,
          chapter: chapter.chapter,
          order: chapter.order,
          headings: chapter.headings,
        },
        p_rights_holder: options.rightsHolder,
        p_rights_evidence_ref: options.rightsEvidenceRef,
      });
      return { revisionId: data.revision_id, status: data.status };
    },
    async driveKnowledgeWorkers() { await rpc("invoke_knowledge_worker"); },
    async readKnowledgeState(ids) { return rpc("authorized_knowledge_pack_revision_state", { p_revision_ids: ids }); },
    async approveRevisions(ids) { await rpc("approve_authorized_knowledge_pack_revisions", { p_expert_slug: "jimmy-lau", p_revision_ids: ids }); },
    async queuePersona(ids) { return rpc("queue_authorized_knowledge_pack_persona", { p_expert_slug: "jimmy-lau", p_revision_ids: ids }); },
    async drivePersonaWorker() { await rpc("invoke_persona_compiler"); },
    async readPersonaState(jobId) { return rpc("authorized_knowledge_pack_persona_state", { p_job_id: jobId }); },
    async publishPersona(jobId) { return rpc("publish_authorized_knowledge_pack_persona", { p_job_id: jobId, p_greeting: options.greeting }); },
    async readCoverage() { return rpc("authorized_knowledge_pack_coverage", { p_expert_slug: "jimmy-lau", p_commit_sha: options.commit }); },
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--publish-persona") args.publishPersona = true;
    else if (key?.startsWith("--") && argv[index + 1]) args[key.slice(2)] = argv[++index];
    else throw new Error("Invalid arguments");
  }
  if (!args.repo || !args["rights-evidence-ref"] || !args["rights-holder"]) {
    throw new Error("Usage: --repo DIR --rights-holder NAME --rights-evidence-ref REF [--publish-persona]");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = required("SUPABASE_URL", ["VITE_SUPABASE_URL"]);
  const key = required("SUPABASE_SECRET_KEY", ["SUPABASE_SERVICE_ROLE_KEY"]);
  const pack = await readPinnedGitKnowledgePack(args.repo, EXPECTED_JIMMY_COMMIT);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const adapter = rpcAdapter(client, {
    commit: EXPECTED_JIMMY_COMMIT,
    rightsHolder: args["rights-holder"],
    rightsEvidenceRef: args["rights-evidence-ref"],
    greeting: args.greeting ?? "我係 Jimmy 嘅 AI 分身。講低你而家工作最卡嘅位置，我會按 Growth with AI 方法同你拆下一步。",
  });
  const report = await runFullDistillation({
    adapter,
    chapters: pack.chapters,
    commit: EXPECTED_JIMMY_COMMIT,
    publishPersona: args.publishPersona === true,
    expectedSourceCount: EXPECTED_JIMMY_SOURCE_COUNT,
    poll: { intervalMs: Number(args["poll-ms"] ?? 10_000), maxAttempts: Number(args["max-polls"] ?? 180) },
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

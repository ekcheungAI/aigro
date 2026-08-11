#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

export const EXPECTED_JIMMY_COMMIT = "2a592eb59398f97800cfe811847bb5f9d85a5668";
export const MAX_MARKDOWN_BYTES = 1_048_576;
const REPOSITORY = "https://github.com/jimmylau-DOTAI/growth-with-ai-guide";
const execFileAsync = promisify(execFile);
const SECRET_FILENAME_TOKEN = /(?:^|[._-])(?:env|api[-_]?keys?|access[-_]?tokens?|tokens?|passwords?|credentials?|secrets?|private[-_]?keys?)(?=$|[._-])/i;
const SECRET_CONTENT = /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?(?:sk-[a-z0-9_-]{20,}|[a-z0-9_/-]{32,})/i;
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function slug(text) {
  return text.toLowerCase().trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

export function extractHeadingLocators(markdown) {
  const stack = [];
  const headings = [];
  let fence = null;
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const depth = match[1].length;
    const text = match[2].trim();
    stack.length = depth - 1;
    stack[depth - 1] = slug(text);
    headings.push({ depth, text, path: stack.filter(Boolean).join("/"), line: index + 1 });
  }
  return headings;
}

export function buildManifestFromEntries(files, commit) {
  const chapters = files.sort((a, b) => compare(a.path, b.path)).map(({ path: relativePath, bytes }) => {
    const markdownBasename = basename(relativePath).replace(/\.md$/i, "");
    if (SECRET_FILENAME_TOKEN.test(markdownBasename)) throw new Error(`secret-like filename: ${relativePath}`);
    if (bytes.length > MAX_MARKDOWN_BYTES) throw new Error(`${relativePath} exceeds ${MAX_MARKDOWN_BYTES} bytes`);
    if (bytes.includes(0)) throw new Error(`binary Markdown is not allowed: ${relativePath}`);
    const content = bytes.toString("utf8");
    if (SECRET_CONTENT.test(content)) throw new Error(`secret-like content: ${relativePath}`);
    const headings = extractHeadingLocators(content);
    const stageMatch = /(?:^|\/)stage[-_ ]?(\d+)(?:\/|$)/i.exec(relativePath)
      ?? /^(\d+)[-_ ]/.exec(relativePath);
    const chapterMatch = /(?:^|\/)(\d+)-(\d+)-[^/]+\.md$/i.exec(relativePath);
    const orderMatch = /(?:^|\/)(\d+)[-_ ]/.exec(relativePath);
    return {
      path: relativePath,
      stage: stageMatch ? Number(stageMatch[1]) : null,
      chapter: chapterMatch ? `${chapterMatch[1]}-${chapterMatch[2]}` : null,
      order: chapterMatch ? Number(chapterMatch[2]) : orderMatch ? Number(orderMatch[1]) : null,
      title: headings[0]?.text ?? relativePath.replace(/\.md$/i, ""),
      byteLength: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sourceUrl: `${REPOSITORY}/blob/${commit}/${relativePath.split("/").map(encodeURIComponent).join("/")}`,
      headings,
    };
  });
  return {
    corpus: { name: "Growth with AI Guide", author: "Jimmy Lau", repository: REPOSITORY, commit, fileCount: chapters.length },
    chapters,
  };
}

export async function buildPinnedGitManifest(repoDir, commit) {
  const root = resolve(repoDir);
  const { stdout } = await execFileAsync(
    "git",
    ["ls-tree", "-r", "-z", commit],
    { cwd: root, encoding: "buffer", maxBuffer: 10 * 1024 * 1024 },
  );
  const entries = Buffer.from(stdout).toString("utf8").split("\0").filter(Boolean);
  const treeFiles = [];
  for (const entry of entries) {
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t([\s\S]+)$/.exec(entry);
    if (!match) throw new Error("invalid Git tree entry");
    const [, mode, type, objectId, path] = match;
    if (mode === "120000") throw new Error(`symlink is not allowed: ${path}`);
    if (mode === "160000" || type === "commit") throw new Error(`submodule is not allowed: ${path}`);
    if (type !== "blob" || !path.toLowerCase().endsWith(".md")) continue;
    const { stdout: blob } = await execFileAsync(
      "git",
      ["cat-file", "blob", objectId],
      { cwd: root, encoding: "buffer", maxBuffer: MAX_MARKDOWN_BYTES + 1 },
    );
    treeFiles.push({ path, bytes: Buffer.from(blob) });
  }

  return buildManifestFromEntries(treeFiles, commit);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key?.startsWith("--") || !argv[index + 1]) throw new Error("usage: --repo DIR --expected-sha SHA [--output FILE]");
    args[key.slice(2)] = argv[index + 1];
  }
  if (!args.repo || !args["expected-sha"]) throw new Error("usage: --repo DIR --expected-sha SHA [--output FILE]");
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: resolve(args.repo) });
  if (args["expected-sha"] !== EXPECTED_JIMMY_COMMIT || stdout.trim() !== args["expected-sha"]) {
    throw new Error(`unexpected commit: expected ${EXPECTED_JIMMY_COMMIT}, received ${stdout.trim()}`);
  }
  const manifest = await buildPinnedGitManifest(args.repo, args["expected-sha"]);
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (args.output) await writeFile(resolve(args.output), json, { flag: "w" });
  else process.stdout.write(json);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

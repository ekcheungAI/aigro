import { lstat, mkdtemp, mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_JIMMY_COMMIT,
  buildPinnedGitManifest,
  buildManifestFromEntries,
  extractHeadingLocators,
} from "../../scripts/generate-jimmy-knowledge-manifest.mjs";

const execFileAsync = promisify(execFile);

async function buildJimmyKnowledgeManifest(root: string, commit: string) {
  if (commit !== EXPECTED_JIMMY_COMMIT) throw new Error("unexpected commit");
  const files: Array<{ path: string; bytes: Buffer }> = [];
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) throw new Error("symlink");
      if (info.isDirectory()) await visit(path);
      else if (entry.name.toLowerCase().endsWith(".md")) {
        files.push({ path: relative(root, path).split("/").join("/"), bytes: await readFile(path) });
      }
    }
  }
  await visit(root);
  return buildManifestFromEntries(files, commit);
}

async function gitFixture() {
  const root = await fixture();
  await execFileAsync("git", ["init", "-q"], { cwd: root });
  await execFileAsync("git", ["add", "."], { cwd: root });
  await execFileAsync("git", ["-c", "user.name=AIGRO Test", "-c", "user.email=test@aigro.local", "commit", "-qm", "fixture"], { cwd: root });
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root });
  return { root, commit: stdout.trim() };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "aigro-jimmy-"));
  await mkdir(join(root, "stage-02"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Growth with AI\n\nOverview.\n");
  await writeFile(
    join(root, "stage-02", "03-agents.md"),
    "# Build AI Agents\n\n## Context\n\nGrounded advice.\n",
  );
  await writeFile(join(root, "ignored.txt"), "not markdown");
  return root;
}

describe("Jimmy Growth with AI manifest", () => {
  it("reads immutable commit blobs despite dirty tracked and untracked Markdown", async () => {
    const { root, commit } = await gitFixture();
    const pinned = await buildPinnedGitManifest(root, commit);
    await writeFile(join(root, "README.md"), "# Dirty tracked injection\n");
    await writeFile(join(root, "untracked.md"), "# Dirty untracked injection\n");
    const dirty = await buildPinnedGitManifest(root, commit);
    expect(dirty).toEqual(pinned);
    expect(dirty.chapters.some((chapter) => chapter.path === "untracked.md")).toBe(false);
  });

  it("rejects symlink entries from the pinned Git tree without reading their targets", async () => {
    const { root } = await gitFixture();
    await symlink("README.md", join(root, "pinned-link.md"));
    await execFileAsync("git", ["add", "pinned-link.md"], { cwd: root });
    await execFileAsync("git", ["-c", "user.name=AIGRO Test", "-c", "user.email=test@aigro.local", "commit", "-qm", "symlink"], { cwd: root });
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root });
    await expect(buildPinnedGitManifest(root, stdout.trim())).rejects.toThrow("symlink");
  });
  it("ignores heading-shaped text inside fenced code blocks", () => {
    expect(extractHeadingLocators("# Real\n\n```md\n## Not a heading\n```\n\n## Child\n"))
      .toEqual([
        { depth: 1, text: "Real", path: "real", line: 1 },
        { depth: 2, text: "Child", path: "real/child", line: 7 },
      ]);
  });

  it("is deterministic, ordered, attributed, and citation-ready", async () => {
    const root = await fixture();
    const first = await buildJimmyKnowledgeManifest(root, EXPECTED_JIMMY_COMMIT);
    const second = await buildJimmyKnowledgeManifest(root, EXPECTED_JIMMY_COMMIT);

    expect(second).toEqual(first);
    expect(first.corpus).toMatchObject({
      repository: "https://github.com/jimmylau-DOTAI/growth-with-ai-guide",
      commit: EXPECTED_JIMMY_COMMIT,
      fileCount: 2,
    });
    expect(first.chapters.map((chapter) => chapter.path)).toEqual([
      "README.md",
      "stage-02/03-agents.md",
    ]);
    expect(first.chapters[1]).toMatchObject({
      stage: 2,
      order: 3,
      title: "Build AI Agents",
      headings: [
        { depth: 1, text: "Build AI Agents", path: "build-ai-agents", line: 1 },
        { depth: 2, text: "Context", path: "build-ai-agents/context", line: 3 },
      ],
      sourceUrl: `https://github.com/jimmylau-DOTAI/growth-with-ai-guide/blob/${EXPECTED_JIMMY_COMMIT}/stage-02/03-agents.md`,
    });
    expect(first.chapters[1].sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a commit other than the pinned commit", async () => {
    await expect(buildJimmyKnowledgeManifest(await fixture(), "0".repeat(40)))
      .rejects.toThrow("unexpected commit");
  });

  it("derives stage and chapter identifiers from the repository's localized paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "aigro-jimmy-localized-"));
    const chapterDir = join(root, "03-AI Builder（AI建構者）", "chapters");
    await mkdir(chapterDir, { recursive: true });
    await writeFile(join(chapterDir, "3-2-建立工作流.md"), "# 建立工作流\n");

    const manifest = await buildJimmyKnowledgeManifest(root, EXPECTED_JIMMY_COMMIT);
    expect(manifest.chapters[0]).toMatchObject({ stage: 3, chapter: "3-2", order: 2 });
  });

  it("rejects symlinks", async () => {
    const root = await fixture();
    await symlink(join(root, "README.md"), join(root, "linked.md"));
    await expect(buildJimmyKnowledgeManifest(root, EXPECTED_JIMMY_COMMIT))
      .rejects.toThrow("symlink");
  });

  it("rejects secret-like filenames and content", async () => {
    const filenameRoot = await fixture();
    await writeFile(join(filenameRoot, "credentials.md"), "# Private\n");
    await expect(buildJimmyKnowledgeManifest(filenameRoot, EXPECTED_JIMMY_COMMIT))
      .rejects.toThrow("secret-like filename");

    const contentRoot = await fixture();
    await writeFile(join(contentRoot, "leak.md"), `# Leak\n\napi_key=${"sk-"}abcdefghijklmnopqrstuvwxyz123456\n`);
    await expect(buildJimmyKnowledgeManifest(contentRoot, EXPECTED_JIMMY_COMMIT))
      .rejects.toThrow("secret-like content");
  });

  it.each(["api-key.md", "access_token.md", "passwords.md", ".env.md", "private-key.md"])(
    "rejects the obvious secret-like filename %s",
    async (filename) => {
      const root = await fixture();
      await writeFile(join(root, filename), "# Must not ingest\n");
      await expect(buildJimmyKnowledgeManifest(root, EXPECTED_JIMMY_COMMIT))
        .rejects.toThrow("secret-like filename");
    },
  );

  it.each(["prod-api-key.md", "github-token.md", "backup-credentials.md"])(
    "rejects sensitive tokens at basename boundaries in %s",
    async (filename) => {
      const root = await fixture();
      await writeFile(join(root, filename), "# Must not ingest\n");
      await expect(buildJimmyKnowledgeManifest(root, EXPECTED_JIMMY_COMMIT))
        .rejects.toThrow("secret-like filename");
    },
  );

  it("allows ordinary words that merely contain a sensitive substring", async () => {
    const root = await fixture();
    await writeFile(join(root, "tokenization-notes.md"), "# Tokenization notes\n");
    const manifest = await buildJimmyKnowledgeManifest(root, EXPECTED_JIMMY_COMMIT);
    expect(manifest.chapters.some((chapter) => chapter.path === "tokenization-notes.md"))
      .toBe(true);
  });

  it("rejects oversized Markdown and binary Markdown", async () => {
    const oversizedRoot = await fixture();
    await writeFile(join(oversizedRoot, "huge.md"), Buffer.alloc(1_048_577, "a"));
    await expect(buildJimmyKnowledgeManifest(oversizedRoot, EXPECTED_JIMMY_COMMIT))
      .rejects.toThrow("exceeds 1048576 bytes");

    const binaryRoot = await fixture();
    await writeFile(join(binaryRoot, "binary.md"), Buffer.from([0x23, 0x20, 0x78, 0x00]));
    await expect(buildJimmyKnowledgeManifest(binaryRoot, EXPECTED_JIMMY_COMMIT))
      .rejects.toThrow("binary");
  });
});

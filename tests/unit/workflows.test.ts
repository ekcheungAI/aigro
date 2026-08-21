import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

/**
 * A workflow that does not parse reports nothing, and on a green PR page that
 * looks exactly like a workflow that passed.
 *
 * This is not hypothetical: ekmission's verify.yml held an unquoted value
 * containing a colon-space, which YAML reads as a nested mapping. The document
 * failed to parse and GitHub ran NONE of the steps for weeks while the repo
 * looked healthy. Deploy automation makes that failure mode more expensive
 * here, because a broken workflow means "did not deploy" rather than a loud
 * error.
 */
const WORKFLOW_DIR = join(process.cwd(), ".github", "workflows");

function workflowFiles(): string[] {
  return readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
}

describe("GitHub workflows", () => {
  it("finds workflow files to check", () => {
    expect(workflowFiles().length).toBeGreaterThan(0);
  });

  it.each(workflowFiles())("%s is valid YAML", (file) => {
    const raw = readFileSync(join(WORKFLOW_DIR, file), "utf8");
    expect(() => yaml.load(raw)).not.toThrow();
  });

  it.each(workflowFiles())("%s declares jobs with steps", (file) => {
    const doc = yaml.load(readFileSync(join(WORKFLOW_DIR, file), "utf8")) as {
      jobs?: Record<string, { steps?: unknown[]; uses?: string }>;
    };
    expect(doc.jobs).toBeTruthy();
    const jobs = Object.entries(doc.jobs ?? {});
    expect(jobs.length).toBeGreaterThan(0);
    for (const [name, job] of jobs) {
      // A job either runs steps or calls a reusable workflow.
      const hasWork = (Array.isArray(job?.steps) && job.steps.length > 0) || Boolean(job?.uses);
      expect(hasWork, `job ${name} in ${file} has no steps`).toBe(true);
    }
  });

  it("deploys only after verification succeeds, in the same workflow run", () => {
    const raw = readFileSync(join(WORKFLOW_DIR, "ci.yml"), "utf8");
    const doc = yaml.load(raw) as {
      on?: Record<string, unknown>;
      jobs?: Record<string, { needs?: string | string[]; if?: string }>;
    };

    const deploy = doc.jobs?.deploy;
    expect(deploy, "deploy must live in ci.yml, not a separate workflow").toBeTruthy();

    // `needs` is the whole guarantee. Without it the deploy job runs in
    // parallel with the tests and usually wins, because it has less to do -
    // which ships a red build.
    const needs = Array.isArray(deploy?.needs) ? deploy?.needs : [deploy?.needs];
    expect(needs).toContain("application");
    expect(needs).toContain("database-and-functions");

    // A needed job that FAILS skips the dependant, so no conclusion guard is
    // required. But main-only is not implied by `needs` — assert it, or every
    // PR would deploy to production.
    expect(deploy?.if ?? "").toContain("refs/heads/main");
  });

  it("does not merge the scheduled sync into the code pipeline", () => {
    // The sync runs every 30 minutes on a timer and touches no code. Folding
    // it in would either run the full suite 48x/day or bury the pipeline in
    // `if: github.event_name != 'schedule'` guards.
    const ci = yaml.load(readFileSync(join(WORKFLOW_DIR, "ci.yml"), "utf8")) as {
      on?: Record<string, unknown>;
    };
    expect(ci.on).not.toHaveProperty("schedule");
    expect(workflowFiles()).toContain("sync-supabase.yml");
  });
});

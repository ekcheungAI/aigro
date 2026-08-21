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

  it("deploys only after verification succeeds on main", () => {
    const raw = readFileSync(join(WORKFLOW_DIR, "deploy.yml"), "utf8");
    const doc = yaml.load(raw) as {
      on?: { workflow_run?: { workflows?: string[]; types?: string[]; branches?: string[] } };
      jobs?: Record<string, { if?: string }>;
    };
    // Deploying on raw push would ship a red build. It must key off the
    // verify workflow completing.
    const trigger = doc.on?.workflow_run;
    expect(trigger, "deploy must trigger on workflow_run, not push").toBeTruthy();
    expect(trigger?.workflows).toContain("Verify application and backend contracts");
    expect(trigger?.branches).toContain("main");

    // workflow_run fires on FAILURE too; the guard is the conclusion check.
    const guard = Object.values(doc.jobs ?? {})[0]?.if ?? "";
    expect(guard).toContain("success");
  });
});

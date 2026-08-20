import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scopedSiteProtectionHeaders } from "../../scripts/site-protection.mjs";

const checker = readFileSync("scripts/check-production-integrations.mjs", "utf8");
const acceptance = readFileSync("tests/e2e/beta-live-chat.spec.ts", "utf8");
const betaGuide = readFileSync("docs/BETA-RELEASE.md", "utf8");

describe("strict production/beta checker", () => {
  it("requires a fresh environment-bound authenticated acceptance artifact", () => {
    expect(checker).toContain("AIGRO_E2E_REPORT_PATH");
    expect(checker).toContain("report?.siteUrl === SITE");
    expect(checker).toContain("report?.supabaseUrl === SUPABASE_URL");
    expect(checker).toContain("ageMs <= 15 * 60_000");
    expect(checker).toContain("releaseInstructors.some");
    expect(checker).not.toContain('"not run: provide a staging/prod smoke identity');
  });

  it("has the acceptance test produce evidence only after CRM consent and deletion pass", () => {
    expect(acceptance).toContain("consent_lead_contact");
    expect(acceptance).toContain("withdraw_lead_contact_consent");
    expect(acceptance).toContain("idempotent_deletion");
    expect(acceptance.indexOf("acceptancePassed = true")).toBeLessThan(
      acceptance.lastIndexOf("writeFileSync("),
    );
  });

  it("scopes the beta protection bypass to the configured site origin", () => {
    expect(checker).toContain("AIGRO_E2E_PROTECTION_BYPASS");
    expect(scopedSiteProtectionHeaders(
      "https://beta.aigro.io/account",
      "https://beta.aigro.io",
      "review-secret",
    )).toEqual({ "x-vercel-protection-bypass": "review-secret" });
    expect(scopedSiteProtectionHeaders(
      "https://staging-aigro.supabase.co/rest/v1/rpc/list_public_instructors",
      "https://beta.aigro.io",
      "review-secret",
    )).toEqual({});

    const checkerCommand = betaGuide.match(
      /Run the integration checker against the staging backend:\s*```bash([\s\S]*?)```/,
    )?.[1];
    expect(checkerCommand).toContain("AIGRO_E2E_PROTECTION_BYPASS");
    expect(checkerCommand).toContain("npm run check:production -- --strict");
  });
});

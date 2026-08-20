import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AIGRO_BETA_PROJECT_ID,
  AIGRO_PRODUCTION_PROJECT_ID,
  AIGRO_PRODUCTION_SUPABASE_URL,
  assertDeploymentContract,
  deploymentRobotsTags,
} from "@/lib/deploymentEnvironment";
import { resolveE2EEnvironment } from "../../playwright.environment";

describe("beta deployment contract", () => {
  it("uses a remote E2E base URL without starting the local dev server", () => {
    const config = resolveE2EEnvironment("https://preview.example.com/", "3000", true);

    expect(config.baseURL).toBe("https://preview.example.com");
    expect(config.webServer).toBeUndefined();
  });

  it("keeps the local Playwright server when no remote base URL is configured", () => {
    const config = resolveE2EEnvironment(undefined, "3000", true);

    expect(config.baseURL).toBe("http://127.0.0.1:3000");
    expect(config.webServer).toBeDefined();
  });

  it("requires the protected-beta automation bypass without installing a global secret header", () => {
    expect(() => resolveE2EEnvironment(
      "https://beta.aigro.io",
      "3000",
      true,
      undefined,
      false,
    )).toThrow(/AIGRO_E2E_PROTECTION_BYPASS/);

    const config = resolveE2EEnvironment(
      "https://beta.aigro.io",
      "3000",
      true,
      "review-secret",
      false,
    );
    expect(config).toMatchObject({
      baseURL: "https://beta.aigro.io",
      globalSetup: "./tests/e2e/global-setup.ts",
      storageState: "test-results/.beta-protection-storage.json",
    });
    const globalSetup = readFileSync(
      resolve(process.cwd(), "tests/e2e/global-setup.ts"),
      "utf8",
    );
    expect(globalSetup).toContain('"x-vercel-protection-bypass": bypassSecret');
    expect(globalSetup).toContain("maxRedirects: 0");
    expect(globalSetup).toContain("mode: 0o600");
    expect(readFileSync(resolve(process.cwd(), "playwright.config.ts"), "utf8"))
      .not.toContain("extraHTTPHeaders");
  });

  it("returns a crawler-readable noindex policy for beta builds", () => {
    expect(deploymentRobotsTags("beta")).toEqual([
      {
        tag: "meta",
        attrs: { name: "robots", content: "noindex, nofollow, noarchive" },
        injectTo: "head-prepend",
      },
      {
        tag: "meta",
        attrs: { name: "googlebot", content: "noindex, nofollow, noarchive" },
        injectTo: "head-prepend",
      },
    ]);
  });

  it("does not return a robots override for production builds", () => {
    expect(deploymentRobotsTags("production")).toEqual([]);
  });

  it("requires an isolated, complete environment for the beta Vercel project", () => {
    const validBeta = {
      vercel: "1",
      vercelProjectId: AIGRO_BETA_PROJECT_ID,
      deployEnvironment: "beta",
      siteUrl: "https://beta.aigro.io",
      supabaseUrl: "https://staging-aigro.supabase.co",
      supabaseAnonKey: "sb_publishable_staging",
      turnstileSiteKey: "turnstile-staging",
      chatRollout: "true",
    };

    expect(() => assertDeploymentContract(validBeta)).not.toThrow();
    expect(() => assertDeploymentContract({
      ...validBeta,
      supabaseUrl: AIGRO_PRODUCTION_SUPABASE_URL,
    })).toThrow("deployment_contract_isolated_beta_supabase_required");
    expect(() => assertDeploymentContract({
      ...validBeta,
      turnstileSiteKey: "",
    })).toThrow("deployment_contract_beta_turnstile_key_required");
    expect(() => assertDeploymentContract({
      ...validBeta,
      deployEnvironment: "production",
    })).toThrow("deployment_contract_beta_identity_mismatch");
    expect(() => assertDeploymentContract({
      ...validBeta,
      vercelProjectId: "prj_not_the_beta_project",
      vercelProjectName: "aigro-beta",
    })).toThrow("deployment_contract_unknown_vercel_project");
    expect(() => assertDeploymentContract({
      ...validBeta,
      vercelProjectName: "aigro",
    })).toThrow("deployment_contract_vercel_project_name_mismatch");
  });

  it("rejects beta values on the production Vercel project", () => {
    expect(() => assertDeploymentContract({
      vercel: "1",
      vercelProjectId: AIGRO_PRODUCTION_PROJECT_ID,
      deployEnvironment: "beta",
      siteUrl: "https://beta.aigro.io",
      supabaseUrl: "https://staging-aigro.supabase.co",
      supabaseAnonKey: "sb_publishable_staging",
      turnstileSiteKey: "turnstile-staging",
      chatRollout: "true",
    })).toThrow("deployment_contract_production_identity_mismatch");
  });

  it("documents beta as an isolated staging contract", () => {
    const envExample = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
    const betaGuidePath = resolve(process.cwd(), "docs/BETA-RELEASE.md");
    expect(existsSync(betaGuidePath)).toBe(true);
    if (!existsSync(betaGuidePath)) return;

    const betaGuide = readFileSync(betaGuidePath, "utf8");
    const productionOrigins = envExample
      .split("\n")
      .find((line) => line.startsWith("ALLOWED_ORIGINS="));

    expect(envExample).toContain("VITE_DEPLOY_ENV=production");
    expect(productionOrigins).not.toContain("beta.aigro.io");
    expect(betaGuide).toContain("`aigro-beta`");
    expect(betaGuide).toContain("https://beta.aigro.io");
    expect(betaGuide).toContain("VITE_DEPLOY_ENV=beta");
    expect(betaGuide).toContain("AIGRO_E2E_BASE_URL=https://beta.aigro.io");
    expect(betaGuide).toContain("AIGRO_E2E_PROTECTION_BYPASS");
  });

  it("declares the Vite build and dist output for both Vercel projects", () => {
    const vercel = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(vercel).toMatchObject({
      framework: "vite",
      buildCommand: "npm run build",
      installCommand: "npm ci",
      outputDirectory: "dist",
    });
  });
});

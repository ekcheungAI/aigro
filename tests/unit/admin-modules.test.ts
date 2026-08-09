import { describe, expect, it } from "vitest";
import {
  ADMIN_MODULES,
  PRODUCTION_INTEGRATIONS,
  adminModuleForPath,
} from "@/components/admin/adminModules";
import { STUDIO_REVIEW_SELECT } from "@/pages/admin/AdminStudio";

describe("master admin module status", () => {
  it("keeps every admin route unique and reviewable", () => {
    const routes = ADMIN_MODULES.map((module) => module.to);
    expect(new Set(routes).size).toBe(routes.length);
    expect(ADMIN_MODULES.every((module) => module.reviewedAt)).toBe(true);
  });

  it("marks every partly connected module as beta with an honest reason", () => {
    const betaModules = ADMIN_MODULES
      .filter((module) => module.status === "beta")
      .map((module) => module.en);

    expect(betaModules).toEqual([
      "Experts",
      "Studio",
      "CRM",
      "Sources",
      "Skills",
      "Engagement",
      "Members",
      "Emails",
      "Settings",
    ]);
    expect(
      ADMIN_MODULES
        .filter((module) => module.status === "beta")
        .every((module) => module.betaReason.trim().length > 0)
    ).toBe(true);
  });

  it("resolves nested admin paths to the correct module", () => {
    expect(adminModuleForPath("/admin").en).toBe("Dashboard");
    expect(adminModuleForPath("/admin/studio/review").en).toBe("Studio");
  });

  it("disambiguates the revision source relationship used by PostgREST", () => {
    expect(STUDIO_REVIEW_SELECT).toContain(
      "knowledge_sources!knowledge_revisions_source_id_fkey"
    );
  });

  it("does not describe disconnected instructor pipelines as live", () => {
    const statuses = Object.fromEntries(
      PRODUCTION_INTEGRATIONS.map((integration) => [integration.key, integration.status])
    );

    expect(statuses.edge_functions).toBe("beta");
    expect(statuses.email_auth).toBe("beta");
    expect(statuses.anonymous_chat).toBe("blocked");
    expect(statuses.instructor_model).toBe("blocked");
    expect(statuses.distillation).toBe("blocked");
    expect(statuses.persona_compiler).toBe("blocked");
    expect(statuses.booking).toBe("blocked");
  });
});

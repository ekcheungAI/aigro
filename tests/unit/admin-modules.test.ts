import { describe, expect, it } from "vitest";
import {
  ADMIN_MODULES,
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
      "Sources",
      "Skills",
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
});

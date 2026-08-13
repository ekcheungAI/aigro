import { describe, expect, it } from "vitest";
import { resolveAuthRedirectUrl } from "../../src/lib/authRedirect";

describe("resolveAuthRedirectUrl", () => {
  it("uses the canonical AIGRO domain in production", () => {
    expect(
      resolveAuthRedirectUrl({
        currentOrigin: "https://aigro-blue.vercel.app",
        isProduction: true,
      })
    ).toBe("https://aigro-blue.vercel.app");
  });

  it("keeps localhost during development", () => {
    expect(
      resolveAuthRedirectUrl({
        currentOrigin: "http://localhost:3000",
        isProduction: false,
      })
    ).toBe("http://localhost:3000");
  });

  it("honours an explicit site URL and removes trailing slashes", () => {
    expect(
      resolveAuthRedirectUrl({
        configuredSiteUrl: "https://aigro-blue.vercel.app///",
        currentOrigin: "http://localhost:3000",
        isProduction: false,
      })
    ).toBe("https://aigro-blue.vercel.app");
  });
});

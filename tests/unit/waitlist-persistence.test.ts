import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabaseReady: true,
  supabase: { from: () => ({ insert }) },
}));

import { captureWaitlistWithFallback } from "@/lib/waitlist";

const entry = {
  email: "reader@example.com",
  kind: "newsletter" as const,
  source: "unit-test",
};

describe("waitlist persistence", () => {
  beforeEach(() => {
    insert.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reports a confirmed server insert", async () => {
    insert.mockResolvedValueOnce({ error: null });

    await expect(
      captureWaitlistWithFallback(entry, "waitlist-test")
    ).resolves.toBe("server");
  });

  it("stores an explicit local fallback after a server error", async () => {
    insert.mockResolvedValueOnce({ error: new Error("offline") });

    await expect(
      captureWaitlistWithFallback(entry, "waitlist-test")
    ).resolves.toBe("local");
    expect(window.localStorage.getItem("waitlist-test")).toContain(
      "reader@example.com"
    );
  });

  it("returns null when both persistence paths fail", async () => {
    insert.mockResolvedValueOnce({ error: new Error("offline") });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("storage unavailable");
        },
      },
    });

    await expect(
      captureWaitlistWithFallback(entry, "waitlist-test")
    ).resolves.toBeNull();
  });
});

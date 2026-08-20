import { beforeEach, describe, expect, it, vi } from "vitest";

const { captureWaitlistWithFallback } = vi.hoisted(() => ({
  captureWaitlistWithFallback: vi.fn(),
}));

vi.mock("@/lib/waitlist", () => ({ captureWaitlistWithFallback }));

import {
  appendInterest,
  EXPERT_INTEREST_KEY,
} from "@/lib/interest";

describe("interest persistence", () => {
  beforeEach(() => {
    captureWaitlistWithFallback.mockReset();
  });

  it("reports a confirmed server save only after Supabase resolves", async () => {
    captureWaitlistWithFallback.mockResolvedValueOnce("server");

    await expect(
      appendInterest(EXPERT_INTEREST_KEY, { email: "expert@example.com" })
    ).resolves.toBe("server");
  });

  it("reports the local fallback when the server save is unavailable", async () => {
    captureWaitlistWithFallback.mockImplementationOnce(async (_entry, key, localEntry) => {
      window.localStorage.setItem(key, JSON.stringify([localEntry]));
      return "local";
    });

    await expect(
      appendInterest(EXPERT_INTEREST_KEY, { email: "expert@example.com" })
    ).resolves.toBe("local");
    expect(window.localStorage.getItem(EXPERT_INTEREST_KEY)).toContain(
      "expert@example.com"
    );
  });

  it("does not claim success when neither persistence path works", async () => {
    captureWaitlistWithFallback.mockResolvedValueOnce(null);

    await expect(
      appendInterest(EXPERT_INTEREST_KEY, { email: "expert@example.com" })
    ).resolves.toBeNull();
  });
});

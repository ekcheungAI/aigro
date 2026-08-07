import { describe, expect, it } from "vitest";
import {
  hasFullPlatformAccess,
  hasHumanBookingAccess,
  type AigroMember,
} from "@/components/auth/member";

function member(overrides: Partial<AigroMember> = {}): AigroMember {
  return {
    name: "Test member",
    email: "member@test.local",
    interests: [],
    persona: null,
    role: "free",
    tier: "free",
    joinedAt: Date.now(),
    notifications: { daily: true, weekly: true, product: false },
    ...overrides,
  };
}

describe("member entitlements", () => {
  it("gives a super admin full platform access regardless of billing tier", () => {
    expect(hasFullPlatformAccess(member({ role: "super_admin", tier: "free" }))).toBe(true);
    expect(hasHumanBookingAccess(member({ role: "super_admin", tier: "free" }))).toBe(true);
  });

  it("does not turn a regular free admin into a VIP member", () => {
    expect(hasFullPlatformAccess(member({ role: "admin", tier: "free" }))).toBe(false);
    expect(hasHumanBookingAccess(member({ role: "admin", tier: "free" }))).toBe(false);
  });

  it("keeps VIP booking access for ordinary members", () => {
    expect(hasHumanBookingAccess(member({ role: "founding", tier: "vip" }))).toBe(true);
  });
});

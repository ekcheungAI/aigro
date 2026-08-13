import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEW_MEMBER_CLASS,
  memberRoleFromAccess,
} from "@/components/auth/accountAccessRole";

describe("account access member classes", () => {
  it("calls every new signup a founding member without changing billing tier", () => {
    expect(DEFAULT_NEW_MEMBER_CLASS).toBe("founding");
    expect(memberRoleFromAccess({
      app_role: "member",
      member_class: DEFAULT_NEW_MEMBER_CLASS,
      tier: "free",
    })).toBe("founding");
  });

  it("keeps legacy rows compatible before member_class is hydrated", () => {
    expect(memberRoleFromAccess({ app_role: "member", tier: "free" })).toBe("free");
    expect(memberRoleFromAccess({ app_role: "member", tier: "pro" })).toBe("founding");
  });

  it("keeps privileged app roles ahead of member class", () => {
    expect(memberRoleFromAccess({
      app_role: "super_admin",
      member_class: "founding",
      tier: "free",
    })).toBe("super_admin");
    expect(memberRoleFromAccess({
      app_role: "expert",
      member_class: "founding",
      tier: "free",
    })).toBe("expert");
  });
});

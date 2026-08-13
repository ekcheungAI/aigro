import { describe, expect, it } from "vitest";
import { authUserDisplayName } from "@/lib/authUserProfile";

describe("auth user profile seed", () => {
  it("uses the invitation name stored by the server", () => {
    expect(authUserDisplayName({ name: "  Invited Member  " }, "member@example.com"))
      .toBe("Invited Member");
  });

  it("falls back to the email prefix for ordinary signups", () => {
    expect(authUserDisplayName({}, "member@example.com")).toBe("member");
    expect(authUserDisplayName({ name: "" }, "")).toBe("會員");
  });
});

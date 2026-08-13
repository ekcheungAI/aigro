import { describe, expect, it } from "vitest";
import {
  isInvitationPasswordSetup,
  passwordSetupDestination,
} from "@/lib/invitationAcceptance";

describe("invitation password setup", () => {
  it("recognises the server-generated invite callback", () => {
    expect(isInvitationPasswordSetup("?invite=1")).toBe(true);
    expect(isInvitationPasswordSetup("?invite=0")).toBe(false);
    expect(isInvitationPasswordSetup("")).toBe(false);
  });

  it("keeps an invited user signed in after choosing a password", () => {
    expect(passwordSetupDestination("?invite=1")).toBe("/account?invited=1");
    expect(passwordSetupDestination("")).toBe("/login");
  });
});

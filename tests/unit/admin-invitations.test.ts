import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke } },
}));

import {
  resendAdminInvitation,
  sendAdminInvitation,
} from "@/lib/adminInvitations";

describe("admin invitation client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoke.mockResolvedValue({ data: { invitation: { id: "invite-1" } }, error: null });
  });

  it("normalises the invitation before invoking the protected function", async () => {
    await expect(sendAdminInvitation({
      email: " Member@Example.com ",
      name: " New Member ",
      memberClass: "founding",
      tier: "free",
      personalMessage: " Welcome ",
    })).resolves.toMatchObject({ ok: true, invitationId: "invite-1" });

    expect(invoke).toHaveBeenCalledWith("admin-send-invite", {
      body: {
        email: "member@example.com",
        name: "New Member",
        memberClass: "founding",
        tier: "free",
        personalMessage: "Welcome",
      },
    });
  });

  it("returns the server error without leaking provider details", async () => {
    invoke.mockResolvedValue({
      data: { error: "Invitation already pending", code: "invite_exists" },
      error: { message: "Edge Function returned a non-2xx status code" },
    });

    await expect(sendAdminInvitation({
      email: "member@example.com",
      name: "Member",
      memberClass: "founding",
      tier: "free",
    })).resolves.toEqual({
      ok: false,
      code: "invite_exists",
      error: "Invitation already pending",
    });
  });

  it("resends an existing invitation by its server id", async () => {
    await expect(
      resendAdminInvitation("3ad30004-1cf4-4e11-96e8-f7e5f16f9ad7")
    ).resolves.toMatchObject({ ok: true, invitationId: "invite-1" });

    expect(invoke).toHaveBeenCalledWith("admin-send-invite", {
      body: { invitationId: "3ad30004-1cf4-4e11-96e8-f7e5f16f9ad7" },
    });
  });
});

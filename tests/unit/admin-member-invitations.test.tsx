import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const currentRole = vi.hoisted(() => ({ value: "super_admin" }));
const invitationRows = vi.hoisted(() => ({ value: [] as Array<Record<string, unknown>> }));
const resendInvitation = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useMember", () => ({
  useMember: () => ({ member: { role: currentRole.value }, loading: false }),
}));

vi.mock("@/components/admin/adminData", () => ({
  countRows: vi.fn(),
  formatDate: () => "2026-08-14",
  timeAgo: () => "剛剛",
  useAdminQuery: () => ({
    data: { profiles: [], total: 0, mcpWaitlist: [], invitations: invitationRows.value },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/admin/AdminToast", () => ({ useAdminToast: () => vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/adminInvitations", () => ({
  resendAdminInvitation: resendInvitation,
  sendAdminInvitation: vi.fn(),
}));

import AdminMembers from "@/pages/admin/AdminMembers";

describe("super-admin member invitations", () => {
  afterEach(() => {
    cleanup();
    currentRole.value = "super_admin";
    invitationRows.value = [];
    vi.clearAllMocks();
  });

  it("opens an invitation form for the super admin", () => {
    render(<AdminMembers />);
    fireEvent.click(screen.getByRole("button", { name: "發送邀請" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("heading", { name: "邀請新會員" })).toBeVisible();
    expect(screen.getByLabelText("姓名")).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("會員級別")).toBeVisible();
    expect(screen.getByLabelText("層級")).toBeVisible();
  });

  it("does not expose the invitation action to an ordinary admin", () => {
    currentRole.value = "admin";
    render(<AdminMembers />);

    expect(screen.queryByRole("button", { name: "發送邀請" })).not.toBeInTheDocument();
  });

  it("offers a resend action for an unsuccessful invitation", () => {
    invitationRows.value = [{
      id: "3ad30004-1cf4-4e11-96e8-f7e5f16f9ad7",
      email: "member@example.com",
      name: "Member",
      member_class: "founding",
      tier: "free",
      personal_message: null,
      status: "failed",
      delivery_status: "failed",
      send_count: 1,
      sent_at: null,
      delivered_at: null,
      accepted_at: null,
      expires_at: "2026-08-14T00:00:00.000Z",
      created_at: "2026-08-14T00:00:00.000Z",
    }];
    resendInvitation.mockResolvedValue({ ok: true, invitationId: invitationRows.value[0].id });

    render(<AdminMembers />);
    fireEvent.click(screen.getByRole("button", { name: "重新發送 member@example.com" }));

    expect(resendInvitation).toHaveBeenCalledWith(invitationRows.value[0].id);
  });
});

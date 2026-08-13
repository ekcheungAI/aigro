import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const memberState = vi.hoisted(() => ({
  member: null as null | { role: string },
  loading: true,
}));

vi.mock("@/hooks/useMember", () => ({
  useMember: () => ({ ...memberState, refresh: vi.fn() }),
}));

vi.mock("@/hooks/useAdminQuery", () => ({
  useAdminQuery: () => ({ data: null, loading: false, error: null }),
}));

import AdminLayout from "@/components/admin/AdminLayout";
import PortalLayout from "@/components/portal/PortalLayout";

describe("protected-area loading UI", () => {
  afterEach(cleanup);

  beforeEach(() => {
    memberState.member = null;
    memberState.loading = true;
  });

  it("shows a neutral session check in admin without an unauthorized message", () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toHaveTextContent("正在確認登入狀態");
    expect(screen.queryByText("需要 admin 帳號登入")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "去登入" })).not.toBeInTheDocument();
  });

  it("shows a neutral session check in portal without an unauthorized message", () => {
    render(
      <MemoryRouter>
        <PortalLayout />
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toHaveTextContent("正在確認登入狀態");
    expect(screen.queryByText("需要領航專家帳號登入")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "去登入" })).not.toBeInTheDocument();
  });
});

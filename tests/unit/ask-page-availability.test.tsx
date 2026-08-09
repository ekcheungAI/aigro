import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryState = vi.hoisted(() => ({
  data: null as unknown,
  loading: true,
  error: null as string | null,
  refetch: vi.fn(),
}));

vi.mock("@/components/admin/adminData", () => ({
  useAdminQuery: () => queryState,
}));

vi.mock("@/data/liveItems", () => ({
  useLiveItems: () => null,
  useLiveFetchedAt: () => null,
}));

import Ask from "@/pages/Ask";

function renderAsk(entry = "/ask?expert=new-instructor") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Ask />
    </MemoryRouter>
  );
}

describe("Ask unavailable instructor UI", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    queryState.data = null;
    queryState.loading = true;
    queryState.error = null;
  });

  it("shows the requested instructor as unavailable and blocks message entry", () => {
    renderAsk();

    expect(screen.getByText(/正在載入指定 AI 導師/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^問下/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "送出問題" })).toBeDisabled();
  });

  it("discloses transcript access, CRM follow-up and anonymous retention", () => {
    renderAsk();

    expect(screen.getByText(/所選導師及獲授權 AIGRO 管理員/)).toBeInTheDocument();
    expect(screen.getByText(/CRM 跟進/)).toBeInTheDocument();
    expect(screen.getByText(/匿名對話保留 30 日/)).toBeInTheDocument();
  });
});

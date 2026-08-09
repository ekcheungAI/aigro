import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryState = vi.hoisted(() => ({
  data: null as unknown,
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
}));

vi.mock("@/components/admin/adminData", () => ({
  useAdminQuery: () => queryState,
}));

vi.mock("@/hooks/usePageMeta", () => ({ default: () => undefined }));

vi.mock("@/lib/expertProfiles", () => ({
  fetchExpertProfile: vi.fn().mockResolvedValue(null),
  fetchExpertLiveStats: vi.fn().mockResolvedValue({
    conversations: 0,
    insights: 0,
    knowledge: 0,
  }),
  fetchExpertTopInsights: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/experts/ExpertIpHero", () => ({
  default: ({ chatReady }: { chatReady?: boolean }) => (
    <div data-testid="expert-hero" data-chat-ready={String(chatReady)} />
  ),
}));
vi.mock("@/components/experts/ExpertStatsBand", () => ({
  default: () => null,
}));
vi.mock("@/components/experts/ExpertSocialWall", () => ({
  default: () => null,
}));
vi.mock("@/components/experts/ExpertTopInsights", () => ({
  default: ({ chatReady }: { chatReady?: boolean }) => (
    <div data-testid="top-insights" data-chat-ready={String(chatReady)} />
  ),
}));
vi.mock("@/components/expert/ExpertStyleSections", () => ({
  default: () => null,
}));

import { normalizePublicInstructor, type PublicInstructorRow } from "@/lib/publicInstructors";
import ExpertProfile from "@/pages/ExpertProfile";

const row: PublicInstructorRow = {
  id: "90000000-0000-0000-0000-000000000001",
  slug: "new-instructor",
  display_name: "New Instructor",
  name_en: "New Instructor",
  name_zh: "新導師",
  title: "AI 增長導師",
  bio: "由已批准資料建立嘅公開導師簡介。",
  brand_color: null,
  specialties: ["AI 增長"],
  quote: "先驗證，再放大。",
  credential: "AIGRO 領航專家",
  verified: true,
  radar: [],
  traits: [],
  public_profile_enabled: true,
  greeting: "你好，我係新導師嘅授權 AI 版本。",
  chat_ready: false,
};

describe("ExpertProfile chat availability", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    queryState.data = [normalizePublicInstructor(row)];
    queryState.loading = false;
    queryState.error = null;
  });

  it("retains live chat readiness and shows a truthful disabled Beta CTA", () => {
    render(
      <MemoryRouter initialEntries={["/experts/new-instructor"]}>
        <Routes>
          <Route path="/experts/:slug" element={<ExpertProfile />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("expert-hero")).toHaveAttribute(
      "data-chat-ready",
      "false"
    );
    expect(screen.getByTestId("top-insights")).toHaveAttribute(
      "data-chat-ready",
      "false"
    );
    const betaButtons = screen.getAllByRole("button", {
      name: /AI 分身聊天暫未開放.*Beta/i,
    });
    expect(betaButtons.length).toBeGreaterThan(0);
    expect(betaButtons.every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(screen.queryByText(/免費無限對話/)).not.toBeInTheDocument();
    expect(screen.getByText(/每日對話額度按帳戶級別計算/)).toBeInTheDocument();
    expect(
      screen.getByText(/匿名每日 10 次.*會員 20 次.*Pro 100 次.*VIP 200 次/)
    ).toBeInTheDocument();
  });
});

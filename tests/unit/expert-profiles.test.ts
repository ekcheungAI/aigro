import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: supabaseMock.getSession },
    from: supabaseMock.from,
  },
}));

import {
  fetchExpertLiveStats,
  fetchExpertTopInsights,
} from "@/lib/expertProfiles";

describe("public expert profile data", () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
    supabaseMock.getSession.mockReset();
    supabaseMock.getSession.mockResolvedValue({ data: { session: null } });
  });

  it("queries only the public published-items projection without a session", async () => {
    const stats = await fetchExpertLiveStats("jimmy-lau");
    const insights = await fetchExpertTopInsights("jimmy-lau", []);

    expect(stats).toEqual({ conversations: 0, insights: 0, knowledge: 0 });
    expect(insights).toEqual([]);
    expect(supabaseMock.from).toHaveBeenCalledWith("items");
  });
});

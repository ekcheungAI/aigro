import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession } },
}));

import { fetchArgroHealth } from "@/lib/argroHealth";

const payload = {
  status: "ok",
  now: "2026-08-08T00:00:00Z",
  llm: { configured: true, base_url: "private", model: "configured" },
  articles: { total: 1, today: 1, week: 1, unclassified: 0, untranslated_zh_tw: 0 },
  last_fetch: "2026-08-08T00:00:00Z",
  sources: [],
};

describe("argro admin health client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getSession.mockResolvedValue({ data: { session: { access_token: "admin-jwt" } } });
  });

  it("uses the authenticated same-origin proxy and never sends an upstream key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchArgroHealth()).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/argro-health", {
      headers: { Authorization: "Bearer admin-jwt" },
      signal: undefined,
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("X-API-Key");
  });

  it("fails closed when there is no authenticated admin session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(fetchArgroHealth()).rejects.toThrow("需要管理員登入");
  });
});

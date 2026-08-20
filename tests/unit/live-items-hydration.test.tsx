import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => {
  const pendingQuery = new Promise(() => undefined);
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(() => pendingQuery),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);

  return {
    from: vi.fn(() => query),
  };
});

vi.mock("@/lib/supabase", () => ({
  supabaseReady: true,
  supabase: { from: supabaseMock.from },
}));

describe("live items hydration", () => {
  beforeEach(() => {
    vi.resetModules();
    supabaseMock.from.mockClear();
  });

  it("does not start the live fetch while server-rendering prerendered HTML", async () => {
    const { useLiveItems } = await import("@/data/liveItems");

    function Probe() {
      return <span>{useLiveItems() ? "live" : "snapshot"}</span>;
    }

    expect(renderToString(<Probe />)).toContain("snapshot");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});

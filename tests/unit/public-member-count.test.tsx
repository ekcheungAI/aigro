import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc },
}));

import usePublicMemberCount from "@/hooks/usePublicMemberCount";

describe("usePublicMemberCount", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("returns the aggregate member count from the public RPC", async () => {
    rpc.mockResolvedValueOnce({ data: 247, error: null });

    const { result } = renderHook(() => usePublicMemberCount());

    await waitFor(() => expect(result.current).toBe(247));
    expect(rpc).toHaveBeenCalledWith("public_member_count");
  });

  it("does not present a fake zero when the aggregate is unavailable", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("offline") });

    const { result } = renderHook(() => usePublicMemberCount());

    await waitFor(() => expect(rpc).toHaveBeenCalledOnce());
    expect(result.current).toBeNull();
  });
});

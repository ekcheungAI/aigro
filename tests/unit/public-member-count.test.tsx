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

  it("starts at the 110-member baseline and adds registered members", async () => {
    rpc.mockResolvedValueOnce({ data: 47, error: null });

    const { result } = renderHook(() => usePublicMemberCount());

    expect(result.current).toBe(110);
    await waitFor(() => expect(result.current).toBe(157));
    expect(rpc).toHaveBeenCalledWith("public_member_count");
  });

  it("keeps the baseline when the aggregate is unavailable", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("offline") });

    const { result } = renderHook(() => usePublicMemberCount());

    await waitFor(() => expect(rpc).toHaveBeenCalledOnce());
    expect(result.current).toBe(110);
  });
});

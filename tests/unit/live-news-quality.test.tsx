import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const liveMock = vi.hoisted(() => {
  const state = {
    rows: [] as Array<Record<string, unknown>>,
  };
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(async () => ({ data: state.rows, error: null })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return { state, query, from: vi.fn(() => query) };
});

vi.mock("@/lib/supabase", () => ({
  supabaseReady: true,
  supabase: { from: liveMock.from },
}));

function row(
  id: string,
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id,
    title: "OpenAI 發布全新推理模型",
    summary: "新模型提升多步推理能力，並加入更完整的安全評估。",
    original_url: `https://example.com/${id}`,
    category: "model_release",
    tags: ["OpenAI"],
    score: 90,
    lang: "zh-HK",
    placement: "featured",
    published_at: "2026-08-22T01:00:00Z",
    sources: { name: "OpenAI Blog" },
    ...overrides,
  };
}

async function flushLiveFetch() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("live news quality boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    liveMock.state.rows = [];
    liveMock.from.mockClear();
    liveMock.query.limit.mockClear();
  });

  it("does not replace a newer bundled snapshot with stale live rows", async () => {
    liveMock.state.rows = Array.from({ length: 5 }, (_, index) =>
      row(`stale-${index}`, { published_at: "2026-08-01T01:00:00Z" }),
    );
    const { useLiveItems } = await import("@/data/liveItems");
    const { result } = renderHook(() => useLiveItems());

    await flushLiveFetch();

    expect(liveMock.query.limit).toHaveBeenCalledOnce();
    expect(result.current).toBeNull();
  });

  it("fails closed when live rows are English instead of Hong Kong Chinese", async () => {
    liveMock.state.rows = Array.from({ length: 5 }, (_, index) =>
      row(`english-${index}`, {
        title: "OpenAI releases a new reasoning model",
        summary: "The model improves multi-step reasoning and safety evaluation.",
        lang: "en",
      }),
    );
    const { useLiveItems } = await import("@/data/liveItems");
    const { result } = renderHook(() => useLiveItems());

    await flushLiveFetch();

    expect(result.current).toBeNull();
  });

  it("keeps a matching bundled category when the filtered live result is empty or older", async () => {
    const { shouldPreferFilteredSnapshot } = await import("@/data/liveItems");
    const filter = {
      mode: "selected" as const,
      category: "觀點與技巧" as const,
      query: "",
    };

    expect(shouldPreferFilteredSnapshot([], filter)).toBe(true);
    expect(
      shouldPreferFilteredSnapshot(
        [
          {
            slug: "stale-tip",
            title: "Claude 實用技巧",
            titleEn: null,
            summary: "以香港繁體整理 Claude 的工作流程技巧。",
            category: "觀點與技巧",
            tags: ["Claude"],
            score: 80,
            source: "Anthropic",
            permalink: "https://example.com/stale-tip",
            originalUrl: "https://example.com/stale-tip",
            canonical: "https://example.com/stale-tip",
            publishedAt: "2026-08-01T01:00:00Z",
            selected: true,
          },
        ],
        filter,
      ),
    ).toBe(true);
  });
});

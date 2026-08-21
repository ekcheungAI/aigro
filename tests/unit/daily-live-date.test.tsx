import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const dailyFixture = vi.hoisted(() => ({
  date: "2026-08-20",
  canonical: "",
  lead: {
    slug: "lead",
    category: "模型發布" as const,
    sectionLabel: "模型發布",
    title: "OpenAI 發布全新推理模型",
    summary: "新模型提升多步推理能力。",
    source: "OpenAI Blog",
    permalink: "https://example.com/lead",
    canonical: "https://example.com/lead",
    score: 90,
  },
  items: [],
  sections: [{ label: "模型發布", category: "模型發布" as const, count: 1 }],
  itemCount: 1,
}));

vi.mock("@/data/aihot", () => ({ aihotDaily: dailyFixture }));
vi.mock("@/data/liveItems", () => ({
  hkDayKey: (iso: string) => iso.slice(0, 10),
  synthesizeDailyForDate: () => null,
  useLiveDaily: () => dailyFixture,
  useLiveInsights: () => [
    {
      slug: "lead",
      publishedAt: "2026-08-20T12:00:00Z",
    },
  ],
}));
vi.mock("@/hooks/useDataFreshness", () => ({
  default: () => ({
    isLive: true,
    isArchive: false,
    isResolved: true,
    status: "live",
    fetchedAt: "2026-08-20T12:00:00Z",
    todayDate: "2026-08-22",
    ago: "昨日",
  }),
}));

import { DailyContent } from "@/pages/Daily";

describe("live daily issue date", () => {
  it("labels the issue with its content date instead of the visitor's current date", () => {
    const html = renderToString(
      <MemoryRouter>
        <DailyContent embedded />
      </MemoryRouter>,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    const text = container.textContent ?? "";

    expect(text).toContain("2026-08-20・星期四");
    expect(text).not.toContain("2026-08-22・星期六");
  });
});

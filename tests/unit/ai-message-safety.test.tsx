import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AiMessage, { type AiReply } from "@/components/ask/AiMessage";

afterEach(cleanup);

function renderReply(reply: AiReply) {
  return render(
    <MemoryRouter>
      <AiMessage reply={reply} animate={false} />
    </MemoryRouter>
  );
}

describe("AiMessage safety states", () => {
  it("links only same-site paths and credential-free HTTPS citations", () => {
    renderReply({
      text: "有來源嘅答案 [S1] [S2]。",
      citations: [
        { marker: "S1", title: "HTTPS", href: "https://example.com/source" },
        { marker: "S2", title: "站內", href: "/experts/elvin-cheung" },
        { marker: "S3", title: "HTTP", href: "http://example.com/source" },
        { marker: "S4", title: "Script", href: "javascript:alert(1)" },
        { marker: "S5", title: "Protocol relative", href: "//example.com/source" },
      ],
      confidence: 1,
      source: "kb",
      answerBasis: "knowledge",
      coverage: "high",
    });

    expect(screen.getByRole("link", { name: /HTTPS/ })).toHaveAttribute(
      "href",
      "https://example.com/source"
    );
    expect(screen.getByRole("link", { name: /站內/ })).toHaveAttribute(
      "href",
      "/experts/elvin-cheung"
    );
    expect(
      screen.queryByRole("link", { name: /\[S3\] HTTP/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /\[S4\] Script/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Protocol relative/ })
    ).not.toBeInTheDocument();
  });

  it("uses the server-provided monthly quota scope in the chip and trust line", () => {
    renderReply({
      text: "你嘅本月對話額度已用完。",
      citations: [],
      confidence: 0,
      source: "quota",
      answerBasis: "general",
      coverage: "none",
      quotaScope: "monthly",
    });

    expect(screen.getAllByText("本月對話額度已用完").length).toBeGreaterThan(0);
    expect(screen.getByText(/香港時間每月重設/, { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText(/香港時間每日重設/, { selector: "p" })).not.toBeInTheDocument();
  });
});

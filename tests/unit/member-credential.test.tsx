import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import MemberCredential from "@/components/auth/MemberCredential";
import {
  memberCredentialId,
  memberCredentialIssuedLabel,
} from "@/components/auth/memberCredentialData";
import type { AigroMember } from "@/components/auth/member";

const member: AigroMember = {
  name: "Elvin C",
  email: "elvin@example.com",
  interests: [],
  persona: null,
  role: "founding",
  tier: "pro",
  joinedAt: Date.UTC(2026, 7, 14),
  notifications: { daily: true, weekly: true, product: false },
};

describe("member credential", () => {
  afterEach(cleanup);

  it("creates a stable Hong Kong credential reference without exposing the email", () => {
    const id = memberCredentialId("Elvin@example.com");
    expect(id).toMatch(/^AIGRO-HK-[A-Z0-9]{8}$/);
    expect(id).toBe(memberCredentialId("elvin@example.com"));
    expect(id).not.toContain("ELVIN");
  });

  it("formats the real membership issue month", () => {
    expect(memberCredentialIssuedLabel(Date.UTC(2026, 7, 14))).toBe("2026 年 8 月");
  });

  it("presents membership as a verified credential rather than a professional licence", () => {
    render(
      <MemoryRouter>
        <MemberCredential member={member} completion={80} />
      </MemoryRouter>
    );

    expect(screen.getByRole("article", { name: "AIGRO 會員身份認證" })).toBeVisible();
    expect(screen.getByText("創始會員")).toBeVisible();
    expect(screen.getByText("會員帳戶已驗證")).toBeVisible();
    expect(screen.getByText("此認證代表 AIGRO 會員身份，並非專業資格或牌照。")).toBeVisible();
    expect(screen.getByText(memberCredentialId(member.email))).toBeVisible();
  });

  it("updates the display picture directly from the credential avatar", () => {
    render(
      <MemoryRouter>
        <MemberCredential member={member} completion={80} onAvatarNotice={() => undefined} />
      </MemoryRouter>
    );

    expect(screen.queryByRole("dialog", { name: "更新個人頭像" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "更新個人頭像" }));
    expect(screen.getByRole("dialog", { name: "更新個人頭像" })).toBeVisible();
    expect(screen.getByRole("button", { name: "選擇天星小輪頭像" })).toBeVisible();
    expect(screen.getByText("上載相片")).toBeVisible();
  });
});

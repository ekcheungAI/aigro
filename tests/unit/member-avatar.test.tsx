import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MemberAvatar from "@/components/auth/MemberAvatar";

describe("member avatars", () => {
  afterEach(cleanup);
  it("assigns an accessible Hong Kong avatar to every member", () => {
    render(
      <MemberAvatar
        member={{ name: "AIGRO Member", email: "member@aigro.io" }}
        size={32}
      />
    );

    expect(screen.getByRole("img", { name: /AIGRO Member 個人頭像：/ })).toBeVisible();
  });

  it("renders the chosen local icon from a saved preset", () => {
    render(
      <MemberAvatar
        member={{
          name: "Elvin",
          email: "elvin@example.com",
          avatarSeed: "elvin@example.com:preset:3",
        }}
      />
    );

    expect(screen.getByRole("img", { name: "Elvin 個人頭像：天星小輪" })).toBeVisible();
  });

  it("renders an uploaded display picture when one is available", () => {
    render(
      <MemberAvatar
        member={{
          name: "Elvin",
          email: "elvin@example.com",
          avatarUrl: "https://cdn.example/elvin.webp",
        }}
      />
    );

    expect(screen.getByRole("img", { name: "Elvin 個人頭像" })).toHaveAttribute(
      "src",
      "https://cdn.example/elvin.webp"
    );
  });
});

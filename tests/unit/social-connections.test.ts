import { describe, expect, it } from "vitest";
import {
  normalizeSocialAccountIdentifier,
  socialConnectionCapability,
} from "@/lib/socialConnections";

describe("social connection consent helpers", () => {
  it("normalizes only public TikTok and Instagram profile identifiers", () => {
    expect(normalizeSocialAccountIdentifier("tiktok", "https://www.tiktok.com/@aigro_teacher/video/1"))
      .toBe("aigro_teacher");
    expect(normalizeSocialAccountIdentifier("instagram", "@aigro.teacher"))
      .toBe("aigro.teacher");
  });

  it("rejects post URLs, credentials and unrelated domains", () => {
    expect(() => normalizeSocialAccountIdentifier("instagram", "https://instagram.com/reel/abc"))
      .toThrow("請輸入公開個人檔案");
    expect(() => normalizeSocialAccountIdentifier("tiktok", "https://user:pw@tiktok.com/@aigro"))
      .toThrow("唔可以包含帳號密碼");
    expect(() => normalizeSocialAccountIdentifier("instagram", "https://example.com/aigro"))
      .toThrow("請輸入 Instagram");
  });

  it("keeps YouTube blocked until an official OAuth connection exists", () => {
    expect(socialConnectionCapability("youtube")).toEqual({
      connectable: false,
      source: "official_oauth",
      status: "planned",
    });
  });
});

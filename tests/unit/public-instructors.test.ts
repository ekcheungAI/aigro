import { describe, expect, it } from "vitest";
import {
  mergePublicInstructors,
  normalizePublicInstructor,
  type PublicInstructorRow,
} from "@/lib/publicInstructors";

const dynamicRow: PublicInstructorRow = {
  id: "90000000-0000-0000-0000-000000000001",
  slug: "new-instructor",
  display_name: "New Instructor",
  name_en: "New Instructor",
  name_zh: "新導師",
  title: "AI 增長導師",
  bio: "由已批准資料建立嘅公開導師簡介。",
  brand_color: null,
  specialties: ["AI 增長", "內容策略"],
  quote: "先驗證，再放大。",
  credential: "AIGRO 領航專家",
  verified: true,
  radar: [],
  traits: ["驗證優先"],
  public_profile_enabled: true,
  greeting: "你好，我係新導師嘅授權 AI 版本。",
  chat_ready: false,
};

describe("public instructor directory", () => {
  it("normalizes a database-only instructor without requiring a code release", () => {
    const instructor = normalizePublicInstructor(dynamicRow);
    expect(instructor.expert.slug).toBe("new-instructor");
    expect(instructor.expert.nameZh).toBe("新導師");
    expect(instructor.expert.specialties).toEqual(["AI 增長", "內容策略"]);
    expect(instructor.chatReady).toBe(false);
    expect(instructor.greeting).toContain("授權 AI");
  });

  it("keeps rich editorial fields for existing instructors but trusts live readiness", () => {
    const [instructor] = mergePublicInstructors([
      {
        ...dynamicRow,
        slug: "elvin-cheung",
        display_name: "Elvin Cheung",
        name_en: "Elvin Cheung",
        name_zh: "",
        chat_ready: false,
      },
    ]);
    expect(instructor.expert.slug).toBe("elvin-cheung");
    expect(instructor.expert.viewpoints?.length).toBeGreaterThan(0);
    expect(instructor.chatReady).toBe(false);
  });

  it("drops malformed or non-public rows instead of exposing them", () => {
    const result = mergePublicInstructors([
      { ...dynamicRow, slug: "Invalid Slug" },
      { ...dynamicRow, slug: "hidden", public_profile_enabled: false },
    ]);
    expect(result).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { leadQuestionMeta, leadQuestionText } from "@/components/admin/adminData";

describe("CRM lead question compatibility", () => {
  it("renders atomic chat questions stored as plain JSON strings", () => {
    expect(leadQuestionText("請問價錢？")).toBe("請問價錢？");
    expect(leadQuestionMeta("請問價錢？")).toEqual({ date: "", persona: "" });
  });

  it("renders structured lead questions", () => {
    const question = { text: "想預約", date: "2026-08-08", persona: "elvin-cheung" };
    expect(leadQuestionText(question)).toBe("想預約");
    expect(leadQuestionMeta(question)).toEqual({
      date: "2026-08-08",
      persona: "elvin-cheung",
    });
  });
});

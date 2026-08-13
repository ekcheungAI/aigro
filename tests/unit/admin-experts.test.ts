import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adminExpertToView, type AdminExpertRecord } from "@/lib/adminExperts";

const row: AdminExpertRecord = {
  id: "10000000-0000-0000-0000-000000000001",
  slug: "new-teacher",
  display_name: "New Teacher",
  name_en: "New Teacher",
  name_zh: "新導師",
  title: "增長導師",
  bio: "真實簡介",
  brand_color: "#466A5E",
  specialties: ["增長"],
  quote: "先做再學",
  credential: "創辦人",
  verified: false,
  radar: [{ label: "實戰", score: 88, note: "重視落地" }],
  traits: ["務實"],
  status: "draft",
  owner_user_id: null,
  public_profile_enabled: false,
  invitation_status: null,
  invitation_email: null,
  invitation_expires_at: null,
  archived_at: null,
};

describe("admin expert records", () => {
  it("turns a database draft into the existing expert editor shape", () => {
    const expert = adminExpertToView(row, []);
    expect(expert.slug).toBe("new-teacher");
    expect(expert.nameZh).toBe("新導師");
    expect(expert.specialties).toEqual(["增長"]);
    expect(expert.radar?.[0].score).toBe(88);
    expect(expert.verified).toBe(false);
    expect(expert.pendingNote).toContain("Supabase");
  });

  it("keeps verified static portrait/deep content while database fields override editable copy", () => {
    const expert = adminExpertToView(
      { ...row, slug: "existing", verified: true, status: "active", title: "DB title" },
      [{
        slug: "existing",
        nameEn: "Static",
        nameZh: "靜態",
        title: "Static title",
        image: "/portrait.jpg",
        verified: true,
        specialties: ["靜態"],
        heuristics: [{ name: "原則", whenToUse: "測試", example: "例子" }],
      }]
    );
    expect(expert.title).toBe("DB title");
    expect(expert.image).toBe("/portrait.jpg");
    expect(expert.heuristics?.[0].name).toBe("原則");
    expect(expert.pendingNote).toBeUndefined();
  });

  it("keeps archived recovery super-admin-only and fail-closed in the UI", () => {
    const source = readFileSync(
      "src/pages/admin/AdminExperts.tsx",
      "utf8"
    );

    expect(source).toContain("canCreateInstructor && (");
    expect(source).toContain('supabase.rpc("restore_expert_workspace"');
    expect(source).toContain("確認復原為私人草稿");
    expect(source).toContain("唔會恢復原 owner、公開 profile、RAG、預約、角色編譯或社交同步");
  });
});

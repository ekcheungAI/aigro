import { describe, expect, it } from "vitest";
import { STUDIO_FLAGS } from "@/pages/admin/AdminStudio";

describe("Admin Studio feature controls", () => {
  it("lets the master admin enable consented daily social sync", () => {
    expect(STUDIO_FLAGS.map(([key]) => key)).toContain("social_sync_enabled");
  });
});

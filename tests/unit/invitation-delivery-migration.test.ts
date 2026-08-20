import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("invitation delivery status migration", () => {
  it("keeps the applied baseline immutable and adds suppressed forward-only", () => {
    const baseline = readFileSync(
      "supabase/migrations/20260813165248_admin_member_invitations.sql",
      "utf8",
    );
    const forward = readFileSync(
      "supabase/migrations/20260820230000_allow_suppressed_invitation_delivery.sql",
      "utf8",
    );

    expect(baseline).not.toContain("'suppressed'");
    expect(forward).toContain("drop constraint if exists invitations_delivery_status_check");
    expect(forward).toContain("'suppressed'");
  });
});

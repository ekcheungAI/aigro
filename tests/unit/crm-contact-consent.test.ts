import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820120000_crm_contact_consent.sql",
  "utf8",
);
const hardeningMigration = readFileSync(
  "supabase/migrations/20260820150000_harden_live_chat_privacy.sql",
  "utf8",
);
const askPage = readFileSync("src/pages/Ask.tsx", "utf8");

describe("CRM contact consent", () => {
  it("stores explicit, conversation-owned consent and supports withdrawal", () => {
    expect(migration).toContain("contact_email");
    expect(migration).toContain("consent_lead_contact");
    expect(migration).toContain("withdraw_lead_contact_consent");
    expect(migration).toContain("lead.contact_consented");
    expect(migration).toContain("lead.contact_consent_withdrawn");
    expect(migration).toContain("owner_id = auth.uid()");
  });

  it("creates or updates consent by the owner and expert even before chat persistence", () => {
    expect(hardeningMigration).toContain("insert into public.leads");
    expect(hardeningMigration).toContain("c.owner_id = auth.uid()");
    expect(hardeningMigration).toMatch(/l\.owner_id\s*=\s*caller_id/);
    expect(hardeningMigration).toMatch(/l\.expert_id\s*=\s*conversation_row\.expert_id/);
    expect(hardeningMigration).toContain("aigro:lead-contact-consent:");
  });

  it("waits for the consent RPC and only reports a stored consent after success", () => {
    expect(askPage).toMatch(/await\s+supabase\.rpc\("consent_lead_contact"/);
    expect(askPage).toMatch(/if\s*\(consentError\)/);
    expect(askPage).not.toContain("Consent capture must never block the local signup success state");
  });

  it("keeps quick membership device-only unless explicit instructor consent is stored", () => {
    expect(askPage).not.toContain("captureWaitlist(");
    expect(askPage).not.toContain("lastUserQuestion(");
    expect(askPage).toContain("saveMember(next, { syncProfile: false })");
    expect(askPage).toContain("快速加入嘅會員身份只會保留喺此裝置");
  });

  it("lets a member withdraw by expert even when no local conversation remains", () => {
    expect(askPage).toContain('.rpc("withdraw_lead_contact_consent_for_expert"');
    expect(askPage).toContain("p_expert_slug: persona.key");
    expect(askPage).not.toContain('if (!supabase || persona.kind !== "expert" || !activeSession) return;');
  });
});

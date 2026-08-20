import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { AIGRO_PRODUCTION_SUPABASE_URL } from "../../src/lib/deploymentEnvironment";

const runLiveChat = process.env.AIGRO_E2E_CHAT === "true";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the beta LIVE CHAT acceptance test`);
  return value.replace(/\/$/, "");
}

function jwtSubject(accessToken: string): string {
  const payload = accessToken.split(".")[1];
  if (!payload) throw new Error("anonymous session returned an invalid access token");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string };
  if (!decoded.sub) throw new Error("anonymous session JWT has no subject");
  return decoded.sub;
}

test("beta LIVE CHAT streams a cited answer and persists CRM side effects", async ({
  page,
  request,
}) => {
  test.skip(!runLiveChat, "set AIGRO_E2E_CHAT=true for the isolated beta acceptance run");

  const expertSlug = requiredEnvironment("AIGRO_E2E_EXPERT_SLUG");
  const question = requiredEnvironment("AIGRO_E2E_CHAT_QUESTION");
  const supabaseUrl = requiredEnvironment("AIGRO_E2E_SUPABASE_URL");
  const publishableKey = requiredEnvironment("AIGRO_E2E_SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = requiredEnvironment("AIGRO_E2E_SERVICE_ROLE_KEY");
  const reportPath = requiredEnvironment("AIGRO_E2E_REPORT_PATH");
  expect(supabaseUrl).not.toBe(AIGRO_PRODUCTION_SUPABASE_URL);
  expect(question.length).toBeGreaterThanOrEqual(10);

  const startedAt = new Date(Date.now() - 5_000).toISOString();
  let accessToken = "";
  let userId = "";
  let conversationId = "";
  let leadId = "";
  let acceptancePassed = false;

  try {
    await page.goto(`/ask?expert=${encodeURIComponent(expertSlug)}`);
    const input = page.locator("#ask-input");
    await expect(page.getByRole("heading", { name: "Ask 問答" })).toBeVisible();
    await expect(input).toBeEnabled({ timeout: 30_000 });
    await input.fill(question);
    await page.getByRole("button", { name: "送出問題" }).click();

    // A release question must exercise the grounded path, not generic fallback.
    await expect(page.getByText("答案引用來源").last()).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/知識庫檢索回答|授權內容庫回答/).last()).toBeVisible();

    accessToken = await page.evaluate(() => {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as { access_token?: string };
          if (parsed.access_token) return parsed.access_token;
        } catch {
          // Ignore unrelated local records.
        }
      }
      return "";
    });
    expect(accessToken).not.toBe("");
    userId = jwtSubject(accessToken);

    const serviceHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    };
    const conversationQuery = new URLSearchParams({
      select: "id,expert_id,owner_id,created_at",
      owner_id: `eq.${userId}`,
      created_at: `gte.${startedAt}`,
      order: "created_at.desc",
      limit: "1",
    });
    const conversationResponse = await request.get(
      `${supabaseUrl}/rest/v1/conversations?${conversationQuery}`,
      { headers: serviceHeaders },
    );
    expect(conversationResponse.ok()).toBe(true);
    const conversations = await conversationResponse.json() as Array<{
      id: string;
      expert_id: string;
      owner_id: string;
    }>;
    expect(conversations).toHaveLength(1);
    conversationId = conversations[0].id;
    const expertId = conversations[0].expert_id;

    const messageQuery = new URLSearchParams({
      select: "role,content,source,citations,request_id,server_generated",
      conversation_id: `eq.${conversationId}`,
      order: "turn_sequence.asc",
    });
    const messageResponse = await request.get(
      `${supabaseUrl}/rest/v1/messages?${messageQuery}`,
      { headers: serviceHeaders },
    );
    expect(messageResponse.ok()).toBe(true);
    const messages = await messageResponse.json() as Array<{
      role: string;
      content: string;
      source: string;
      citations: unknown[];
      request_id: string | null;
      server_generated: boolean;
    }>;
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(messages.every((message) => message.server_generated)).toBe(true);
    expect(messages[0].content).toBe(question);
    expect(messages[1].content.length).toBeGreaterThan(20);
    expect(messages[1].source).toBe("kb");
    expect(messages[1].citations.length).toBeGreaterThan(0);
    expect(messages[0].request_id).toBe(messages[1].request_id);

    const leadQuery = new URLSearchParams({
      select: "id,owner_id,expert_id,source_conversation_id,last_message_id",
      owner_id: `eq.${userId}`,
      expert_id: `eq.${expertId}`,
      limit: "1",
    });
    const leadResponse = await request.get(
      `${supabaseUrl}/rest/v1/leads?${leadQuery}`,
      { headers: serviceHeaders },
    );
    expect(leadResponse.ok()).toBe(true);
    const leads = await leadResponse.json() as Array<{ id: string; source_conversation_id: string }>;
    expect(leads).toHaveLength(1);
    expect(leads[0].source_conversation_id).toBe(conversationId);
    leadId = leads[0].id;

    const userHeaders = {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const contactEmail = `aigro-beta-${Date.now()}@example.com`;
    const consentResponse = await request.post(
      `${supabaseUrl}/rest/v1/rpc/consent_lead_contact`,
      {
        headers: userHeaders,
        data: { p_conversation_id: conversationId, p_email: contactEmail },
      },
    );
    expect(consentResponse.ok()).toBe(true);

    const consentedLeadResponse = await request.get(
      `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=contact_email,contact_consented_at`,
      { headers: serviceHeaders },
    );
    expect(consentedLeadResponse.ok()).toBe(true);
    const consentedLeads = await consentedLeadResponse.json() as Array<{
      contact_email: string | null;
      contact_consented_at: string | null;
    }>;
    expect(consentedLeads).toEqual([{
      contact_email: contactEmail,
      contact_consented_at: expect.any(String),
    }]);

    const withdrawalResponse = await request.post(
      `${supabaseUrl}/rest/v1/rpc/withdraw_lead_contact_consent`,
      { headers: userHeaders, data: { p_conversation_id: conversationId } },
    );
    expect(withdrawalResponse.ok()).toBe(true);
    const withdrawnLeadResponse = await request.get(
      `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=contact_email,contact_consented_at`,
      { headers: serviceHeaders },
    );
    expect(withdrawnLeadResponse.ok()).toBe(true);
    expect(await withdrawnLeadResponse.json()).toEqual([{
      contact_email: null,
      contact_consented_at: null,
    }]);

    const interactionQuery = new URLSearchParams({
      select: "id,lead_id,conversation_id,message_id,question",
      lead_id: `eq.${leadId}`,
      conversation_id: `eq.${conversationId}`,
    });
    const interactionResponse = await request.get(
      `${supabaseUrl}/rest/v1/lead_interactions?${interactionQuery}`,
      { headers: serviceHeaders },
    );
    expect(interactionResponse.ok()).toBe(true);
    const interactions = await interactionResponse.json() as Array<{ question: string }>;
    expect(interactions).toHaveLength(1);
    expect(interactions[0].question).toBe(question);

    // Exercise the ACK-loss retry contract before cleaning the synthetic chat.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const deletion = await request.post(
        `${supabaseUrl}/rest/v1/rpc/delete_chat_conversation`,
        {
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          data: { p_conversation_id: conversationId },
        },
      );
      expect(deletion.ok()).toBe(true);
      expect(await deletion.json()).toBe(true);
    }
    acceptancePassed = true;
  } finally {
    if (leadId) {
      await request.delete(
        `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );
    }
    if (userId) {
      await request.delete(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });
    }
  }

  expect(acceptancePassed).toBe(true);
  const absoluteReportPath = resolve(process.cwd(), reportPath);
  mkdirSync(dirname(absoluteReportPath), { recursive: true });
  writeFileSync(absoluteReportPath, `${JSON.stringify({
    schemaVersion: 1,
    passed: true,
    checkedAt: new Date().toISOString(),
    siteUrl: betaBaseUrl,
    supabaseUrl,
    expertSlug,
    checks: [
      "grounded_stream",
      "citations",
      "atomic_messages",
      "lead_interaction",
      "contact_consent",
      "contact_withdrawal",
      "idempotent_deletion",
    ],
  }, null, 2)}\n`, { mode: 0o600 });
});

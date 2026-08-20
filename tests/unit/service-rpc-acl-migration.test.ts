import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260820180000_restore_service_rpc_acl.sql"
);

const criticalSignatures = [
  "match_expert_knowledge(uuid, extensions.halfvec, integer, double precision)",
  "claim_distillation_jobs(text, integer)",
  "complete_distillation_job(uuid, text, text, jsonb, text, jsonb, jsonb)",
  "requeue_stuck_distillation_jobs()",
  "invoke_knowledge_worker()",
  "claim_persona_synthesis_jobs(text, integer)",
  "requeue_stuck_persona_synthesis_jobs()",
  "invoke_persona_compiler()",
  "persist_chat_round(uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb, jsonb, text, integer, text)",
  "check_chat_rate_limit(uuid, integer)",
  "check_chat_rate_limits(uuid, text, integer, integer)",
  "reserve_chat_request(uuid, uuid, uuid, uuid, text)",
  "fail_chat_request(uuid, uuid, text)",
  "purge_expired_anonymous_chats()",
  "refresh_lead_questions(uuid)",
  "queue_due_social_syncs(date)",
  "acquire_social_sync_invocation_lease(text, integer)",
  "release_social_sync_invocation_lease(text)",
  "claim_social_sync_jobs(text, integer)",
  "finish_social_sync_job(uuid, text, boolean, integer, text, text, text, boolean)",
  "requeue_stuck_social_sync_jobs()",
  "stage_social_content_for_distillation(uuid)",
  "persist_social_sync_result(uuid, text, uuid, uuid, text, text, jsonb, text, text)",
  "invoke_social_sync_worker()",
  "dispatch_social_sync()",
  "cancel_expert_invitation(uuid, text)",
  "has_current_passed_persona_evaluation(uuid, uuid)",
  "is_expert_chat_ready(uuid)",
];

describe("service RPC ACL restoration", () => {
  it("revokes every service-only RPC from browser roles and restores service_role", () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;

    const sql = readFileSync(migrationPath, "utf8")
      .toLowerCase()
      .replace(/\s+/g, " ");
    const revokeBlock = sql.match(
      /revoke all on function (.*?) from public, anon, authenticated;/
    )?.[1];
    const grantBlock = sql.match(
      /grant execute on function (.*?) to service_role;/
    )?.[1];

    expect(sql).toContain(
      "alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;"
    );
    expect(revokeBlock).toBeTruthy();
    expect(grantBlock).toBeTruthy();
    for (const signature of criticalSignatures) {
      expect(revokeBlock).toContain(`public.${signature}`);
      expect(grantBlock).toContain(`public.${signature}`);
    }
  });
});

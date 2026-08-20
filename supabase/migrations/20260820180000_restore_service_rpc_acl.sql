-- Restore the service-only RPC boundary after production ACL drift exposed
-- worker, retrieval, persistence, quota and destructive maintenance helpers to
-- browser roles. Keep this forward-only and explicit: browser-safe definer RPCs
-- are intentionally not included.

-- Fail closed for every future function owned by the migration role. Public
-- browser RPCs must opt back in with an explicit GRANT in their own migration.
alter default privileges for role postgres in schema public
revoke execute on functions from public, anon, authenticated;

revoke all on function
  public.match_expert_knowledge(uuid, extensions.halfvec, integer, double precision),
  public.claim_distillation_jobs(text, integer),
  public.complete_distillation_job(uuid, text, text, jsonb, text, jsonb, jsonb),
  public.requeue_stuck_distillation_jobs(),
  public.invoke_knowledge_worker(),
  public.claim_persona_synthesis_jobs(text, integer),
  public.requeue_stuck_persona_synthesis_jobs(),
  public.invoke_persona_compiler(),
  public.persist_chat_round(uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb, jsonb, text, integer, text),
  public.check_chat_rate_limit(uuid, integer),
  public.check_chat_rate_limits(uuid, text, integer, integer),
  public.reserve_chat_request(uuid, uuid, uuid, uuid, text),
  public.fail_chat_request(uuid, uuid, text),
  public.purge_expired_anonymous_chats(),
  public.refresh_lead_questions(uuid),
  public.queue_due_social_syncs(date),
  public.acquire_social_sync_invocation_lease(text, integer),
  public.release_social_sync_invocation_lease(text),
  public.claim_social_sync_jobs(text, integer),
  public.finish_social_sync_job(uuid, text, boolean, integer, text, text, text, boolean),
  public.requeue_stuck_social_sync_jobs(),
  public.stage_social_content_for_distillation(uuid),
  public.persist_social_sync_result(uuid, text, uuid, uuid, text, text, jsonb, text, text),
  public.invoke_social_sync_worker(),
  public.dispatch_social_sync(),
  public.cancel_expert_invitation(uuid, text),
  public.has_current_passed_persona_evaluation(uuid, uuid),
  public.is_expert_chat_ready(uuid)
from public, anon, authenticated;

grant execute on function
  public.match_expert_knowledge(uuid, extensions.halfvec, integer, double precision),
  public.claim_distillation_jobs(text, integer),
  public.complete_distillation_job(uuid, text, text, jsonb, text, jsonb, jsonb),
  public.requeue_stuck_distillation_jobs(),
  public.invoke_knowledge_worker(),
  public.claim_persona_synthesis_jobs(text, integer),
  public.requeue_stuck_persona_synthesis_jobs(),
  public.invoke_persona_compiler(),
  public.persist_chat_round(uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb, jsonb, text, integer, text),
  public.check_chat_rate_limit(uuid, integer),
  public.check_chat_rate_limits(uuid, text, integer, integer),
  public.reserve_chat_request(uuid, uuid, uuid, uuid, text),
  public.fail_chat_request(uuid, uuid, text),
  public.purge_expired_anonymous_chats(),
  public.refresh_lead_questions(uuid),
  public.queue_due_social_syncs(date),
  public.acquire_social_sync_invocation_lease(text, integer),
  public.release_social_sync_invocation_lease(text),
  public.claim_social_sync_jobs(text, integer),
  public.finish_social_sync_job(uuid, text, boolean, integer, text, text, text, boolean),
  public.requeue_stuck_social_sync_jobs(),
  public.stage_social_content_for_distillation(uuid),
  public.persist_social_sync_result(uuid, text, uuid, uuid, text, text, jsonb, text, text),
  public.invoke_social_sync_worker(),
  public.dispatch_social_sync(),
  public.cancel_expert_invitation(uuid, text),
  public.has_current_passed_persona_evaluation(uuid, uuid),
  public.is_expert_chat_ready(uuid)
to service_role;

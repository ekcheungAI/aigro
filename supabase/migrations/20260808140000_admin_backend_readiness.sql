-- Non-secret operational readiness for the Master Admin control plane.
-- The function reports presence/counts only; Vault values never leave Postgres.

create or replace function public.get_backend_readiness()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'workers', jsonb_build_object(
      'knowledge_cron', exists (
        select 1 from cron.job where jobname = 'aigro-run-distillation-worker' and active
      ),
      'persona_cron', exists (
        select 1 from cron.job where jobname = 'aigro-run-persona-compiler' and active
      ),
      'distillation_requeue_cron', exists (
        select 1 from cron.job where jobname = 'aigro-requeue-stuck-distillation' and active
      ),
      'persona_requeue_cron', exists (
        select 1 from cron.job where jobname = 'aigro-requeue-stuck-persona-synthesis' and active
      ),
      'anonymous_purge_cron', exists (
        select 1 from cron.job where jobname = 'aigro-purge-anonymous-chats' and active
      )
    ),
    'vault', jsonb_build_object(
      'project_url', exists (select 1 from vault.secrets where name = 'project_url'),
      'knowledge_worker_secret', exists (
        select 1 from vault.secrets where name = 'knowledge_worker_secret'
      ),
      'persona_compiler_secret', exists (
        select 1 from vault.secrets where name = 'persona_compiler_secret'
      ),
      'booking_webhook_secret', exists (
        select 1 from vault.secrets where name = 'booking_webhook_secret'
      )
    ),
    'storage', jsonb_build_object(
      'private_expert_kb', exists (
        select 1 from storage.buckets where id = 'expert-kb' and public = false
      )
    ),
    'experts', jsonb_build_object(
      'total', (select count(*) from public.experts),
      'active', (select count(*) from public.experts where status = 'active'),
      'cms_enabled', (
        select count(*) from public.experts
        where coalesce((feature_flags ->> 'cms_ingestion_enabled')::boolean, false)
      ),
      'rag_enabled', (
        select count(*) from public.experts
        where coalesce((feature_flags ->> 'rag_enabled')::boolean, false)
      ),
      'booking_enabled', (
        select count(*) from public.experts
        where coalesce((feature_flags ->> 'booking_enabled')::boolean, false)
      ),
      'published_persona', (
        select count(*) from public.experts where published_persona_version_id is not null
      )
    ),
    'knowledge', jsonb_build_object(
      'sources', (select count(*) from public.knowledge_sources),
      'approved_revisions', (
        select count(*) from public.knowledge_revisions where status = 'approved'
      ),
      'published_sources', (
        select count(*) from public.knowledge_sources where published_revision_id is not null
      ),
      'chunks', (select count(*) from public.knowledge_chunks),
      'queued_or_processing_jobs', (
        select count(*) from public.distillation_jobs where status in ('queued', 'processing', 'retry')
      ),
      'failed_jobs', (
        select count(*) from public.distillation_jobs where status = 'failed'
      )
    ),
    'persona', jsonb_build_object(
      'versions', (select count(*) from public.expert_persona_versions),
      'evaluation_questions', (select count(*) from public.persona_evaluation_questions),
      'queued_or_processing_jobs', (
        select count(*) from public.persona_synthesis_jobs where status in ('queued', 'processing', 'retry')
      ),
      'failed_jobs', (
        select count(*) from public.persona_synthesis_jobs where status = 'failed'
      )
    ),
    'booking', jsonb_build_object(
      'availability_rules', (select count(*) from public.availability_rules),
      'bookings', (select count(*) from public.bookings)
    ),
    'chat_crm', jsonb_build_object(
      'conversations', (select count(*) from public.conversations),
      'messages', (select count(*) from public.messages),
      'leads', (select count(*) from public.leads),
      'knowledge_gaps', (select count(*) from public.knowledge_gaps)
    )
  );
end;
$$;

revoke all on function public.get_backend_readiness() from public, anon, authenticated;
grant execute on function public.get_backend_readiness() to authenticated;

-- AIGRO licenses sources for retrieval/distillation/persona use only. Model
-- training is never an implicit or configurable permission on this table.
update public.knowledge_sources
set rights_scope = (
  case
    when jsonb_typeof(rights_scope) = 'object' then rights_scope
    else '{}'::jsonb
  end
) || '{"model_training":false}'::jsonb
where rights_scope -> 'model_training' is distinct from 'false'::jsonb;

alter table public.knowledge_sources
  alter column rights_scope
  set default '{"model_training":false}'::jsonb;

alter table public.knowledge_sources
  add constraint knowledge_sources_model_training_opt_out
  check (
    rights_scope -> 'model_training' is not distinct from 'false'::jsonb
  );

comment on constraint knowledge_sources_model_training_opt_out
on public.knowledge_sources is
'Source rights always opt out of model training with the exact JSON boolean false.';

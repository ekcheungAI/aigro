-- A quick Kanban stage move must not mutate an independently scheduled follow-up.
-- Detailed edits still go through update_expert_lead, where an explicit null means
-- that the operator intentionally cleared the follow-up date.
create or replace function public.update_lead_stage(p_lead_id uuid, p_stage text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  lead_row public.leads%rowtype;
begin
  if p_stage not in ('新線索', '已接觸', '跟進中', '已轉化') then
    raise exception 'invalid_lead_stage' using errcode = '22023';
  end if;

  select * into lead_row
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead_not_found' using errcode = 'P0002';
  end if;

  if lead_row.expert_id is null or not public.owns_expert(lead_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.leads
  set stage = p_stage,
      timeline = (
        case
          when jsonb_array_length(coalesce(timeline, '[]'::jsonb)) >= 100
            then coalesce(timeline, '[]'::jsonb) - 0
          else coalesce(timeline, '[]'::jsonb)
        end
      ) || jsonb_build_array(
        jsonb_build_object(
          'date', to_char(now() at time zone 'Asia/Hong_Kong', 'YYYY-MM-DD HH24:MI'),
          'label', '階段更新 — 移至' || p_stage,
          'actor_id', auth.uid()
        )
      ),
      last_activity_at = now()
  where id = p_lead_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), lead_row.expert_id, 'lead.stage_updated', 'lead', p_lead_id,
    jsonb_build_object(
      'old_stage', lead_row.stage,
      'new_stage', p_stage,
      'next_follow_up_at', lead_row.next_follow_up_at,
      'follow_up_preserved', true,
      'note_added', false
    )
  );
end;
$$;

revoke all on function public.update_lead_stage(uuid, text)
from public, anon, authenticated;
grant execute on function public.update_lead_stage(uuid, text) to authenticated;

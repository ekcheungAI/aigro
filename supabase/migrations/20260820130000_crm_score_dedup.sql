-- CRM scores are derived from durable interactions, not from repeated turns.
-- A visitor asking the same ordinary question must not become high intent just
-- by keeping the chat open.

create or replace function public.normalize_lead_interaction_score()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  prior_interaction_count integer;
  prior_intent_count integer;
  next_intent_count integer;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('aigro:lead-score:' || new.lead_id::text, 0)
  );

  select
    (select count(*)::integer
     from public.lead_interactions li
     where li.lead_id = new.lead_id),
    (select count(distinct prior.signal)::integer
     from public.lead_interactions li
     cross join lateral unnest(coalesce(li.signals, '{}'::text[])) as prior(signal)
     where li.lead_id = new.lead_id
       and prior.signal <> 'asked_question')
  into prior_interaction_count, prior_intent_count;

  select count(distinct signal)::integer
  into next_intent_count
  from (
    select prior.signal
    from public.lead_interactions li
    cross join lateral unnest(coalesce(li.signals, '{}'::text[])) as prior(signal)
    where li.lead_id = new.lead_id
      and prior.signal <> 'asked_question'
    union
    select current_signal.signal
    from unnest(coalesce(new.signals, '{}'::text[])) as current_signal(signal)
    where current_signal.signal <> 'asked_question'
  ) intents;

  new.score_delta := least(
    100,
    case when prior_interaction_count = 0 then 5 else 0 end
      + greatest(0, next_intent_count - coalesce(prior_intent_count, 0)) * 20
  );
  return new;
end;
$$;

revoke all on function public.normalize_lead_interaction_score()
from public, anon, authenticated;

create or replace function public.recompute_lead_score_from_interactions()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  interaction_count integer;
  intent_count integer;
begin
  select
    (select count(*)::integer
     from public.lead_interactions li
     where li.lead_id = new.lead_id),
    (select count(distinct signals.signal)::integer
     from public.lead_interactions li
     cross join lateral unnest(coalesce(li.signals, '{}'::text[])) as signals(signal)
     where li.lead_id = new.lead_id
       and signals.signal <> 'asked_question')
  into interaction_count, intent_count;

  update public.leads
  set score = least(
    100,
    case when interaction_count > 0 then 5 else 0 end
      + coalesce(intent_count, 0) * 20
  )
  where id = new.lead_id;
  return new;
end;
$$;

revoke all on function public.recompute_lead_score_from_interactions()
from public, anon, authenticated;

drop trigger if exists lead_interactions_normalize_score on public.lead_interactions;
create trigger lead_interactions_normalize_score
before insert on public.lead_interactions
for each row execute function public.normalize_lead_interaction_score();

drop trigger if exists lead_interactions_recompute_score on public.lead_interactions;
create trigger lead_interactions_recompute_score
after insert on public.lead_interactions
for each row execute function public.recompute_lead_score_from_interactions();

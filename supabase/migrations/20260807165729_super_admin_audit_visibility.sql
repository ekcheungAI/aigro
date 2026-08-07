-- Platform administrators need visibility into access-control events whose
-- expert_id is intentionally null. Expert owners retain their narrower policy.
create policy "audit_admin_read" on public.audit_events
for select to authenticated
using ((select public.is_admin()));

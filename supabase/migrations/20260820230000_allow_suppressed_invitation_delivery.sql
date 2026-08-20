-- Keep the invitation delivery-state contract forward-only for environments where
-- the original invitations migration has already been applied.
alter table public.invitations
  drop constraint if exists invitations_delivery_status_check;

alter table public.invitations
  add constraint invitations_delivery_status_check
  check (
    delivery_status in (
      'queued',
      'sent',
      'delivered',
      'delayed',
      'opened',
      'clicked',
      'bounced',
      'complained',
      'failed',
      'suppressed'
    )
  );

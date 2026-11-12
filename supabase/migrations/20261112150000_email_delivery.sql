-- Email delivery tracking (lib/email-delivery.ts, app/api/resend/webhook).
--
--   internal_email_log  gains the Resend email id, and the time a scheduled
--                       email goes out.
--   email_delivery      the latest delivery state of each email Resend sent,
--                       kept up to date by Resend's webhook. A bounce, spam
--                       complaint or Resend suppression here stops the forms
--                       and the dashboard emailing that address again.
--
-- The site's server key is the only one with access. Run after
-- 20261112140000_blog_and_roles.sql. Safe to run again.

alter table public.internal_email_log
  add column if not exists resend_id text,
  add column if not exists scheduled_for timestamptz;

create index if not exists internal_email_log_by_resend_id
  on public.internal_email_log (resend_id)
  where resend_id is not null;

create table if not exists public.email_delivery (
  resend_id text primary key,
  to_email text not null check (to_email = lower(to_email)),
  status text not null check (
    status in ('scheduled', 'sent', 'delayed', 'delivered', 'bounced', 'complained', 'failed', 'suppressed', 'canceled')
  ),
  detail text,
  updated_at timestamptz not null default now()
);

create index if not exists email_delivery_problems
  on public.email_delivery (to_email)
  where status in ('bounced', 'complained', 'suppressed');

alter table public.email_delivery enable row level security;
grant select, insert, update on public.email_delivery to service_role;
revoke all on public.email_delivery from anon, authenticated;

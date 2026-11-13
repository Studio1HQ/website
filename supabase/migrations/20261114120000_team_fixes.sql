-- An audit trail for the team and money pages (lib/internal/team/audit.ts).
--
--   team_audit   who changed what, and when: payments marked paid, undone,
--                edited, cancelled or deleted; salary lines; payslips saved,
--                reopened and emailed; expense-claim decisions; attendance
--                someone overwrote or removed; team-list changes; and
--                invoice or claim emails the intake turned away (shown on
--                the Payments page as "Emails not taken in").
--
-- Rows are only ever added. The dashboard works without this table (audit
-- writes are best effort), so it can be run at any time. The site's server
-- key is the only one with access. Run after
-- 20261113130000_team_and_payments.sql. Safe to run again.

create table if not exists public.team_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- A staff email, or the sender's address for intake emails.
  actor text not null,
  area text not null check (area in ('payments', 'payroll', 'claims', 'attendance', 'people', 'intake')),
  -- A short verb: paid, undone, edited, deleted, salary-lines, approved, skipped…
  action text not null,
  -- What it was done to: a payment id, "email month", an email's subject.
  subject text not null default '',
  -- The values before and after, or the reason.
  detail jsonb not null default '{}'
);

create index if not exists team_audit_by_area
  on public.team_audit (area, created_at desc);
create index if not exists team_audit_by_subject
  on public.team_audit (subject, created_at desc);

alter table public.team_audit enable row level security;
-- Insert and read only: the trail can't be edited or emptied from the site.
grant select, insert on public.team_audit to service_role;
revoke all on public.team_audit from anon, authenticated;

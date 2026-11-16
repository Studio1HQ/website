-- Dashboard notifications: the bell in the internal dashboard.
--
-- One row per person per thing that now needs them: a task someone gave
-- them, a call added or moved, a deliverable to write or review, an expense
-- claim decided, a request for access (admins). Shown only inside the
-- dashboard; nothing here is emailed or posted anywhere.
--
-- Tables: internal_notifications.
--
-- Run this once in the Supabase SQL editor. Safe to run again. Until it has
-- run, the bell shows nothing and the rest of the dashboard works as before.

create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Who it's for, and who did the thing (both lowercase staff emails).
  email text not null check (email = lower(email)),
  actor text not null default '',
  -- What happened, for the icon: task, call, deliverable, claim, access.
  kind text not null default 'other'
    check (kind in ('task', 'call', 'deliverable', 'claim', 'access', 'other')),
  -- "Priya gave you a task", then the thing's own name underneath.
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 300),
  -- Where it opens: a dashboard path, never an outside link.
  href text not null check (href like '/internal%'),
  read_at timestamptz
);

create index if not exists internal_notifications_by_person
  on public.internal_notifications (email, created_at desc);
create index if not exists internal_notifications_unread
  on public.internal_notifications (email) where read_at is null;

-- Access: the site's server key only -------------------------------------

alter table public.internal_notifications enable row level security;
grant select, insert, update, delete on public.internal_notifications to service_role;
revoke all on public.internal_notifications from anon, authenticated;

notify pgrst, 'reload schema';

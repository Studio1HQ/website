-- Tasks: a priority on each card, and people who share a task.
--
-- priority     Top, Medium or Low. Every task, old and new, starts at
--              Medium. Cards show Top and Low (Medium is the quiet
--              default), and each day and board column lists Top first.
-- with_emails  the other people a task is shared with (did it together, or
--              will). One row: it shows on the person's list and on each of
--              theirs, any of them can move it, and done is done for all.
--              Emails of people on the team list (checked by the app).
--
-- Until this runs, tasks still save and load as before; picking Top or Low,
-- or adding people, says the update is needed.
--
-- Needs 20261116100000_team_tasks.sql. Safe to run again.

alter table public.team_tasks
  add column if not exists priority text not null default 'medium';

alter table public.team_tasks
  drop constraint if exists team_tasks_priority_check;

alter table public.team_tasks
  add constraint team_tasks_priority_check
  check (priority in ('top', 'medium', 'low'));

alter table public.team_tasks
  add column if not exists with_emails text[] not null default '{}';

alter table public.team_tasks
  drop constraint if exists team_tasks_with_emails_check;

alter table public.team_tasks
  add constraint team_tasks_with_emails_check
  check (cardinality(with_emails) <= 10);

-- "Tasks shared with me": with_emails && '{me}'.
create index if not exists team_tasks_with_emails
  on public.team_tasks using gin (with_emails);

notify pgrst, 'reload schema';

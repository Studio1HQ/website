-- Tasks: time on a work log line is optional.
--
-- People now list what they did today, one line each, and add a rough time
-- only if they want to. team_work_logs.minutes may be null ("no time
-- given"); when it's there it's still 5 minutes to 16 hours. Totals count
-- only the lines with a time.
--
-- Needs 20261116100000_team_tasks.sql. Safe to run again.

alter table public.team_work_logs
  alter column minutes drop not null;

alter table public.team_work_logs
  drop constraint if exists team_work_logs_minutes_check;

alter table public.team_work_logs
  add constraint team_work_logs_minutes_check
  check (minutes is null or minutes between 5 and 960);

notify pgrst, 'reload schema';

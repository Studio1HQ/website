-- Tasks: a run of days for ongoing work, so a card isn't moved day by day.
--
-- start_on  the first day of a task that runs over several days; due_on is
--           its last. Null for a one-day task (the usual). The Week view
--           shows the card on every day from start_on to due_on (to the day
--           it was finished, once it's done), and moving it moves the run.
--           The app only writes it when it's before the task's last day.
--
-- Until this runs, tasks still save and load as before; picking "Several
-- days" says the update is needed.
--
-- Needs 20261116100000_team_tasks.sql. Safe to run again.

alter table public.team_tasks
  add column if not exists start_on date;

notify pgrst, 'reload schema';

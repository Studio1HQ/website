-- Tasks: remember when a task slips, for the founders' monthly review
-- (app/internal/(dashboard)/tasks/reports/review).
--
--   team_tasks.slips      how many times its day was moved later once that
--                         day had come (IST) while it was still owed (Not
--                         started or In progress). Planning ahead isn't a
--                         slip; pushing today's card to tomorrow is.
--   team_tasks.missed_on  the first due day it missed: where its delay is
--                         counted from, however many times it moved after.
--
-- A trigger sets both, so a drag, the edit dialog and "More days" all count
-- the same way, and nothing else can change them. Tasks moved before this
-- ran keep 0: that history wasn't kept. Safe to run again.

alter table public.team_tasks
  add column if not exists slips smallint not null default 0;

alter table public.team_tasks
  add column if not exists missed_on date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'team_tasks_slips_positive') then
    alter table public.team_tasks
      add constraint team_tasks_slips_positive check (slips >= 0);
  end if;
end $$;

create or replace function public.team_tasks_note_slip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.due_on is not null
     and new.due_on is not null
     and new.due_on > old.due_on
     and old.status in ('todo', 'doing')
     and old.due_on <= (now() at time zone 'Asia/Kolkata')::date
  then
    new.slips := least(old.slips + 1, 32767);
    new.missed_on := coalesce(old.missed_on, old.due_on);
  else
    new.slips := old.slips;
    new.missed_on := old.missed_on;
  end if;
  return new;
end;
$$;

create or replace trigger team_tasks_note_slip
  before update on public.team_tasks
  for each row execute function public.team_tasks_note_slip();

-- New tasks start clean, whatever the insert says.
create or replace function public.team_tasks_new_slip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.slips := 0;
  new.missed_on := null;
  return new;
end;
$$;

create or replace trigger team_tasks_new_slip
  before insert on public.team_tasks
  for each row execute function public.team_tasks_new_slip();

notify pgrst, 'reload schema';

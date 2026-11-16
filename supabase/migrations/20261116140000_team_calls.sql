-- Calls: Studio1's internal calls (syncs, stand-ups, 1:1s), so everyone can
-- see which calls they have this week and when (app/internal/(dashboard)/calls).
-- Prospect, hiring and client calls stay in Google Calendar; only internal
-- calls live here.
--
--   team_calls         one call, once or repeating weekly on chosen days
--                      (every week or every other week), at a time in IST,
--                      with who's in, a host, the Meet link and what it's for
--   team_call_changes  one day of a repeating call cancelled, or moved to
--                      another day or time; the rest of the series is kept
--
-- The founders and the founder's associate plan calls; everyone on the
-- team sees all of them (the owner, 16 Nov 2026). The app checks that. The
-- site's server key is the only one with access. Needs set_updated_at
-- (the dashboard migration). Safe to run again.

create table if not exists public.team_calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,
  updated_by text,

  title text not null check (length(title) between 1 and 120),
  about text not null default '' check (length(about) <= 2000),
  link text not null default '' check (length(link) <= 500),
  host text check (host is null or length(host) <= 320),
  -- Who's in, by email (people not on the team list yet too).
  people text[] not null default '{}' check (cardinality(people) <= 60),
  -- Everyone on the team: new joiners are in without editing the call.
  whole_team boolean not null default false,

  -- 'once' happens on starts_on; 'weekly' on `days` (ISO weekdays, 1 =
  -- Monday) from starts_on until ends_on, every `every_weeks` weeks
  -- counted from the week of starts_on.
  repeat text not null default 'weekly' check (repeat in ('once', 'weekly')),
  days smallint[] not null default '{}' check (days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  every_weeks smallint not null default 1 check (every_weeks between 1 and 4),
  starts_on date not null,
  ends_on date,
  -- "HH:MM" in IST.
  start_time text not null check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  minutes integer not null check (minutes between 5 and 480),

  constraint team_calls_days check (repeat = 'once' or cardinality(days) > 0),
  constraint team_calls_range check (ends_on is null or ends_on >= starts_on),
  constraint team_calls_someone check (whole_team or cardinality(people) > 0)
);

create index if not exists team_calls_by_range
  on public.team_calls (starts_on, ends_on);

create table if not exists public.team_call_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,
  updated_by text,

  call_id uuid not null references public.team_calls (id) on delete cascade,
  -- The day it was due on (as the series has it).
  on_day date not null,
  cancelled boolean not null default false,
  -- Moved: the new day and/or time; null keeps the series' own.
  moved_day date,
  moved_time text check (moved_time is null or moved_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  note text not null default '' check (length(note) <= 300),

  unique (call_id, on_day),
  constraint team_call_changes_something check (cancelled or moved_day is not null or moved_time is not null)
);

create index if not exists team_call_changes_by_day
  on public.team_call_changes (on_day);
create index if not exists team_call_changes_by_moved
  on public.team_call_changes (moved_day) where moved_day is not null;

-- updated_at on every edit ----------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['team_calls', 'team_call_changes'] loop
    execute format(
      'create or replace trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- Access: the site's server key only -------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['team_calls', 'team_call_changes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';

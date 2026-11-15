-- Attendance: more than one slot a day.
--
-- A day used to be one stretch (start_time to end_time). People who work in
-- parts (a morning and an evening, say) can now log each part as a slot.
--
--   team_attendance.slots   the day's slots in order, as a JSON list:
--                           [{"start": "09:30", "end": "13:00"},
--                            {"start": "16:00", "end": null}]
--                           `end` is null while a slot is still going; only
--                           the last one can be.
--
-- start_time and end_time stay: the first slot's start and the last slot's
-- end (null while it's going), so anything reading only those still sees the
-- whole day. Days logged before this get their one stretch as a single slot.
-- Safe to run again.

alter table public.team_attendance
  add column if not exists slots jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_attendance_slots_is_list'
  ) then
    alter table public.team_attendance
      add constraint team_attendance_slots_is_list check (jsonb_typeof(slots) = 'array');
  end if;
end $$;

update public.team_attendance
set slots = jsonb_build_array(
  jsonb_build_object('start', to_char(start_time, 'HH24:MI'), 'end', to_char(end_time, 'HH24:MI'))
)
where start_time is not null
  and slots = '[]'::jsonb;

notify pgrst, 'reload schema';

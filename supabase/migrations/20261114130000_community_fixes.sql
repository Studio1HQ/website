-- Community fixes: "signed up for more than one event" counts events, not
-- rows. Safe to run again; needs 20261113140000_community.sql.
--
-- Before, community_people counted one row per sign-up, so someone on a
-- hackathon event's guest list and in that hackathon's site registrations
-- counted as two events. Now each event counts once per person: a site
-- registration belongs to the community event with the same hackathon_slug
-- when there is one. The columns and their types stay the same, so the
-- pages work before and after this runs.
--
--   events    events the person signed up for (cancellations left out)
--   attended  events they were checked in at

create or replace view public.community_people
with (security_invoker = true) as
  with seen as (
    select
      g.email,
      'e:' || g.event_id::text as event_key,
      coalesce(e.starts_on, g.created_at::date) as seen_on,
      (g.status = 'attended') as attended
    from public.community_guests g
    join public.community_events e on e.id = g.event_id
    where g.status <> 'cancelled'
    union all
    select
      lower(h.email),
      coalesce(
        (
          select 'e:' || e.id::text
          from public.community_events e
          where e.hackathon_slug = h.hackathon_slug
          order by e.created_at
          limit 1
        ),
        'h:' || h.hackathon_slug
      ),
      h.created_at::date,
      (h.review_status = 'attended')
    from public.hackathon_registrations h
    where h.review_status not in ('rejected', 'withdrawn')
  )
  select
    email,
    min(seen_on) as first_seen,
    count(distinct event_key) as events,
    count(distinct event_key) filter (where attended) as attended
  from seen
  group by email;

-- community_people_by_month reads the view above and needs no change.

grant select on public.community_people to service_role;
revoke all on public.community_people from anon, authenticated;

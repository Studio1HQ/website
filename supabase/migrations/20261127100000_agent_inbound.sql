-- Inbound: leads that book a call or email us, and the design agent that
-- works on them (app/internal/(dashboard)/inbound).
--
-- A lead is a row in outreach_orgs whose source is inbound_call or
-- inbound_email; there is no second leads table. Two programs meet at the
-- database: the website (writes events, shows results, with the service
-- role) and the agent's worker (claims events, writes results back, with
-- the narrow agent_worker role below, never the service role).
--
--   agent_events    one row per thing the agent should do for a lead
--   agent_files     files the agent made (kept in the private bucket
--                   agent-files at <org_id>/<event_id>/<name>)
--   inbound_mail    mail waiting to be sorted, and a short record after
--                   (rows older than 15 days are deleted by
--                   app/api/cron/purge-inbound-mail)
--   agent_settings  small settings the founders control
--
-- Also: the inbound_manager role (the Inbound area, given one by one), and
-- the audit trail takes the area 'inbound'.
--
-- Needs the outreach migrations (20261117100000_outreach.sql and
-- 20261118120000_outreach_research.sql) and the Supabase Storage schema.
-- Safe to run again.

-- Events -------------------------------------------------------------------

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- A staff email, 'webhook:cal' or 'sorter'.
  created_by text,
  org_id uuid not null references public.outreach_orgs (id) on delete cascade,
  kind text not null
    check (kind in ('lead_created', 'call_notes_added', 'founder_answers', 'proposal_sent', 'reply_received', 'won', 'lost')),
  -- Keys used: message, notes, answers, contact_name, contact_role,
  -- call_at, reason, source.
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  attempts int not null default 0,
  claimed_at timestamptz,
  finished_at timestamptz,
  -- Safe to show; never a secret.
  error text not null default '',
  -- The agent's reply for this event, and the three lists every report ends with.
  report text not null default '',
  done_items text[] not null default '{}',
  waiting_items text[] not null default '{}',
  next_items text[] not null default '{}'
);

create index if not exists agent_events_by_status
  on public.agent_events (status, created_at);
create index if not exists agent_events_by_org
  on public.agent_events (org_id, created_at desc);

-- Files --------------------------------------------------------------------

create table if not exists public.agent_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references public.outreach_orgs (id) on delete cascade,
  event_id uuid references public.agent_events (id) on delete set null,
  name text not null,
  storage_path text not null unique,
  content_type text not null default '',
  bytes bigint not null default 0,
  kind text not null default 'other'
    check (kind in ('brief', 'deck_pdf', 'deck_pptx', 'outline', 'other')),
  approved_to_send boolean not null default false,
  approved_by text,
  approved_at timestamptz
);

create index if not exists agent_files_by_org
  on public.agent_files (org_id, created_at desc);
create index if not exists agent_files_by_event
  on public.agent_files (event_id) where event_id is not null;

-- Mail ---------------------------------------------------------------------

create table if not exists public.inbound_mail (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  -- For de-duplication: Resend retries a webhook under the same message.
  message_id text unique,
  from_address text not null,
  from_name text not null default '',
  subject text not null default '',
  -- Only: auto-submitted, precedence, list-unsubscribe, list-id,
  -- return-path, x-autoreply, x-auto-response-suppress, reply-to
  -- (lowercased keys). The app keeps to that list; the worker never reads
  -- other headers. Authentication-Results is never stored: the sender can
  -- write one, so it proves nothing (see sender_verified).
  headers jsonb not null default '{}'::jsonb,
  -- The website's own answer, from the receiving provider's DMARC verdict.
  -- The worker trusts this and nothing in the headers; it can read it and
  -- never write it.
  sender_verified boolean not null default false,
  -- The worker sets it to null as soon as the mail is sorted.
  body_text text,
  excerpt text not null default '' check (char_length(excerpt) <= 300),
  status text not null default 'new'
    check (status in ('new', 'sorting', 'sorted', 'failed')),
  label text not null default '',
  -- 'rules', 'model' or 'person'.
  decided_by text not null default '',
  reason text not null default '',
  confidence numeric,
  held boolean not null default false,
  org_id uuid references public.outreach_orgs (id) on delete set null,
  -- 'lead' or 'not_lead': a person's correction of the sorter.
  correction text not null default '' check (correction in ('', 'lead', 'not_lead')),
  resolved_by text,
  resolved_at timestamptz,
  -- Added to the contract so a mail stuck in 'sorting' can be put back.
  claimed_at timestamptz,
  attempts int not null default 0
);

create index if not exists inbound_mail_by_status
  on public.inbound_mail (status, received_at);
create index if not exists inbound_mail_by_age
  on public.inbound_mail (received_at);
create index if not exists inbound_mail_held
  on public.inbound_mail (received_at desc) where held;

-- Settings -----------------------------------------------------------------

create table if not exists public.agent_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- sorter.apply false: the sorter only labels mail and never creates a lead.
insert into public.agent_settings (key, value) values
  ('sorter', '{"apply": false}'::jsonb),
  ('auto_start', '{"booking": true, "mail": false}'::jsonb),
  ('house_rules', '{"rules": []}'::jsonb)
on conflict (key) do nothing;

-- Access: the site's server key only, plus the worker's own role -----------

do $$
declare
  t text;
begin
  foreach t in array array['agent_events', 'agent_files', 'inbound_mail', 'agent_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- The worker's database identity -------------------------------------------
-- nologin, reached through PostgREST with a JWT whose role claim is
-- agent_worker (authenticator may switch to it). Least privilege: column
-- grants are the limit, the policies below only let the rows through.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'agent_worker') then
    create role agent_worker nologin;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    grant agent_worker to authenticator;
  end if;
end $$;

grant usage on schema public to agent_worker;

-- agent_events: read, queue the two kinds the sorter queues, report back.
revoke all on public.agent_events from agent_worker;
grant select on public.agent_events to agent_worker;
grant insert (id, created_by, org_id, kind, payload) on public.agent_events to agent_worker;
grant update (status, attempts, claimed_at, finished_at, error, report, done_items, waiting_items, next_items)
  on public.agent_events to agent_worker;

-- agent_files: read and add (approval stays with the site).
revoke all on public.agent_files from agent_worker;
grant select on public.agent_files to agent_worker;
grant insert (id, org_id, event_id, name, storage_path, content_type, bytes, kind)
  on public.agent_files to agent_worker;

-- inbound_mail: read (sender_verified included), and write the sorting
-- result. sender_verified is not in the update list: only the site sets it.
revoke all on public.inbound_mail from agent_worker;
grant select on public.inbound_mail to agent_worker;
grant update (status, label, decided_by, reason, confidence, held, org_id, body_text, excerpt, claimed_at, attempts)
  on public.inbound_mail to agent_worker;

-- agent_settings: read only.
revoke all on public.agent_settings from agent_worker;
grant select on public.agent_settings to agent_worker;

-- outreach_orgs: never est_value, currency, notes, owner or anything about money.
-- The worker may read orgs (it must see whether any org already owns a
-- domain) and create leads from mail. It may only edit the research fields of
-- an inbound lead: name, website, domain, kind, stage and source are in the
-- insert grant and not the update grant, so a compromised worker cannot
-- rewrite a client or an outreach prospect, or move a lead.
revoke all on public.outreach_orgs from agent_worker;
grant select (id, name, website, domain, kind, stage, source, interest, about, funding, why_fit, conflict, client_id)
  on public.outreach_orgs to agent_worker;
grant insert (name, website, domain, kind, stage, source, interest, about, funding, why_fit, conflict, created_by, updated_by)
  on public.outreach_orgs to agent_worker;
grant update (interest, about, funding, why_fit, conflict, updated_by)
  on public.outreach_orgs to agent_worker;

-- outreach_contacts: only the contacts of inbound leads (see the policies).
revoke all on public.outreach_contacts from agent_worker;
grant select (id, org_id, name, title, email) on public.outreach_contacts to agent_worker;
grant insert (org_id, name, title, email, is_primary, created_by) on public.outreach_contacts to agent_worker;

-- Row policies for the worker (service_role bypasses row security).
do $$
declare
  rule record;
begin
  for rule in
    select * from (values
      ('agent_events', 'select'), ('agent_events', 'insert'), ('agent_events', 'update'),
      ('agent_files', 'select'), ('agent_files', 'insert'),
      ('inbound_mail', 'select'), ('inbound_mail', 'update'),
      ('agent_settings', 'select'),
      ('outreach_orgs', 'select')
    ) as r (tbl, cmd)
  loop
    execute format('drop policy if exists %I on public.%I', 'agent_worker_' || rule.cmd, rule.tbl);
    -- Open to the worker: the column grants are the limit. Inserting and
    -- editing orgs and reading and adding contacts get row limits below.
    if rule.cmd = 'select' then
      execute format('create policy %I on public.%I for select to agent_worker using (true)', 'agent_worker_' || rule.cmd, rule.tbl);
    elsif rule.cmd = 'insert' then
      execute format('create policy %I on public.%I for insert to agent_worker with check (true)', 'agent_worker_' || rule.cmd, rule.tbl);
    else
      execute format('create policy %I on public.%I for update to agent_worker using (true) with check (true)', 'agent_worker_' || rule.cmd, rule.tbl);
    end if;
  end loop;
end $$;

-- Row limits for the two company tables. The worker reads every org (to see
-- whether a domain is taken), creates only leads that came from mail, and
-- edits only inbound leads. Its contacts are those of inbound leads.
drop policy if exists agent_worker_insert on public.outreach_orgs;
create policy agent_worker_insert on public.outreach_orgs
  for insert to agent_worker
  with check (source = 'inbound_email' and stage = 'lead');

drop policy if exists agent_worker_update on public.outreach_orgs;
create policy agent_worker_update on public.outreach_orgs
  for update to agent_worker
  using (source in ('inbound_call', 'inbound_email'))
  with check (source in ('inbound_call', 'inbound_email'));

drop policy if exists agent_worker_select on public.outreach_contacts;
create policy agent_worker_select on public.outreach_contacts
  for select to agent_worker
  using (exists (
    select 1 from public.outreach_orgs o
    where o.id = org_id and o.source in ('inbound_call', 'inbound_email')
  ));

drop policy if exists agent_worker_insert on public.outreach_contacts;
create policy agent_worker_insert on public.outreach_contacts
  for insert to agent_worker
  with check (exists (
    select 1 from public.outreach_orgs o
    where o.id = org_id and o.source in ('inbound_call', 'inbound_email')
  ));

-- Files: a private bucket ------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('agent-files', 'agent-files', false)
on conflict (id) do nothing;

-- The worker may add and read objects in this bucket only. Granting on
-- storage.objects needs the right to grant; where it is missing, the notice
-- says so and the grant has to be made by hand in the dashboard's SQL editor.
do $$
begin
  grant usage on schema storage to agent_worker;
  grant select, insert on storage.objects to agent_worker;
exception when insufficient_privilege then
  raise notice 'Could not grant agent_worker access to storage.objects: grant select, insert on storage.objects to agent_worker, as the owner';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'agent_worker_read_agent_files'
  ) then
    create policy agent_worker_read_agent_files on storage.objects
      for select to agent_worker
      using (bucket_id = 'agent-files');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'agent_worker_add_agent_files'
  ) then
    create policy agent_worker_add_agent_files on storage.objects
      for insert to agent_worker
      with check (bucket_id = 'agent-files');
  end if;
end $$;

-- Claiming work ------------------------------------------------------------
-- Called by the worker through PostgREST rpc, as agent_worker (security
-- invoker: its own column grants and policies apply).

-- The oldest queued event, now running, with the lead's name, website and
-- domain. No row when the queue is empty. Events running for more than 45
-- minutes go back to queued while attempts < 3, else fail with 'timed out'.
create or replace function public.agent_claim_event()
returns table (
  id uuid,
  created_at timestamptz,
  created_by text,
  org_id uuid,
  kind text,
  payload jsonb,
  status text,
  attempts int,
  claimed_at timestamptz,
  org_name text,
  org_website text,
  org_domain text
)
language sql
security invoker
set search_path = public
as $$
  update public.agent_events as stuck
  set status = case when stuck.attempts < 3 then 'queued' else 'failed' end,
      error = case when stuck.attempts < 3 then stuck.error else 'timed out' end,
      finished_at = case when stuck.attempts < 3 then stuck.finished_at else now() end
  where stuck.status = 'running'
    and stuck.claimed_at < now() - interval '45 minutes';

  with next_event as (
    select e.id
    from public.agent_events as e
    where e.status = 'queued'
    order by e.created_at
    limit 1
    for update skip locked
  ),
  claimed as (
    update public.agent_events as ev
    set status = 'running',
        attempts = ev.attempts + 1,
        claimed_at = now()
    from next_event
    where ev.id = next_event.id
    returning ev.id, ev.created_at, ev.created_by, ev.org_id, ev.kind, ev.payload,
              ev.status, ev.attempts, ev.claimed_at
  )
  select c.id, c.created_at, c.created_by, c.org_id, c.kind, c.payload,
         c.status, c.attempts, c.claimed_at,
         o.name, o.website, o.domain
  from claimed as c
  join public.outreach_orgs as o on o.id = c.org_id;
$$;

-- The oldest mail still new, now sorting. Mail sorting for more than 45
-- minutes goes back to new while attempts < 3, else it is marked failed.
create or replace function public.agent_claim_mail()
returns setof public.inbound_mail
language sql
security invoker
set search_path = public
as $$
  update public.inbound_mail as stuck
  set status = case when stuck.attempts < 3 then 'new' else 'failed' end,
      reason = case when stuck.attempts < 3 then stuck.reason else 'timed out' end
  where stuck.status = 'sorting'
    and stuck.claimed_at < now() - interval '45 minutes';

  with next_mail as (
    select m.id
    from public.inbound_mail as m
    where m.status = 'new'
    order by m.received_at
    limit 1
    for update skip locked
  )
  update public.inbound_mail as mail
  set status = 'sorting',
      attempts = mail.attempts + 1,
      claimed_at = now()
  from next_mail
  where mail.id = next_mail.id
  returning mail.*;
$$;

revoke all on function public.agent_claim_event() from public, anon, authenticated, service_role;
revoke all on function public.agent_claim_mail() from public, anon, authenticated, service_role;
grant execute on function public.agent_claim_event() to agent_worker;
grant execute on function public.agent_claim_mail() to agent_worker;

-- The Inbound role and the audit trail ----------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_members_roles_known'
      and conrelid = 'public.internal_members'::regclass
      and pg_get_constraintdef(oid) like '%inbound_manager%'
  ) then
    alter table public.internal_members
      drop constraint if exists internal_members_roles_known;
    alter table public.internal_members
      add constraint internal_members_roles_known check (
        roles <@ array[
          'admin', 'hiring_reviewer', 'hiring_viewer', 'blog_reviewer', 'blog_writer',
          'community_manager', 'community_viewer',
          'client_manager', 'client_member',
          'tasks_viewer',
          'outreach_manager', 'influencer_manager', 'socials_manager',
          'inbound_manager',
          'job_board_editor'
        ]::text[]
      );
  end if;
end $$;

do $$
begin
  if to_regclass('public.team_audit') is not null then
    alter table public.team_audit drop constraint if exists team_audit_area_check;
    alter table public.team_audit add constraint team_audit_area_check
      check (area in ('payments', 'payroll', 'claims', 'attendance', 'people', 'intake', 'influencers', 'job_board', 'inbound'));
  end if;
end $$;

notify pgrst, 'reload schema';

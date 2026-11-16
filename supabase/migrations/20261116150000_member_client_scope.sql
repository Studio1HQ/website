-- Which clients a Client team member may open (People → their row → Clients).
-- Null is every client, which is what everyone had before this column, so
-- nothing changes until an admin picks someone's clients. Managers, admins
-- and the founders always see every client; the app ignores this for them.
-- No foreign key on an array: a deleted client's id just stops matching.

alter table public.internal_members
  add column if not exists client_ids uuid[];

comment on column public.internal_members.client_ids is
  'Client team members: the client_accounts ids they may open. Null = every client.';

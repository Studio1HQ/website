-- Client links: a short list of named links per client ("Blog plan
-- (Notion)", "Where blogs get published", "Shared drive"…), shown in the
-- client's workspace header and edited by client managers
-- (app/internal/(dashboard)/clients/[slug]).
--
--   client_accounts.links  jsonb array of {label, url}, at most 12.
--                          The app checks each url (http(s) only, no
--                          logins or keys) before saving.
--
-- Needs the client work migration (20261115130000_client_work.sql).
-- Safe to run again.

alter table public.client_accounts
  add column if not exists links jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_accounts_links_list'
      and conrelid = 'public.client_accounts'::regclass
  ) then
    alter table public.client_accounts
      -- CASE so the length is only taken of an array.
      add constraint client_accounts_links_list check (
        case
          when jsonb_typeof(links) = 'array' then jsonb_array_length(links) <= 12
          else false
        end
      );
  end if;
end $$;

notify pgrst, 'reload schema';

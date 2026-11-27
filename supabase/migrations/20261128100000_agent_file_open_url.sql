-- Inbound: a link to the editable copy of a deck.
--
-- After the agent builds deck.pptx, its worker can upload the file to
-- Studio1's Google Drive folder, where Google turns it into Slides. The link
-- to it is kept beside the file so the lead page can show "Open in Google
-- Slides". Only the address of one Slides deck is accepted, in the one shape
-- the worker builds from the file's id, so a worker that has gone wrong
-- cannot plant any other link (a form, a published page) on a lead's page.
--
-- Safe to run more than once.

alter table public.agent_files
  add column if not exists open_url text
  check (
    open_url is null
    or open_url ~ '^https://docs\.google\.com/presentation/d/[A-Za-z0-9_-]{10,100}/edit$'
  );

-- The worker may set it when it adds a file. It still cannot change a file
-- afterwards (no update grant), and approval stays with the site.
grant insert (open_url) on public.agent_files to agent_worker;

# Studio1 Design: running it locally

This folder is Studio1's copy of [langchain-ai/design-agent](https://github.com/langchain-ai/design-agent)
with our changes on top. It lives in the Studio1 website repo, on the `design-agent` branch, beside the
dashboard code it works with. Everything the template documents still applies; this page covers only
what we added and how to run it on a laptop. Run every command below from this folder.

The template came in as one squashed commit (`git subtree add --prefix=design-agent ... --squash`), so
its later releases can be pulled with
`git subtree pull --prefix=design-agent https://github.com/langchain-ai/design-agent main --squash`.
The website's lint, type check, formatter and Vercel build all skip this folder.

## What the fork adds

| Piece | Where | What it does |
| --- | --- | --- |
| Brand pack | `workspace/brand/` | Studio1's colours, fonts, logos, voice and graphic language, built from the website repo's design system |
| Context pack | `skills/studio1-context/` | What Studio1 sells and has proved: services, 13 public case studies, testimonials, client names. Generated, do not edit by hand |
| Research skill | `skills/studio1-company-research/` | A sourced brief on a named company |
| Pitch deck skill | `skills/studio1-pitch-deck/` | An intro or proposal deck built from the brief and the context pack |
| Lead events | `studio1_worker/` | Turns a lead event (created, call notes, founder answers and so on) into one agent turn on that lead's own thread |
| Model setup | `config/studio1.env.example` | Claude Opus 5.5 leads; open models on Nebius Token Factory take the helper roles |
| Search setup | `config/mcp.studio1.example.toml` | Web search servers for the research skill |
| Contrast exceptions | `design.contrastExceptions` in `tokens.json` | Lets the brand pack declare the two Studio1 elements that fail the WCAG check on purpose |

## First run

Needs Docker Desktop running and `uv`.

```bash
uv sync --all-extras --dev
uv run design-agent sandbox build      # the agent's computer, about five minutes the first time
uv run design-agent demo               # the template's sample card and teaser, no keys needed
```

## Keys and models

```bash
cp .env.example .env
# paste the block from config/studio1.env.example into .env, then set the two keys:
uv run design-agent config set ANTHROPIC_API_KEY NEBIUS_API_KEY
uv run design-agent doctor
```

For research, copy `config/mcp.studio1.example.toml` to `config/mcp.toml`. It points the agent at
the search router below.

Without a search server the research skill stops and says so. It never answers from memory.

## Search router

One local MCP server sits in front of Olostep, Bright Data and ScrapeGraphAI, so the agent sees four
stable tools while the provider behind each one can be reordered, capped or swapped. Start it in its
own terminal before the agent, in a shell that has the provider keys.

The router only answers callers that send a shared secret, and it only listens on this machine.
Generate the secret once, then export it in the shell that starts the router and in the shell that
starts the agent:

```bash
python -c "import secrets; print('Bearer ' + secrets.token_urlsafe(32))"
export STUDIO1_ROUTER_AUTHORIZATION="Bearer <the value printed above>"
```

The router will not start without it, and it refuses any host other than 127.0.0.1, localhost or
::1.

```bash
export OLOSTEP_API_KEY=... BRIGHTDATA_API_TOKEN=... SGAI_API_KEY=...   # GITHUB_TOKEN is optional
cp config/router.studio1.example.toml config/router.toml
uv run python -m studio1_router --host 127.0.0.1 --port 8765
```

The agent sees these tools (the server name is `router`, so each is prefixed):

- `router_web_search(query, max_results)` returns title, url and snippet per result.
- `router_read_page(url)` returns the page as markdown or text, cut to a maximum length, with the
  final URL and a `truncated` flag.
- `router_extract_fields(url, fields)` returns the named fields from a page. `fields` maps each name
  to a short description of what to extract.
- `router_lookup_company(name, github)` returns public GitHub facts for an org or `owner/repo`:
  stars, forks, open issues, last push, latest release and top repositories. Without `github` it
  returns candidates from GitHub search with their scores, never a confirmed match.

Each tool also takes an optional `context` (a lead slug, for example) that is only written to the
usage log.

The config file is `config/router.toml` (or `--config`, or `STUDIO1_ROUTER_CONFIG`). It sets the
provider order per tool, each provider's `enabled` and `monthly_cap`, the page text length and the
timeout. It is re-read when it changes, so no restart is needed. A provider without a key, or past
its cap, is skipped, and a failing one hands over to the next. Some capabilities ship switched off
in the example because their API shape could not be confirmed from the docs; the file says which.

Every provider call is appended to `workspace/state/router/usage.jsonl` (time, tool, provider,
result, duration, context, query or URL host; never page text or keys). To see this month against
the caps:

```bash
uv run python -m studio1_router usage
```

## Ask for something

Every request below calls the models and costs money.

```bash
uv run design-agent ask "A 1600x900 blog cover for a post about MCP servers"
uv run design-agent ask "Research Acme Cloud (https://acme.example) and build the intro deck"
```

Finished files land in `workspace/out/<thread>/`.

## Lead events

One lead has one thread, `lead-<slug>`, so the brief from the first event is still there when call
notes arrive later.

```bash
uv run python -m studio1_worker lead-created --company "Acme Cloud" --url https://acme.example \
  --source booking --message "We want help with our launch content" --dry-run
uv run python -m studio1_worker call-notes --lead acme-cloud --notes-file notes.txt
uv run python -m studio1_worker founder-answers --lead acme-cloud --text "Pilot at ..., start in January"
uv run python -m studio1_worker status
```

`--dry-run` prints the thread and the full prompt and calls nothing. Drop it to run for real. Each
event's reply is saved under `workspace/state/leads/<slug>/reports/`, and every reply ends with
three lists: Done, Waiting on a founder, Next.

## Inbox sorter

Decides, for one mail at a time, whether a mail to contact@ is a lead. Only a real company that
wants Studio1's services becomes a lead and starts the agent. Three passes:

1. Plain rules, no model: auto-replies and bounces, newsletters and no-reply senders, mail from
   studio1hq.com, and mail from a company that is already a lead (that becomes a `reply_received`
   event on its thread, never a new lead).
2. A small model on Nebius reads what is left and answers with one JSON label: `lead`, `not_sure`,
   `selling_to_us`, `job_ask`, `partner_ask` or `noise`.
3. Code decides. Any model error, bad JSON or low confidence gives `not_sure`, which goes to a
   person. `lead` needs a company, a request for services and a company name. `not_sure` and
   `partner_ask` are held for review; the rest are skipped.

It is silent by default: it labels and logs, but creates no lead and starts no agent unless you
pass `--apply`. Run it silently on real mail for a week first.

```bash
uv run python -m studio1_worker sort-mail --eml mail.eml --dry-run   # rules result and exact prompt, no call
uv run python -m studio1_worker sort-mail --eml mail.eml             # label and log only
uv run python -m studio1_worker sort-mail --eml mail.eml --apply     # also create the lead
uv run python -m studio1_worker sort-mail --from "Name <a@b.com>" --subject "Hi" --body-file body.txt
uv run python -m studio1_worker sort-review                          # held mails
uv run python -m studio1_worker sort-correct --id <id> --label lead|not-lead [--apply]
uv run python -m studio1_worker sort-log --days 7                    # counts per label, then the list
```

Files live in `workspace/state/sorter/`. `log.jsonl` has the sender, subject, label, deciding pass,
reason, confidence and whether it was applied, never the body. `review.jsonl` keeps a 300 character
excerpt and the model's fields for mails the model read. Both are purged after 15 days.
`examples.jsonl` holds your corrections; the latest ones go to the model as examples next time.

| Setting | Default |
| --- | --- |
| `STUDIO1_SORTER_BASE_URL` | `https://api.tokenfactory.nebius.com/v1/` |
| `STUDIO1_SORTER_MODEL` | `zai-org/GLM-5.3-Flash` |
| `STUDIO1_SORTER_API_KEY_ENV` | `NEBIUS_API_KEY` (the name of the variable that holds the key) |
| `STUDIO1_SORTER_THRESHOLD` | `0.7`, the confidence below which a mail goes to review |
| `STUDIO1_SORTER_EXAMPLES` | `8`, how many corrections go into the prompt |

## Refresh the context pack

After the website's case studies or services change:

```bash
uv run python scripts/build_studio1_context.py
```

Client work that is not public is excluded by the site's own draft flag and by a hard check in the
script, which fails if either name appears in its output.

## Editable decks

The pitch deck skill writes `deck/outline.json`. The PDF is built from it, and so can a PowerPoint
file that opens in Google Slides, PowerPoint or Keynote:

```bash
uv run python -m studio1_pptx build path/to/outline.json --out deck.pptx
uv run python -m studio1_pptx check deck.pptx --outline path/to/outline.json
```

`build` refuses an outline that breaks the schema or uses a banned character (an em dash, an en
dash or an exclamation mark) and names the slide. Fix the outline and build again. `check` reopens
the file and exits 1 if the slide size, a headline, a font, a colour or the frame count is off.

What is editable: every word is a real text box, and the shapes (cards, the orange selection
frame and its tag) are real shapes. The only pictures are the sunrise panel, the paper grain and
the logos. The picture files and how to rebuild them are in `studio1_pptx/assets/README.md`.

Fonts: the file asks for Inter, and Inter Medium for headlines, because Google Slides has Inter
but not Studio1 Sans (Inter renamed). A laptop without Inter installed will show PowerPoint's or
Keynote's substitute, so install Inter before editing offline. The two names live in one constant,
`studio1_pptx/brand.py`.

The file is a second build of the same outline, laid out by hand-written rules and not by the HTML
pages, so it matches the PDF closely, not exactly. Treat the PDF as the one to send and the
PowerPoint as the one to edit.

## Running from the dashboard queue

`serve` lets the dashboard drive the worker instead of a person typing commands. It reads events
and unsorted mail from the dashboard's Supabase database, does the work and writes the results back.
It talks to Supabase only through its REST interfaces, with a token for the limited `agent_worker`
role. It never holds the service role key.

Three settings are required. `serve` checks them before it claims anything and names any that is
missing:

| Setting | What it is |
| --- | --- |
| `STUDIO1_SUPABASE_URL` | The project address, like `https://abc.supabase.co` |
| `STUDIO1_SUPABASE_APIKEY` | The project's anon or publishable key |
| `STUDIO1_SUPABASE_WORKER_JWT` | A token whose `role` claim is `agent_worker` |

```bash
uv run python -m studio1_worker serve                       # runs until stopped
uv run python -m studio1_worker serve --once                # one tick, then exit (tests, cron)
uv run python -m studio1_worker serve --poll-seconds 30 --runner api
```

Each tick sorts all waiting mail first (cheap), then claims and runs at most one event (costly),
then sleeps. Events run one at a time. On SIGINT or SIGTERM the worker stops after the current
event. An event that fails is marked failed with a short message and the loop carries on. Every
action logs one line with ids, never content.

The sorter labels mail and wipes the stored body. It creates a lead only when the dashboard setting
`sorter` has `{"apply": true}`, and starts the agent for a new lead only when `auto_start` has
`"mail": true`. An authenticated reply from an existing lead queues a `reply_received` event when
`apply` is on. A new lead's domain is its identity, so a mail can only claim the domain it was sent from (a mail naming another website, or a domain that any org already owns, is held), and the domain is stored only for authenticated mail. For mail from the database, "authenticated" means the row's `sender_verified`, which the website sets from its receiving provider's own DMARC verdict; the stored headers are never used for it (the website no longer stores `Authentication-Results`, and the worker ignores one if a row carries it), while local `.eml` files keep the `STUDIO1_SORTER_TRUSTED_AUTHSERV` header check. A mail whose sender matches an existing lead but is not authenticated is held, and a
mail can never update a lead that exists. Any doubt, or any error, holds the mail for a person.

After each event the worker uploads the files in `workspace/out/<thread>/` that are new or changed
since the last event on that thread, including `deck.pptx`. A note of what was sent is kept in
`workspace/state/queue/manifests/`. Links, folders and files over 100 MiB are skipped. The API
runner has no local files, so it uploads none.

To stop one lead from spending without limit, the worker refuses to run more than a set number of
events for one lead in a UTC day. Set it in the `agent_settings` row with key `caps`:

```json
{"events_per_lead_per_day": 6}
```

Six is the default when the key is absent. An event over the limit fails with the error
`daily cap reached for this lead`.

### Measuring the sorter first

`sort-eval` runs the real sorter on mail a person already sorted by hand, so you can see how it
does before `apply` is switched on. It calls the model, so it needs the sorter's key and costs
money. It prints how many model calls it will make and asks first, unless you pass `--yes`.

```bash
uv run python -m studio1_worker sort-eval ./labelled
uv run python -m studio1_worker sort-eval ./labelled --limit 20 --yes
```

The folder has one subfolder per true label, each holding `.eml` files:

```text
labelled/
  lead/            not_sure/        selling_to_us/
  job_ask/         partner_ask/     noise/
```

`--limit N` takes the first N files of each label. The output is a confusion table, the recall and
precision for `lead`, the true leads that were neither labelled `lead` nor held for review (missed
leads), and the mails that are not leads but would have started the agent. The exit code is 1 if
any true lead was skipped outright. Treat that list as the one to read first.

## Checks

```bash
make check                                             # lint, types, offline tests
uv run pytest -q -m render tests/render/test_gates_render.py   # gates inside the sandbox image
```

## Not built yet

The dashboard pages that show all this (the Inbound section), the Google Drive upload for the
editable deck, enrichment beyond the GitHub lookup, and hosting. The queue reader is built but has
only been tested against a stand-in database.

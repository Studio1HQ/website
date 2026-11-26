"""Command line: `uv run python -m studio1_worker --help`."""

from __future__ import annotations

import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

import click

from studio1_worker.events import (
    NOTES_FILENAME,
    EventKind,
    LeadEvent,
    prompt_for,
    slugify,
    thread_id_for,
)
from studio1_worker.queue import QueueError, Supabase
from studio1_worker.runners import ApiRunner, CliRunner, Runner, RunnerError
from studio1_worker.serve import Worker, make_stop_event
from studio1_worker.sort_eval import collect as collect_eval_items
from studio1_worker.sort_eval import count_model_calls, evaluate, format_report
from studio1_worker.sorter import (
    SORTER_ROOT,
    Mail,
    ModelClient,
    OpenAIClient,
    SorterConfigError,
    SorterSettings,
    SorterState,
    SortResult,
    apply_rules,
    build_prompt,
    classify,
    new_lead_event,
    parse_eml,
)
from studio1_worker.store import DEFAULT_ROOT, LeadStore
from studio1_worker.turn import run_turn


def _common[F: Callable[..., Any]](func: F) -> F:
    func = click.option(
        "--runner",
        "runner_name",
        type=click.Choice(["cli", "api"]),
        default="cli",
        show_default=True,
        help="Run the turn through the local CLI or the self-hosted HTTP API.",
    )(func)
    return click.option(
        "--dry-run",
        is_flag=True,
        help="Print the thread id and the full prompt. Record nothing and call nothing.",
    )(func)


def _lead_option[F: Callable[..., Any]](func: F) -> F:
    return click.option("--lead", "slug", required=True, help="The lead's slug.")(func)


def _store() -> LeadStore:
    return LeadStore(DEFAULT_ROOT)


def _existing(slug: str, kind: EventKind, **fields: Any) -> LeadEvent:
    lead = _store().load_lead(slug)
    if lead is None:
        raise click.ClickException(f"No lead called {slug}. Run lead-created first.")
    facts = {k: lead.get(k) for k in ("company_name", "company_url", "source", "contact_name")}
    facts["contact_role"] = lead.get("contact_role")
    facts["source"] = facts["source"] or "manual"
    return LeadEvent(kind=kind, lead_slug=slug, **facts, **fields)


def _runner(name: str) -> Runner:
    try:
        return ApiRunner() if name == "api" else CliRunner()
    except RunnerError as error:
        raise click.ClickException(str(error)) from None


def _execute(
    event: LeadEvent, runner_name: str, dry_run: bool, notes_text: str | None = None
) -> None:
    thread = thread_id_for(event)
    prompt = prompt_for(event)
    if dry_run:
        click.echo(f"thread: {thread}")
        if notes_text is not None:
            click.echo(f"attachment: {NOTES_FILENAME} ({len(notes_text)} characters)")
        click.echo("--- prompt ---")
        click.echo(prompt)
        return
    runner = _runner(runner_name)
    store = _store()
    store.upsert_lead(event, thread)
    number = store.queue(event)
    attachments: list[Path] = []
    if notes_text is not None:
        folder = store.folder(event.lead_slug) / "attachments"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / NOTES_FILENAME
        path.write_text(notes_text)
        attachments.append(path)
    store.set_status(event.lead_slug, number, "running")
    try:
        outcome = run_turn(runner, thread, prompt, attachments, build_deck=runner_name == "cli")
    except RunnerError as error:
        store.set_status(event.lead_slug, number, "failed", str(error))
        raise click.ClickException(f"Event {number} failed: {error}") from None
    except Exception as error:
        store.set_status(event.lead_slug, number, "failed", type(error).__name__)
        raise
    result = outcome.result
    if outcome.deck is not None:
        click.echo(f"Editable deck: {outcome.deck}")
    elif outcome.deck_problem:
        click.echo(f"Editable deck not built: {outcome.deck_problem}", err=True)
    lead = store.finish(event, number, result.reply, result.files)
    click.echo(f"\nEvent {number} ({event.kind.value}) done on {thread}.")
    if result.working:
        click.echo("Background work was still running when the wait ended.")
    _print_lists(lead)


def _print_lists(lead: dict[str, Any]) -> None:
    for title, key in (("Waiting on a founder", "waiting"), ("Next", "next")):
        click.echo(f"{title}:")
        for item in lead.get(key) or ["(none recorded)"]:
            click.echo(f"  - {item}")


@click.group()
def cli() -> None:
    """Run Studio1 lead events through the design agent, one thread per lead."""


@cli.command("lead-created")
@click.option("--company", required=True, help="Company name.")
@click.option("--url", required=True, help="Company website.")
@click.option(
    "--source",
    type=click.Choice(["booking", "mail", "manual"]),
    required=True,
    help="How it came in.",
)
@click.option("--contact-name", default=None)
@click.option("--contact-role", default=None)
@click.option("--message", default=None, help="What they wrote or booked for.")
@_common
def lead_created(
    company: str,
    url: str,
    source: str,
    contact_name: str | None,
    contact_role: str | None,
    message: str | None,
    runner_name: str,
    dry_run: bool,
) -> None:
    """A new lead. A second one for the same company updates it on the same thread."""
    slug = slugify(company)
    if not slug:
        raise click.ClickException("The company name needs at least one letter or digit.")
    event = LeadEvent.model_validate(
        {
            "kind": EventKind.LEAD_CREATED,
            "lead_slug": slug,
            "company_name": company,
            "company_url": url,
            "source": source,
            "contact_name": contact_name,
            "contact_role": contact_role,
            "message": message,
        }
    )
    _execute(event, runner_name, dry_run)


@cli.command("call-notes")
@_lead_option
@click.option("--notes-file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--notes", default=None, help="The notes as text.")
@_common
def call_notes(
    slug: str, notes_file: Path | None, notes: str | None, runner_name: str, dry_run: bool
) -> None:
    """Notes from the call; they go to the agent as an attached file."""
    if (notes_file is None) == (notes is None):
        raise click.UsageError("Give exactly one of --notes-file or --notes.")
    text = notes_file.read_text() if notes_file else notes or ""
    event = _existing(slug, EventKind.CALL_NOTES_ADDED)
    _execute(event, runner_name, dry_run, notes_text=text)


@cli.command("founder-answers")
@_lead_option
@click.option("--text", required=True, help="The founder's answers, including prices and scope.")
@_common
def founder_answers(slug: str, text: str, runner_name: str, dry_run: bool) -> None:
    """Founder answers; the only source of prices and scope."""
    _execute(_existing(slug, EventKind.FOUNDER_ANSWERS, answers=text), runner_name, dry_run)


@cli.command("proposal-sent")
@_lead_option
@_common
def proposal_sent(slug: str, runner_name: str, dry_run: bool) -> None:
    """The proposal went out."""
    _execute(_existing(slug, EventKind.PROPOSAL_SENT), runner_name, dry_run)


@cli.command("reply-received")
@_lead_option
@click.option("--text", required=True, help="The lead's reply.")
@_common
def reply_received(slug: str, text: str, runner_name: str, dry_run: bool) -> None:
    """The lead replied."""
    _execute(_existing(slug, EventKind.REPLY_RECEIVED, message=text), runner_name, dry_run)


@cli.command("won")
@_lead_option
@_common
def won(slug: str, runner_name: str, dry_run: bool) -> None:
    """The lead became a client."""
    _execute(_existing(slug, EventKind.WON), runner_name, dry_run)


@cli.command("lost")
@_lead_option
@click.option("--reason", required=True, help="Why the lead was lost.")
@_common
def lost(slug: str, reason: str, runner_name: str, dry_run: bool) -> None:
    """The lead is lost."""
    _execute(_existing(slug, EventKind.LOST, reason=reason), runner_name, dry_run)


@cli.command("status")
@click.option("--lead", "slug", default=None, help="Show one lead.")
def status(slug: str | None) -> None:
    """Each lead with its last event and its open lists."""
    store = _store()
    slugs = [slug] if slug else store.slugs()
    if not slugs:
        click.echo("No leads yet.")
        return
    for name in slugs:
        lead = store.load_lead(name)
        if lead is None:
            raise click.ClickException(f"No lead called {name}.")
        events = store.events(name)
        last = events[-1] if events else None
        click.echo(f"{name} ({lead.get('company_name', '?')})")
        if last:
            kind = last["event"]["kind"]
            click.echo(f"  last event: {kind} #{last['n']} {last['status']} at {last['at']}")
        else:
            click.echo("  last event: none")
        _print_lists(lead)
        click.echo("")


def _sorter_settings() -> SorterSettings:
    try:
        return SorterSettings.from_env()
    except SorterConfigError as error:
        raise click.ClickException(str(error)) from None


def _model_client(settings: SorterSettings) -> ModelClient:
    try:
        return OpenAIClient(settings)
    except SorterConfigError as error:
        raise click.ClickException(str(error)) from None


def _mail_from_options(
    eml: Path | None, sender: str | None, subject: str | None, body_file: Path | None
) -> Mail:
    if eml is not None:
        if sender or subject or body_file:
            raise click.UsageError(
                "Give --eml, or --from with --subject and --body-file, not both."
            )
        return parse_eml(eml.read_bytes())
    if not (sender and subject is not None and body_file):
        raise click.UsageError("Give --eml, or all of --from, --subject and --body-file.")
    return Mail(sender=sender, subject=subject, body=body_file.read_text())


@cli.command("sort-mail")
@click.option("--eml", type=click.Path(exists=True, dir_okay=False, path_type=Path), default=None)
@click.option("--from", "sender", default=None, help='The sender, like "Name <a@b.com>".')
@click.option("--subject", default=None)
@click.option("--body-file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option(
    "--apply",
    "apply_",
    is_flag=True,
    help="Create the lead or record the reply and start the agent. Without it, only label and log.",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Print the rules result and the exact model prompt. Log nothing and call nothing.",
)
@click.option("--runner", "runner_name", type=click.Choice(["cli", "api"]), default="cli")
def sort_mail(
    eml: Path | None,
    sender: str | None,
    subject: str | None,
    body_file: Path | None,
    apply_: bool,
    dry_run: bool,
    runner_name: str,
) -> None:
    """Label one mail: lead, held for review, or skipped. Silent unless --apply."""
    mail = _mail_from_options(eml, sender, subject, body_file)
    leads, state, settings = _store(), SorterState(SORTER_ROOT), _sorter_settings()
    if dry_run:
        hit = apply_rules(mail, leads)
        click.echo(f"pass 1: {f'{hit.label.value} ({hit.reason})' if hit else 'no rule fired'}")
        prompt = build_prompt(mail, state.examples(settings.examples))
        click.echo("--- system ---")
        click.echo(prompt.system)
        click.echo("--- user ---")
        click.echo(prompt.user)
        return
    state.purge()
    if state.was_applied(mail.mail_id):
        raise click.ClickException(f"Mail {mail.mail_id} was already applied. Nothing done.")
    # Pass 1 needs no key, so only a mail that reaches the model asks for one.
    result = classify(
        mail,
        leads=leads,
        client=_LazyClient(settings),
        settings=settings,
        examples=state.examples(settings.examples),
    )
    applied = apply_ and result.event is not None
    state.record(mail, result, applied=applied)
    click.echo(_result_line(mail.mail_id, result))
    if result.event is not None:
        if not apply_:
            click.echo("Silent mode: nothing created. Add --apply to act on it.")
        else:
            _execute(result.event, runner_name, False)


class _LazyClient:
    def __init__(self, settings: SorterSettings) -> None:
        self._settings = settings
        self._client: ModelClient | None = None

    def complete(self, system: str, user: str) -> str:
        if self._client is None:
            self._client = _model_client(self._settings)
        return self._client.complete(system, user)


def _result_line(mail_id: str, result: SortResult) -> str:
    sure = f", confidence {result.confidence:.2f}" if result.confidence is not None else ""
    return (
        f"{mail_id}: {result.label.value} (pass {result.decided_pass}{sure}), "
        f"{result.action}. {result.reason}"
    )


@cli.command("sort-review")
def sort_review() -> None:
    """Mails held for a person: not sure, or an event or community asking for support."""
    state = SorterState(SORTER_ROOT)
    state.purge()
    held = state.held()
    if not held:
        click.echo("Nothing held for review.")
        return
    for row in held:
        click.echo(f"{row['id']}  {row['label']}  {row['sender']}")
        click.echo(f"  subject: {row['subject']}")
        click.echo(f"  why: {row['reason']}")
        click.echo(f"  excerpt: {row['excerpt']}")


@cli.command("sort-correct")
@click.option(
    "--id", "mail_id", required=True, help="The mail id from sort-mail, sort-review or sort-log."
)
@click.option("--label", type=click.Choice(["lead", "not-lead"]), required=True)
@click.option("--company", default=None, help="Company name, if the model did not give one.")
@click.option("--url", default=None, help="Company website, if the model did not give one.")
@click.option("--apply", "apply_", is_flag=True, help="For a lead, create it and start the agent.")
@click.option(
    "--update-existing",
    is_flag=True,
    help="Allow --apply to update a lead that already exists (its website is replaced).",
)
@click.option("--runner", "runner_name", type=click.Choice(["cli", "api"]), default="cli")
def sort_correct(
    mail_id: str,
    label: str,
    company: str | None,
    url: str | None,
    apply_: bool,
    update_existing: bool,
    runner_name: str,
) -> None:
    """Record the right label for a logged mail. The next sort sees it as an example."""
    state = SorterState(SORTER_ROOT)
    state.purge()
    review, logged = state.find_review(mail_id), state.find_log(mail_id)
    if review is None and logged is None:
        raise click.ClickException(f"No logged mail with id {mail_id}. Entries are kept 15 days.")
    known = review or logged or {}
    sender, subject = str(known["sender"]), str(known["subject"])
    excerpt = str(review["excerpt"]) if review else ""
    event = None
    if label == "lead" and apply_:
        verdict = (review or {}).get("verdict") or {}
        event = new_lead_event(
            company_name=company or verdict.get("company_name"),
            company_url=url or verdict.get("company_url"),
            sender=sender,
            message=excerpt,
        )
        if event is None:
            raise click.ClickException("Give --company and --url: the saved mail has neither.")
        if _store().load_lead(event.lead_slug) is not None and not update_existing:
            raise click.ClickException(
                f"{event.lead_slug} is already a lead. Nothing was changed or recorded. "
                "Add --update-existing to replace its details."
            )
    state.add_example(
        sender=sender, subject=subject, excerpt=excerpt, label=label.replace("-", "_")
    )
    if review:
        state.resolve(mail_id)
    click.echo(f"Recorded {mail_id} as {label}.")
    if event is not None:
        click.echo("Only the 300-character excerpt is kept, so the lead message is the excerpt.")
        _execute(event, runner_name, False)


@cli.command("sort-log")
@click.option("--days", default=7, show_default=True, type=click.IntRange(min=1))
def sort_log(days: int) -> None:
    """Counts per label, then each sorted mail. Never shows a body."""
    state = SorterState(SORTER_ROOT)
    state.purge()
    rows = state.log(days)
    if not rows:
        click.echo(f"Nothing sorted in the last {days} days.")
        return
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["label"]] = counts.get(row["label"], 0) + 1
    for name, number in sorted(counts.items(), key=lambda item: -item[1]):
        click.echo(f"{number:4}  {name}")
    click.echo("")
    for row in rows:
        mark = "applied" if row["applied"] else row["action"]
        click.echo(f"{row['at']}  {row['id']}  {row['label']}  {mark}  {row['sender']}")
        click.echo(f"  {row['subject']}")


@cli.command("serve")
@click.option("--once", is_flag=True, help="Do one tick and exit (for tests and cron).")
@click.option(
    "--poll-seconds",
    type=click.FloatRange(min=1),
    default=15.0,
    show_default=True,
    help="Seconds to sleep between ticks.",
)
@click.option(
    "--runner",
    "runner_name",
    type=click.Choice(["cli", "api"]),
    default="cli",
    show_default=True,
    help="Run each turn through the local CLI or the self-hosted HTTP API.",
)
def serve(once: bool, poll_seconds: float, runner_name: str) -> None:
    """Work from the dashboard's queue: sort waiting mail, then run one event, then sleep.

    Needs STUDIO1_SUPABASE_URL, STUDIO1_SUPABASE_APIKEY and STUDIO1_SUPABASE_WORKER_JWT. On
    SIGINT or SIGTERM the current event finishes and the worker exits.
    """
    import logging
    import signal

    try:
        db = Supabase.from_env()
    except QueueError as error:
        raise click.ClickException(str(error)) from None
    settings = _sorter_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    worker = Worker(db, _runner(runner_name), runner_name, settings, _LazyClient(settings))
    stop = make_stop_event(signal.signal)
    try:
        worker.serve(once=once, poll_seconds=poll_seconds, stop=stop)
    except QueueError as error:
        raise click.ClickException(str(error)) from None


@cli.command("sort-eval")
@click.argument("folder", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.option(
    "--limit", type=click.IntRange(min=1), default=None, help="At most N mails per label."
)
@click.option("--yes", is_flag=True, help="Do not ask before calling the model.")
def sort_eval(folder: Path, limit: int | None, yes: bool) -> None:
    """Run the real sorter on mail you sorted by hand and report how it did.

    FOLDER has one subfolder per true label (lead, not_sure, selling_to_us, job_ask,
    partner_ask, noise), each holding .eml files. This CALLS THE MODEL, so it needs the sorter's
    key and costs money: it prints how many calls it will make and asks first. Exit code 1 if
    any true lead would have been skipped outright.
    """
    items = collect_eval_items(folder, limit)
    if not items:
        raise click.ClickException(f"No .eml files under {folder}/<label>/ for any label.")
    settings = _sorter_settings()
    calls = count_model_calls(items)
    click.echo(f"{len(items)} mails, {calls} model calls (the rules settle the rest).")
    client = _model_client(settings) if calls else _LazyClient(settings)
    if calls and not yes:
        click.confirm("Call the model now?", abort=True)
    report = evaluate(items, client, settings, folder)
    for line in format_report(report):
        click.echo(line)
    if report.missed_leads:
        sys.exit(1)


def main() -> None:
    cli(prog_name="python -m studio1_worker")


if __name__ == "__main__":
    main()
    sys.exit(0)

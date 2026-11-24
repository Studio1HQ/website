"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent } from "react";
import { CalendarPlus, PencilSimple, Receipt } from "@/components/internal/icons";
import {
  createCycle,
  saveCycleNotes,
  setCycleState,
  setInvoice,
  startNextMonth,
} from "@/app/internal/(dashboard)/clients/actions";
import {
  CYCLE_STATES,
  INVOICE_STATES,
  NO_SECRETS_HINT,
  type ActionResult,
  type CycleState,
  type InvoiceState,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import {
  ExternalLink,
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import { TONES } from "@/components/internal/community/ui";
import { OptionBadge } from "@/components/internal/clients/ui";
import {
  FormDialog,
  FormField,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";

/**
 * The month (cycle) controls on a client's workspace and the overview:
 * its state, notes and invoice flag, and the buttons that start a month.
 * Managers only; the actions check again.
 */

/** Shows the toast for a result and refreshes; true when it worked. */
function useResult() {
  const afterSave = useAfterSave();
  const toast = useToast();
  return (result: ActionResult) => {
    if (!result.ok) {
      toast("error", result.message);
      return false;
    }
    toast("success", result.message ?? "Saved");
    if (result.warning) toast("error", result.warning);
    afterSave();
    return true;
  };
}

/**
 * Planning → Active → Closing → Closed as a row of steps. Managers click a
 * step to move the month there (back as well as forward); everyone else
 * sees the state.
 */
export function CycleStateControl({
  cycleId,
  state,
  canEdit,
}: {
  cycleId: string;
  state: CycleState;
  canEdit: boolean;
}) {
  const done = useResult();
  const [busy, start] = useTransition();
  if (!canEdit) return <OptionBadge list={CYCLE_STATES} value={state} />;
  return (
    <div
      role="group"
      aria-label="Month state"
      className={cn(
        "inline-flex max-w-full overflow-x-auto rounded-lg bg-[var(--i-sunken)] p-0.5 ring-1 ring-inset ring-[var(--i-line)]",
        busy && "opacity-60",
      )}
    >
      {CYCLE_STATES.map((option) => {
        const on = option.value === state;
        return (
          <button
            key={option.value}
            type="button"
            disabled={busy || on}
            aria-pressed={on}
            onClick={() =>
              start(
                async () =>
                  void done(await setCycleState(cycleId, option.value)),
              )
            }
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors",
              on
                ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] dark:bg-white/[0.14] dark:shadow-none"
                : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
            )}
          >
            {on ? (
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  TONES[option.tone ?? "stone"].dot,
                )}
              />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The agreed scope and the retro note: read for everyone, edited in place by managers. */
export function CycleNotes({
  cycleId,
  scopeNote,
  retroNote,
  canEdit,
}: {
  cycleId: string;
  scopeNote: string;
  retroNote: string;
  canEdit: boolean;
}) {
  const done = useResult();
  const [editing, setEditing] = useState(false);
  const [scope, setScope] = useState(scopeNote);
  const [retro, setRetro] = useState(retroNote);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const open = () => {
    setScope(scopeNote);
    setRetro(retroNote);
    setError(null);
    setEditing(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await saveCycleNotes(cycleId, {
        scope_note: scope,
        retro_note: retro,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      done(result);
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <form onSubmit={submit} className="space-y-3">
        <fieldset disabled={busy} className="m-0 space-y-3 border-0 p-0">
          <label className="block">
            <span className="mb-1 block text-[12px] text-[var(--i-muted)]">
              Agreed scope
            </span>
            <textarea
              rows={3}
              maxLength={5000}
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              placeholder="What we agreed with the client for this month."
              className={textareaClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-[var(--i-muted)]">
              Retro (team only, never in the client&rsquo;s report)
            </span>
            <textarea
              rows={3}
              maxLength={5000}
              value={retro}
              onChange={(event) => setRetro(event.target.value)}
              placeholder="What went well, what slipped and why, what to change next month."
              className={textareaClass}
            />
          </label>
        </fieldset>
        {error ? (
          <p
            role="alert"
            className="text-[12.5px] text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={buttonClass("ghost", "sm")}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={buttonClass("accent", "sm")}
          >
            {busy ? "Saving…" : "Save notes"}
          </button>
        </div>
      </form>
    );
  }

  const note = (label: string, value: string, empty: string) => (
    <div>
      <p className="text-[12px] text-[var(--i-muted)]">{label}</p>
      {value ? (
        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--i-ink-2)]">
          {value}
        </p>
      ) : (
        <p className="mt-1 text-[13px] text-[var(--i-faint)]">{empty}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {note("Agreed scope", scopeNote, "Nothing written down yet.")}
      {note("Retro (team only)", retroNote, "Written when the month closes.")}
      {canEdit ? (
        <button
          type="button"
          onClick={open}
          className={buttonClass("secondary", "sm")}
        >
          <PencilSimple size={13} /> Edit notes
        </button>
      ) : null}
    </div>
  );
}

/** The invoice flag (not sent, sent, paid) and its link. No amounts here. */
export function InvoiceControl({
  cycleId,
  state,
  url,
  canEdit,
}: {
  cycleId: string;
  state: InvoiceState;
  url: string | null;
  canEdit: boolean;
}) {
  const done = useResult();
  const [value, setValue] = useState<InvoiceState>(state);
  const [link, setLink] = useState(url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setValue(state);
    setLink(url ?? "");
    setError(null);
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await setInvoice(cycleId, {
        invoice_state: value,
        invoice_url: link,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      done(result);
      setOpen(false);
    });
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <OptionBadge list={INVOICE_STATES} value={state} />
      {url ? (
        <ExternalLink href={url} className="text-[12.5px]">
          Invoice
        </ExternalLink>
      ) : null}
      {canEdit ? (
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          width="sm"
          trigger={
            <button type="button" className={buttonClass("ghost", "sm")}>
              <Receipt size={13} /> Change
            </button>
          }
          title="Invoice for this month"
          description="Set whether this month's invoice is sent or paid, with a link to it."
          onSubmit={submit}
          busy={busy}
          error={error}
          submitLabel="Save"
        >
          <FormField id="invoice-state" label="Invoice">
            <Select
              id="invoice-state"
              value={value}
              onChange={setValue}
              options={INVOICE_STATES}
            />
          </FormField>
          <FormField
            id="invoice-url"
            label="Link to the invoice"
            help={`No amounts here: the invoice tool has those. ${NO_SECRETS_HINT}`}
          >
            <input
              id="invoice-url"
              type="url"
              inputMode="url"
              maxLength={1000}
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://"
              className={inputClass()}
            />
          </FormField>
        </FormDialog>
      ) : null}
    </span>
  );
}

/** Starts one engagement's month with the scope lines from its template (Active once the month has begun). */
export function CycleStartButton({
  engagementId,
  month,
  label = "Start this month",
}: {
  engagementId: string;
  month: string;
  label?: string;
}) {
  const done = useResult();
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        start(async () => void done(await createCycle(engagementId, month)))
      }
      className={buttonClass("accent")}
    >
      <CalendarPlus size={14} /> {busy ? "Starting…" : label}
    </button>
  );
}

/**
 * Starts a month for every active engagement that hasn't got it (the same
 * as the cron on the 25th). Defaults to next month.
 */
export function CycleStartAllButton({
  month,
  label,
  variant = "secondary",
}: {
  month: string;
  label: string;
  variant?: "accent" | "secondary";
}) {
  const done = useResult();
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => start(async () => void done(await startNextMonth(month)))}
      className={buttonClass(variant)}
    >
      <CalendarPlus size={14} /> {busy ? "Starting…" : label}
    </button>
  );
}

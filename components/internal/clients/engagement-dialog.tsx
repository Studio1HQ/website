"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  saveEngagement as saveEngagementAction,
} from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import {
  CADENCES,
  DELIVERABLE_KINDS,
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_TYPES,
  NO_SECRETS_HINT,
  monthLabel,
  personName,
  thisMonth,
  type Cadence,
  type DeliverableKind,
  type Engagement,
  type EngagementStatus,
  type EngagementType,
  type TemplateLine,
} from "@/lib/internal/clients/schema";
import { changedFields } from "@/lib/internal/clients/rules";
import { MAX_PLAN_LINES, firstMonthFor, planFrom, planLines, withKind, type PlanItem } from "@/lib/internal/clients/plan";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { DateField, SuggestInput } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import { buttonClass, inputClass, textareaClass } from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
  FormSection,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";

const saveEngagement = guarded(saveEngagementAction);

/**
 * Add or edit an engagement (the unit of monthly scope): name, type,
 * status, account owner, dates, cadence, and the client tracker and
 * contract links. Adding one also asks what's in it: a checklist that
 * opens on the type's template (tick what's included, set how many) and
 * becomes the first month's plan. Managers only; saveEngagement checks again.
 */

type Values = {
  name: string;
  type: EngagementType;
  status: EngagementStatus;
  owner: string;
  starts_on: string;
  ends_on: string;
  cadence: Cadence;
  client_tracker_url: string;
  contract_url: string;
  notes: string;
};

function startValues(engagement: Engagement | undefined, me: string): Values {
  return {
    name: engagement?.name ?? "",
    type: engagement?.type ?? "devrel_retainer",
    status: engagement?.status ?? "active",
    owner: engagement ? (engagement.owner ?? "") : me,
    starts_on: engagement?.starts_on ?? "",
    ends_on: engagement?.ends_on ?? "",
    cadence: engagement?.cadence ?? "monthly",
    client_tracker_url: engagement?.client_tracker_url ?? "",
    contract_url: engagement?.contract_url ?? "",
    notes: engagement?.notes ?? "",
  };
}

export function EngagementDialog({
  engagement,
  clientId,
  workspacePath,
  owners = [],
  names = {},
  me = "",
  types = ENGAGEMENT_TYPES,
  money = false,
  plans = {},
  trigger,
}: {
  /** The engagement to edit; leave out to add one. */
  engagement?: Engagement;
  /** Adding: the client it belongs to. */
  clientId: string;
  /** The client's workspace; a new engagement opens there, selected. */
  workspacePath: string;
  /** Emails for the account owner suggestions (ownerChoices()). */
  owners?: readonly string[];
  names?: Readonly<Record<string, string>>;
  /** The viewer's email: a new engagement's owner unless changed. */
  me?: string;
  /** Built-in types and the team's own (engagementTypes()). */
  types?: readonly { value: EngagementType; label: string }[];
  /** The viewer is a founder: the contract link is theirs alone to see and set. */
  money?: boolean;
  /** Each type's template lines, for a new project's checklist. */
  plans?: Readonly<Record<string, readonly TemplateLine[]>>;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const afterSave = useAfterSave();
  const toast = useToast();
  const [values, setValues] = useState<Values>(() =>
    startValues(engagement, me),
  );
  // What the form showed when it opened: editing sends only the fields
  // changed since, so it never puts back what someone else changed meanwhile.
  const [opened, setOpened] = useState<Values>(() =>
    startValues(engagement, me),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, startSaving] = useTransition();
  const adding = !engagement;
  const planFor = (type: EngagementType) => planFrom(plans[type] ?? []);
  const [plan, setPlan] = useState<PlanItem[]>(() => planFor(startValues(engagement, me).type));
  const [open, setOpen] = useDialogOpen(() => {
    const start = startValues(engagement, me);
    setValues(start);
    setOpened(start);
    setPlan(planFor(start.type));
    setError(null);
  });
  const changePlan = (index: number, change: Partial<PlanItem>) =>
    setPlan((current) => current.map((item, at) => (at === index ? { ...item, ...change } : item)));
  const ticked = planLines(plan);
  const shownKinds = new Set(plan.map((item) => item.kind));
  const moreKinds = DELIVERABLE_KINDS.filter((kind) => !shownKinds.has(kind.value));
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const people = owners.map((email) => ({
    value: email,
    label: personName(email, names),
  }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (adding && ticked.length > MAX_PLAN_LINES) {
      setError(`Tick up to ${MAX_PLAN_LINES} kinds of work; add more on the month's page.`);
      return;
    }
    const payload: Record<string, unknown> = adding
      ? { ...values, client_id: clientId }
      : changedFields(values, opened);
    // Without the contract field, its value never goes: a save here can't blank it.
    if (!money) delete payload.contract_url;
    if (!adding && !Object.keys(payload).length) {
      setOpen(false);
      return;
    }
    startSaving(async () => {
      const result = await saveEngagement(
        engagement?.id ?? null,
        payload,
        adding ? ticked : undefined,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      if (result.warning) toast("error", result.warning);
      setOpen(false);
      if (!engagement && result.id)
        router.push(`${workspacePath}?engagement=${result.id}`);
      else afterSave();
    });
  };

  const text = (
    key: "name" | "client_tracker_url" | "contract_url",
    placeholder: string,
    url = false,
  ) => (
    <input
      id={`engagement-${key}`}
      type={url ? "url" : "text"}
      inputMode={url ? "url" : undefined}
      required={key === "name"}
      maxLength={url ? 1000 : 120}
      value={values[key]}
      onChange={(event) => set(key, event.target.value)}
      placeholder={placeholder}
      className={inputClass()}
    />
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={engagement ? "Edit project" : "New project"}
      description="A line of work for this company, like DevRel or Blogs. Each month of it is a project page with its pieces, links and report."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={engagement ? "Save" : "Add project"}
    >
      <FormField id="engagement-name" label="Name" required wide>
        {text("name", "DevRel")}
      </FormField>
      <FormField
        id="engagement-type"
        label="Type"
        required
        help="Sets the monthly scope a new month starts with. Make your own under Templates."
      >
        <Select
          id="engagement-type"
          value={values.type}
          onChange={(next) => {
            set("type", next);
            // A new project's checklist opens on the new type's template.
            if (adding) setPlan(planFor(next));
          }}
          options={types}
        />
      </FormField>
      <FormField id="engagement-status" label="Status">
        <Select
          id="engagement-status"
          value={values.status}
          onChange={(next) => set("status", next)}
          options={ENGAGEMENT_STATUSES}
        />
      </FormField>
      <FormField
        id="engagement-owner"
        label="Account owner"
        help="Chases the client's approvals."
      >
        <SuggestInput
          id="engagement-owner"
          type="text"
          value={values.owner}
          onChange={(next) => set("owner", next)}
          options={people}
          placeholder="name@studio1hq.com"
        />
      </FormField>
      <FormField id="engagement-cadence" label="Cadence">
        <Select
          id="engagement-cadence"
          value={values.cadence}
          onChange={(next) => set("cadence", next)}
          options={CADENCES}
        />
      </FormField>
      <FormField id="engagement-starts_on" label="Start date">
        <DateField
          id="engagement-starts_on"
          value={values.starts_on}
          onChange={(next) => set("starts_on", next)}
        />
      </FormField>
      <FormField id="engagement-ends_on" label="End date">
        <DateField
          id="engagement-ends_on"
          value={values.ends_on}
          onChange={(next) => set("ends_on", next)}
          min={values.starts_on || undefined}
        />
      </FormField>
      {adding ? (
        <>
          <FormSection
            title="What's in it"
            hint={`Tick what's included and set how many. ${monthLabel(firstMonthFor(values.starts_on, thisMonth()))} starts with this plan; each month after carries it over, and the numbers can change month to month.`}
          />
          <div className="sm:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-[var(--i-muted)]">
                {ticked.length ? `${ticked.length} ticked` : "Nothing ticked: the month starts empty"}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPlan((current) => current.map((item) => ({ ...item, on: false })))}
                  className={buttonClass("ghost", "sm")}
                >
                  Clear all
                </button>
                <button type="button" onClick={() => setPlan(planFor(values.type))} className={buttonClass("ghost", "sm")}>
                  Use the template
                </button>
              </span>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {plan.map((item, index) => {
                const id = `plan-${index}`;
                return (
                  <li
                    key={`${item.kind}-${index}`}
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-lg border px-3 transition-colors",
                      item.on ? "border-[var(--i-line-strong)] bg-[var(--i-panel)]" : "border-[var(--i-line)] bg-[var(--i-sunken)]",
                    )}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={item.on}
                      onChange={(event) => changePlan(index, { on: event.target.checked, quantity: item.quantity || 1 })}
                      className="size-4 shrink-0 accent-[var(--i-accent)]"
                    />
                    <label
                      htmlFor={id}
                      className={cn("min-w-0 flex-1 cursor-pointer truncate text-[13px]", !item.on && "text-[var(--i-muted)]")}
                    >
                      {item.label}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={999}
                      value={item.on ? item.quantity || "" : ""}
                      placeholder={item.on ? "0" : "—"}
                      disabled={!item.on}
                      aria-label={`How many: ${item.label}`}
                      onChange={(event) => changePlan(index, { quantity: Math.max(0, Math.min(999, Number(event.target.value) || 0)) })}
                      className="h-7 w-16 shrink-0 rounded-md border border-[var(--i-line)] bg-transparent px-2 text-right text-[13px] tabular-nums outline-none focus:border-[var(--i-line-strong)] disabled:border-transparent disabled:opacity-50"
                    />
                  </li>
                );
              })}
            </ul>
            {moreKinds.length ? (
              <div className="mt-2 max-w-xs">
                <Select<DeliverableKind | "">
                  aria-label="Add another kind of work"
                  size="sm"
                  value=""
                  placeholder="Add another kind of work"
                  onChange={(kind) => {
                    if (kind) setPlan((current) => withKind(current, kind));
                  }}
                  options={moreKinds}
                />
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      <FormSection title="Links" hint={NO_SECRETS_HINT} />
      <FormField
        id="engagement-client_tracker_url"
        label="Client tracker"
        help="Their Notion or sheet, if they keep one."
      >
        {text("client_tracker_url", "https://", true)}
      </FormField>
      {money ? (
        <FormField id="engagement-contract_url" label="Contract">
          {text("contract_url", "https://", true)}
        </FormField>
      ) : null}
      <FormField id="engagement-notes" label="Notes" wide>
        <textarea
          id="engagement-notes"
          rows={3}
          maxLength={5000}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          className={textareaClass}
        />
      </FormField>
    </FormDialog>
  );
}

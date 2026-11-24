"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, LockSimple, Trash, X } from "@/components/internal/icons";
import {
  moveToNextMonth as moveToNextMonthAction,
  removeDeliverable as removeDeliverableAction,
  saveDeliverable as saveDeliverableAction,
} from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import {
  FORM_FIELD_LABELS,
  MEMBER_FIELDS,
  formValueOf,
  memberMayStartAt,
  type ClientsAccess,
  type FormField,
} from "@/lib/internal/clients/rules";
import {
  CONTENT_TYPES,
  DELIVERABLE_KINDS,
  DELIVERABLE_STATUSES,
  LINK_FIELDS,
  POST_KINDS,
  WRITTEN_KINDS,
  statusLabel,
  todayKey,
  NO_SECRETS_HINT,
  SIZES,
  labelOf,
  personName,
  type ContentType,
  type Deliverable,
  type DeliverableKind,
  type DeliverableStatus,
  type ScopeLine,
  type Size,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { DateField, SuggestInput } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";

const moveToNextMonth = guarded(moveToNextMonthAction);
const removeDeliverable = guarded(removeDeliverableAction);
const saveDeliverable = guarded(saveDeliverableAction);

/**
 * Add or edit a deliverable: every field, with a links section that says
 * never to paste passwords or keys. Managers change everything; members
 * change dates, links and notes on the ones they own or review (the rest
 * shows locked), and add new ones they own or review. The status isn't
 * here once it exists: use MoveStatusMenu, and BlockDialog for the flag.
 */

type Values = {
  title: string;
  kind: DeliverableKind;
  scope_line_id: string;
  owner: string;
  reviewer: string;
  size: Size;
  status: DeliverableStatus;
  week: string;
  due_on: string;
  client_due_on: string;
  draft_url: string;
  review_url: string;
  pr_url: string;
  published_url: string;
  notes: string;
  content_type: ContentType | "";
  views: string;
  /** One link per line. */
  extra_urls: string;
  /** Adding as Published: the day it went live. */
  published_on: string;
};

/** Fields that need the DevRel tracker migration. */
const DEVREL_KEYS: readonly (keyof Values)[] = [
  "content_type",
  "views",
  "extra_urls",
];

export type DeliverableDefaults = Partial<
  Pick<
    Deliverable,
    | "title"
    | "kind"
    | "scope_line_id"
    | "owner"
    | "reviewer"
    | "size"
    | "week"
    | "due_on"
    | "status"
    | "published_url"
    | "views"
    | "extra_urls"
    | "content_type"
  >
>;

export function DeliverableDialog({
  deliverable,
  cycleId,
  scopeLines = [],
  owners = [],
  names = {},
  access,
  canChange = true,
  me,
  defaults,
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  devrel = false,
}: {
  /** The deliverable to edit; leave out to add one. */
  deliverable?: Deliverable;
  /** Adding: the month (cycle) it belongs to. Required when adding. */
  cycleId?: string;
  /** The cycle's scope lines, for the "Counts toward" picker. */
  scopeLines?: readonly Pick<ScopeLine, "id" | "kind" | "label">[];
  /** Emails for the owner and reviewer suggestions (ownerChoices()). */
  owners?: readonly string[];
  /** email → name (namesFrom(people)). */
  names?: Readonly<Record<string, string>>;
  /** The viewer's access. */
  access: ClientsAccess;
  /** Editing: may the viewer change it (canChangeDeliverable)? Read-only when false. */
  canChange?: boolean;
  /** The viewer's email: a member adding one owns it unless they pick otherwise. */
  me?: string;
  /** Starting values when adding (a scope line's kind, this week…). */
  defaults?: DeliverableDefaults;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  /** The DevRel tracker migration has run: show type, views, more links. */
  devrel?: boolean;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(720px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]"
          onClick={(event) => event.stopPropagation()}
        >
          <DeliverableForm
            key={deliverable?.id ?? "new"}
            deliverable={deliverable}
            cycleId={cycleId}
            scopeLines={scopeLines}
            owners={owners}
            names={names}
            access={access}
            readOnly={Boolean(deliverable) && !canChange}
            me={me}
            defaults={defaults}
            title={title}
            devrel={devrel}
            close={() => setOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function startValues(
  deliverable: Deliverable | undefined,
  defaults: DeliverableDefaults | undefined,
  me?: string,
): Values {
  const source = {
    ...(defaults ?? {}),
    ...(deliverable ?? {}),
  } as Partial<Deliverable>;
  return {
    title: source.title ?? "",
    kind: source.kind ?? "blog",
    scope_line_id: source.scope_line_id ?? "",
    owner: source.owner ?? (deliverable ? "" : (me ?? "")),
    reviewer: source.reviewer ?? "",
    size: source.size ?? "M",
    status: source.status ?? "planned",
    week: source.week ?? "",
    due_on: source.due_on ?? "",
    client_due_on: source.client_due_on ?? "",
    draft_url: source.draft_url ?? "",
    review_url: source.review_url ?? "",
    pr_url: source.pr_url ?? "",
    published_url: source.published_url ?? "",
    notes: source.notes ?? "",
    published_on: todayKey(),
    content_type: source.content_type ?? "",
    views:
      source.views === null || source.views === undefined
        ? ""
        : String(source.views),
    extra_urls: (source.extra_urls ?? []).join("\n"),
  };
}

/**
 * Statuses a new deliverable can start at: the early ones, or Published for
 * work that's already live (it needs the live link). Client review and
 * Approved need their own checks, so they go through the status menu.
 */
const START_STATUSES = DELIVERABLE_STATUSES.filter((option) =>
  ["planned", "in_progress", "internal_review", "published"].includes(
    option.value,
  ),
);

function DeliverableForm({
  deliverable,
  cycleId,
  scopeLines,
  owners,
  names,
  access,
  readOnly,
  me,
  defaults,
  title,
  devrel,
  close,
}: {
  deliverable?: Deliverable;
  cycleId?: string;
  scopeLines: readonly Pick<ScopeLine, "id" | "kind" | "label">[];
  owners: readonly string[];
  names: Readonly<Record<string, string>>;
  access: ClientsAccess;
  readOnly: boolean;
  me?: string;
  defaults?: DeliverableDefaults;
  title?: string;
  devrel: boolean;
  close: () => void;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [values, setValues] = useState<Values>(() =>
    startValues(deliverable, defaults, me),
  );
  // What the form showed when it opened: a save sends only the fields
  // changed since, with what they were, so it never writes over someone
  // else's newer change (saveDeliverable checks).
  const [opened] = useState(() => ({
    values: startValues(deliverable, defaults, me),
    deliverable,
  }));
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, startSaving] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const editing = Boolean(deliverable);
  const manager = access === "manager";
  /** Members editing: only dates, links and notes. */
  const locked = (field: keyof Values) =>
    readOnly ||
    (editing &&
      !manager &&
      !(MEMBER_FIELDS as readonly string[]).includes(field));
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  /** Type for written pieces; views and more links for posts (or when set). */
  const shows = (key: keyof Values) =>
    devrel &&
    (key === "content_type"
      ? WRITTEN_KINDS.has(values.kind)
      : POST_KINDS.has(values.kind) || Boolean(values[key]));

  const people = owners.map((email) => ({
    value: email,
    label: personName(email, names),
  }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    if (!editing && !cycleId) {
      setError("Pick the month this belongs to first.");
      return;
    }
    const payload: Record<string, unknown> = {};
    const seen: Record<string, string> = {};
    for (const key of Object.keys(values) as (keyof Values)[]) {
      if (key === "published_on" && (editing || values.status !== "published"))
        continue;
      if (key === "status" && editing) continue;
      if (locked(key)) continue;
      // Hidden here means not ours to change: never blank them by accident.
      if (DEVREL_KEYS.includes(key) && !shows(key)) continue;
      if (editing && opened.deliverable) {
        // Unchanged here: leave it as it is now, whoever changed it since.
        if (values[key] === opened.values[key]) continue;
        if (key in FORM_FIELD_LABELS)
          seen[key] = formValueOf(opened.deliverable, key as FormField);
      }
      payload[key] = values[key];
    }
    if (!editing) payload.cycle_id = cycleId;
    if (editing && !Object.keys(payload).length) {
      close();
      return;
    }
    setError(null);
    startSaving(async () => {
      const result = await saveDeliverable(
        deliverable?.id ?? null,
        payload,
        editing ? seen : undefined,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      close();
      afterSave();
    });
  };

  const remove = () => {
    if (!deliverable) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      timer.current = setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    startSaving(async () => {
      const result = await removeDeliverable(deliverable.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", "Deliverable deleted");
      close();
      afterSave();
    });
  };

  // Slipped work: into next month, so this one can close.
  const moveOn = () => {
    if (!deliverable) return;
    startSaving(async () => {
      const result = await moveToNextMonth(deliverable.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Moved to next month");
      close();
      afterSave();
    });
  };

  const field = (
    key: keyof Values,
    label: string,
    control: ReactNode,
    options: { wide?: boolean; required?: boolean; help?: ReactNode } = {},
  ) => (
    <div key={key} className={cn("min-w-0", options.wide && "sm:col-span-2")}>
      <label
        htmlFor={`deliverable-${key}`}
        className="mb-1 flex items-center gap-1 text-[12px] text-[var(--i-muted)]"
      >
        {label}
        {options.required ? (
          <span className="text-[var(--i-accent-text)]">*</span>
        ) : null}
        {editing && !readOnly && locked(key) ? (
          <LockSimple
            size={11}
            className="text-[var(--i-faint)]"
            aria-label="Managers only"
          />
        ) : null}
      </label>
      {control}
      {options.help ? (
        <p className="mt-1 text-[11.5px] leading-snug text-[var(--i-faint)]">
          {options.help}
        </p>
      ) : null}
    </div>
  );

  const text = (
    key: keyof Values,
    placeholder?: string,
    type: "text" | "url" = "text",
  ) => (
    <input
      id={`deliverable-${key}`}
      type={type === "url" ? "url" : "text"}
      inputMode={type === "url" ? "url" : undefined}
      value={values[key]}
      onChange={(event) => set(key, event.target.value as Values[typeof key])}
      disabled={locked(key)}
      placeholder={placeholder}
      maxLength={type === "url" ? 1000 : 200}
      className={inputClass()}
    />
  );

  const date = (key: "week" | "due_on" | "client_due_on") => (
    <DateField
      id={`deliverable-${key}`}
      value={values[key]}
      onChange={(next) => set(key, next)}
      disabled={locked(key)}
    />
  );

  const heading =
    title ??
    (editing
      ? readOnly
        ? deliverable?.title
        : "Edit deliverable"
      : "New deliverable");

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
        <Dialog.Title className="min-w-0 truncate text-[15px] font-medium">
          {heading}
        </Dialog.Title>
        <Dialog.Description className="sr-only">
          {readOnly
            ? "You can read this but not change it."
            : "Fill in the deliverable's details and save."}
        </Dialog.Description>
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
          >
            <X size={16} />
          </button>
        </Dialog.Close>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {editing && !manager && !readOnly ? (
          <p className="mb-3.5 text-[12px] text-[var(--i-muted)]">
            You can change dates, links, notes{devrel ? ", type and views" : ""}
            . Ask a client manager for the rest.
          </p>
        ) : null}
        <fieldset
          disabled={readOnly || saving}
          className="m-0 grid min-w-0 gap-x-4 gap-y-3.5 border-0 p-0 sm:grid-cols-2"
        >
          {field(
            "title",
            "Title",
            text("title", "How we cut cold starts by 60%"),
            { wide: true, required: true },
          )}
          {field(
            "kind",
            "Kind",
            <Select
              id="deliverable-kind"
              value={values.kind}
              onChange={(next) => set("kind", next)}
              options={DELIVERABLE_KINDS}
              disabled={locked("kind")}
            />,
            { required: true },
          )}
          {field(
            "scope_line_id",
            "Counts toward",
            <Select
              id="deliverable-scope_line_id"
              value={values.scope_line_id}
              onChange={(next) => {
                set("scope_line_id", next);
                const line = scopeLines.find((item) => item.id === next);
                if (line && !editing) set("kind", line.kind);
              }}
              options={[
                { value: "", label: "Nothing in the scope (extra)" },
                ...scopeLines.map((line) => ({
                  value: line.id,
                  label: line.label || labelOf(DELIVERABLE_KINDS, line.kind),
                })),
              ]}
              disabled={locked("scope_line_id")}
            />,
          )}
          {shows("content_type")
            ? field(
                "content_type",
                "Type",
                <Select
                  id="deliverable-content_type"
                  value={values.content_type}
                  onChange={(next) => set("content_type", next)}
                  options={[
                    { value: "" as const, label: "Not set" },
                    ...CONTENT_TYPES,
                  ]}
                  disabled={locked("content_type")}
                />,
              )
            : null}
          {field(
            "owner",
            "Owner",
            <SuggestInput
              id="deliverable-owner"
              type="text"
              value={values.owner}
              onChange={(next) => set("owner", next)}
              options={people}
              placeholder="name@studio1hq.com"
              disabled={locked("owner")}
            />,
          )}
          {field(
            "reviewer",
            "Reviewer",
            <SuggestInput
              id="deliverable-reviewer"
              type="text"
              value={values.reviewer}
              onChange={(next) => set("reviewer", next)}
              options={people}
              placeholder="name@studio1hq.com"
              disabled={locked("reviewer")}
            />,
          )}
          {field(
            "size",
            "Size",
            <Select
              id="deliverable-size"
              value={values.size}
              onChange={(next) => set("size", next)}
              options={SIZES.map((option) => ({
                value: option.value,
                label: `${option.value} · ${option.label}`,
              }))}
              disabled={locked("size")}
            />,
            {
              help: "Small 1 point, Medium 2, Large 3, against each person's weekly capacity.",
            },
          )}
          {editing
            ? null
            : field(
                "status",
                "Starts at",
                <Select
                  id="deliverable-status"
                  value={values.status}
                  onChange={(next) => set("status", next)}
                  options={START_STATUSES.filter(
                    (option) =>
                      manager || memberMayStartAt(option.value, values.kind),
                  ).map((option) => ({
                    value: option.value,
                    label:
                      option.value === "published"
                        ? "Already live (Published)"
                        : statusLabel(option.value, values.kind),
                  }))}
                />,
                {
                  help:
                    values.status === "published"
                      ? "Add its live link below."
                      : undefined,
                },
              )}
          {!editing && values.status === "published"
            ? field(
                "published_on",
                "Went live on",
                <DateField
                  id="deliverable-published_on"
                  value={values.published_on}
                  onChange={(next) => set("published_on", next)}
                  max={todayKey()}
                  required
                />,
              )
            : null}
          {field("week", "Week", date("week"), {
            help: "Any day in the week; it's saved as that Monday.",
          })}
          {field("due_on", "Due date", date("due_on"))}
          {field("client_due_on", "Client to reply by", date("client_due_on"), {
            help: "Set when it goes to client review. After it, it shows as waiting on the client.",
          })}

          <div className="sm:col-span-2 mt-1 border-t border-[var(--i-line)] pt-3.5">
            <p className="text-[13px] font-medium">Links</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--i-faint)]">
              {NO_SECRETS_HINT}
            </p>
          </div>
          {LINK_FIELDS.map(([key, label]) =>
            field(key, label, text(key, "https://", "url"), {
              help:
                key === "published_url"
                  ? "Needed to move it to Published."
                  : undefined,
            }),
          )}
          {shows("extra_urls")
            ? field(
                "extra_urls",
                "More live links",
                <textarea
                  id="deliverable-extra_urls"
                  value={values.extra_urls}
                  onChange={(event) => set("extra_urls", event.target.value)}
                  rows={2}
                  maxLength={5000}
                  disabled={locked("extra_urls")}
                  placeholder="The same post elsewhere, one link per line"
                  className={textareaClass}
                />,
                { wide: true },
              )
            : null}
          {shows("views")
            ? field(
                "views",
                "Views",
                <input
                  id="deliverable-views"
                  type="text"
                  inputMode="numeric"
                  value={values.views}
                  onChange={(event) => set("views", event.target.value)}
                  disabled={locked("views")}
                  placeholder="7000 or 7k"
                  maxLength={20}
                  className={`${inputClass()} tabular-nums`}
                />,
                { help: "Views or impressions, all platforms together." },
              )
            : null}

          {field(
            "notes",
            "Notes",
            <textarea
              id="deliverable-notes"
              value={values.notes}
              onChange={(event) => set("notes", event.target.value)}
              rows={3}
              maxLength={5000}
              disabled={locked("notes")}
              className={textareaClass}
            />,
            { wide: true },
          )}
        </fieldset>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--i-line)] bg-[var(--i-panel)] px-5 py-3">
        <div className="min-w-0 flex-1">
          {error ? (
            <p
              role="alert"
              className="text-[12.5px] text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          ) : editing && manager && !readOnly ? (
            <span className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className={buttonClass(
                  confirmDelete ? "danger" : "ghost",
                  "sm",
                )}
              >
                <Trash size={14} />{" "}
                {confirmDelete
                  ? "Click again to delete, with its history"
                  : "Delete"}
              </button>
              {deliverable && deliverable.status !== "published" ? (
                <button
                  type="button"
                  onClick={moveOn}
                  disabled={saving}
                  title="It slipped: take it out of this month and put it in the next one"
                  className={buttonClass("ghost", "sm")}
                >
                  <ArrowRight size={14} /> Move to next month
                </button>
              ) : null}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Dialog.Close asChild>
            <button type="button" className={buttonClass("ghost")}>
              {readOnly ? "Close" : "Cancel"}
            </button>
          </Dialog.Close>
          {readOnly ? null : (
            <button
              type="submit"
              disabled={saving}
              className={buttonClass("accent")}
            >
              {saving ? "Saving…" : editing ? "Save" : "Add deliverable"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

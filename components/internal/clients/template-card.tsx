"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowUp,
  PencilSimple,
  Plus,
  Trash,
} from "@/components/internal/icons";
import {
  createTemplate as createTemplateAction,
  resetTemplate as resetTemplateAction,
  saveTemplate as saveTemplateAction,
} from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import {
  DELIVERABLE_KINDS,
  DUE_RULES,
  PERSON_ROLES,
  labelOf,
  type DeliverableKind,
  type DueRule,
  type EngagementType,
  type PersonRole,
  type TemplateLine,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import {
  FormDialog,
  FormField,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import { Pill } from "@/components/internal/community/ui";
import {
  Card,
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";

const createTemplate = guarded(createTemplateAction);
const resetTemplate = guarded(resetTemplateAction);
const saveTemplate = guarded(saveTemplateAction);

/**
 * One engagement type's scope template: its default lines and weekly
 * rhythm, shown as a list, edited in place by managers (add, remove,
 * reorder, change), saved as the type's own or reset to the built-in one.
 * It only sets what the next month started from it begins with.
 */

type EditLine = Omit<TemplateLine, "quantity"> & {
  key: number;
  quantity: string;
};

const MAX_LINES = 20;

let nextKey = 1;
const withKey = (line: TemplateLine): EditLine => ({
  ...line,
  quantity: String(line.quantity),
  key: nextKey++,
});

const ROLE_OPTIONS = [
  { value: "", label: "Anyone" },
  ...PERSON_ROLES.map(({ value, label }) => ({ value, label })),
];
const KIND_OPTIONS = DELIVERABLE_KINDS.map(({ value, label }) => ({
  value,
  label,
}));
const DUE_OPTIONS = DUE_RULES.map(({ value, label }) => ({ value, label }));

/**
 * "New template": a name and, if wanted, another template to copy. It
 * shows up as a card here and as a type on the engagement form.
 */
export function NewTemplateButton({
  types,
}: {
  types: readonly { value: string; label: string }[];
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setName("");
    setFrom("");
    setError(null);
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Give the template a name.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await createTemplate({ name, from });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Template added");
      setOpen(false);
      afterSave();
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button type="button" className={buttonClass("secondary", "sm")}>
          <Plus size={13} /> New template
        </button>
      }
      title="New template"
      description="A new kind of engagement with its own monthly plan."
      width="sm"
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel="Create"
    >
      <FormField
        id="new-template-name"
        label="Name"
        required
        help="What this kind of engagement is called. It can't be renamed later."
      >
        <input
          id="new-template-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          placeholder="Launch support, GTM and blogs…"
          className={inputClass()}
          autoFocus
        />
      </FormField>
      <FormField
        id="new-template-from"
        label="Start from"
        help="Copies that template's lines. You can change them after."
      >
        <Select
          id="new-template-from"
          value={from}
          onChange={setFrom}
          options={[{ value: "", label: "Empty" }, ...types]}
        />
      </FormField>
    </FormDialog>
  );
}

export function TemplateCard({
  type,
  name,
  own,
  lines,
  rhythm,
  custom,
}: {
  type: EngagementType;
  name: string;
  /** A team-made type: it can be removed, not reset. */
  own: boolean;
  lines: TemplateLine[];
  rhythm: string;
  /** Saved for this type (edited), rather than the built-in default. */
  custom: boolean;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditLine[]>([]);
  const [draftRhythm, setDraftRhythm] = useState(rhythm);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const startEditing = () => {
    setDraft(lines.map(withKey));
    setDraftRhythm(rhythm);
    setError(null);
    setEditing(true);
  };

  const change = (key: number, patch: Partial<EditLine>) =>
    setDraft((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  const move = (index: number, by: -1 | 1) =>
    setDraft((current) => {
      const target = index + by;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const add = () =>
    setDraft((current) =>
      current.length >= MAX_LINES
        ? current
        : [
            ...current,
            withKey({
              kind: "blog",
              label: "",
              quantity: 1,
              owner_role: null,
              due_rule: "weekly",
            }),
          ],
    );

  const save = () => {
    setError(null);
    startSaving(async () => {
      const result = await saveTemplate(type, {
        lines: draft.map((line) => ({
          kind: line.kind,
          label: line.label,
          quantity: line.quantity.trim() === "" ? "0" : line.quantity,
          owner_role: line.owner_role ?? "",
          due_rule: line.due_rule,
        })),
        rhythm: draftRhythm,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Template saved");
      setEditing(false);
      afterSave();
    });
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setConfirmReset(false);
    startSaving(async () => {
      const result = await resetTemplate(type);
      if (!result.ok) {
        toast("error", result.message);
        return;
      }
      toast(
        "success",
        result.message ?? (own ? "Template removed" : "Back to the default"),
      );
      setEditing(false);
      afterSave();
    });
  };

  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--i-line)] px-5 py-3">
        <h2 className="flex items-center gap-2 text-[13.5px] font-medium">
          {name}
          <Pill tone={own ? "sky" : custom ? "violet" : "stone"}>
            {own ? "Yours" : custom ? "Edited" : "Default"}
          </Pill>
        </h2>
        {!editing ? (
          <div className="flex items-center gap-1.5">
            {custom ? (
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className={buttonClass(confirmReset ? "danger" : "ghost", "sm")}
              >
                {own ? (
                  <Trash size={13} />
                ) : (
                  <ArrowCounterClockwise size={13} />
                )}
                {own
                  ? confirmReset
                    ? "Click again to remove"
                    : "Remove"
                  : confirmReset
                    ? "Click again to reset"
                    : "Reset to default"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={startEditing}
              className={buttonClass("secondary", "sm")}
            >
              <PencilSimple size={13} /> Edit
            </button>
          </div>
        ) : null}
      </div>

      {!editing ? (
        <>
          {lines.length ? (
            <ul className="divide-y divide-[var(--i-line)] text-[13px]">
              {lines.map((line, index) => (
                <li
                  key={`${line.kind}-${index}`}
                  className="flex items-start justify-between gap-3 px-5 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {line.label || labelOf(DELIVERABLE_KINDS, line.kind)}
                    </span>
                    <span className="block text-[12px] text-[var(--i-muted)]">
                      {[
                        labelOf(DELIVERABLE_KINDS, line.kind),
                        line.owner_role
                          ? labelOf(PERSON_ROLES, line.owner_role)
                          : "Anyone",
                        labelOf(DUE_RULES, line.due_rule),
                      ].join(" · ")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      line.quantity === 0
                        ? "text-[var(--i-faint)]"
                        : "font-medium",
                    )}
                    title="Default quantity"
                  >
                    × {line.quantity}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-[13px] text-[var(--i-muted)]">
              No lines. A new month starts empty.
            </p>
          )}
          <p className="mt-auto border-t border-[var(--i-line)] px-5 py-3 text-[12.5px] text-[var(--i-muted)]">
            <span className="text-[var(--i-faint)]">Weekly rhythm: </span>
            {rhythm || "Not set"}
          </p>
        </>
      ) : (
        <div className="px-5 py-4">
          <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">{name} template lines</legend>
            {draft.length ? (
              <ol className="space-y-2.5">
                {draft.map((line, index) => {
                  const id = `template-${type}-${line.key}`;
                  return (
                    <li
                      key={line.key}
                      className="rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)] p-2.5"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="min-w-0">
                          <label
                            htmlFor={`${id}-label`}
                            className="mb-1 block text-[11.5px] text-[var(--i-muted)]"
                          >
                            Name
                          </label>
                          <input
                            id={`${id}-label`}
                            value={line.label}
                            maxLength={80}
                            placeholder={labelOf(DELIVERABLE_KINDS, line.kind)}
                            onChange={(event) =>
                              change(line.key, { label: event.target.value })
                            }
                            className={inputClass("sm")}
                          />
                        </div>
                        <div className="min-w-0">
                          <label
                            htmlFor={`${id}-kind`}
                            className="mb-1 block text-[11.5px] text-[var(--i-muted)]"
                          >
                            Kind
                          </label>
                          <Select
                            id={`${id}-kind`}
                            size="sm"
                            value={line.kind}
                            onChange={(value) =>
                              change(line.key, {
                                kind: value as DeliverableKind,
                              })
                            }
                            options={KIND_OPTIONS}
                          />
                        </div>
                        <div className="min-w-0">
                          <label
                            htmlFor={`${id}-role`}
                            className="mb-1 block text-[11.5px] text-[var(--i-muted)]"
                          >
                            Usual owner
                          </label>
                          <Select
                            id={`${id}-role`}
                            size="sm"
                            value={line.owner_role ?? ""}
                            onChange={(value) =>
                              change(line.key, {
                                owner_role: value
                                  ? (value as PersonRole)
                                  : null,
                              })
                            }
                            options={ROLE_OPTIONS}
                          />
                        </div>
                        <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-2">
                          <div className="min-w-0">
                            <label
                              htmlFor={`${id}-qty`}
                              className="mb-1 block text-[11.5px] text-[var(--i-muted)]"
                            >
                              Quantity
                            </label>
                            <input
                              id={`${id}-qty`}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={999}
                              step={1}
                              value={line.quantity}
                              onChange={(event) =>
                                change(line.key, {
                                  quantity: event.target.value,
                                })
                              }
                              className={cn(inputClass("sm"), "tabular-nums")}
                            />
                          </div>
                          <div className="min-w-0">
                            <label
                              htmlFor={`${id}-due`}
                              className="mb-1 block text-[11.5px] text-[var(--i-muted)]"
                            >
                              When due
                            </label>
                            <Select
                              id={`${id}-due`}
                              size="sm"
                              value={line.due_rule}
                              onChange={(value) =>
                                change(line.key, { due_rule: value as DueRule })
                              }
                              options={DUE_OPTIONS}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${line.label || labelOf(DELIVERABLE_KINDS, line.kind)} up`}
                          className={buttonClass("ghost", "sm")}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === draft.length - 1}
                          aria-label={`Move ${line.label || labelOf(DELIVERABLE_KINDS, line.kind)} down`}
                          className={buttonClass("ghost", "sm")}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((current) =>
                              current.filter((item) => item.key !== line.key),
                            )
                          }
                          aria-label={`Remove ${line.label || labelOf(DELIVERABLE_KINDS, line.kind)}`}
                          className={buttonClass("ghost", "sm")}
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-[13px] text-[var(--i-muted)]">
                No lines. A new month will start empty.
              </p>
            )}
            <button
              type="button"
              onClick={add}
              disabled={draft.length >= MAX_LINES}
              className={cn(buttonClass("secondary", "sm"), "mt-2.5")}
            >
              <Plus size={13} /> Add a line
            </button>
            <label
              htmlFor={`template-${type}-rhythm`}
              className="mb-1 mt-4 block text-[12px] text-[var(--i-muted)]"
            >
              Weekly rhythm
            </label>
            <textarea
              id={`template-${type}-rhythm`}
              value={draftRhythm}
              maxLength={300}
              rows={2}
              onChange={(event) => setDraftRhythm(event.target.value)}
              placeholder="Monday plan, Friday results."
              className={textareaClass}
            />
          </fieldset>
          {error ? (
            <p
              role="alert"
              className="mt-3 text-[12.5px] text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className={buttonClass("secondary", "md")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={buttonClass("primary", "md")}
            >
              {saving ? "Saving…" : "Save template"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

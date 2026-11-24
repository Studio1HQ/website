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
import { Trash } from "@/components/internal/icons";
import {
  removeScopeLine as removeScopeLineAction,
  saveScopeLine as saveScopeLineAction,
} from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import { changedFields } from "@/lib/internal/clients/rules";
import {
  DELIVERABLE_KINDS,
  DUE_RULES,
  PERSON_ROLES,
  type DeliverableKind,
  type DueRule,
  type PersonRole,
  type ScopeLine,
} from "@/lib/internal/clients/schema";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";

const removeScopeLine = guarded(removeScopeLineAction);
const saveScopeLine = guarded(saveScopeLineAction);

type Values = {
  kind: DeliverableKind;
  label: string;
  planned: string;
  owner_role: PersonRole | "";
  due_rule: DueRule | "";
  notes: string;
};

function startValues(line?: ScopeLine): Values {
  return {
    kind: line?.kind ?? "blog",
    label: line?.label ?? "",
    planned: line ? String(line.planned) : "1",
    owner_role: line?.owner_role ?? "",
    due_rule: line?.due_rule ?? "",
    notes: line?.notes ?? "",
  };
}

export function ScopeLineDialog({
  cycleId,
  line,
  position,
  trigger,
}: {
  cycleId: string;
  line?: ScopeLine;
  /** A new line goes at the end. */
  position?: number;
  trigger: ReactNode;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [values, setValues] = useState<Values>(() => startValues(line));
  // What the form showed when it opened: editing sends only the fields
  // changed since, so it never puts back what someone else changed meanwhile.
  const [opened, setOpened] = useState<Values>(() => startValues(line));
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    const first = startValues(line);
    setValues(first);
    setOpened(first);
    setError(null);
  });
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = line
      ? changedFields(values, opened)
      : { ...values, cycle_id: cycleId, position: position ?? 0 };
    if (line && !Object.keys(payload).length) {
      setOpen(false);
      return;
    }
    start(async () => {
      const result = await saveScopeLine(line?.id ?? null, payload);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      setOpen(false);
      afterSave();
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={line ? "Edit this part of the plan" : "Add to this month's plan"}
      description="The kind of work and how many the contract covers this month."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={line ? "Save" : "Add to the plan"}
    >
      <FormField id="scope-kind" label="Kind" required>
        <Select
          id="scope-kind"
          value={values.kind}
          onChange={(next) => set("kind", next)}
          options={DELIVERABLE_KINDS}
        />
      </FormField>
      <FormField
        id="scope-planned"
        label="Planned this month"
        required
        help="Per the contract. 0 keeps the line with nothing due."
      >
        <input
          id="scope-planned"
          type="text"
          inputMode="numeric"
          required
          maxLength={3}
          value={values.planned}
          onChange={(event) => set("planned", event.target.value)}
          className={`${inputClass()} tabular-nums`}
        />
      </FormField>
      <FormField
        id="scope-label"
        label="Name"
        wide
        help="Leave blank to use the kind, e.g. “Blog”."
      >
        <input
          id="scope-label"
          type="text"
          maxLength={80}
          value={values.label}
          onChange={(event) => set("label", event.target.value)}
          placeholder="Day 0 cookbooks"
          className={inputClass()}
        />
      </FormField>
      <FormField id="scope-owner_role" label="Usual owner">
        <Select
          id="scope-owner_role"
          value={values.owner_role}
          onChange={(next) => set("owner_role", next)}
          options={[{ value: "" as const, label: "Anyone" }, ...PERSON_ROLES]}
        />
      </FormField>
      <FormField id="scope-due_rule" label="When due">
        <Select
          id="scope-due_rule"
          value={values.due_rule}
          onChange={(next) => set("due_rule", next)}
          options={[{ value: "" as const, label: "Not set" }, ...DUE_RULES]}
        />
      </FormField>
      <FormField id="scope-notes" label="Notes" wide>
        <textarea
          id="scope-notes"
          rows={2}
          maxLength={2000}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          className={textareaClass}
        />
      </FormField>
    </FormDialog>
  );
}

/** Removes a scope line on a second click; its deliverables stay. */
export function RemoveLineButton({ id, name }: { id: string; name: string }) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const click = () => {
    if (!confirm) {
      setConfirm(true);
      timer.current = setTimeout(() => setConfirm(false), 5000);
      return;
    }
    start(async () => {
      const result = await removeScopeLine(id);
      setConfirm(false);
      if (!result.ok) {
        toast("error", result.message);
        return;
      }
      toast("success", result.message ?? "Removed");
      afterSave();
    });
  };
  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      aria-label={confirm ? `Click again to remove ${name}` : `Remove ${name}`}
      title={
        confirm
          ? "Click again to remove. Its deliverables stay, as extra work."
          : "Remove"
      }
      className={buttonClass(confirm ? "danger" : "ghost", "sm")}
    >
      <Trash size={13} />
      {confirm ? "Remove?" : null}
    </button>
  );
}

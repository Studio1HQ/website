"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "@phosphor-icons/react";
import { addClientTask } from "@/app/internal/(dashboard)/clients/workspace-actions";
import { useToast } from "@/components/internal/toast";
import { DateField } from "@/components/internal/pickers";
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

/**
 * "Add task" in a client's workspace (client managers): a task on someone's
 * board in the team's task tracker, for one of this client's engagements.
 * It's saved by the Tasks area's own action, so its rules apply: the
 * founders and the founder's associate can give anyone a task; an admin
 * anyone except the founders and other admins; everyone else only
 * themselves. `people` is already narrowed to who this viewer may pick.
 */

type Values = {
  email: string;
  title: string;
  engagement: string;
  partOf: string;
  due: string;
  notes: string;
};

export function AddClientTask({
  clientName,
  people,
  engagements,
  deliverables,
  defaultDue,
}: {
  clientName: string;
  people: readonly { email: string; name: string; me: boolean }[];
  engagements: readonly { id: string; name: string }[];
  /** Open deliverables, for "Part of". */
  deliverables: readonly { id: string; title: string; engagementId: string }[];
  /** A due day to start from (the week's Friday when looking ahead), or "". */
  defaultDue: string;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const start = (): Values => ({
    email: people[0]?.email ?? "",
    title: "",
    engagement: engagements[0]?.id ?? "",
    partOf: "",
    due: defaultDue,
    notes: "",
  });
  const [values, setValues] = useState<Values>(start);
  const [error, setError] = useState<string | null>(null);
  const [busy, startSaving] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setValues(start());
    setError(null);
  });
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const onlyMe = people.length === 1 && people[0].me;
  const partOfOptions = deliverables.filter(
    (item) => item.engagementId === values.engagement,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!values.title.trim()) {
      setError("Give it a title.");
      return;
    }
    startSaving(async () => {
      const result = await addClientTask(values.engagement, {
        email: values.email,
        title: values.title,
        notes: values.notes,
        due_on: values.due || null,
        deliverable_id: values.partOf || null,
      }).catch(() => ({
        ok: false as const,
        message: "The request failed. Try again in a minute.",
      }));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Task added");
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
          <Plus size={13} /> Add task
        </button>
      }
      title={`Add a task for ${clientName}`}
      description="A task on someone's board in the team's task tracker, counted toward this client."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel="Add task"
      width="sm"
    >
      <FormField id="client-task-title" label="Task" required>
        <input
          id="client-task-title"
          type="text"
          required
          maxLength={200}
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="Article plan, idea list, community event…"
          className={inputClass()}
          autoFocus
        />
      </FormField>
      <FormField
        id="client-task-person"
        label="Who"
        help={
          onlyMe
            ? "Only the founders can put tasks on other people's boards, so this goes on yours."
            : "It goes on their board in Tasks."
        }
      >
        <Select
          id="client-task-person"
          value={values.email}
          onChange={(email) => set("email", email)}
          options={people.map((person) => ({
            value: person.email,
            label: person.me ? `${person.name} (me)` : person.name,
            textValue: person.name,
          }))}
          className="w-full"
          disabled={people.length < 2}
        />
      </FormField>
      {engagements.length > 1 ? (
        <FormField id="client-task-engagement" label="For">
          <Select
            id="client-task-engagement"
            value={values.engagement}
            onChange={(engagement) =>
              setValues((current) => ({ ...current, engagement, partOf: "" }))
            }
            options={engagements.map((engagement) => ({
              value: engagement.id,
              label: engagement.name,
            }))}
            className="w-full"
          />
        </FormField>
      ) : null}
      {partOfOptions.length ? (
        <FormField
          id="client-task-part"
          label="Part of a deliverable"
          help="Optional. Shows the deliverable's name next to the task."
        >
          <Select
            id="client-task-part"
            value={values.partOf}
            onChange={(partOf) => set("partOf", partOf)}
            options={[
              { value: "", label: "None" },
              ...partOfOptions.map((item) => ({
                value: item.id,
                label: item.title,
              })),
            ]}
            className="w-full"
          />
        </FormField>
      ) : null}
      <FormField id="client-task-due" label="Due" help="Optional.">
        <DateField
          id="client-task-due"
          value={values.due}
          onChange={(due) => set("due", due)}
          aria-label="Due"
        />
      </FormField>
      <FormField id="client-task-notes" label="Notes" help="Optional. Only the team sees these.">
        <textarea
          id="client-task-notes"
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          rows={3}
          maxLength={4000}
          className={textareaClass}
        />
      </FormField>
    </FormDialog>
  );
}

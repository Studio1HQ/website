"use client";

import { useState } from "react";
import { leaveTask, removeTask, saveTask } from "@/app/internal/(dashboard)/tasks/actions";
import { saveDeliverable } from "@/app/internal/(dashboard)/clients/actions";
import { saveRecord } from "@/app/internal/(dashboard)/community/actions";
import { buttonClass, inputClass, textareaClass } from "@/components/internal/ui";
import { DateField } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { forOptionLabel, type ForOption, type LogTarget } from "@/components/internal/tasks/kit";
import { WithPicker } from "@/components/internal/tasks/with-picker";
import { DELIVERABLE_KINDS, weekStart, type DeliverableKind } from "@/lib/internal/clients/schema";
import {
  DEFAULT_PRIORITY,
  TASK_AREAS,
  TASK_PRIORITIES,
  isStudioArea,
  type StudioArea,
  type Task,
  type TaskPriority,
  type Teammate,
} from "@/lib/internal/tasks/shared";

const COMMUNITY = "__community__";

/**
 * Add or edit a task. Where it lives depends on who it's for, so nothing is
 * entered twice:
 *   Studio1                 a task on the board (with an area)
 *   a client (or Studio1's  a new deliverable in that client's month, so it
 *   own engagement)         shows in client work at once; or, unticked, a
 *                           task that counts toward the client
 *   the community list      a community task (community managers)
 */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  person,
  forOptions,
  deliverables,
  canClients,
  canCommunity,
  today,
  team,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing this task; leave out to add one. */
  task?: Task;
  /** Whose board it goes on. */
  person: { email: string; name: string; own: boolean };
  forOptions: readonly ForOption[];
  /** The person's open client deliverables, for "Part of". */
  deliverables: readonly LogTarget[];
  /** The viewer can add deliverables in client work. */
  canClients: boolean;
  /** The viewer manages the community task list. */
  canCommunity: boolean;
  today: string;
  /** Everyone active on the team list: who a task can be shared with. */
  team: readonly Teammate[];
}) {
  const { pending, run } = useTeamAction();
  const start = () => ({
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    target: task?.engagement_id ?? "",
    area: (task && isStudioArea(task.area) ? task.area : "content") as StudioArea,
    partOf: task?.deliverable_id ?? "",
    due: task?.due_on ?? "",
    priority: (task?.priority ?? DEFAULT_PRIORITY) as TaskPriority,
    people: task?.with_emails ?? [],
    asDeliverable: !task,
    kind: "blog" as DeliverableKind,
  });
  const [form, setForm] = useState(start);
  const [confirming, setConfirming] = useState(false);
  const set = (patch: Partial<ReturnType<typeof start>>) => setForm((current) => ({ ...current, ...patch }));

  const engagement = forOptions.find((option) => option.id === form.target);
  const community = form.target === COMMUNITY;
  const deliverableOk = Boolean(!task && engagement && engagement.cycleId && canClients);
  const asDeliverable = deliverableOk && form.asDeliverable;
  const studio = !community && (!engagement || engagement.internal) && !asDeliverable;
  const partOfOptions = engagement ? deliverables.filter((item) => item.engagementId === engagement.id) : [];

  const close = () => {
    setForm(start());
    setConfirming(false);
    onOpenChange(false);
  };

  const submit = () => {
    const title = form.title.trim();
    if (!title) return;
    if (community) {
      run(
        () =>
          saveRecord("task", null, {
            title,
            owner: person.email,
            due_on: form.due || null,
            // The community list's own scale: Top is high, Low is low.
            priority: form.priority === "top" ? "high" : form.priority === "low" ? "low" : "normal",
            status: "todo",
            details: form.notes,
          }),
        close,
      );
      return;
    }
    if (asDeliverable && engagement?.cycleId) {
      run(
        () =>
          saveDeliverable(null, {
            cycle_id: engagement.cycleId,
            title,
            kind: form.kind,
            owner: person.email,
            due_on: form.due || null,
            week: weekStart(form.due || today),
            notes: form.notes,
          }),
        close,
      );
      return;
    }
    run(
      () =>
        saveTask(task?.id ?? null, {
          email: person.email,
          title,
          notes: form.notes,
          area: form.area,
          engagement_id: engagement?.id ?? null,
          deliverable_id: engagement && form.partOf ? form.partOf : null,
          due_on: form.due || null,
          priority: form.priority,
          with: form.people,
        }),
      close,
    );
  };

  const forChoices = [
    { value: "", label: "Studio1", textValue: "Studio1" },
    ...(canCommunity && !task ? [{ value: COMMUNITY, label: "Community task list", textValue: "Community task list" }] : []),
    ...forOptions.map((option) => ({ value: option.id, label: forOptionLabel(option), textValue: forOptionLabel(option) })),
  ];

  return (
    <TeamDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={task ? "Edit task" : person.own ? "Add a task" : `Add a task for ${person.name}`}
      description={
        community
          ? "Goes on the community task list, assigned to them. It shows on their board too."
          : asDeliverable
            ? `Goes into ${engagement?.client}'s month in client work, owned by ${person.own ? "you" : person.name}. It shows on the board too.`
            : undefined
      }
      footer={
        <>
          {task && person.own && task.email.toLowerCase() !== person.email.toLowerCase() ? (
            // Shared with them by someone else: they take themselves off rather than delete it for everyone.
            <button type="button" className={buttonClass("ghost")} disabled={pending} onClick={() => run(() => leaveTask(task.id), close)}>
              Take me off
            </button>
          ) : task ? (
            confirming ? (
              <button
                type="button"
                className={buttonClass("danger")}
                disabled={pending}
                onClick={() => run(() => removeTask(task.id), close)}
              >
                {task.with_emails.length ? "Delete it for everyone" : "Delete it"}
              </button>
            ) : (
              <button type="button" className={buttonClass("ghost")} onClick={() => setConfirming(true)}>
                Delete…
              </button>
            )
          ) : null}
          <span className="flex-1" />
          <button type="button" className={buttonClass("ghost")} onClick={close}>
            Cancel
          </button>
          <button type="button" className={buttonClass("primary")} disabled={pending || !form.title.trim()} onClick={submit}>
            {pending ? "Saving…" : task ? "Save" : asDeliverable ? "Add deliverable" : "Add task"}
          </button>
        </>
      }
    >
      <Label label="Task">
        <input
          value={form.title}
          onChange={(event) => set({ title: event.target.value })}
          maxLength={200}
          placeholder="What needs doing"
          className={inputClass()}
          autoFocus
        />
      </Label>
      {forChoices.length > 1 ? (
        <Label label="For" group>
          <Select
            aria-label="For"
            value={form.target}
            onChange={(target) => set({ target, partOf: "" })}
            options={forChoices}
            className="w-full"
          />
        </Label>
      ) : null}
      {engagement && !task ? (
        deliverableOk ? (
          <label className="flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={form.asDeliverable}
              onChange={(event) => set({ asDeliverable: event.target.checked })}
              className="mt-0.5 size-4"
            />
            <span>
              Add it as a deliverable in client work
              <span className="block text-[12px] text-[var(--i-muted)]">
                Untick for work that isn&apos;t a deliverable (a call, research): it still counts toward {engagement.client}.
              </span>
            </span>
          </label>
        ) : (
          <p className="text-[12.5px] text-[var(--i-muted)]">
            {!canClients
              ? `It counts toward ${engagement.client}. Ask a client manager to add deliverables.`
              : `${engagement.client} has no plan for this month yet, so this is added as a task that counts toward them. A client manager starts the month in Clients.`}
          </p>
        )
      ) : null}
      {asDeliverable ? (
        <Label label="Kind" group>
          <Select
            aria-label="Kind"
            value={form.kind}
            onChange={(kind) => set({ kind })}
            options={DELIVERABLE_KINDS.map((option) => ({ value: option.value, label: option.label }))}
            className="w-full"
          />
        </Label>
      ) : null}
      {studio && !community ? (
        <Label label="Area" group>
          <Segmented
            label="Area"
            value={form.area}
            onChange={(area) => set({ area })}
            options={TASK_AREAS.map((area) => ({ value: area.value, label: area.label }))}
          />
        </Label>
      ) : null}
      {engagement && !asDeliverable && partOfOptions.length ? (
        <Label label="Part of" hint="optional: its time counts toward that deliverable" group>
          <Select
            aria-label="Part of"
            value={form.partOf}
            onChange={(partOf) => set({ partOf })}
            options={[{ value: "", label: "None" }, ...partOfOptions.map((item) => ({ value: item.id, label: item.title }))]}
            className="w-full"
          />
        </Label>
      ) : null}
      <Label label="Priority" group>
        <Segmented
          label="Priority"
          value={form.priority}
          onChange={(priority) => set({ priority })}
          options={TASK_PRIORITIES.map((option) => ({ value: option.value, label: option.label }))}
        />
      </Label>
      {!community && !asDeliverable ? (
        <Label label="With" hint="shared: on their lists too" group>
          <WithPicker
            team={team}
            value={form.people}
            onChange={(people) => set({ people })}
            exclude={[task?.email ?? person.email]}
            variant="field"
          />
        </Label>
      ) : null}
      <Label label="Due" hint="optional" group>
        <DateField value={form.due} onChange={(due) => set({ due })} aria-label="Due" />
      </Label>
      <Label label="Notes" hint="optional">
        <textarea
          value={form.notes}
          onChange={(event) => set({ notes: event.target.value })}
          rows={3}
          maxLength={4000}
          className={textareaClass}
        />
      </Label>
    </TeamDialog>
  );
}

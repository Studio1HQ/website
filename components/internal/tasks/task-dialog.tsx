"use client";

import { useState } from "react";
import {
  leaveTask as leaveTaskAction,
  removeTask as removeTaskAction,
  saveTask as saveTaskAction,
} from "@/app/internal/(dashboard)/tasks/actions";
import { saveRecord as saveRecordAction } from "@/app/internal/(dashboard)/community/actions";
import { buttonClass, inputClass, textareaClass } from "@/components/internal/ui";
import { DateField } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { forOptionLabel, type ForOption, type LogTarget } from "@/components/internal/tasks/kit";
import { WithPicker } from "@/components/internal/tasks/with-picker";
import { earliestCardDay } from "@/lib/internal/tasks/calendar";
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
import { guarded } from "@/components/internal/guarded";

// A save that never reached the server answers { ok: false } here, so the open form stays (guarded).
const leaveTask = guarded(leaveTaskAction);
const removeTask = guarded(removeTaskAction);
const saveTask = guarded(saveTaskAction);
const saveRecord = guarded(saveRecordAction);

const COMMUNITY = "__community__";

/**
 * Add or edit a task. Where it lives depends on who it's for, so nothing is
 * entered twice:
 *   Studio1                 a task on the board (with an area)
 *   a client                a task with the client as a label: it shows
 *                           under the client's Tasks tab, for our record,
 *                           and never changes the client's plan
 *   the community list      a community task (community managers)
 */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  person,
  forOptions,
  deliverables,
  canCommunity,
  today,
  team,
  forLabel,
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
  /** What the task is for now ("Nebius · DevRel retainer"): names its client when forOptions doesn't have it. */
  forLabel?: string;
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
    finished: task?.done_on ?? today,
  });
  const [form, setForm] = useState(start);
  // The task as the dialog opened with it: a save sends only what was
  // changed since, so it can't put back what someone else changed meanwhile.
  const [opened, setOpened] = useState(start);
  const [confirming, setConfirming] = useState(false);
  const set = (patch: Partial<ReturnType<typeof start>>) => setForm((current) => ({ ...current, ...patch }));
  // Each time it opens, it starts from the task as it is now. A card keeps
  // this dialog mounted, so before, a second edit showed the task as it was
  // before the first save (its old client too) and saved that back.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const fresh = start();
      setForm(fresh);
      setOpened(fresh);
      setConfirming(false);
    }
  }

  // Its client when the list doesn't have it (that work has ended, or it
  // isn't one the viewer can pick): still a choice, so a save keeps it.
  const kept: ForOption | null =
    task?.engagement_id && !forOptions.some((option) => option.id === task.engagement_id)
      ? {
          id: task.engagement_id,
          client: forLabel || "Its client",
          clientSlug: "",
          name: "",
          internal: task.area !== "client",
          cycleId: null,
        }
      : null;
  const options = kept ? [...forOptions, kept] : forOptions;
  const engagement = options.find((option) => option.id === form.target);
  const community = form.target === COMMUNITY;
  const studio = !community && (!engagement || engagement.internal);
  const partOfOptions = engagement ? deliverables.filter((item) => item.engagementId === engagement.id) : [];

  const close = () => {
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
    const what = {
      area: form.area,
      engagement_id: engagement?.id ?? null,
      deliverable_id: engagement && form.partOf ? form.partOf : null,
    };
    if (!task) {
      run(
        () =>
          saveTask(null, {
            email: person.email,
            title,
            notes: form.notes,
            ...what,
            due_on: form.due || null,
            priority: form.priority,
            with: form.people,
          }),
        close,
      );
      return;
    }
    // Editing: only the fields changed in this dialog (as EditCard does on the Week view).
    const changed: Record<string, unknown> = {};
    if (title !== opened.title.trim()) changed.title = title;
    if (form.notes !== opened.notes) changed.notes = form.notes;
    if (form.target !== opened.target || form.partOf !== opened.partOf || (studio && form.area !== opened.area)) {
      Object.assign(changed, what);
    }
    if (form.due !== opened.due) changed.due_on = form.due || null;
    if (form.priority !== opened.priority) changed.priority = form.priority;
    if ([...form.people].sort().join() !== [...opened.people].sort().join()) changed.with = form.people;
    if (task.status === "done" && form.finished && (form.finished !== opened.finished || !task.done_on)) {
      changed.done_on = form.finished;
    }
    if (!Object.keys(changed).length) return close();
    run(() => saveTask(task.id, changed), close);
  };

  const forChoices = [
    { value: "", label: "Studio1", textValue: "Studio1" },
    ...(canCommunity && !task ? [{ value: COMMUNITY, label: "Community task list", textValue: "Community task list" }] : []),
    ...options.map((option) => {
      const label = option === kept ? option.client : forOptionLabel(option);
      return { value: option.id, label, textValue: label };
    }),
  ];

  return (
    <TeamDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={task ? "Edit task" : person.own ? "Add a task" : `Add a task for ${person.name}`}
      description={
        community
          ? "Goes on the community task list, assigned to them. It shows on their board too."
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
            {pending ? "Saving…" : task ? "Save" : "Add task"}
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
      {engagement && !engagement.internal && !task ? (
        <p className="text-[12.5px] text-[var(--i-muted)]">
          A label for our own record: it shows under {engagement.client}&apos;s Tasks tab and changes nothing in their plan.
        </p>
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
      {engagement && partOfOptions.length ? (
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
      {!community && !(task && person.own && task.email.toLowerCase() !== person.email.toLowerCase()) ? (
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
      {task?.status === "done" ? (
        // Marking it Done stamps that day; set the real one here, even after its week is over.
        <Label label="Finished on" hint="the week it counts in" group>
          <DateField
            value={form.finished}
            onChange={(finished) => set({ finished })}
            min={earliestCardDay(today)}
            max={today}
            required
            aria-label="Finished on"
          />
        </Label>
      ) : null}
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

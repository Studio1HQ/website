"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@/components/internal/icons";
import { savePerson as savePersonAction } from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import { PERSON_ROLES, type PersonRole } from "@/lib/internal/clients/schema";
import { useToast } from "@/components/internal/toast";
import { SuggestInput } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import { buttonClass, inputClass } from "@/components/internal/ui";

const savePerson = guarded(savePersonAction);

/** One person's capacity row, as the table and the dialog use it. */
export type CapacityPerson = {
  email: string;
  name: string;
  /** null: no capacity row saved yet. */
  role: PersonRole | null;
  weekly_capacity: number | null;
  slack_user_id: string;
  active: boolean;
};

const ROLE_OPTIONS = PERSON_ROLES.map(({ value, label }) => ({ value, label }));

/** A sensible start for someone without a row: about a week of medium pieces. */
export const DEFAULT_CAPACITY = 6;

/**
 * Add or edit someone's capacity: name, role, weekly points, Slack user id
 * and whether they're taking client work. The email is fixed once saved.
 */
export function CapacityDialog({
  person,
  choices = [],
  trigger,
}: {
  /** The person to edit; leave out to add someone. */
  person?: CapacityPerson;
  /** Emails to suggest when adding (people with a client role and no row yet). */
  choices?: readonly string[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(480px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          {/* Mounted only while open, so every opening starts from the saved values. */}
          <CapacityForm
            person={person}
            choices={choices}
            close={() => setOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CapacityForm({
  person,
  choices,
  close,
}: {
  person?: CapacityPerson;
  choices: readonly string[];
  close: () => void;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(person?.email ?? "");
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState<PersonRole>(person?.role ?? "writer");
  const [capacity, setCapacity] = useState(
    String(person?.weekly_capacity ?? DEFAULT_CAPACITY),
  );
  const [slack, setSlack] = useState(person?.slack_user_id ?? "");
  const [active, setActive] = useState(person?.active ?? true);
  const adding = !person;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startSaving(async () => {
      const result = await savePerson({
        email,
        name,
        role,
        weekly_capacity: capacity,
        slack_user_id: slack,
        active,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Capacity saved");
      close();
      afterSave();
    });
  };

  const label = (id: string, text: string, required = false) => (
    <label
      htmlFor={id}
      className="mb-1 block text-[12px] text-[var(--i-muted)]"
    >
      {text}
      {required ? (
        <span className="text-[var(--i-accent-text)]"> *</span>
      ) : null}
    </label>
  );

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
        <Dialog.Title className="text-[15px] font-medium">
          {adding ? "Add someone" : `Capacity: ${person.name || person.email}`}
        </Dialog.Title>
        <Dialog.Description className="sr-only">
          Set their role, weekly capacity in points and Slack user id, then
          save.
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
        <fieldset
          disabled={saving}
          className="m-0 grid min-w-0 gap-x-4 gap-y-3.5 border-0 p-0 sm:grid-cols-2"
        >
          <div className="min-w-0 sm:col-span-2">
            {label("capacity-email", "Email", true)}
            {adding ? (
              <SuggestInput
                id="capacity-email"
                type="email"
                required
                value={email}
                onChange={setEmail}
                options={choices.map((value) => ({ value }))}
                placeholder="name@studio1hq.com"
              />
            ) : (
              <input
                id="capacity-email"
                value={email}
                readOnly
                className={inputClass()}
              />
            )}
          </div>
          <div className="min-w-0">
            {label("capacity-name", "Name")}
            <input
              id="capacity-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="As the team knows them"
              className={inputClass()}
            />
          </div>
          <div className="min-w-0">
            {label("capacity-role", "Role", true)}
            <Select
              id="capacity-role"
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS}
            />
          </div>
          <div className="min-w-0">
            {label("capacity-points", "Points a week", true)}
            <input
              id="capacity-points"
              type="number"
              inputMode="numeric"
              required
              min={0}
              max={100}
              step={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              className={inputClass()}
            />
          </div>
          <div className="min-w-0">
            {label("capacity-slack", "Slack user id")}
            <input
              id="capacity-slack"
              value={slack}
              maxLength={40}
              onChange={(event) => setSlack(event.target.value.trim())}
              placeholder="U012AB3CD"
              className={inputClass()}
            />
            <p className="mt-1 text-[11.5px] leading-snug text-[var(--i-faint)]">
              From their Slack profile: ⋯ then &ldquo;Copy member ID&rdquo;.
              Optional.
            </p>
          </div>
          <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-4 accent-[var(--i-accent)]"
            />
            Taking client work (shows on the load page)
          </label>
        </fieldset>
        {error ? (
          <p
            role="alert"
            className="mt-3 text-[12.5px] text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
        <Dialog.Close asChild>
          <button type="button" className={buttonClass("secondary")}>
            Cancel
          </button>
        </Dialog.Close>
        <button
          type="submit"
          disabled={saving}
          className={buttonClass("primary")}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

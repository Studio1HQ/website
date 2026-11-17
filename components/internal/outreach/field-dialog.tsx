"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Trash, X } from "@phosphor-icons/react";
import {
  CURRENCIES,
  ownerName,
  type FieldDef,
} from "@/lib/internal/community/schema";
import type { OutreachResult } from "@/lib/internal/outreach/schema";
import { cn } from "@/lib/utils";
import { DateField, SuggestInput } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import { useToast } from "@/components/internal/toast";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";

/**
 * An add and edit form built from a field list (lib/internal/outreach/
 * schema.ts): organisations and contacts both use it. The page hands it the
 * save (and delete) to call, so the form knows nothing about what it's
 * editing. Opens from its trigger, or is controlled with open/onOpenChange.
 */

type Values = Record<string, string | boolean>;

function initialValue(field: FieldDef, value: unknown): string | boolean {
  if (field.type === "bool") return value === true;
  if (value === null || value === undefined) {
    if (field.type === "currency") return "USD";
    if (field.type === "select") return field.initial ?? field.options?.[0]?.value ?? "";
    return "";
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function visible(field: FieldDef, values: Values) {
  if (!field.showIf) return true;
  return field.showIf.values.includes(String(values[field.showIf.key] ?? ""));
}

type Props = {
  fields: readonly FieldDef[];
  /** "organisation", for "New organisation" and "Add organisation". */
  noun: string;
  /** The record to edit; leave out to add a new one. */
  record?: { id: string } & Record<string, unknown>;
  /** Starting values for a new record. */
  defaults?: Record<string, unknown>;
  /** Who can own it: emails, for "owner" fields. */
  owners?: readonly string[];
  save: (values: Record<string, unknown>) => Promise<OutreachResult>;
  remove?: () => Promise<OutreachResult>;
  /** What else goes when this is deleted, shown before the second click. */
  deleteNote?: string;
  /** After adding, open this path with the new id on the end. */
  goTo?: string;
  /** After deleting, go here. */
  deletedHref?: string;
};

export function FieldDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  ...form
}: Props & {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(720px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          {/* Mounted only while open, so every opening starts from fresh values. */}
          <FieldForm key={form.record?.id ?? "new"} {...form} close={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FieldForm({
  fields,
  noun,
  record,
  defaults,
  owners = [],
  save,
  remove,
  deleteNote,
  goTo,
  deletedHref,
  close,
}: Props & { close: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useMemo(() => {
    const source = { ...(defaults ?? {}), ...(record ?? {}) };
    const values: Values = {};
    for (const field of fields) values[field.key] = initialValue(field, source[field.key]);
    return values;
  }, [fields, defaults, record]);
  const [values, setValues] = useState<Values>(start);

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  const set = (key: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, unknown> = {};
    // A field hidden by another one's value is cleared.
    for (const field of fields) {
      payload[field.key] = visible(field, values) ? values[field.key] : field.type === "bool" ? false : "";
    }
    setError(null);
    startSaving(async () => {
      const result = await save(payload);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      close();
      if (!record && goTo && result.id) router.push(`${goTo}${result.id}`);
      else router.refresh();
    });
  };

  const onDelete = () => {
    if (!remove) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Long enough to read what else gets deleted.
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), deleteNote ? 8000 : 4000);
      return;
    }
    startSaving(async () => {
      const result = await remove();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Deleted");
      close();
      if (deletedHref) router.push(deletedHref);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
        <Dialog.Title className="text-[15px] font-medium">
          {record ? `Edit ${noun}` : `New ${noun}`}
        </Dialog.Title>
        <Dialog.Description className="sr-only">{`Fill in the ${noun}'s details and save.`}</Dialog.Description>
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

      {/* A plain div scrolls; a fieldset as the scroll box doesn't in every browser. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <fieldset disabled={saving} className="m-0 grid min-w-0 gap-x-4 gap-y-3.5 border-0 p-0 sm:grid-cols-2">
          {fields
            .filter((field) => visible(field, values))
            .map((field) => {
              const id = `outreach-${noun}-${field.key}`;
              const value = values[field.key];
              const text = typeof value === "string" ? value : "";
              if (field.type === "bool") {
                return (
                  <div key={field.key} className="min-w-0 self-end pb-1.5">
                    <label className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(event) => set(field.key, event.target.checked)}
                        className="size-4 accent-[var(--i-accent)]"
                      />
                      {field.label}
                    </label>
                    {field.help ? (
                      <p className="mt-1 text-[11.5px] leading-snug text-[var(--i-faint)]">{field.help}</p>
                    ) : null}
                  </div>
                );
              }
              let control: ReactNode;
              switch (field.type) {
                case "textarea":
                  control = (
                    <textarea
                      id={id}
                      value={text}
                      onChange={(event) => set(field.key, event.target.value)}
                      rows={3}
                      maxLength={field.max}
                      required={field.required}
                      placeholder={field.placeholder}
                      className={textareaClass}
                    />
                  );
                  break;
                case "select":
                case "currency":
                  control = (
                    <Select
                      id={id}
                      value={text}
                      onChange={(next) => set(field.key, next)}
                      options={field.type === "currency" ? CURRENCIES : (field.options ?? [])}
                    />
                  );
                  break;
                case "owner": {
                  // Someone who has since lost access still shows, so saving
                  // another field doesn't quietly drop them.
                  const known = !text || owners.includes(text);
                  control = (
                    <Select
                      id={id}
                      value={text}
                      onChange={(next) => set(field.key, next)}
                      options={[
                        { value: "", label: "No owner" },
                        ...(known ? [] : [{ value: text, label: `${ownerName(text)} (no access now)`, disabled: true }]),
                        ...owners.map((email) => ({ value: email, label: ownerName(email) })),
                      ]}
                    />
                  );
                  break;
                }
                case "date":
                  control = (
                    <DateField id={id} value={text} onChange={(next) => set(field.key, next)} required={field.required} />
                  );
                  break;
                case "tags":
                  if (!field.options?.length) {
                    control = (
                      <input
                        id={id}
                        type="text"
                        value={text}
                        onChange={(event) => set(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        className={inputClass()}
                      />
                    );
                    break;
                  }
                  {
                    // A fixed list: chips to switch on and off, kept as "a, b".
                    const picked = text.split(",").map((item) => item.trim()).filter(Boolean);
                    control = (
                      <div id={id} role="group" aria-label={field.label} className="flex flex-wrap gap-1.5">
                        {field.options.map((option) => {
                          const on = picked.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                set(
                                  field.key,
                                  (on ? picked.filter((item) => item !== option.value) : [...picked, option.value]).join(
                                    ", ",
                                  ),
                                )
                              }
                              className={cn(
                                "inline-flex h-7 items-center rounded-full px-2.5 text-[12.5px] ring-1 ring-inset transition-colors",
                                on
                                  ? "bg-[var(--i-accent-soft)] font-medium text-[var(--i-accent-text)] ring-[var(--i-accent)]"
                                  : "text-[var(--i-muted)] ring-[var(--i-line)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }
                  break;
                case "text":
                  control = (
                    <SuggestInput
                      id={id}
                      type="text"
                      value={text}
                      onChange={(next) => set(field.key, next)}
                      options={(field.suggestions ?? []).map((item) => ({ value: item, label: item }))}
                      maxLength={field.max ?? 200}
                      required={field.required}
                      placeholder={field.placeholder}
                    />
                  );
                  break;
                default:
                  control = (
                    <input
                      id={id}
                      type={field.type === "email" ? "email" : "text"}
                      inputMode={field.type === "money" ? "decimal" : field.type === "url" ? "url" : undefined}
                      value={text}
                      onChange={(event) => set(field.key, event.target.value)}
                      required={field.required}
                      placeholder={field.placeholder ?? (field.type === "url" ? "https://" : undefined)}
                      className={cn(inputClass(), field.type === "money" && "tabular-nums")}
                    />
                  );
              }
              return (
                <div
                  key={field.key}
                  className={cn("min-w-0", (field.wide || field.type === "textarea") && "sm:col-span-2")}
                >
                  <label htmlFor={id} className="mb-1 block text-[12px] text-[var(--i-muted)]">
                    {field.label}
                    {field.required ? <span className="text-[var(--i-accent-text)]"> *</span> : null}
                  </label>
                  {control}
                  {field.help ? (
                    <p className="mt-1 text-[11.5px] leading-snug text-[var(--i-faint)]">{field.help}</p>
                  ) : null}
                </div>
              );
            })}
        </fieldset>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--i-line)] bg-[var(--i-panel)] px-5 py-3">
        <div className="min-w-0 flex-1">
          {error ? (
            <p role="alert" className="text-[12.5px] text-rose-700 dark:text-rose-300">
              {error}
            </p>
          ) : record && remove ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className={buttonClass(confirmDelete ? "danger" : "ghost", "sm")}
              >
                <Trash size={14} /> {confirmDelete ? "Click again to delete" : "Delete"}
              </button>
              {confirmDelete && deleteNote ? (
                <p role="alert" className="mt-1.5 text-[12px] leading-snug text-rose-700 dark:text-rose-300">
                  {deleteNote}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Dialog.Close asChild>
            <button type="button" className={buttonClass("ghost")}>
              Cancel
            </button>
          </Dialog.Close>
          <button type="submit" disabled={saving} className={buttonClass("accent")}>
            {saving ? "Saving…" : record ? "Save" : `Add ${noun}`}
          </button>
        </div>
      </div>
    </form>
  );
}

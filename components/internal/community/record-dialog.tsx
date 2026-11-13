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
  removeRecord,
  saveRecord,
} from "@/app/internal/(dashboard)/community/actions";
import {
  CHANNELS,
  CURRENCIES,
  DELETE_NOTES,
  ENTITIES,
  ownerName,
  type EntityKey,
  type FieldDef,
  type RefOptions,
} from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import { Select } from "@/components/internal/select";

/**
 * The add and edit form for any community record, built from its field
 * list in schema.ts. Opens from its trigger, or is controlled with
 * open/onOpenChange (a task card, a table row).
 */

type Values = Record<string, string | boolean>;

function initialValue(field: FieldDef, value: unknown): string | boolean {
  if (field.type === "bool") return value === true;
  if (value === null || value === undefined) {
    if (field.type === "currency") return "INR";
    if (field.type === "select")
      return field.initial ?? field.options?.[0]?.value ?? "";
    return "";
  }
  if (Array.isArray(value)) return value.join(", ");
  if (field.type === "time" && typeof value === "string")
    return value.slice(0, 5);
  return String(value);
}

function visible(field: FieldDef, values: Values) {
  if (!field.showIf) return true;
  return field.showIf.values.includes(String(values[field.showIf.key] ?? ""));
}

export function RecordDialog({
  entity,
  record,
  defaults,
  hidden = [],
  refs = {},
  owners = [],
  trigger,
  open: controlledOpen,
  onOpenChange,
  goTo,
  canDelete = true,
  readOnly = false,
  title,
  onDeleted,
  deletedHref,
}: {
  entity: EntityKey;
  /** The record to edit; leave out to add a new one. */
  record?: { id: string } & Record<string, unknown>;
  /** Starting values for a new record, e.g. { event_id }. */
  defaults?: Record<string, unknown>;
  /** Fields the page fixes, not shown in the form. */
  hidden?: string[];
  refs?: RefOptions;
  owners?: string[];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** After adding, open this path with the new id on the end. */
  goTo?: string;
  canDelete?: boolean;
  /** Viewers: the form shows but can't be saved. */
  readOnly?: boolean;
  title?: string;
  onDeleted?: () => void;
  /** After deleting, go here (a detail page's list). */
  deletedHref?: string;
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
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(720px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          {/* Mounted only while open, so every opening starts from fresh values. */}
          <RecordForm
            key={record?.id ?? "new"}
            entity={entity}
            record={record}
            defaults={defaults}
            hidden={hidden}
            refs={refs}
            owners={owners}
            goTo={goTo}
            canDelete={canDelete}
            readOnly={readOnly}
            title={title}
            onDeleted={onDeleted}
            deletedHref={deletedHref}
            close={() => setOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RecordForm({
  entity,
  record,
  defaults,
  hidden,
  refs,
  owners,
  goTo,
  canDelete,
  readOnly,
  title,
  onDeleted,
  deletedHref,
  close,
}: {
  entity: EntityKey;
  record?: { id: string } & Record<string, unknown>;
  defaults?: Record<string, unknown>;
  hidden: string[];
  refs: RefOptions;
  owners: string[];
  goTo?: string;
  canDelete: boolean;
  readOnly: boolean;
  title?: string;
  onDeleted?: () => void;
  deletedHref?: string;
  close: () => void;
}) {
  const def = ENTITIES[entity];
  const router = useRouter();
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useMemo(() => {
    const source = { ...(defaults ?? {}), ...(record ?? {}) };
    const values: Values = {};
    for (const field of def.fields)
      values[field.key] = initialValue(field, source[field.key]);
    return values;
  }, [def, defaults, record]);
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
    if (readOnly) return;
    const payload: Record<string, unknown> = {};
    for (const field of def.fields) {
      if (hidden.includes(field.key)) {
        // Fixed by the page: only sent when adding.
        if (!record && defaults && field.key in defaults)
          payload[field.key] = values[field.key];
        continue;
      }
      // A field hidden by another one's value is cleared.
      payload[field.key] = visible(field, values)
        ? values[field.key]
        : field.type === "bool"
          ? false
          : "";
    }
    setError(null);
    startSaving(async () => {
      const result = await saveRecord(entity, record?.id ?? null, payload);
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

  const remove = () => {
    if (!record) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Long enough to read what else gets deleted.
      confirmTimer.current = setTimeout(
        () => setConfirmDelete(false),
        DELETE_NOTES[entity] ? 8000 : 4000,
      );
      return;
    }
    startSaving(async () => {
      const result = await removeRecord(entity, record.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast(
        "success",
        `${def.noun.charAt(0).toUpperCase()}${def.noun.slice(1)} deleted`,
      );
      close();
      if (onDeleted) onDeleted();
      else if (deletedHref) router.push(deletedHref);
      else router.refresh();
    });
  };

  const heading = title ?? (record ? `Edit ${def.noun}` : `New ${def.noun}`);
  const listId = (key: string) => `community-${entity}-${key}-list`;

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
        <Dialog.Title className="text-[15px] font-medium">
          {heading}
        </Dialog.Title>
        <Dialog.Description className="sr-only">
          {readOnly
            ? "You can read this but not change it."
            : `Fill in the ${def.noun}'s details and save.`}
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

      {/* A plain div scrolls; a fieldset as the scroll box doesn't in every browser. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <fieldset
          disabled={readOnly || saving}
          className="m-0 grid min-w-0 gap-x-4 gap-y-3.5 border-0 p-0 sm:grid-cols-2"
        >
          {def.fields
            .filter(
              (field) => !hidden.includes(field.key) && visible(field, values),
            )
            .map((field) => {
              const id = `community-${entity}-${field.key}`;
              const value = values[field.key];
              const label = (
                <label
                  htmlFor={id}
                  className="mb-1 block text-[12px] text-[var(--i-muted)]"
                >
                  {field.label}
                  {field.required ? (
                    <span className="text-[var(--i-accent-text)]"> *</span>
                  ) : null}
                </label>
              );
              const help = field.help ? (
                <p className="mt-1 text-[11.5px] leading-snug text-[var(--i-faint)]">
                  {field.help}
                </p>
              ) : null;
              const wrap = (control: ReactNode) => (
                <div
                  key={field.key}
                  className={cn(
                    "min-w-0",
                    (field.wide || field.type === "textarea") &&
                      "sm:col-span-2",
                  )}
                >
                  {label}
                  {control}
                  {help}
                </div>
              );
              const text = typeof value === "string" ? value : "";
              switch (field.type) {
                case "textarea":
                  return wrap(
                    <textarea
                      id={id}
                      value={text}
                      onChange={(event) => set(field.key, event.target.value)}
                      rows={field.key === "body" ? 4 : 3}
                      maxLength={field.max}
                      required={field.required}
                      placeholder={field.placeholder}
                      className={textareaClass}
                    />,
                  );
                case "select":
                case "currency": {
                  const list =
                    field.type === "currency"
                      ? CURRENCIES
                      : (field.options ?? []);
                  return wrap(
                    <Select
                      id={id}
                      value={text}
                      onChange={(next) => set(field.key, next)}
                      options={list}
                    />,
                  );
                }
                case "ref": {
                  const list = (refs[field.ref!] ?? []).filter(
                    (option) => option.value !== record?.id,
                  );
                  const known =
                    !text || list.some((option) => option.value === text);
                  // Blank submits "" (saved as null). Optional refs offer
                  // "None"; required ones show "Pick one" until picked, and
                  // the browser's required check stops a blank save.
                  return wrap(
                    <Select
                      id={id}
                      value={text}
                      onChange={(next) => set(field.key, next)}
                      required={field.required}
                      placeholder="Pick one"
                      options={[
                        ...(field.required
                          ? []
                          : [{ value: "", label: "None" }]),
                        ...(known ? [] : [{ value: text, label: "Current" }]),
                        ...list,
                      ]}
                    />,
                  );
                }
                case "bool":
                  return (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 self-end pb-1.5 text-[13px]"
                    >
                      <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(event) =>
                          set(field.key, event.target.checked)
                        }
                        className="size-4 accent-[var(--i-accent)]"
                      />
                      {field.label}
                    </label>
                  );
                case "date":
                case "time":
                  return wrap(
                    <input
                      id={id}
                      type={field.type}
                      value={text}
                      onChange={(event) => set(field.key, event.target.value)}
                      required={field.required}
                      className={inputClass()}
                    />,
                  );
                case "owner":
                case "channel":
                case "text": {
                  const suggestions =
                    field.type === "owner"
                      ? owners.map((email) => ({
                          value: email,
                          label: ownerName(email),
                        }))
                      : field.type === "channel"
                        ? Object.values(CHANNELS).map((label) => ({
                            value: label,
                            label,
                          }))
                        : (field.suggestions ?? []).map((item) => ({
                            value: item,
                            label: item,
                          }));
                  return wrap(
                    <>
                      <input
                        id={id}
                        type="text"
                        value={text}
                        onChange={(event) => set(field.key, event.target.value)}
                        maxLength={field.max ?? 200}
                        required={field.required}
                        placeholder={field.placeholder}
                        list={
                          suggestions.length ? listId(field.key) : undefined
                        }
                        autoComplete="off"
                        className={inputClass()}
                      />
                      {suggestions.length ? (
                        <datalist id={listId(field.key)}>
                          {suggestions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </datalist>
                      ) : null}
                    </>,
                  );
                }
                default:
                  return wrap(
                    <input
                      id={id}
                      type={field.type === "email" ? "email" : "text"}
                      inputMode={
                        field.type === "int"
                          ? "numeric"
                          : field.type === "money"
                            ? "decimal"
                            : field.type === "url"
                              ? "url"
                              : undefined
                      }
                      value={text}
                      onChange={(event) => set(field.key, event.target.value)}
                      required={field.required}
                      placeholder={
                        field.placeholder ??
                        (field.type === "money"
                          ? "25000"
                          : field.type === "url"
                            ? "https://"
                            : undefined)
                      }
                      className={cn(
                        inputClass(),
                        (field.type === "int" || field.type === "money") &&
                          "tabular-nums",
                      )}
                    />,
                  );
              }
            })}
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
          ) : record && canDelete && !readOnly ? (
            <>
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
                {confirmDelete ? "Click again to delete" : "Delete"}
              </button>
              {/* What else goes with it, before the second click. */}
              {confirmDelete && DELETE_NOTES[entity] ? (
                <p
                  role="alert"
                  className="mt-1.5 text-[12px] leading-snug text-rose-700 dark:text-rose-300"
                >
                  {DELETE_NOTES[entity]}
                </p>
              ) : null}
            </>
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
              {saving ? "Saving…" : record ? "Save" : `Add ${def.noun}`}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

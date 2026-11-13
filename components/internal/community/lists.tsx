"use client";

import {
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Circle,
  EnvelopeSimple,
  LinkedinLogo,
  PencilSimple,
  Phone,
  Plus,
  Star,
} from "@phosphor-icons/react";
import { setQuickField } from "@/app/internal/(dashboard)/community/actions";
import {
  EVENT_PARTNER_ROLES,
  EXPENSE_CATEGORIES,
  TASK_PRIORITIES,
  formatDay,
  formatMoney,
  isOwnedBy,
  labelOf,
  todayKey,
  type Contact,
  type EventPartner,
  type Expense,
  type RefOptions,
  type Sponsorship,
  type Task,
} from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { EmptyState, buttonClass, safeUrl } from "@/components/internal/ui";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import { QuickSelect } from "@/components/internal/community/quick-select";
import { DueDate, OptionPill, Owner, Pill } from "@/components/internal/community/ui";

/* Client lists with an add button and click-to-edit rows. */

type Shared = {
  canEdit: boolean;
  refs?: RefOptions;
  owners?: string[];
  /** Values for new records, e.g. { event_id }. */
  defaults?: Record<string, unknown>;
  /** Fields the page fixes. */
  hidden?: string[];
};

/** One edit dialog for a whole list: rows set which record it opens. */
function useEditor<T extends { id: string }>() {
  const [editing, setEditing] = useState<T | null>(null);
  return {
    editing,
    open: (record: T) => setEditing(record),
    dialogProps: {
      open: editing !== null,
      onOpenChange: (next: boolean) => {
        if (!next) setEditing(null);
      },
    },
  };
}

/** A small "+ Thing" button; passes props through so it can be a dialog trigger. */
export function AddButton({
  label,
  size = "sm",
  ...props
}: ComponentProps<"button"> & {
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button type="button" {...props} className={buttonClass("secondary", size)}>
      <Plus size={13} /> {label}
    </button>
  );
}

function ListShell({
  title,
  action,
  children,
  empty,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
        <h2 className="text-[13px] font-medium">{title}</h2>
        {action}
      </div>
      {empty ?? children}
    </section>
  );
}

const rowButton =
  "flex w-full items-center gap-3 px-5 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--i-hover)] focus-visible:bg-[var(--i-hover)]";

/* -------------------------------------------------------------- expenses */

export function ExpenseList({
  expenses,
  eventNames,
  title = "Expenses",
  canEdit,
  ...form
}: Shared & {
  expenses: Expense[];
  eventNames?: Record<string, string>;
  title?: ReactNode;
}) {
  const editor = useEditor<Expense>();
  return (
    <ListShell
      title={title}
      action={
        canEdit ? (
          <RecordDialog
            entity="expense"
            {...form}
            trigger={<AddButton label="Expense" />}
          />
        ) : null
      }
      empty={
        expenses.length ? undefined : (
          <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
            No expenses yet. Add planned costs to see them against the budget.
          </p>
        )
      }
    >
      <ul className="divide-y divide-[var(--i-line)]">
        {expenses.map((expense) => (
          <li key={expense.id} className="flex items-center gap-2 pr-4">
            <button
              type="button"
              className={cn(rowButton, "min-w-0 flex-1")}
              onClick={() => editor.open(expense)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {expense.description}
                </span>
                <span className="block truncate text-[12px] text-[var(--i-muted)]">
                  {[
                    labelOf(EXPENSE_CATEGORIES, expense.category),
                    expense.vendor,
                    eventNames && expense.event_id
                      ? eventNames[expense.event_id]
                      : eventNames
                        ? "General"
                        : "",
                    expense.status === "paid" && expense.paid_on
                      ? `paid ${formatDay(expense.paid_on)}`
                      : expense.due_on
                        ? `due ${formatDay(expense.due_on)}`
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatMoney(expense.amount, expense.currency)}
              </span>
            </button>
            <QuickSelect
              entity="expense"
              id={expense.id}
              value={expense.status}
              canEdit={canEdit}
            />
          </li>
        ))}
      </ul>
      <RecordDialog
        entity="expense"
        {...form}
        hidden={[]}
        record={editor.editing ?? undefined}
        readOnly={!canEdit}
        {...editor.dialogProps}
      />
    </ListShell>
  );
}

/* ---------------------------------------------------------- sponsorships */

export function SponsorshipList({
  sponsorships,
  sponsorNames,
  eventNames,
  title = "Sponsorships",
  canEdit,
  ...form
}: Shared & {
  sponsorships: Sponsorship[];
  sponsorNames: Record<string, string>;
  eventNames?: Record<string, string>;
  title?: ReactNode;
}) {
  const editor = useEditor<Sponsorship>();
  return (
    <ListShell
      title={title}
      action={
        canEdit ? (
          <RecordDialog
            entity="sponsorship"
            {...form}
            trigger={<AddButton label="Sponsorship" />}
          />
        ) : null
      }
      empty={
        sponsorships.length ? undefined : (
          <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
            No sponsorships yet.
          </p>
        )
      }
    >
      <ul className="divide-y divide-[var(--i-line)]">
        {sponsorships.map((deal) => (
          <li key={deal.id} className="flex items-center gap-2 pr-4">
            <button
              type="button"
              className={cn(rowButton, "min-w-0 flex-1")}
              onClick={() => editor.open(deal)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {sponsorNames[deal.sponsor_id] ?? "Sponsor"}
                </span>
                <span className="block truncate text-[12px] text-[var(--i-muted)]">
                  {[
                    eventNames
                      ? deal.event_id
                        ? (eventNames[deal.event_id] ?? "An event")
                        : "General"
                      : "",
                    deal.in_kind,
                    deal.status === "paid" && deal.paid_on
                      ? `paid ${formatDay(deal.paid_on)}`
                      : deal.due_on
                        ? `due ${formatDay(deal.due_on)}`
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {deal.amount !== null
                  ? formatMoney(deal.amount, deal.currency)
                  : deal.in_kind
                    ? "In kind"
                    : "—"}
              </span>
            </button>
            <QuickSelect
              entity="sponsorship"
              id={deal.id}
              value={deal.status}
              canEdit={canEdit}
            />
          </li>
        ))}
      </ul>
      <RecordDialog
        entity="sponsorship"
        {...form}
        hidden={[]}
        record={editor.editing ?? undefined}
        readOnly={!canEdit}
        {...editor.dialogProps}
      />
    </ListShell>
  );
}

/* -------------------------------------------------------------- partners */

/**
 * Who's involved in an event besides Studio1 (on an event page), or the
 * events a partner is part of (on a partner page): the main host first,
 * then everyone linked with a role.
 */
export function EventPartnerList({
  side,
  links,
  names,
  host,
  hosted = [],
  missing,
  title = "Partners",
  canEdit,
  ...form
}: Shared & {
  /** "event": rows are partners. "partner": rows are events. */
  side: "event" | "partner";
  links: EventPartner[];
  /** Names of the partners (event side) or events (partner side). */
  names: Record<string, string>;
  /** Event side: the event's own host, from its Host field. */
  host?: { id: string; name: string } | null;
  /** Partner side: events this partner hosts (their Host field). */
  hosted?: { id: string; name: string; when?: string }[];
  /** Set when the table isn't there yet: what to run. */
  missing?: string | null;
  title?: ReactNode;
}) {
  const editor = useEditor<EventPartner>();
  const hrefOf = (id: string) =>
    side === "event" ? `/internal/community/campus/${id}` : `/internal/community/events/${id}`;
  const fixed = side === "event" ? (host ? [{ ...host, when: undefined }] : []) : hosted;
  const empty = !fixed.length && !links.length;
  return (
    <ListShell
      title={title}
      action={
        canEdit && !missing ? (
          <RecordDialog
            entity="event_partner"
            {...form}
            title={side === "event" ? "Add a partner to this event" : "Link this partner to an event"}
            trigger={<AddButton label={side === "event" ? "Partner" : "Event"} />}
          />
        ) : null
      }
      empty={
        empty ? (
          <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
            {missing && canEdit
              ? missing
              : side === "event"
                ? "No partners yet. Set the host with Edit, and add co-hosts, the venue or community partners here."
                : "Not part of any event yet."}
          </p>
        ) : undefined
      }
    >
      <ul className="divide-y divide-[var(--i-line)]">
        {fixed.map((item) => (
          <li key={`host-${item.id}`} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
            <span className="min-w-0 flex-1">
              <Link href={hrefOf(item.id)} className="block truncate font-medium hover:text-[var(--i-accent-text)]">
                {item.name}
              </Link>
              {item.when ? (
                <span className="block truncate text-[12px] text-[var(--i-muted)]">{item.when}</span>
              ) : null}
            </span>
            <Pill tone="orange">Host</Pill>
          </li>
        ))}
        {links.map((link) => {
          const other = side === "event" ? link.partner_id : link.event_id;
          return (
            <li key={link.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
              <span className="min-w-0 flex-1">
                <Link href={hrefOf(other)} className="block truncate font-medium hover:text-[var(--i-accent-text)]">
                  {names[other] ?? (side === "event" ? "A partner" : "An event")}
                </Link>
                {link.notes ? (
                  <span className="block truncate text-[12px] text-[var(--i-muted)]">{link.notes}</span>
                ) : null}
              </span>
              <OptionPill list={EVENT_PARTNER_ROLES} value={link.role} />
              {canEdit ? (
                <button
                  type="button"
                  aria-label="Edit"
                  title="Edit"
                  onClick={() => editor.open(link)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  <PencilSimple size={14} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {missing && canEdit && !empty ? (
        <p className="border-t border-[var(--i-line)] px-5 py-2.5 text-[12px] text-[var(--i-muted)]">{missing}</p>
      ) : null}
      <RecordDialog
        entity="event_partner"
        {...form}
        record={editor.editing ?? undefined}
        readOnly={!canEdit}
        {...editor.dialogProps}
      />
    </ListShell>
  );
}

/* -------------------------------------------------------------- contacts */

export function ContactList({
  contacts,
  canEdit,
  ...form
}: Shared & { contacts: Contact[] }) {
  const editor = useEditor<Contact>();
  return (
    <ListShell
      title="Contacts"
      action={
        canEdit ? (
          <RecordDialog
            entity="contact"
            {...form}
            trigger={<AddButton label="Contact" />}
          />
        ) : null
      }
      empty={
        contacts.length ? undefined : (
          <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
            No contacts yet.
          </p>
        )
      }
    >
      <ul className="divide-y divide-[var(--i-line)]">
        {contacts.map((contact) => (
          <li key={contact.id} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => editor.open(contact)}
                className="min-w-0 text-left hover:text-[var(--i-accent-text)]"
              >
                <span className="flex items-center gap-1.5 text-[13px] font-medium">
                  {contact.name}
                  {contact.is_primary ? (
                    <Star
                      size={12}
                      weight="fill"
                      className="text-amber-500"
                      aria-label="Main contact"
                    />
                  ) : null}
                </span>
                {contact.title ? (
                  <span className="block text-[12px] text-[var(--i-muted)]">
                    {contact.title}
                  </span>
                ) : null}
              </button>
              <span className="flex shrink-0 items-center gap-1">
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    title={contact.email}
                    className={buttonClass("ghost", "sm")}
                  >
                    <EnvelopeSimple size={14} />
                    <span className="sr-only">Email {contact.name}</span>
                  </a>
                ) : null}
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                    title={contact.phone}
                    className={buttonClass("ghost", "sm")}
                  >
                    <Phone size={14} />
                    <span className="sr-only">Call {contact.name}</span>
                  </a>
                ) : null}
                {safeUrl(contact.linkedin) ? (
                  <a
                    href={safeUrl(contact.linkedin)!.toString()}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className={buttonClass("ghost", "sm")}
                  >
                    <LinkedinLogo size={14} />
                    <span className="sr-only">{contact.name} on LinkedIn</span>
                  </a>
                ) : null}
              </span>
            </div>
            {contact.email || contact.phone ? (
              <p className="mt-1 truncate text-[12px] text-[var(--i-muted)]">
                {[contact.email, contact.phone].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <RecordDialog
        entity="contact"
        {...form}
        record={editor.editing ?? undefined}
        readOnly={!canEdit}
        {...editor.dialogProps}
      />
    </ListShell>
  );
}

/* ----------------------------------------------------------------- tasks */

export function TaskCheck({ task, canMove }: { task: Task; canMove: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  const done = task.status === "done";
  const toggle = () =>
    startTransition(async () => {
      const result = await setQuickField(
        "task",
        task.id,
        done ? "todo" : "done",
      );
      if (result.ok) {
        toast("success", done ? "Moved back to To do" : "Done");
        router.refresh();
      } else toast("error", result.message);
    });
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!canMove || busy}
      aria-label={
        done
          ? `Mark "${task.title}" as not done`
          : `Mark "${task.title}" as done`
      }
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-default",
        done
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-[var(--i-faint)] hover:text-[var(--i-ink-2)]",
        busy && "animate-pulse",
      )}
    >
      {done ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} />}
    </button>
  );
}

export function TaskList({
  tasks,
  me,
  title = "Tasks",
  showDone = false,
  showOwner = true,
  canEdit,
  ...form
}: Shared & {
  tasks: Task[];
  me: string;
  title?: ReactNode;
  showDone?: boolean;
  /** Off for "My tasks", where the owner is always the reader. */
  showOwner?: boolean;
}) {
  const editor = useEditor<Task>();
  const today = todayKey();
  const [withDone, setWithDone] = useState(showDone);
  const open = tasks.filter((task) => task.status !== "done");
  const shown = withDone ? tasks : open;
  const doneCount = tasks.length - open.length;
  return (
    <ListShell
      title={
        <>
          {title}{" "}
          <span className="font-normal text-[var(--i-faint)]">
            {open.length}
          </span>
        </>
      }
      action={
        canEdit ? (
          <RecordDialog
            entity="task"
            {...form}
            trigger={<AddButton label="Task" />}
          />
        ) : null
      }
    >
      {shown.length ? (
        <ul className="divide-y divide-[var(--i-line)]">
          {shown.map((task) => (
            <li key={task.id} className="flex items-center gap-2 pl-3 pr-4">
              <TaskCheck
                task={task}
                canMove={canEdit || isOwnedBy(task.owner, me)}
              />
              <button
                type="button"
                onClick={() => editor.open(task)}
                className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px]",
                    task.status === "done" &&
                      "text-[var(--i-muted)] line-through",
                  )}
                >
                  {task.title}
                </span>
                {task.priority === "urgent" || task.priority === "high" ? (
                  <Pill tone={task.priority === "urgent" ? "rose" : "amber"}>
                    {labelOf(TASK_PRIORITIES, task.priority)}
                  </Pill>
                ) : null}
                {showOwner ? (
                  <span className="hidden max-w-[9rem] text-[12.5px] sm:inline-flex">
                    <Owner owner={task.owner} />
                  </span>
                ) : null}
                <span className="w-[5.5rem] shrink-0 text-right text-[12.5px]">
                  <DueDate
                    day={task.due_on}
                    done={task.status === "done"}
                    today={today}
                    quiet
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<CheckCircle size={20} />}
          title={doneCount ? "All done" : "No tasks yet"}
        >
          {canEdit
            ? "Add the next thing that needs doing and who owns it."
            : undefined}
        </EmptyState>
      )}
      {doneCount ? (
        <div className="border-t border-[var(--i-line)] px-5 py-2">
          <button
            type="button"
            onClick={() => setWithDone((value) => !value)}
            className="text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
          >
            {withDone ? "Hide done" : `Show ${doneCount} done`}
          </button>
        </div>
      ) : null}
      <RecordDialog
        entity="task"
        {...form}
        hidden={[]}
        record={editor.editing ?? undefined}
        readOnly={!canEdit}
        {...editor.dialogProps}
      />
    </ListShell>
  );
}

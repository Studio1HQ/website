"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Copy,
  DownloadSimple,
  UploadSimple,
  UserCheck,
  Users,
  X,
} from "@phosphor-icons/react";
import { changeEntries } from "@/app/internal/(dashboard)/actions";
import {
  importGuestList,
  markRestNoShow,
  setQuickField,
} from "@/app/internal/(dashboard)/community/actions";
import {
  MAX_CSV_BYTES,
  byteLength,
  csvCell,
  guestsFromCsv,
} from "@/lib/internal/community/csv";
import {
  doorRows,
  type DoorRow,
  type SiteRegistration,
} from "@/lib/internal/community/door";
import {
  GUEST_ROLES,
  labelOf,
  type Guest,
} from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import {
  EmptyState,
  StatusBadge,
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import { QuickSelect } from "@/components/internal/community/quick-select";
import { AddButton } from "@/components/internal/community/lists";

/**
 * An event's guest list: registrations, check-ins at the door, a CSV import
 * from Luma or Meetup, and "mark the rest as no-shows" once it's over. A
 * hackathon event also lists its site registrations here (lib/internal/
 * community/door.ts), so everyone is checked in from one list.
 */

const VIEWS = [
  {
    key: "all",
    label: "All",
    match: (guest: Pick<DoorRow, "status">) => guest.status !== "cancelled",
  },
  {
    key: "going",
    label: "Going",
    match: (guest: Pick<DoorRow, "status">) =>
      guest.status === "registered" || guest.status === "confirmed",
  },
  {
    key: "attended",
    label: "Attended",
    match: (guest: Pick<DoorRow, "status">) => guest.status === "attended",
  },
  {
    key: "waitlisted",
    label: "Waitlist",
    match: (guest: Pick<DoorRow, "status">) => guest.status === "waitlisted",
  },
  {
    key: "no_show",
    label: "No-show",
    match: (guest: Pick<DoorRow, "status">) => guest.status === "no_show",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    match: (guest: Pick<DoorRow, "status">) => guest.status === "cancelled",
  },
] as const;

const PAGE = 200;

function ImportDialog({ eventId }: { eventId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, startTransition] = useTransition();
  const preview = useMemo(
    () => (text.trim() ? guestsFromCsv(text) : null),
    [text],
  );

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      toast("error", "That file is too big. Split it into smaller ones.");
      return;
    }
    setFileName(file.name);
    setText(await file.text());
  };

  const submit = () => {
    // Pasted text has no file size to check, so measure it here: a request
    // over the server's limit fails without a message.
    if (byteLength(text) > MAX_CSV_BYTES) {
      toast("error", "That list is too big. Split it into smaller ones.");
      return;
    }
    startTransition(async () => {
      const result = await importGuestList(eventId, text);
      if (result.ok) {
        toast("success", result.message ?? "Imported");
        if (result.warning) toast("error", result.warning);
        setOpen(false);
        setText("");
        setFileName("");
        router.refresh();
      } else toast("error", result.message);
    });
  };

  const found = preview?.ok ? preview.columns : null;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={buttonClass("secondary", "sm")}>
          <UploadSimple size={13} /> Import CSV
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(640px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
            <div>
              <Dialog.Title className="text-[15px] font-medium">
                Import a guest list
              </Dialog.Title>
              <Dialog.Description className="text-[12.5px] text-[var(--i-muted)]">
                A CSV export from Luma, Meetup, Google Forms or a spreadsheet.
                It needs an email column.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)]"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <div className="space-y-3 overflow-y-auto px-5 py-4">
            <label className={cn(buttonClass("secondary"), "cursor-pointer")}>
              <UploadSimple size={14} /> {fileName || "Choose a CSV file"}
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                onChange={pick}
                className="sr-only"
              />
            </label>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setFileName("");
              }}
              rows={6}
              placeholder={
                "…or paste it here:\nname,email,company\nPriya Shah,priya@example.com,IIT Bombay"
              }
              className={cn(textareaClass, "font-mono text-[12px]")}
            />
            {preview ? (
              preview.ok ? (
                <div className="rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--i-ink-2)]">
                  <p>
                    <strong className="font-medium">
                      {preview.guests.length.toLocaleString("en-IN")}
                    </strong>{" "}
                    guests found
                    {preview.skipped
                      ? `, ${preview.skipped} rows without an email skipped`
                      : ""}
                    .
                  </p>
                  <p className="text-[var(--i-muted)]">
                    Columns found: email
                    {found?.name ? ", name" : ""}
                    {found?.organisation ? ", college or company" : ""}
                    {found?.status ? ", status" : ""}
                    {found?.checkIn ? ", check-in" : ""}
                    {found?.role ? ", role" : ""}.
                  </p>
                  {preview.unreadCheckIns ? (
                    <p className="mt-1 text-amber-800 dark:text-amber-200">
                      {preview.unreadCheckIns} check-in{" "}
                      {preview.unreadCheckIns === 1 ? "value" : "values"}{" "}
                      can&apos;t be read and will count as not checked in. Use
                      yes/no or a date like 2026-11-13 18:30.
                    </p>
                  ) : null}
                  <p className="mt-1 text-[var(--i-muted)]">
                    People already on the list are updated. Check-ins made here
                    are never undone.
                  </p>
                </div>
              ) : (
                <p
                  role="alert"
                  className="text-[12.5px] text-rose-700 dark:text-rose-300"
                >
                  {preview.message}
                </p>
              )
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
            <Dialog.Close asChild>
              <button type="button" className={buttonClass("ghost")}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !preview?.ok || preview.guests.length === 0}
              className={buttonClass("accent")}
            >
              {busy
                ? "Importing…"
                : preview?.ok
                  ? `Import ${preview.guests.length.toLocaleString("en-IN")}`
                  : "Import"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function GuestList({
  eventId,
  eventName,
  guests,
  registrations,
  canEdit,
  isOver,
}: {
  eventId: string;
  eventName: string;
  guests: Guest[];
  /** A hackathon event's registrations from the site form. */
  registrations?: SiteRegistration[];
  canEdit: boolean;
  /** The event has happened: offer "mark the rest as no-shows". */
  isOver: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [busy, startTransition] = useTransition();
  const [confirmNoShow, setConfirmNoShow] = useState(false);
  const rows = useMemo(() => doorRows(guests, registrations ?? []), [guests, registrations]);
  const fromSite = rows.filter((row) => row.source === "site").length;

  const counts = useMemo(
    () =>
      Object.fromEntries(
        VIEWS.map((item) => [item.key, rows.filter(item.match).length]),
      ),
    [rows],
  );
  const shown = useMemo(() => {
    const match = VIEWS.find((item) => item.key === view)!.match;
    const words = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        match(row) &&
        (!words ||
          `${row.name} ${row.email} ${row.detail}`
            .toLowerCase()
            .includes(words)),
    );
  }, [rows, view, query]);
  const going = counts.going ?? 0;

  // A guest's status, or a site registration's review status (which needs
  // hackathon access; community managers have it).
  const checkIn = (row: DoorRow, attended: boolean) =>
    startTransition(async () => {
      const result =
        row.source === "site"
          ? await changeEntries("hackathons", [row.id], {
              status: attended ? "attended" : "confirmed",
            })
          : await setQuickField(
              "guest",
              row.id,
              attended ? "attended" : "registered",
            );
      if (result.ok) {
        toast(
          "success",
          attended
            ? `${row.name || row.email} checked in`
            : "Check-in undone",
        );
        router.refresh();
      } else toast("error", result.message ?? "Couldn't save. Try again.");
    });

  const noShows = () => {
    if (!confirmNoShow) {
      setConfirmNoShow(true);
      setTimeout(() => setConfirmNoShow(false), 4000);
      return;
    }
    startTransition(async () => {
      const result = await markRestNoShow(eventId);
      setConfirmNoShow(false);
      if (result.ok) {
        toast("success", result.message ?? "Done");
        router.refresh();
      } else toast("error", result.message);
    });
  };

  const copyEmails = async () => {
    const emails = shown.map((row) => row.email).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      toast(
        "success",
        `Copied ${shown.length} ${shown.length === 1 ? "email" : "emails"}`,
      );
    } catch {
      toast("error", "Couldn't copy. Your browser blocked the clipboard.");
    }
  };

  const download = () => {
    const header = [
      "name",
      "email",
      "organisation",
      "role",
      "status",
      "checked_in_at",
      "source",
    ];
    const lines = shown.map((row) =>
      [
        row.name,
        row.email,
        row.detail,
        row.role,
        row.status,
        row.checked_in_at ?? "",
        row.source === "site" ? "site form" : "guest list",
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\r\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      eventName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "guests"
    }-guests.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--i-line)] px-5 py-3">
        <h2 className="text-[13px] font-medium">
          {registrations ? "Door list" : "Guest list"}{" "}
          <span className="font-normal text-[var(--i-faint)]">
            {counts.all}
          </span>
          {registrations ? (
            <span className="ml-1.5 text-[12px] font-normal text-[var(--i-muted)]">
              {fromSite.toLocaleString("en-IN")} from the site form
            </span>
          ) : null}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {canEdit && isOver && going > 0 ? (
            <button
              type="button"
              onClick={noShows}
              disabled={busy}
              className={buttonClass(confirmNoShow ? "danger" : "ghost", "sm")}
            >
              {confirmNoShow
                ? `Mark ${going} as no-show?`
                : "Mark the rest as no-show"}
            </button>
          ) : null}
          {canEdit ? <ImportDialog eventId={eventId} /> : null}
          {canEdit ? (
            <RecordDialog
              entity="guest"
              defaults={{ event_id: eventId }}
              hidden={["event_id"]}
              trigger={<AddButton label="Guest" />}
            />
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Users size={20} />} title="No guests yet">
          {canEdit
            ? "Import the CSV from Luma, Meetup or a Google Form, or add people one by one. Check them in at the door from here."
            : "Nobody has been added to this event's guest list."}
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--i-line)] px-4 py-2.5">
            <div
              className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1"
              role="tablist"
              aria-label="Guest views"
            >
              {VIEWS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={view === item.key}
                  onClick={() => {
                    setView(item.key);
                    setLimit(PAGE);
                  }}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12.5px]",
                    view === item.key
                      ? "bg-[var(--i-sunken)] font-medium text-[var(--i-ink)] ring-1 ring-[var(--i-line)]"
                      : "text-[var(--i-muted)] hover:bg-[var(--i-hover)]",
                  )}
                >
                  {item.label}
                  <span className="tabular-nums text-[var(--i-faint)]">
                    {counts[item.key]}
                  </span>
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guests"
              aria-label="Search guests"
              className={cn(inputClass("xs"), "sm:w-48")}
            />
            <button
              type="button"
              onClick={copyEmails}
              disabled={!shown.length}
              className={buttonClass("ghost", "sm")}
              title="Copy these emails"
            >
              <Copy size={13} />{" "}
              <span className="sr-only sm:not-sr-only">Emails</span>
            </button>
            <button
              type="button"
              onClick={download}
              disabled={!shown.length}
              className={buttonClass("ghost", "sm")}
              title="Download these guests as CSV"
            >
              <DownloadSimple size={13} />{" "}
              <span className="sr-only sm:not-sr-only">CSV</span>
            </button>
          </div>

          <ul className="divide-y divide-[var(--i-line)]">
            {shown.slice(0, limit).map((row) => (
              <li key={row.key} className="flex items-center gap-3 px-5 py-2">
                {row.source === "site" ? (
                  <Link
                    href={`/internal/hackathons/${row.id}`}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[13px] font-medium hover:text-[var(--i-accent-text)]">
                      {row.name || row.email}
                      <span className="ml-1.5 text-[11.5px] font-normal text-[var(--i-muted)]">
                        Site form
                      </span>
                    </span>
                    <span className="block truncate text-[12px] text-[var(--i-muted)]">
                      {[row.name ? row.email : "", row.detail]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(row.guest ?? null)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[13px] font-medium hover:text-[var(--i-accent-text)]">
                      {row.name || row.email}
                      {row.role !== "attendee" ? (
                        <span className="ml-1.5 text-[11.5px] font-normal text-[var(--i-muted)]">
                          {labelOf(GUEST_ROLES, row.role)}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--i-muted)]">
                      {[row.name ? row.email : "", row.detail]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                )}
                {row.source === "site" ? (
                  <StatusBadge status={row.reviewStatus} />
                ) : (
                  <QuickSelect
                    entity="guest"
                    id={row.id}
                    value={row.status}
                    canEdit={canEdit}
                    label={`Status of ${row.name || row.email}`}
                  />
                )}
                {canEdit ? (
                  row.status === "attended" ? (
                    <button
                      type="button"
                      onClick={() => checkIn(row, false)}
                      disabled={busy}
                      className={cn(buttonClass("ghost", "sm"), "w-[5.5rem]")}
                    >
                      Undo
                    </button>
                  ) : row.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => checkIn(row, true)}
                      disabled={busy}
                      className={cn(
                        buttonClass("secondary", "sm"),
                        "w-[5.5rem]",
                      )}
                    >
                      <UserCheck size={13} /> Check in
                    </button>
                  ) : (
                    <span className="w-[5.5rem]" />
                  )
                ) : null}
              </li>
            ))}
          </ul>
          {shown.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
              Nobody here.
            </p>
          ) : null}
          {shown.length > limit ? (
            <div className="border-t border-[var(--i-line)] px-5 py-2.5">
              <button
                type="button"
                onClick={() => setLimit((value) => value + PAGE * 5)}
                className="text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
              >
                Show more ({(shown.length - limit).toLocaleString("en-IN")}{" "}
                left)
              </button>
            </div>
          ) : null}
        </>
      )}

      <RecordDialog
        entity="guest"
        hidden={["event_id"]}
        record={editing ?? undefined}
        readOnly={!canEdit}
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
      />
    </section>
  );
}

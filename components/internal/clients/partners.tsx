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
import { Handshake, Plus, Trash } from "@/components/internal/icons";
import {
  removePartner,
  savePartner,
} from "@/app/internal/(dashboard)/clients/actions";
import {
  PARTNER_STATUSES,
  PARTNER_TYPES,
  formatDay,
  labelOf,
  personName,
  todayKey,
  toneOf,
  type Partner,
  type PartnerStatus,
  type PartnerType,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { DateField } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import {
  Card,
  CardTitle,
  ExternalLink,
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import { Pill } from "@/components/internal/community/ui";
import { OwnerName } from "@/components/internal/clients/ui";
import { PartnerIcon } from "@/components/internal/clients/kind-icon";
import {
  FormDialog,
  FormField,
} from "@/components/internal/clients/client-dialog-shell";

/**
 * Co-GTM and partner outreach for an engagement (the "Co-GTM & Events"
 * table from the Notion trackers): who, why them, the pitch, the latest
 * step, what the client said, who runs it and the status. Open ones first,
 * with a follow-up date that turns amber when it's due. Members add the
 * ones they run and change those; client managers change any.
 */

type Viewer = { email: string; manager: boolean };

const ORDER: Record<PartnerStatus, number> = {
  in_progress: 0,
  not_started: 1,
  hold: 2,
  done: 3,
  dropped: 4,
};

type Filter = "open" | "all" | PartnerStatus;

/** Plural names for the kind filter and the group headings. */
const KIND_LABELS: Record<PartnerType, string> = {
  co_gtm: "Co-GTM",
  partner: "Partners",
  event: "Events",
  community: "Communities",
  ambassador: "Ambassadors and devs",
  media: "Newsletters and media",
  other: "Other",
};

function hostOf(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function Partners({
  engagementId,
  partners,
  viewer,
  owners,
  names,
}: {
  engagementId: string;
  partners: readonly Partner[];
  viewer: Viewer;
  owners: readonly string[];
  names: Readonly<Record<string, string>>;
}) {
  const today = todayKey();
  const [filter, setFilter] = useState<Filter>("open");
  // One kind at a time (Co-GTM, communities…), or all of them in groups.
  const [kind, setKind] = useState<PartnerType | "all">("all");
  const [editing, setEditing] = useState<Partner | null>(null);
  const count = (status: PartnerStatus) =>
    partners.filter((item) => item.status === status).length;
  const open = partners.filter(
    (item) => item.status !== "done" && item.status !== "dropped",
  );
  const shown = (
    filter === "all"
      ? partners
      : filter === "open"
        ? open
        : partners.filter((item) => item.status === filter)
  )
    .filter((item) => kind === "all" || item.type === kind)
    .slice()
    .sort(
      (a, b) =>
        ORDER[a.status] - ORDER[b.status] ||
        (a.follow_up_on ?? "9999").localeCompare(b.follow_up_on ?? "9999") ||
        b.updated_at.localeCompare(a.updated_at),
    );
  const may = (item: Partner) =>
    viewer.manager ||
    item.owner?.toLowerCase() === viewer.email.toLowerCase() ||
    item.created_by?.toLowerCase() === viewer.email.toLowerCase();

  const kinds = PARTNER_TYPES.map((type) => ({
    value: type.value,
    label: KIND_LABELS[type.value],
    count: partners.filter((item) => item.type === type.value).length,
  })).filter((item) => item.count > 0);
  // With every kind showing, rows sit under a heading per kind.
  const groups =
    kind === "all" && kinds.length > 1
      ? kinds
          .map((item) => ({
            ...item,
            rows: shown.filter((row) => row.type === item.value),
          }))
          .filter((item) => item.rows.length)
      : [{ value: kind, label: "", count: shown.length, rows: shown }];
  const row = (item: Partner) => (
    <PartnerRow
      key={item.id}
      partner={item}
      canChange={may(item)}
      names={names}
      today={today}
      showType={false}
      onOpen={() => setEditing(item)}
    />
  );

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "open", label: "Open", count: open.length },
    ...PARTNER_STATUSES.map((status) => ({
      value: status.value as Filter,
      label: status.label,
      count: count(status.value),
    })).filter((item) => item.count > 0),
    { value: "all", label: "All", count: partners.length },
  ];

  return (
    <Card>
      <CardTitle
        action={
          <PartnerDialog
            engagementId={engagementId}
            viewer={viewer}
            owners={owners}
            names={names}
            trigger={
              <button type="button" className={buttonClass("ghost", "sm")}>
                <Plus size={13} /> Add partner
              </button>
            }
          />
        }
      >
        Partners and Co-GTM{" "}
        <span className="font-normal text-[var(--i-faint)]">
          {partners.length}
        </span>
      </CardTitle>

      {partners.length ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--i-line)] px-5 py-2">
            {kinds.length > 1 ? (
              <div
                role="tablist"
                aria-label="Kind"
                className="flex flex-wrap gap-1"
              >
                {[
                  {
                    value: "all" as const,
                    label: "Every kind",
                    count: partners.length,
                  },
                  ...kinds,
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={kind === item.value}
                    onClick={() => setKind(item.value)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[12.5px] transition-colors",
                      kind === item.value
                        ? "bg-[var(--i-sunken)] font-medium text-[var(--i-ink)] ring-1 ring-inset ring-[var(--i-line)]"
                        : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
                    )}
                  >
                    {item.label}{" "}
                    <span className="tabular-nums text-[var(--i-faint)]">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <div
              role="tablist"
              aria-label="Status"
              className="flex flex-wrap gap-1"
            >
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.value}
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[12.5px] transition-colors",
                    filter === item.value
                      ? "bg-[var(--i-sunken)] font-medium text-[var(--i-ink)] ring-1 ring-inset ring-[var(--i-line)]"
                      : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
                  )}
                >
                  {item.label}{" "}
                  <span className="tabular-nums text-[var(--i-faint)]">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {shown.length ? (
            <table className="w-full border-collapse text-left text-[13px] max-lg:block">
              <thead className="max-lg:hidden">
                <tr className="text-[12px] text-[var(--i-muted)] [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:pb-1.5 [&>th]:pt-2.5 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
                  <th className="w-44">Company</th>
                  <th>Why them</th>
                  <th>Pitch and latest step</th>
                  <th className="w-44">Client&apos;s input</th>
                  <th className="w-36">Who · follow up</th>
                  <th className="w-36">Status</th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.value} className="max-lg:block">
                  {group.label ? (
                    <tr className="max-lg:block">
                      <th
                        colSpan={6}
                        scope="rowgroup"
                        className="border-t border-[var(--i-line)] bg-[var(--i-sunken)] px-5 py-1.5 text-left text-[12px] font-medium text-[var(--i-ink-2)] max-lg:block"
                      >
                        <span className="inline-flex items-center gap-2">
                          {group.value !== "all" ? (
                            <PartnerIcon type={group.value} size={13} />
                          ) : null}
                          {group.label}
                        </span>{" "}
                        <span className="font-normal tabular-nums text-[var(--i-faint)]">
                          {group.rows.length}
                        </span>
                      </th>
                    </tr>
                  ) : null}
                  {group.rows.map(row)}
                </tbody>
              ))}
            </table>
          ) : (
            <p className="px-5 py-5 text-[13px] text-[var(--i-muted)]">
              Nothing here. Pick another tab.
            </p>
          )}
        </>
      ) : (
        <div className="flex items-start gap-2.5 px-5 py-5 text-[13px] text-[var(--i-muted)]">
          <Handshake size={16} className="mt-0.5 shrink-0" />
          Companies to team up with for this client: co-written tutorials,
          integrations, joint events. Note why them, the pitch, and the latest
          step, so anyone can pick it up.
        </div>
      )}

      {editing ? (
        <PartnerDialog
          key={editing.id}
          engagementId={engagementId}
          partner={editing}
          viewer={viewer}
          owners={owners}
          names={names}
          readOnly={!may(editing)}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      ) : null}
    </Card>
  );
}

function PartnerRow({
  partner,
  canChange,
  names,
  today,
  onOpen,
  showType = true,
}: {
  partner: Partner;
  canChange: boolean;
  names: Readonly<Record<string, string>>;
  today: string;
  onOpen: () => void;
  /** Off when the row sits under its kind's heading. */
  showType?: boolean;
}) {
  const host = hostOf(partner.website);
  const live =
    partner.status === "in_progress" || partner.status === "not_started";
  const due = live && partner.follow_up_on && partner.follow_up_on <= today;
  return (
    <tr
      className={cn(
        "border-t border-[var(--i-line)] align-top transition-colors hover:bg-[var(--i-hover)]",
        "lg:[&>td]:px-3 lg:[&>td]:py-3 lg:first:[&>td]:pl-5 lg:last:[&>td]:pr-5",
        "max-lg:flex max-lg:flex-col max-lg:gap-1.5 max-lg:px-5 max-lg:py-3",
        (partner.status === "done" || partner.status === "dropped") &&
          "text-[var(--i-muted)]",
      )}
    >
      <td>
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full break-words text-left text-[13.5px] font-medium leading-snug text-[var(--i-ink)] hover:text-[var(--i-accent-text)]"
        >
          {partner.name}
        </button>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
          {showType ? (
            <Pill tone={toneOf(PARTNER_TYPES, partner.type)}>
              {labelOf(PARTNER_TYPES, partner.type)}
            </Pill>
          ) : null}
          {host && partner.website ? (
            <ExternalLink href={partner.website}>{host}</ExternalLink>
          ) : null}
        </span>
      </td>
      <td className="max-lg:empty:hidden">
        <Clamp text={partner.notes} label="Why them" />
      </td>
      <td>
        <Clamp text={partner.pitch} label="Pitch" />
        {partner.latest ? (
          <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-snug text-emerald-700 dark:text-emerald-300">
            <span className="font-medium">Latest:</span> {partner.latest}
          </p>
        ) : null}
      </td>
      <td>
        <Clamp text={partner.client_input} label="Client's input" />
      </td>
      <td className="text-[12.5px]">
        <OwnerName email={partner.owner} names={names} empty="—" />
        {partner.follow_up_on ? (
          <span
            className={cn(
              "mt-1 block tabular-nums",
              due
                ? "font-medium text-amber-700 dark:text-amber-300"
                : "text-[var(--i-muted)]",
            )}
          >
            Follow up {formatDay(partner.follow_up_on, today)}
            {due ? " · due" : ""}
          </span>
        ) : null}
      </td>
      <td>
        <StatusPick partner={partner} canChange={canChange} />
      </td>
    </tr>
  );
}

/** Long text, three lines, the rest on hover (and in the dialog). */
function Clamp({ text, label }: { text: string; label: string }) {
  if (!text) return null;
  return (
    <p
      title={text}
      className="line-clamp-3 whitespace-pre-wrap break-words text-[12.5px] leading-snug text-[var(--i-ink-2)]"
    >
      <span className="text-[var(--i-faint)] lg:hidden">{label}: </span>
      {text}
    </p>
  );
}

/** The status, changed in place by whoever may change the row. */
function StatusPick({
  partner,
  canChange,
}: {
  partner: Partner;
  canChange: boolean;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [busy, start] = useTransition();
  if (!canChange)
    return (
      <Pill tone={toneOf(PARTNER_STATUSES, partner.status)}>
        {labelOf(PARTNER_STATUSES, partner.status)}
      </Pill>
    );
  return (
    <Select
      size="sm"
      aria-label={`Status of ${partner.name}`}
      value={partner.status}
      disabled={busy}
      onChange={(next) =>
        start(async () => {
          const result = await savePartner(partner.id, { status: next });
          if (!result.ok) {
            toast("error", result.message);
            return;
          }
          toast(
            "success",
            `${partner.name}: ${labelOf(PARTNER_STATUSES, next)}`,
          );
          afterSave();
        })
      }
      options={PARTNER_STATUSES}
      className="w-full max-lg:w-40"
    />
  );
}

type Values = {
  name: string;
  website: string;
  type: PartnerType;
  status: PartnerStatus;
  owner: string;
  notes: string;
  pitch: string;
  latest: string;
  client_input: string;
  follow_up_on: string;
};

function startValues(partner: Partner | undefined, me: string): Values {
  return {
    name: partner?.name ?? "",
    website: partner?.website ?? "",
    type: partner?.type ?? "co_gtm",
    status: partner?.status ?? "not_started",
    owner: partner ? (partner.owner ?? "") : me,
    notes: partner?.notes ?? "",
    pitch: partner?.pitch ?? "",
    latest: partner?.latest ?? "",
    client_input: partner?.client_input ?? "",
    follow_up_on: partner?.follow_up_on ?? "",
  };
}

function PartnerDialog({
  engagementId,
  partner,
  viewer,
  owners,
  names,
  readOnly = false,
  trigger,
  open: controlled,
  onOpenChange,
}: {
  engagementId: string;
  partner?: Partner;
  viewer: Viewer;
  owners: readonly string[];
  names: Readonly<Record<string, string>>;
  readOnly?: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [own, setOwn] = useState(false);
  const open = controlled ?? own;
  const [values, setValues] = useState<Values>(() =>
    startValues(partner, viewer.email),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const setOpen = (next: boolean) => {
    if (next && !open) {
      setValues(startValues(partner, viewer.email));
      setError(null);
      setConfirm(false);
    }
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const people = [
    ...new Set(
      [viewer.email, ...owners, values.owner]
        .filter(Boolean)
        .map((email) => email.toLowerCase()),
    ),
  ]
    .map((email) => ({ value: email, label: personName(email, names) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (readOnly) {
      setOpen(false);
      return;
    }
    setError(null);
    start(async () => {
      const payload: Record<string, unknown> = { ...values };
      // Members run their own: the owner stays with them.
      if (!viewer.manager) delete payload.owner;
      if (!partner) payload.engagement_id = engagementId;
      const result = await savePartner(partner?.id ?? null, payload);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      setOpen(false);
      afterSave();
    });
  };

  const remove = () => {
    if (!partner) return;
    if (!confirm) {
      setConfirm(true);
      timer.current = setTimeout(() => setConfirm(false), 5000);
      return;
    }
    start(async () => {
      const result = await removePartner(partner.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Removed");
      setOpen(false);
      afterSave();
    });
  };

  const area = (
    key: "notes" | "pitch" | "latest" | "client_input",
    rows: number,
    max: number,
    placeholder: string,
  ) => (
    <textarea
      id={`partner-${key}`}
      rows={rows}
      maxLength={max}
      value={values[key]}
      onChange={(event) => set(key, event.target.value)}
      placeholder={placeholder}
      disabled={readOnly}
      className={textareaClass}
    />
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={
        partner
          ? readOnly
            ? partner.name
            : `Edit ${partner.name}`
          : "Add a partner"
      }
      description="A company to team up with for this client, and where it stands."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={readOnly ? "Close" : partner ? "Save" : "Add partner"}
      footerStart={
        partner && !readOnly ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={buttonClass(confirm ? "danger" : "ghost", "sm")}
          >
            <Trash size={13} /> {confirm ? "Click again to remove" : "Remove"}
          </button>
        ) : undefined
      }
    >
      <FormField id="partner-name" label="Company" required>
        <input
          id="partner-name"
          type="text"
          required
          maxLength={120}
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="Shorebird"
          disabled={readOnly}
          className={inputClass()}
        />
      </FormField>
      <FormField id="partner-website" label="Website">
        <input
          id="partner-website"
          type="text"
          inputMode="url"
          maxLength={1000}
          value={values.website}
          onChange={(event) => set("website", event.target.value)}
          placeholder="shorebird.dev"
          disabled={readOnly}
          className={inputClass()}
        />
      </FormField>
      <FormField id="partner-type" label="Type">
        <Select
          id="partner-type"
          value={values.type}
          onChange={(next) => set("type", next)}
          options={PARTNER_TYPES}
          disabled={readOnly}
        />
      </FormField>
      <FormField id="partner-status" label="Status">
        <Select
          id="partner-status"
          value={values.status}
          onChange={(next) => set("status", next)}
          options={PARTNER_STATUSES}
          disabled={readOnly}
        />
      </FormField>
      <FormField
        id="partner-owner"
        label="Who runs it"
        help={viewer.manager ? undefined : "You, for the ones you add."}
      >
        <Select
          id="partner-owner"
          value={values.owner.toLowerCase()}
          onChange={(next) => set("owner", next)}
          options={people}
          disabled={readOnly || !viewer.manager}
        />
      </FormField>
      <FormField id="partner-follow_up_on" label="Follow up on">
        <DateField
          id="partner-follow_up_on"
          value={values.follow_up_on}
          onChange={(next) => set("follow_up_on", next)}
          disabled={readOnly}
        />
      </FormField>
      <FormField id="partner-notes" label="Why them" wide>
        {area(
          "notes",
          2,
          2000,
          "Who they are, who we know there, why they fit this client",
        )}
      </FormField>
      <FormField id="partner-pitch" label="The pitch" wide>
        {area(
          "pitch",
          3,
          3000,
          "What we'd do together: an integration tutorial, a co-written blog, an event",
        )}
      </FormField>
      <FormField
        id="partner-latest"
        label="Latest step"
        wide
        help="Replace it as things move, so the table shows where it stands."
      >
        {area(
          "latest",
          2,
          1000,
          "Sent a DM to their Head of Growth, waiting to hear back",
        )}
      </FormField>
      <FormField id="partner-client_input" label="Client's input" wide>
        {area("client_input", 2, 2000, "What the client said about it")}
      </FormField>
    </FormDialog>
  );
}

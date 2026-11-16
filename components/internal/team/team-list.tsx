"use client";

import { useState, type ReactNode } from "react";
import { Crown, UserPlus } from "@phosphor-icons/react";
import { addTeammateAction, saveTeammateAction, setTeammateAccess } from "@/app/internal/(dashboard)/people/actions";
import { DateField, SuggestInput } from "@/components/internal/pickers";
import { Avatar, Card, buttonClass, inputClass, relativeDate } from "@/components/internal/ui";
import { Chip } from "@/components/internal/team/chips";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import {
  AREA_LIST,
  EMPTY_GRID,
  ROLE_INFO,
  allowedLevels,
  areaAccess,
  gridFromRoles,
  isStaffEmail,
  levelInfo,
  rolesFromGrid,
  type AccessGrid,
  type AreaInfo,
  type AreaLevel,
} from "@/lib/internal/roles";
import { PERSON_KINDS, displayName, photoUrl, type PersonKind } from "@/lib/internal/team/shared";
import type { Teammate } from "@/lib/internal/team/teammates";
import { cn } from "@/lib/utils";

const FOUNDERS = "Arindam or Amitesh";
const EVERYONE = "My day, Tasks and Calls";

/* -------------------------------------------------------------- the list */

/**
 * Everyone on the team, one row each: who they are, what they can open and
 * whether they're in. Clicking a row opens the same dialog as Add person.
 * Admins only (the page checks); the server actions check every change again.
 */
/** A client to pick for someone: just enough to name it. */
export type ClientChoice = { id: string; name: string };

export function TeamList({
  teammates,
  clients,
  me,
  owner,
  reviewers,
}: {
  teammates: Teammate[];
  /** Every client, for scoping a Client team member to some of them. */
  clients: ClientChoice[];
  me: string;
  /** Arindam or Amitesh: outside writers, the Admin switch, Team tasks and turning people off are theirs. */
  owner: boolean;
  reviewers: string[];
}) {
  const [open, setOpen] = useState<Teammate | "new" | null>(null);
  const waiting = teammates.filter((teammate) => teammate.status === "pending").length;

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
          <p className="max-w-2xl text-[12.5px] leading-relaxed text-[var(--i-muted)]">
            Everyone here gets {EVERYONE}. Click someone to change their details or what else they can open.
            {waiting ? ` ${waiting === 1 ? "One person is" : `${waiting} people are`} waiting at the top.` : ""}
          </p>
          <button type="button" onClick={() => setOpen("new")} className={buttonClass("accent", "sm")}>
            <UserPlus size={14} /> Add person
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--i-line)] text-left text-[var(--i-muted)] [&>th]:py-2 [&>th]:font-normal">
                <th scope="col" className="px-5">Person</th>
                <th scope="col" className="hidden px-3 md:table-cell">Type</th>
                <th scope="col" className="hidden px-3 sm:table-cell">Can also open</th>
                <th scope="col" className="px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {teammates.map((teammate) => (
                <tr
                  key={teammate.email}
                  onClick={() => setOpen(teammate)}
                  className={cn(
                    "cursor-pointer border-b border-[var(--i-line)] align-middle last:border-b-0 hover:bg-[var(--i-hover)]",
                    teammate.status === "off" && "opacity-60",
                  )}
                >
                  <td className="px-5 py-2.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpen(teammate);
                      }}
                      className="flex min-w-0 items-center gap-2.5 text-left"
                    >
                      <Avatar name={teammate.name} email={teammate.email} size={28} src={photoUrl(teammate.person)} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {teammate.name}
                          {teammate.email === me ? <span className="font-normal text-[var(--i-faint)]"> (you)</span> : null}
                        </span>
                        <span className="block truncate text-[11.5px] text-[var(--i-muted)]">{teammate.email}</span>
                      </span>
                    </button>
                    <div className="mt-1.5 sm:hidden">
                      <AccessChips teammate={teammate} clients={clients} />
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <span className="block">{typeOf(teammate)}</span>
                    {teammate.person?.designation ? (
                      <span className="block truncate text-[11.5px] text-[var(--i-muted)]">{teammate.person.designation}</span>
                    ) : null}
                  </td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <AccessChips teammate={teammate} clients={clients} />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <StatusChip teammate={teammate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[var(--i-line)] px-5 py-2.5 text-[11.5px] leading-relaxed text-[var(--i-faint)]">
          Anyone who signs in with an @studio1hq.com address joins this list by themselves. Money (payroll and payments)
          stays with the founders.
        </p>
      </Card>
      {/* A fresh dialog per person, so nothing typed for one carries over. */}
      {open ? (
        <TeammateDialog
          key={open === "new" ? "new" : open.email}
          teammate={open === "new" ? null : open}
          clients={clients}
          me={me}
          owner={owner}
          reviewers={reviewers}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

function typeOf(teammate: Teammate) {
  if (teammate.status === "owner") return "Founder";
  if (teammate.outside) return "Outside writer";
  return teammate.person ? PERSON_KINDS[teammate.person.kind] : "Employee";
}

/** What someone can open beyond what everyone gets, as short chips. */
function AccessChips({ teammate, clients }: { teammate: Teammate; clients: ClientChoice[] }) {
  if (teammate.status === "owner") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--i-accent-text)]">
        <Crown size={12} weight="fill" /> Everything, Money included
      </span>
    );
  }
  if (teammate.roles.includes("admin")) return <Chip tone="violet">Admin: everything but Money</Chip>;
  const grid = gridFromRoles(teammate.roles);
  const chips = AREA_LIST.flatMap((area) => {
    const info = levelInfo(area.key, grid[area.key]);
    if (!info) return [];
    // A Client team member given some clients: name them.
    if (area.key === "clients" && grid.clients === "own" && teammate.clientIds) {
      return [`Clients: ${clientNames(clients, teammate.clientIds)}`];
    }
    return [`${area.label}: ${info.label}`];
  });
  if (chips.length === 0) {
    return <span className="text-[12px] text-[var(--i-faint)]">{teammate.outside ? "Nothing yet" : "Nothing else yet"}</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <Chip key={chip}>{chip}</Chip>
      ))}
    </span>
  );
}

/** "Measure, Nebius" for the ids picked, in the clients' order. */
function clientNames(clients: ClientChoice[], ids: readonly string[]) {
  const names = clients.filter((client) => ids.includes(client.id)).map((client) => client.name);
  return names.length ? names.join(", ") : "none left";
}

function StatusChip({ teammate }: { teammate: Teammate }) {
  if (teammate.status === "pending") {
    return (
      <span title={teammate.requestedAt ? `Asked ${relativeDate(teammate.requestedAt)}` : undefined}>
        <Chip tone="amber">Waiting</Chip>
      </span>
    );
  }
  if (teammate.status === "off") return <Chip>Off</Chip>;
  return (
    <span title={teammate.lastSeen ? `Last seen ${relativeDate(teammate.lastSeen)}` : undefined}>
      <Chip tone="emerald">Active</Chip>
    </span>
  );
}

/* ------------------------------------------------------------ the dialog */

/**
 * Add person, or one person's row: their details on top, what they can
 * open below. Studio1 addresses get the roster fields (type, employee ID);
 * anyone else can only be a blog writer.
 */
function TeammateDialog({
  teammate,
  clients,
  me,
  owner,
  reviewers,
  onClose,
}: {
  teammate: Teammate | null;
  clients: ClientChoice[];
  me: string;
  owner: boolean;
  reviewers: string[];
  onClose: () => void;
}) {
  const { pending, run } = useTeamAction();
  const person = teammate?.person ?? null;
  const [email, setEmail] = useState(teammate?.email ?? "");
  const [name, setName] = useState(person?.name || teammate?.name || "");
  const [kind, setKind] = useState<PersonKind>(person?.kind ?? "employee");
  const [code, setCode] = useState(person?.employee_code ?? "");
  const [designation, setDesignation] = useState(person?.designation ?? "");
  const [joined, setJoined] = useState(person?.joined_on ?? "");
  const [reviewer, setReviewer] = useState(person?.reviewer ?? "");
  const [grid, setGrid] = useState<AccessGrid>(teammate ? gridFromRoles(teammate.roles) : EMPTY_GRID);
  const [admin, setAdmin] = useState(teammate?.roles.includes("admin") ?? false);
  // Client team only: the clients they may open, or null for every client.
  const [clientIds, setClientIds] = useState<string[] | null>(teammate?.clientIds ?? null);
  const [confirmOff, setConfirmOff] = useState(false);

  const address = email.trim().toLowerCase();
  const isNew = teammate === null;
  const outside = teammate ? teammate.outside : address.includes("@") && !isStaffEmail(address);
  const self = teammate?.email === me;
  const founder = teammate?.status === "owner";

  // Why the access part can't change at all, if it can't.
  const lock = founder
    ? "The founders have everything, Money included."
    : self
      ? "That's you: someone else changes your access."
      : teammate?.status === "off"
        ? "Their access is off. Turn it back on to change it."
        : !owner && teammate?.roles.includes("admin")
          ? `Only ${FOUNDERS} can change an admin's access.`
          : outside && isNew && !owner
            ? `Only ${FOUNDERS} can invite writers from outside Studio1.`
            : null;
  const canEditAccess = !lock && !outside;

  const save = () => {
    const input = {
      email: address,
      name,
      kind,
      employee_code: code,
      designation,
      joined_on: joined,
      reviewer: kind === "intern" ? reviewer : "",
      ...(canEditAccess
        ? { roles: rolesFromGrid(grid, admin), client_ids: grid.clients === "own" && !admin ? clientIds : null }
        : {}),
    };
    run(() => (isNew ? addTeammateAction(input) : saveTeammateAction(input)), onClose);
  };
  const turn = (on: boolean) => run(() => setTeammateAccess(teammate?.email, on), onClose);

  const canTurn = owner && teammate && !self && !founder;
  const title = isNew ? "Add person" : teammate.name;

  return (
    <TeamDialog
      open
      wide
      onOpenChange={(next) => (next ? null : onClose())}
      title={title}
      description={
        isNew
          ? `They get ${EVERYONE}, plus whatever you pick below, and an email saying they're in.`
          : [teammate.email, teammate.lastSeen ? `last seen ${relativeDate(teammate.lastSeen)}` : "hasn't signed in yet"].join(" · ")
      }
      footer={
        <>
          {canTurn ? (
            confirmOff ? (
              <span className="mr-auto flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--i-muted)]">
                They can&apos;t sign in; their days and payslips stay.
                <button type="button" disabled={pending} onClick={() => turn(false)} className={buttonClass("danger", "sm")}>
                  Turn off
                </button>
                <button type="button" onClick={() => setConfirmOff(false)} className={buttonClass("ghost", "sm")}>
                  Keep
                </button>
              </span>
            ) : teammate.status === "off" ? (
              <button type="button" disabled={pending} onClick={() => turn(true)} className={cn(buttonClass("secondary"), "mr-auto")}>
                Turn back on
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmOff(true)} className={cn(buttonClass("danger"), "mr-auto")}>
                {teammate.status === "pending" ? "Decline" : "Turn off access"}
              </button>
            )
          ) : null}
          <button type="button" onClick={onClose} className={buttonClass("ghost")}>
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || (isNew && (!address.includes("@") || (outside && !owner)))}
            onClick={save}
            className={buttonClass("accent")}
          >
            {pending ? "Saving…" : isNew ? "Add and invite" : teammate.status === "pending" ? "Approve" : "Save"}
          </button>
        </>
      }
    >
      <Section title="Details">
        <div className="grid gap-3 sm:grid-cols-2">
          {isNew ? (
            <Label label="Email">
              <input
                type="email"
                value={email}
                autoFocus
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@studio1hq.com"
                className={inputClass()}
              />
            </Label>
          ) : null}
          <Label label="Name" hint={isNew ? "they can change it" : undefined} className={isNew ? undefined : "sm:col-span-2"}>
            <input
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder={address.includes("@") ? displayName({ email: address }) : "Priya Sharma"}
              className={inputClass()}
            />
          </Label>
        </div>
        {outside ? null : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label group label="Type">
                <Segmented
                  label="Type"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: "employee", label: "Employee" },
                    { value: "intern", label: "Intern" },
                  ]}
                />
              </Label>
              {kind === "intern" ? (
                <Label label="Reviewer" hint="logs their days">
                  <SuggestInput
                    value={reviewer}
                    onChange={setReviewer}
                    options={reviewers.filter((option) => option !== address).map((option) => ({ value: option }))}
                    placeholder="mentor@studio1hq.com"
                  />
                </Label>
              ) : (
                <p className="self-end pb-2 text-[12px] text-[var(--i-faint)]">Employees log their own days on My day.</p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <Label label="Designation">
                <input
                  value={designation}
                  maxLength={80}
                  onChange={(event) => setDesignation(event.target.value)}
                  placeholder="DevRel Engineer"
                  className={inputClass()}
                />
              </Label>
              <Label label="Employee ID" hint="optional">
                <input
                  value={code}
                  maxLength={24}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="S1-001"
                  className={inputClass()}
                />
              </Label>
              <Label label="Joined on">
                <DateField value={joined} onChange={setJoined} />
              </Label>
            </div>
          </>
        )}
      </Section>

      <Section title="What they can open" note={outside ? undefined : `Everyone gets ${EVERYONE}.`}>
        {outside ? (
          <p className="rounded-lg bg-[var(--i-sunken)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
            Someone outside Studio1 can only have <strong className="font-medium text-[var(--i-ink-2)]">Blog: Own work</strong>
            : they write their own posts and ask for a review, and see nothing else.
            {isNew && !owner ? ` Only ${FOUNDERS} can invite them.` : ""}
          </p>
        ) : (
          <>
            {lock ? <p className="rounded-lg bg-[var(--i-sunken)] px-3 py-2 text-[12.5px] text-[var(--i-muted)]">{lock}</p> : null}
            <div className="divide-y divide-[var(--i-line)]">
              {AREA_LIST.map((area) => (
                <AreaRow
                  key={area.key}
                  area={area}
                  email={address}
                  value={admin || founder ? areaAccess(["admin"], area.key) : grid[area.key]}
                  disabled={!canEditAccess || admin || founder}
                  locked={
                    !owner && area.key === "tasks" ? `Only ${FOUNDERS} can change who sees the team's tasks.` : null
                  }
                  onChange={(level) => setGrid((current) => ({ ...current, [area.key]: level }))}
                >
                  {area.key === "clients" && grid.clients === "own" && !admin && !founder ? (
                    <ClientPicker
                      clients={clients}
                      value={clientIds}
                      disabled={!canEditAccess}
                      onChange={setClientIds}
                    />
                  ) : null}
                </AreaRow>
              ))}
              <AdminRow
                on={admin || founder}
                disabled={!canEditAccess || founder || !owner}
                note={!owner && !founder ? `Only ${FOUNDERS} can make someone an admin.` : null}
                onChange={setAdmin}
              />
            </div>
          </>
        )}
      </Section>
    </TeamDialog>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">
        {title}
        {note ? <span className="ml-2 font-normal normal-case tracking-normal text-[var(--i-muted)]">{note}</span> : null}
      </h3>
      {children}
    </section>
  );
}

/** What having no access to an area means. */
function noneText(area: AreaInfo) {
  if (area.key === "tasks") return "They see and update their own tasks, like everyone.";
  return `They don't see ${area.key === "clients" ? "client work" : `the ${area.label.toLowerCase()} area`}.`;
}

/** One area: its levels as pills, and what the picked one lets them do. */
function AreaRow({
  area,
  email,
  value,
  disabled,
  locked,
  onChange,
  children,
}: {
  area: AreaInfo;
  email: string;
  value: AreaLevel | null;
  disabled: boolean;
  /** This area alone can't change, and why. */
  locked: string | null;
  onChange: (level: AreaLevel | null) => void;
  /** More choices for the picked level, under its description. */
  children?: ReactNode;
}) {
  const allowed = email.includes("@") ? (allowedLevels(email, area.key) as AreaLevel[]) : area.levels.map((info) => info.level);
  const info = levelInfo(area.key, value);
  const options: { value: AreaLevel | null; label: string }[] = [
    { value: null, label: "No access" },
    ...area.levels.filter((level) => allowed.includes(level.level)).map((level) => ({ value: level.level, label: level.label })),
  ];
  const off = disabled || Boolean(locked);
  return (
    <div className="grid gap-x-4 gap-y-1.5 py-3 first:pt-0 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <span className="pt-1.5 text-[13px] font-medium">{area.label}</span>
      <div className="min-w-0">
        <div role="radiogroup" aria-label={area.label} className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const on = option.value === value;
            return (
              <label
                key={option.label}
                className={cn(
                  "inline-flex h-8 select-none items-center rounded-full border px-3 text-[12.5px] transition-colors",
                  on
                    ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)] font-medium text-[var(--i-accent-text)]"
                    : "border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink-2)]",
                  off ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[var(--i-hover)]",
                  off && on && "opacity-80",
                )}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={`area-${area.key}`}
                  checked={on}
                  disabled={off}
                  onChange={() => onChange(option.value)}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--i-muted)]">
          {locked && !disabled ? locked : info ? info.description : noneText(area)}
        </p>
        {children}
      </div>
    </div>
  );
}

/**
 * Which clients a Client team member sees: every client, or only the ones
 * picked. Picking a client narrows it; unpicking the last goes back to all.
 */
function ClientPicker({
  clients,
  value,
  disabled,
  onChange,
}: {
  clients: ClientChoice[];
  value: string[] | null;
  disabled: boolean;
  onChange: (value: string[] | null) => void;
}) {
  const toggle = (id: string) => {
    const next = value?.includes(id) ? value.filter((item) => item !== id) : [...(value ?? []), id];
    onChange(next.length ? next : null);
  };
  const pill = (on: boolean) =>
    cn(
      "inline-flex h-7 select-none items-center gap-1 rounded-full border px-2.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
      on
        ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)] font-medium text-[var(--i-accent-text)]"
        : "border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink-2)] hover:bg-[var(--i-hover)]",
    );
  return (
    <div role="group" aria-label="Which clients" className="mt-2.5 rounded-lg bg-[var(--i-sunken)] p-2.5">
      <p className="mb-2 text-[12px] text-[var(--i-muted)]">Which clients</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={value === null} disabled={disabled} onClick={() => onChange(null)} className={pill(value === null)}>
          All clients
        </button>
        {clients.map((client) => {
          const on = Boolean(value?.includes(client.id));
          return (
            <button
              key={client.id}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => toggle(client.id)}
              className={pill(on)}
            >
              {client.name}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-[var(--i-muted)]">
        {value === null
          ? "They see every client. Pick some to limit them to those."
          : `They see only ${clientNames(clients, value)}: nothing from other clients, in Clients or as task tags.`}
      </p>
    </div>
  );
}

function AdminRow({
  on,
  disabled,
  note,
  onChange,
}: {
  on: boolean;
  disabled: boolean;
  note: string | null;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="grid gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <span className="pt-0.5 text-[13px] font-medium">Admin</span>
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Admin"
          disabled={disabled}
          onClick={() => onChange(!on)}
          className={cn(
            "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60",
            on ? "border-[var(--i-accent)] bg-[var(--i-accent)]" : "border-[var(--i-line)] bg-[var(--i-sunken)]",
          )}
        >
          <span
            className={cn(
              "inline-block size-3.5 rounded-full bg-white shadow-[var(--i-shadow-sm)] transition-transform",
              on ? "translate-x-[18px]" : "translate-x-[2px]",
            )}
          />
        </button>
        <span className="text-[12px] leading-relaxed text-[var(--i-muted)]">
          {note ?? ROLE_INFO.admin.description}
          {on ? " Every area above is at its top level." : ""}
        </span>
      </div>
    </div>
  );
}

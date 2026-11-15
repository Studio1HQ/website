"use client";

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { CaretDown, Crown, UserPlus } from "@phosphor-icons/react";
import { invite, updateMember } from "@/app/internal/(dashboard)/team/actions";
import type { Member } from "@/lib/internal/members";
import {
  AREA_LIST,
  EMPTY_GRID,
  OWNERS,
  PRESETS,
  ROLE_INFO,
  allowedLevels,
  areaAccess,
  gridFromRoles,
  isStaffEmail,
  levelInfo,
  presetAllowed,
  presetGrid,
  roleChangeProblem,
  rolesFromGrid,
  rolesLabel,
  type AccessGrid,
  type AreaInfo,
  type AreaLevel,
  type RoleKey,
} from "@/lib/internal/roles";
import { cn } from "@/lib/utils";
import { Select, type SelectOption } from "@/components/internal/select";
import { useToast } from "@/components/internal/toast";
import {
  Avatar,
  Card,
  CardTitle,
  EmptyState,
  Notice,
  buttonClass,
  formatDate,
  menuContentClass,
  menuItemClass,
  relativeDate,
  inputClass,
} from "@/components/internal/ui";

/** Their own name when they've given one, else worked out from the address. */
function nameOf(email: string, name?: string) {
  return name?.trim() || email.split("@")[0].replace(/[._+-]+/g, " ");
}

const FOUNDERS = "Arindam or Amitesh";
const OUTSIDE_REASON = "People outside Studio1 can only write their own blog posts.";
const ADMIN_COVERS = "Admin already includes the top level here.";
const NONE = "No access";

/** Who/what a row is: someone's access, the controls' state and why some can't change. */
type AccessRow = {
  key: string;
  email: string;
  name: ReactNode;
  /** The line under the name. */
  sub: ReactNode;
  grid: AccessGrid;
  admin: boolean;
  /** The founders: everything, nothing to change. */
  owner?: boolean;
  /** Why nothing in this row can change, when that's so (shown in the row). */
  lock?: string | null;
  /** Why the Admin switch can't change, when the rest can. */
  adminLock?: string | null;
  /** Held still while a change saves. */
  busy?: boolean;
  dim?: boolean;
  onChange?: (grid: AccessGrid, admin: boolean) => void;
  actions?: ReactNode;
};

type Hint = (text: string | null) => void;

/** The text a cell explains itself with: why it's locked, or what its level allows. */
function cellText(row: AccessRow, area: AreaInfo, value: AreaLevel | null) {
  const outside = !isStaffEmail(row.email) && row.email.includes("@");
  if (row.owner) return "The founders have everything, Money included.";
  if (row.lock) return row.lock;
  if (outside && allowedLevels(row.email, area.key).length === 0) return OUTSIDE_REASON;
  if (row.admin) return ADMIN_COVERS;
  const info = levelInfo(area.key, value);
  return info
    ? `${area.label}: ${info.label}. ${info.description}`
    : `${area.label}: ${NONE}. They can't open ${area.label === "Clients" ? "client work" : `the ${area.label.toLowerCase()} area`}.`;
}

/** One cell: a compact select of the levels this area has. */
function AccessCell({ row, area, onHint }: { row: AccessRow; area: AreaInfo; onHint: Hint }) {
  const describedBy = useId();
  const value = row.admin ? areaAccess(["admin"], area.key) : row.grid[area.key];
  const allowed = row.email.includes("@") ? (allowedLevels(row.email, area.key) as AreaLevel[]) : area.levels.map((l) => l.level);
  const blocked = allowed.length === 0;
  const disabled = Boolean(row.busy || row.lock || row.owner || row.admin || blocked || !row.onChange);
  const options: SelectOption<AreaLevel | "">[] = [
    { value: "", label: NONE },
    ...area.levels.map((info) => ({
      value: info.level,
      label: allowed.includes(info.level) ? info.label : `${info.label} (Studio1 only)`,
      textValue: info.label,
      disabled: !allowed.includes(info.level),
    })),
  ];
  const text = cellText(row, area, value);
  return (
    <span
      className="block"
      title={text}
      onMouseEnter={() => onHint(text)}
      onMouseLeave={() => onHint(null)}
      onFocus={() => onHint(text)}
      onBlur={() => onHint(null)}
    >
      <Select<AreaLevel | "">
        size="xs"
        value={value ?? ""}
        options={options}
        disabled={disabled}
        aria-label={`${area.label} for ${row.email}`}
        aria-describedby={describedBy}
        className="w-full min-w-[7.25rem] disabled:pointer-events-none"
        onChange={(next) => row.onChange?.({ ...row.grid, [area.key]: next || null }, row.admin)}
      />
      <span id={describedBy} className="sr-only">
        {text}
      </span>
    </span>
  );
}

/** The Admin switch. */
function AdminSwitch({ row, onHint }: { row: AccessRow; onHint: Hint }) {
  const outside = !isStaffEmail(row.email) && row.email.includes("@");
  const reason = row.owner
    ? "The founders are always admins."
    : row.lock || (outside ? OUTSIDE_REASON : row.adminLock) || null;
  const text = reason ?? `Admin: ${ROLE_INFO.admin.description}`;
  const disabled = Boolean(row.busy || reason || !row.onChange);
  const on = row.owner || row.admin;
  return (
    <span
      className="inline-flex"
      title={text}
      onMouseEnter={() => onHint(text)}
      onMouseLeave={() => onHint(null)}
      onFocus={() => onHint(text)}
      onBlur={() => onHint(null)}
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Admin for ${row.email}`}
        disabled={disabled}
        onClick={() => row.onChange?.(row.grid, !row.admin)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-50",
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
    </span>
  );
}

/** "Fill from…": common rows in one pick. Admin isn't touched. */
function PresetMenu({ row }: { row: AccessRow }) {
  const disabled = Boolean(row.busy || row.lock || row.owner || row.admin || !row.onChange);
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={row.admin ? "Admin already includes every area." : undefined}
          className={buttonClass("ghost", "sm")}
        >
          Fill from… <CaretDown size={11} weight="bold" />
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} collisionPadding={12} className={menuContentClass}>
          {PRESETS.map((preset) => {
            const ok = !row.email.includes("@") || presetAllowed(row.email, preset);
            return (
              <Menu.Item
                key={preset.key}
                disabled={!ok}
                className={cn(menuItemClass, "items-start")}
                onSelect={() => row.onChange?.(presetGrid(preset), row.admin)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block">{preset.label}</span>
                  <span className="block text-[12px] text-[var(--i-muted)]">
                    {ok ? preset.description : "Studio1 addresses only"}
                  </span>
                </span>
              </Menu.Item>
            );
          })}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

function PersonCell({ row, size }: { row: AccessRow; size: 24 | 28 }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={typeof row.name === "string" ? row.name : row.email} email={row.email} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{row.name}</span>
        <span className="block truncate text-[12px] text-[var(--i-muted)]">{row.sub}</span>
        {row.lock ? <span className="block text-[12px] text-[var(--i-faint)]">{row.lock}</span> : null}
      </span>
    </span>
  );
}

const OWNER_CELL = (
  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--i-accent-soft)] px-2 py-0.5 text-[12px] font-medium text-[var(--i-accent-text)]">
    <Crown size={12} weight="fill" /> Owner · everything, Money included
  </span>
);

/**
 * The access grid: a row per person, a column per area, plus Admin. A table
 * from `lg` up, a card per person below (like the dashboard's other tables).
 * Under it, a line explains whichever cell is pointed at or focused.
 */
function AccessTable({ rows, label }: { rows: AccessRow[]; label: string }) {
  const [hint, setHint] = useState<string | null>(null);
  return (
    <>
      {/* Phones and tablets: a card per person. */}
      <ul className="divide-y divide-[var(--i-line)] lg:hidden">
        {rows.map((row) => (
          <li key={row.key} className={cn("space-y-3 px-4 py-3.5 text-[13px]", row.dim && "opacity-60")}>
            <PersonCell row={row} size={28} />
            {row.owner ? (
              OWNER_CELL
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  {AREA_LIST.map((area) => (
                    <div key={area.key} className="min-w-0 space-y-1">
                      <span className="block text-[12px] text-[var(--i-muted)]">{area.label}</span>
                      <AccessCell row={row} area={area} onHint={setHint} />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <AdminSwitch row={row} onHint={setHint} />
                    <span className="text-[12.5px] text-[var(--i-ink-2)]">Admin</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PresetMenu row={row} />
                  {row.actions}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left text-[13px]" aria-label={label}>
          <thead>
            <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)] [&>th]:whitespace-nowrap [&>th]:px-2 [&>th]:py-2.5 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
              <th scope="col">Person</th>
              {AREA_LIST.map((area) => (
                <th key={area.key} scope="col">
                  {area.label}
                </th>
              ))}
              <th scope="col">Admin</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-[var(--i-line)] last:[&>tr]:border-0 [&>tr>td]:px-2 [&>tr>td]:py-2.5 first:[&>tr>td]:pl-5 last:[&>tr>td]:pr-5">
            {rows.map((row) => (
              <tr key={row.key} className={cn("align-middle", row.dim && "opacity-60")}>
                <td className="min-w-[12rem] max-w-[16rem]">
                  <PersonCell row={row} size={24} />
                </td>
                {row.owner ? (
                  <td colSpan={AREA_LIST.length + 2}>{OWNER_CELL}</td>
                ) : (
                  <>
                    {AREA_LIST.map((area) => (
                      <td key={area.key}>
                        <AccessCell row={row} area={area} onHint={setHint} />
                      </td>
                    ))}
                    <td>
                      <AdminSwitch row={row} onHint={setHint} />
                    </td>
                    <td>
                      <span className="flex items-center justify-end gap-1.5">
                        <PresetMenu row={row} />
                        {row.actions}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="min-h-[2.75rem] border-t border-[var(--i-line)] px-5 py-3 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
        {hint ?? "Point at or tab to a cell to see what that level lets them do."}
      </p>
    </>
  );
}

/** Every level of every area in one place, plus Admin and what's outside the grid. */
function Legend() {
  return (
    <Card>
      <CardTitle>What each level means</CardTitle>
      <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {AREA_LIST.map((area) => (
          <div key={area.key}>
            <h3 className="text-[13px] font-medium">{area.label}</h3>
            <dl className="mt-1.5 space-y-2">
              <div>
                <dt className="text-[12.5px] text-[var(--i-ink-2)]">{NONE}</dt>
                <dd className="text-[12.5px] leading-relaxed text-[var(--i-muted)]">They don&apos;t see this area.</dd>
              </div>
              {area.levels.map((info) => (
                <div key={info.level}>
                  <dt className="text-[12.5px] text-[var(--i-ink-2)]">{info.label}</dt>
                  <dd className="text-[12.5px] leading-relaxed text-[var(--i-muted)]">{info.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-[var(--i-line)] px-5 py-3 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
        <p>
          <strong className="font-medium text-[var(--i-ink-2)]">Admin</strong>: {ROLE_INFO.admin.description} With Admin
          on, every area is at its top level (in Team tasks, admins see and give tasks to everyone but the founders and other
          admins; the founder's associate sees everyone). Any admin can change the other cells; only the founders
          switch Admin on or off.
        </p>
        <p>
          <strong className="font-medium text-[var(--i-ink-2)]">Money</strong> (payroll, expense claims and payments)
          isn&apos;t in the grid: it stays with Arindam and Amitesh.
        </p>
        <p>
          <strong className="font-medium text-[var(--i-ink-2)]">The team list</strong> (My day: hours, leave, expenses
          and payslips) isn&apos;t in the grid either: being on it is set on{" "}
          <Link href="/internal/people?tab=directory" className="text-[var(--i-ink-2)] underline underline-offset-2">
            People
          </Link>
          , and it lets someone in without any area here.
        </p>
        <p>
          People outside @studio1hq.com can only ever have Blog: Own work.
        </p>
      </div>
    </Card>
  );
}

/** The cells for someone being added, laid out like a card. */
function InviteGrid({
  grid,
  admin,
  canAdmin,
  onChange,
}: {
  grid: AccessGrid;
  admin: boolean;
  canAdmin: boolean;
  onChange: (grid: AccessGrid, admin: boolean) => void;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const row: AccessRow = {
    key: "invite",
    email: "@studio1hq.com",
    name: "",
    sub: "",
    grid,
    admin,
    adminLock: canAdmin ? null : `Only ${FOUNDERS} can make someone an admin.`,
    onChange,
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
        {AREA_LIST.map((area) => (
          <div key={area.key} className="min-w-0 space-y-1">
            <span className="block text-[12px] text-[var(--i-muted)]">{area.label}</span>
            <AccessCell row={row} area={area} onHint={setHint} />
          </div>
        ))}
        <div className="flex h-7 items-center gap-2">
          <AdminSwitch row={row} onHint={setHint} />
          <span className="text-[12.5px] text-[var(--i-ink-2)]">Admin</span>
        </div>
        <div className="flex h-7 items-center">
          <PresetMenu row={row} />
        </div>
      </div>
      <p className="text-[12.5px] leading-relaxed text-[var(--i-muted)]">{hint ?? " "}</p>
    </div>
  );
}

/**
 * The team list, for admins, as one access grid. Every admin gives and takes
 * away access (approving included). Owners (`canManage`) also invite,
 * decline, turn access off and on, and decide who's an admin. The server
 * actions check all of this again, so disabling the controls is only for
 * clarity.
 */
export function TeamView({ members, me, canManage }: { members: Member[]; me: string; canManage: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Record<string, { grid: AccessGrid; admin: boolean }>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState<{ grid: AccessGrid; admin: boolean }>({
    grid: { ...EMPTY_GRID, blog: "own" },
    admin: false,
  });

  const actor = { owner: canManage };

  const run = (email: string, status: "active" | "disabled", roles: RoleKey[], done: string) => {
    setBusy(email);
    startTransition(async () => {
      const result = await updateMember(email, status, roles);
      setBusy(null);
      if (result.ok) toast("success", done);
      else toast("error", result.message);
    });
  };

  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setBusy("invite");
    startTransition(async () => {
      const roles: RoleKey[] = isStaffEmail(email)
        ? rolesFromGrid(inviteAccess.grid, inviteAccess.admin)
        : ["blog_writer"];
      const result = await invite(email, roles);
      setBusy(null);
      if (result.ok) {
        toast("success", result.message ?? `Invited ${email}`);
        setInviteEmail("");
      } else {
        toast("error", result.message);
      }
    });
  };

  const pending = members.filter((member) => member.status === "pending");
  const others = members.filter((member) => member.status !== "pending");
  const inviteIsStaff = isStaffEmail(inviteEmail.trim());

  const pendingRows: AccessRow[] = pending.map((member) => {
    const access = chosen[member.email] ?? { grid: EMPTY_GRID, admin: false };
    const roles = rolesFromGrid(access.grid, access.admin);
    const busyHere = busy === member.email;
    return {
      key: member.email,
      email: member.email,
      name: member.name || member.email,
      sub: (
        <span title={formatDate(member.requested_at)}>
          {member.name ? `${member.email} · ` : ""}Asked {relativeDate(member.requested_at)}
        </span>
      ),
      grid: access.grid,
      admin: access.admin,
      busy: busyHere,
      adminLock: roleChangeProblem(actor, member, { status: "active", roles: ["admin"] }),
      onChange: (grid, admin) => setChosen((current) => ({ ...current, [member.email]: { grid, admin } })),
      actions: (
        <>
          <button
            type="button"
            disabled={busyHere || roles.length === 0}
            title={roles.length === 0 ? "Pick at least one area first." : undefined}
            onClick={() => run(member.email, "active", roles, `Approved ${member.email}: ${rolesLabel(roles)}`)}
            className={buttonClass("accent", "sm")}
          >
            Approve
          </button>
          {canManage ? (
            <button
              type="button"
              disabled={busyHere}
              onClick={() => run(member.email, "disabled", [], `Declined ${member.email}`)}
              className={buttonClass("ghost", "sm")}
            >
              Decline
            </button>
          ) : null}
        </>
      ),
    };
  });

  const ownerRows: AccessRow[] = OWNERS.map((email) => ({
    key: email,
    email,
    name: <span className="capitalize">{nameOf(email)}</span>,
    sub: email,
    grid: EMPTY_GRID,
    admin: true,
    owner: true,
  }));

  const teamRows: AccessRow[] = others.map((member) => {
    const off = member.status === "disabled";
    const self = member.email === me;
    const outside = !isStaffEmail(member.email);
    const busyHere = busy === member.email;
    const lock = self
      ? "That's you: someone else changes your access."
      : off && canManage
        ? "Access is off. Turn it on to change it."
        : roleChangeProblem(actor, member, { status: "active", roles: [] });
    return {
      key: member.email,
      email: member.email,
      name: (
        <>
          <span className={cn(!member.name && "capitalize")}>{nameOf(member.email, member.name)}</span>
          {outside ? (
            <span className="ml-2 rounded-full border border-[var(--i-line)] px-1.5 py-px text-[11px] font-normal normal-case text-[var(--i-muted)]">
              Outside writer
            </span>
          ) : null}
        </>
      ),
      sub: [
        member.email,
        member.invited_by ? `invited by ${member.invited_by.split("@")[0]}` : "",
        member.last_seen_at ? `last seen ${relativeDate(member.last_seen_at)}` : "",
        off ? "access off" : "",
        outside ? "Blog: own work only" : "",
      ]
        .filter(Boolean)
        .join(" · "),
      grid: gridFromRoles(member.roles),
      admin: member.roles.includes("admin"),
      lock,
      adminLock: roleChangeProblem(actor, member, { status: "active", roles: ["admin"] }),
      busy: busyHere,
      dim: off,
      onChange: (grid, admin) => {
        const roles = rolesFromGrid(grid, admin);
        if (roles.length === 0) {
          toast("error", "Keep at least one area, or turn their access off.");
          return;
        }
        run(member.email, "active", roles, `${member.email} now has ${rolesLabel(roles)}`);
      },
      actions: canManage ? (
        <button
          type="button"
          disabled={busyHere || self}
          onClick={() =>
            run(
              member.email,
              off ? "active" : "disabled",
              member.roles,
              off ? `Turned on ${member.email}` : `Turned off ${member.email}`,
            )
          }
          className={buttonClass(off ? "secondary" : "danger", "sm")}
        >
          {off ? "Turn on" : "Turn off"}
        </button>
      ) : null,
    };
  });

  return (
    <div className="space-y-5">
      {canManage ? (
        <Card>
          <CardTitle>Add someone</CardTitle>
          <form onSubmit={submitInvite} className="space-y-3 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@studio1hq.com or a writer's own email"
                className={cn(inputClass("sm"), "w-auto min-w-[min(260px,100%)] flex-1")}
              />
              <button type="submit" disabled={busy === "invite"} className={buttonClass("accent")}>
                <UserPlus size={15} /> Add
              </button>
            </div>
            <p className="text-[12.5px] text-[var(--i-muted)]">
              They can sign in straight away with the access you pick, and get an email saying so. Employee IDs,
              attendance and payslips are on{" "}
              <Link href="/internal/people?tab=directory" className="text-[var(--i-ink-2)] underline underline-offset-2">
                People
              </Link>
              .
            </p>
            {inviteEmail.includes("@") && !inviteIsStaff ? (
              <p className="text-[12.5px] text-[var(--i-muted)]">
                Someone outside Studio1 can only have{" "}
                <strong className="font-medium text-[var(--i-ink-2)]">Blog: Own work</strong>: they write their own
                posts and ask for a review, and see nothing else.
              </p>
            ) : (
              <InviteGrid
                grid={inviteAccess.grid}
                admin={inviteAccess.admin}
                canAdmin={canManage}
                onChange={(grid, admin) => setInviteAccess({ grid, admin })}
              />
            )}
          </form>
        </Card>
      ) : (
        <Notice tone="info">
          You can approve people and change what they can open here. Inviting people, turning access off, the Admin
          switch and other admins&apos; access stay with Arindam and Amitesh.
        </Notice>
      )}

      <Card>
        <CardTitle>
          Waiting for approval{" "}
          {pending.length ? (
            <span className="ml-1 rounded-full bg-[var(--i-accent-soft)] px-1.5 text-[11.5px] tabular-nums text-[var(--i-accent-text)]">
              {pending.length}
            </span>
          ) : null}
        </CardTitle>
        {pending.length === 0 ? (
          <EmptyState icon={<Crown size={20} />} title="No requests">
            Teammates appear here after they sign in with their @studio1hq.com address. They get no access until you
            approve them with at least one area.
          </EmptyState>
        ) : (
          <AccessTable rows={pendingRows} label="People waiting for approval" />
        )}
      </Card>

      <Card>
        <CardTitle>Who can open what</CardTitle>
        <AccessTable rows={[...ownerRows, ...teamRows]} label="Team access" />
        <p className="border-t border-[var(--i-line)] px-5 py-3 text-[12.5px] text-[var(--i-muted)]">
          Money (payroll and payments) isn&apos;t in this grid: it stays with the founders.
        </p>
      </Card>

      <Legend />
    </div>
  );
}

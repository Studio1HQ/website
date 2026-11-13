"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Crown, UserPlus } from "@phosphor-icons/react";
import { invite, updateMember } from "@/app/internal/(dashboard)/team/actions";
import type { Member } from "@/lib/internal/members";
import {
  OWNERS,
  OUTSIDE_ROLES,
  ROLE_INFO,
  ROLE_KEYS,
  isStaffEmail,
  rolesLabel,
  type RoleKey,
} from "@/lib/internal/roles";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import {
  Avatar,
  Card,
  CardTitle,
  EmptyState,
  Notice,
  buttonClass,
  formatDate,
  inputClass,
  relativeDate,
} from "@/components/internal/ui";

function nameOf(email: string) {
  return email.split("@")[0].replace(/[._+-]+/g, " ");
}

/** Role checkboxes. Outside addresses only ever see Blog writer. */
function RolePicker({
  email,
  value,
  onChange,
  disabled,
}: {
  email: string;
  value: RoleKey[];
  onChange: (roles: RoleKey[]) => void;
  disabled?: boolean;
}) {
  const options = isStaffEmail(email) || !email.includes("@") ? ROLE_KEYS : OUTSIDE_ROLES;
  const admin = value.includes("admin");
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Roles for ${email || "the invite"}`}>
      {options.map((key) => {
        const on = value.includes(key);
        // Admin covers everything, so the other boxes show as included.
        const implied = admin && key !== "admin";
        return (
          <label
            key={key}
            title={ROLE_INFO[key].description}
            className={cn(
              "inline-flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] transition-colors",
              on || implied
                ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)] text-[var(--i-accent-text)]"
                : "border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink-2)] hover:bg-[var(--i-hover)]",
              (disabled || implied) && "cursor-default opacity-70",
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={on || implied}
              disabled={disabled || implied}
              onChange={() => onChange(on ? value.filter((role) => role !== key) : [...value, key])}
            />
            {ROLE_INFO[key].label}
          </label>
        );
      })}
    </div>
  );
}

/**
 * The team list. Only owners (`canManage`) approve, invite, change roles or
 * turn access off; other admins see it read-only. The server actions check
 * this again, so hiding the controls is only for clarity.
 */
export function TeamView({ members, me, canManage }: { members: Member[]; me: string; canManage: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Record<string, RoleKey[]>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState<RoleKey[]>(["blog_writer"]);

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
      const result = await invite(email, isStaffEmail(email) ? inviteRoles : ["blog_writer"]);
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

  return (
    <div className="space-y-5">
      {canManage ? (
      <Card>
        <CardTitle>Invite someone</CardTitle>
        <form onSubmit={submitInvite} className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="name@studio1hq.com or a writer's own email"
              className={cn(inputClass("sm"), "w-auto min-w-[260px] flex-1")}
            />
            <button type="submit" disabled={busy === "invite"} className={buttonClass("accent")}>
              <UserPlus size={15} /> Invite
            </button>
          </div>
          {inviteEmail.includes("@") && !inviteIsStaff ? (
            <p className="text-[12.5px] text-[var(--i-muted)]">
              Someone outside Studio1 can only be a <strong className="font-medium text-[var(--i-ink-2)]">Blog writer</strong>: they
              write their own posts and ask for a review, and see nothing else.
            </p>
          ) : (
            <RolePicker email={inviteEmail.trim() || "@studio1hq.com"} value={inviteRoles} onChange={setInviteRoles} />
          )}
        </form>
      </Card>
      ) : (
        <Notice tone="info">
          Only Arindam and Amitesh can approve people, invite them, change roles or turn access off. You can see the
          team here.
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
            Teammates appear here after they sign in with their @studio1hq.com address.
          </EmptyState>
        ) : (
          <ul>
            {pending.map((member) => {
              const roles = chosen[member.email] ?? [];
              return (
                <li
                  key={member.email}
                  className="flex flex-wrap items-center gap-3 border-b border-[var(--i-line)] px-5 py-3.5 last:border-b-0"
                >
                  <Avatar name={nameOf(member.email)} email={member.email} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{member.email}</p>
                    <p className="text-[12px] text-[var(--i-muted)]" title={formatDate(member.requested_at)}>
                      Asked {relativeDate(member.requested_at)}
                    </p>
                  </div>
                  {canManage ? (
                    <>
                      <RolePicker
                        email={member.email}
                        value={roles}
                        onChange={(next) => setChosen((current) => ({ ...current, [member.email]: next }))}
                      />
                      <button
                        type="button"
                        disabled={busy === member.email || roles.length === 0}
                        onClick={() => run(member.email, "active", roles, `Approved ${member.email} as ${rolesLabel(roles)}`)}
                        className={buttonClass("accent")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy === member.email}
                        onClick={() => run(member.email, "disabled", [], `Declined ${member.email}`)}
                        className={buttonClass("ghost")}
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <span className="text-[12.5px] text-[var(--i-muted)]">Waiting for Arindam or Amitesh</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Team</CardTitle>
        <ul>
          {OWNERS.map((email) => (
            <li key={email} className="flex items-center gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
              <Avatar name={nameOf(email)} email={email} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium capitalize">{nameOf(email)}</p>
                <p className="truncate text-[12px] text-[var(--i-muted)]">{email}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--i-accent-soft)] px-2 py-0.5 text-[12px] font-medium text-[var(--i-accent-text)]">
                <Crown size={12} weight="fill" /> Owner · Admin
              </span>
            </li>
          ))}
          {others.map((member) => {
            const off = member.status === "disabled";
            const self = member.email === me;
            const outside = !isStaffEmail(member.email);
            return (
              <li
                key={member.email}
                className={cn(
                  "flex flex-wrap items-center gap-3 border-b border-[var(--i-line)] px-5 py-3.5 last:border-b-0",
                  off && "opacity-60",
                )}
              >
                <Avatar name={nameOf(member.email)} email={member.email} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium capitalize">
                    {nameOf(member.email)}
                    {outside ? (
                      <span className="ml-2 rounded-full border border-[var(--i-line)] px-1.5 py-px text-[11px] font-normal normal-case text-[var(--i-muted)]">
                        Outside writer
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[12px] text-[var(--i-muted)]">
                    {member.email}
                    {member.invited_by ? ` · invited by ${member.invited_by.split("@")[0]}` : ""}
                    {member.last_seen_at ? ` · last seen ${relativeDate(member.last_seen_at)}` : ""}
                    {off ? " · access off" : ""}
                  </p>
                </div>
                <RolePicker
                  email={member.email}
                  value={member.roles}
                  disabled={!canManage || busy === member.email || self || off}
                  onChange={(roles) =>
                    roles.length
                      ? run(member.email, "active", roles, `${member.email} is now ${rolesLabel(roles)}`)
                      : toast("error", "Keep at least one role, or turn their access off.")
                  }
                />
                {canManage ? (
                  <button
                    type="button"
                    disabled={busy === member.email || self}
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
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle>What each role can do</CardTitle>
        <dl className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_KEYS.map((role) => (
            <div key={role}>
              <dt className="text-[13px] font-medium">
                {ROLE_INFO[role].label}{" "}
                <span className="text-[11.5px] font-normal text-[var(--i-faint)]">{ROLE_INFO[role].area}</span>
              </dt>
              <dd className="mt-1 text-[12.5px] leading-relaxed text-[var(--i-muted)]">{ROLE_INFO[role].description}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-[var(--i-line)] px-5 py-3 text-[12.5px] text-[var(--i-muted)]">
          One person can have several roles, like Hiring reviewer and Blog writer. Admin includes everything.
        </p>
      </Card>
    </div>
  );
}

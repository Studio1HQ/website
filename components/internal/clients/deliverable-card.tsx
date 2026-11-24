"use client";

import { useState } from "react";
import Link from "next/link";
import { Prohibit } from "@/components/internal/icons";
import {
  canChangeDeliverable,
  daysStuck,
  type ClientsAccess,
} from "@/lib/internal/clients/rules";
import {
  DELIVERABLE_KINDS,
  clientPath,
  labelOf,
  plural,
  todayKey,
  type Deliverable,
  type ScopeLine,
  type StatusEvent,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { ExternalLink } from "@/components/internal/ui";
import { DueDate } from "@/components/internal/community/ui";
import { BlockDialog } from "@/components/internal/clients/block-dialog";
import { DeliverableDialog } from "@/components/internal/clients/deliverable-dialog";
import { MoveStatusMenu } from "@/components/internal/clients/move-status-menu";
import {
  DeliverableFlags,
  OwnerName,
  SizeTag,
} from "@/components/internal/clients/ui";

/**
 * A deliverable as a board card and as a table row, both built from the
 * same pieces: the status menu, the flags (blocked, waiting on client,
 * late), owner, size, due date, and the edit and block dialogs. Data comes
 * in through props; the viewer decides what can be changed.
 */

export type DeliverableViewProps = {
  deliverable: Deliverable;
  /** Who's looking: their email and client-work access. */
  viewer: { email: string; clients: ClientsAccess };
  /** Context shown on the card/row: the client and engagement. */
  clientName?: string;
  /** Links the client name to its workspace. */
  clientSlug?: string;
  engagementName?: string;
  /** The engagement's type is "internal" (may skip Client review). */
  internal?: boolean;
  /** For the edit dialog's pickers. */
  owners?: readonly string[];
  names?: Readonly<Record<string, string>>;
  scopeLines?: readonly Pick<ScopeLine, "id" | "kind" | "label">[];
  /** Status events, for "no change for N days". */
  events?: readonly Pick<StatusEvent, "deliverable_id" | "at">[];
  today?: string;
};

function Context({
  clientName,
  clientSlug,
  engagementName,
}: Pick<DeliverableViewProps, "clientName" | "clientSlug" | "engagementName">) {
  if (!clientName && !engagementName) return null;
  return (
    <span className="block truncate text-[12px] text-[var(--i-muted)]">
      {clientName ? (
        clientSlug ? (
          <Link
            href={clientPath(clientSlug)}
            className="hover:text-[var(--i-ink)]"
            onClick={(event) => event.stopPropagation()}
          >
            {clientName}
          </Link>
        ) : (
          clientName
        )
      ) : null}
      {clientName && engagementName ? " · " : null}
      {engagementName}
    </span>
  );
}

function Stuck({
  deliverable,
  events,
  today,
}: Pick<DeliverableViewProps, "deliverable" | "events" | "today">) {
  if (!events || deliverable.status === "published") return null;
  const days = daysStuck(deliverable, events, today);
  if (days < 5) return null;
  return (
    <span className="text-[11.5px] text-[var(--i-faint)]">
      No change for {plural(days, "day")}
    </span>
  );
}

/** A board card. Click it to open the deliverable. */
export function DeliverableCard(props: DeliverableViewProps) {
  const {
    deliverable,
    viewer,
    internal,
    owners,
    names,
    scopeLines,
    today = todayKey(),
  } = props;
  const [editing, setEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const canChange = canChangeDeliverable(viewer, deliverable);
  return (
    <article
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)] transition-colors hover:border-[var(--i-line-strong)]",
        deliverable.blocked
          ? "border-rose-200 dark:border-rose-500/30"
          : "border-[var(--i-line)]",
      )}
    >
      <div className="min-w-0">
        <Context
          clientName={props.clientName}
          clientSlug={props.clientSlug}
          engagementName={props.engagementName}
        />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-0.5 block w-full text-left text-[13.5px] font-medium leading-snug text-[var(--i-ink)] hover:text-[var(--i-accent-text)]"
        >
          {deliverable.title}
        </button>
        <span className="mt-0.5 block text-[12px] text-[var(--i-muted)]">
          {labelOf(DELIVERABLE_KINDS, deliverable.kind)}
        </span>
      </div>
      <DeliverableFlags deliverable={deliverable} today={today} />
      <div className="flex flex-wrap items-center gap-2">
        <MoveStatusMenu
          deliverable={deliverable}
          internal={internal}
          canChange={canChange}
        />
        {deliverable.due_on ? (
          <span className="text-[12px]">
            <DueDate
              day={deliverable.due_on}
              done={deliverable.status === "published"}
              today={today}
            />
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-[12.5px]">
        <OwnerName email={deliverable.owner} names={names} />
        <span className="flex shrink-0 items-center gap-1">
          {deliverable.status === "published" && deliverable.published_url ? (
            <ExternalLink
              href={deliverable.published_url}
              className="text-[12px]"
            >
              Live
            </ExternalLink>
          ) : null}
          {canChange && deliverable.status !== "published" ? (
            <button
              type="button"
              onClick={() => setBlocking(true)}
              aria-label={
                deliverable.blocked
                  ? "Blocked: change or unblock"
                  : "Mark as blocked"
              }
              title={
                deliverable.blocked
                  ? "Blocked: change or unblock"
                  : "Mark as blocked"
              }
              className={cn(
                "flex size-7 items-center justify-center rounded-md hover:bg-[var(--i-hover)]",
                deliverable.blocked
                  ? "text-rose-600 dark:text-rose-300"
                  : "text-[var(--i-faint)]",
              )}
            >
              <Prohibit size={14} />
            </button>
          ) : null}
          <SizeTag size={deliverable.size} />
        </span>
      </div>
      <Stuck deliverable={deliverable} events={props.events} today={today} />
      <DeliverableDialog
        deliverable={deliverable}
        access={viewer.clients}
        canChange={canChange}
        owners={owners}
        names={names}
        scopeLines={scopeLines}
        open={editing}
        onOpenChange={setEditing}
      />
      {canChange ? (
        <BlockDialog
          deliverable={deliverable}
          open={blocking}
          onOpenChange={setBlocking}
        />
      ) : null}
    </article>
  );
}

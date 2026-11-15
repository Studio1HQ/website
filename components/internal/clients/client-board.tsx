"use client";

import {
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import Link from "next/link";
import { Prohibit } from "@phosphor-icons/react";
import { saveClient } from "@/app/internal/(dashboard)/clients/actions";
import { cn } from "@/lib/utils";
import {
  CLIENTS_VIEW_COOKIE,
  type ClientsView,
} from "@/lib/internal/clients/overview-view";
import {
  CLIENT_STATUSES,
  labelOf,
  toneOf,
  type ClientStatus,
  type HealthLevel,
} from "@/lib/internal/clients/schema";
import { Pill, TONES } from "@/components/internal/community/ui";
import { Select } from "@/components/internal/select";
import { useToast } from "@/components/internal/toast";
import { ClientLogo } from "@/components/internal/clients/client-logo";
import { HealthBadge, ProgressMeter } from "@/components/internal/clients/ui";

/* The overview as a board: every client in a column by status. */

export type BoardEngagement = {
  id: string;
  name: string;
  href: string;
  health: { level: HealthLevel; reason: string };
  /** This month's deliverables; null when the month hasn't started. */
  progress: { done: number; planned: number } | null;
  /** The month's state when it isn't Active ("Planning"…). */
  stage: string | null;
  blocked: number;
  waiting: number;
};

export type BoardClient = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  status: ClientStatus;
  archived: boolean;
  contact: string;
  href: string;
  /** Its active engagements this month, with health. */
  engagements: BoardEngagement[];
  /** Its other engagements in a line, when there's no active one. */
  summary: string;
};

const CLIENT_DRAG = "application/x-studio1-client";

/** Keeps the view just picked (Table or Board) for this person's next visit. */
export function RememberClientsView({ view }: { view: ClientsView }) {
  useEffect(() => {
    document.cookie = `${CLIENTS_VIEW_COOKIE}=${view}; path=/internal/clients; max-age=31536000; samesite=lax${
      location.protocol === "https:" ? "; secure" : ""
    }`;
  }, [view]);
  return null;
}
const SEVERITY: Record<HealthLevel, number> = { red: 0, amber: 1, green: 2 };

function worst(client: BoardClient) {
  return Math.min(
    3,
    ...client.engagements.map((item) => SEVERITY[item.health.level]),
  );
}

export function ClientBoard({
  clients,
  canMove,
}: {
  clients: BoardClient[];
  /** Client managers: drag a card, or pick a status, to move it. */
  canMove: boolean;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [over, setOver] = useState<ClientStatus | null>(null);
  const [shown, place] = useOptimistic(
    clients,
    (state, moved: { id: string; status: ClientStatus }) =>
      state.map((client) =>
        client.id === moved.id ? { ...client, status: moved.status } : client,
      ),
  );

  const move = (client: BoardClient, status: ClientStatus) => {
    if (client.status === status) return;
    start(async () => {
      place({ id: client.id, status });
      try {
        const result = await saveClient(client.id, { status });
        if (result.ok)
          toast(
            "success",
            `${client.name} moved to ${labelOf(CLIENT_STATUSES, status)}`,
          );
        else toast("error", result.message);
      } catch {
        toast("error", "Something went wrong. Try again in a minute.");
      }
    });
  };

  const drop = (status: ClientStatus) => (event: DragEvent) => {
    event.preventDefault();
    setOver(null);
    const id = event.dataTransfer.getData(CLIENT_DRAG);
    const client = shown.find((item) => item.id === id);
    if (client) move(client, status);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CLIENT_STATUSES.map((column) => {
        const list = shown
          .filter((client) => client.status === column.value)
          .sort((a, b) => worst(a) - worst(b) || a.name.localeCompare(b.name));
        return (
          <section
            key={column.value}
            aria-label={`${column.label}: ${list.length}`}
            onDragOver={(event) => {
              if (!canMove || !event.dataTransfer.types.includes(CLIENT_DRAG))
                return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setOver(column.value);
            }}
            onDragLeave={(event) => {
              if (
                event.currentTarget.contains(event.relatedTarget as Node | null)
              )
                return;
              setOver((current) => (current === column.value ? null : current));
            }}
            onDrop={drop(column.value)}
            className={cn(
              "min-w-0 rounded-xl bg-[var(--i-sunken)] p-2 ring-1 ring-[var(--i-line)] transition-shadow",
              over === column.value && "ring-2 ring-[var(--i-accent)]",
            )}
          >
            <h2 className="flex items-center gap-2 px-2 pb-2 pt-1 text-[12.5px] font-medium text-[var(--i-ink-2)]">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  TONES[toneOf(CLIENT_STATUSES, column.value)].dot,
                )}
              />
              {column.label}
              <span className="ml-auto font-normal tabular-nums text-[var(--i-faint)]">
                {list.length}
              </span>
            </h2>
            {list.length ? (
              <ul className="space-y-2">
                {list.map((client) => (
                  <li key={client.id}>
                    <ClientCard
                      client={client}
                      canMove={canMove}
                      pending={pending}
                      onMove={move}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--i-line)] px-3 py-5 text-center text-[12px] text-[var(--i-faint)]">
                {canMove ? (
                  <>
                    <span className="max-md:hidden">Drop a client here</span>
                    <span className="md:hidden">No clients</span>
                  </>
                ) : (
                  "No clients"
                )}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ClientCard({
  client,
  canMove,
  pending,
  onMove,
}: {
  client: BoardClient;
  canMove: boolean;
  pending: boolean;
  onMove: (client: BoardClient, status: ClientStatus) => void;
}) {
  const risky = client.engagements.some((item) => item.health.level === "red");
  return (
    <article
      draggable={canMove}
      onDragStart={(event) => {
        event.dataTransfer.setData(CLIENT_DRAG, client.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)] transition-colors hover:border-[var(--i-line-strong)]",
        canMove && "md:cursor-grab md:active:cursor-grabbing",
        risky
          ? "border-rose-200 dark:border-rose-500/30"
          : "border-[var(--i-line)]",
        client.archived && "opacity-70",
      )}
    >
      <div className="flex items-center gap-2.5">
        <ClientLogo
          slug={client.slug}
          name={client.name}
          website={client.website}
          size={28}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={client.href}
            draggable={false}
            className="block truncate text-[13.5px] font-medium leading-snug hover:text-[var(--i-accent-text)]"
          >
            {client.name}
          </Link>
          {client.contact ? (
            <p className="truncate text-[12px] text-[var(--i-muted)]">
              {client.contact}
            </p>
          ) : null}
        </div>
        {client.archived ? <Pill>Archived</Pill> : null}
      </div>

      {client.engagements.length ? (
        <ul className="space-y-2.5">
          {client.engagements.map((engagement) => (
            <li
              key={engagement.id}
              className="space-y-1.5 rounded-lg bg-[var(--i-sunken)] px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <Link
                  href={engagement.href}
                  draggable={false}
                  className="min-w-0 max-w-full truncate text-[12.5px] text-[var(--i-ink-2)] hover:text-[var(--i-accent-text)]"
                >
                  {engagement.name}
                </Link>
                <HealthBadge
                  level={engagement.health.level}
                  reason={engagement.health.reason}
                />
              </div>
              {engagement.progress ? (
                <ProgressMeter
                  done={engagement.progress.done}
                  planned={engagement.progress.planned}
                  compact
                />
              ) : (
                <p className="text-[12px] text-[var(--i-faint)]">
                  Month not started
                </p>
              )}
              {engagement.stage || engagement.blocked || engagement.waiting ? (
                <p className="flex flex-wrap gap-x-2 text-[11.5px] text-[var(--i-muted)]">
                  {engagement.stage ? <span>{engagement.stage}</span> : null}
                  {engagement.blocked ? (
                    <span className="text-rose-700 dark:text-rose-300">
                      <Prohibit size={11} className="mr-0.5 inline" />
                      {engagement.blocked} blocked
                    </span>
                  ) : null}
                  {engagement.waiting ? (
                    <span className="text-sky-800 dark:text-sky-200">
                      {engagement.waiting} waiting on client
                    </span>
                  ) : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="line-clamp-2 text-[12px] text-[var(--i-muted)]">
          {client.summary}
        </p>
      )}

      {canMove ? (
        <Select
          aria-label={`Move ${client.name}`}
          size="xs"
          value={client.status}
          disabled={pending}
          options={CLIENT_STATUSES}
          onChange={(status) => onMove(client, status)}
          className="w-fit"
        />
      ) : null}
    </article>
  );
}

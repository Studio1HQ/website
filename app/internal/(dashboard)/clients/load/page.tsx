import type { Metadata } from "next";
import { requireClients } from "@/lib/internal/session";
import {
  incomplete,
  loadClients,
  loadDeliverables,
  loadEngagements,
  loadPeople,
  loadScopeLines,
  ownerChoices,
} from "@/lib/internal/clients/data";
import {
  isDueInWeek,
  isInternal,
  isLate,
  ownerLoad,
  sizePoints,
} from "@/lib/internal/clients/rules";
import {
  isOwnedBy,
  namesFrom,
  pointsLabel,
  shiftWeek,
  todayKey,
  weekStart,
  type ClientAccount,
  type Deliverable,
  type Engagement,
  type ScopeLine,
} from "@/lib/internal/clients/schema";
import { Notice, PageHeader } from "@/components/internal/ui";
import {
  ClientsLoadNotice,
  ClientsMigrationNotice,
} from "@/components/internal/clients/ui";
import { DeliverableCard } from "@/components/internal/clients/deliverable-card";
import {
  WeekSwitcher,
  weekFromParam,
  weekPhrase,
} from "@/components/internal/clients/week-switcher";
import {
  LoadPerson,
  type LoadItem,
} from "@/components/internal/clients/load-person";

export const metadata: Metadata = { title: "Owner load" };

function loadHref(week: string) {
  return `/internal/clients/load?week=${week}`;
}

/** Due date first (no date last), then title. */
function byDue(a: LoadItem, b: LoadItem) {
  return (
    (a.deliverable.due_on ?? "9999").localeCompare(
      b.deliverable.due_on ?? "9999",
    ) || a.deliverable.title.localeCompare(b.deliverable.title)
  );
}

/**
 * Capacity and owner load for a week: per person, the points of open work
 * due against their weekly capacity, plus what's in review, waiting for
 * their review, blocked and late. The plan's rule: flag anyone over capacity
 * before the Monday plan goes to a client. Unassigned work sits at the end
 * so it gets an owner.
 */
export default async function ClientsLoadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireClients();
  const manager = staff.clients === "manager";
  const query = await searchParams;
  const today = todayKey();
  const current = weekStart(today);
  const week = weekFromParam(query.week, today);
  const words = weekPhrase(week, current);

  const [open, engagements, clients, people, owners] = await Promise.all([
    // Every open item: the week's points, plus review, blocked and late counts.
    loadDeliverables({ open: true }),
    loadEngagements(),
    loadClients({ archived: true }),
    loadPeople(),
    ownerChoices(),
  ]);

  const header = (
    <PageHeader
      eyebrow="Clients"
      title="Owner load"
      description="Points of open work due in the week against each person's weekly capacity (small 1, medium 2, large 3). Work that's live doesn't count."
      actions={
        <WeekSwitcher
          week={week}
          current={current}
          hrefFor={{
            previous: loadHref(shiftWeek(week, -1)),
            next: loadHref(shiftWeek(week, 1)),
            current: loadHref(current),
          }}
        />
      }
    />
  );

  const failed = [open, engagements, clients, people].find(
    (result) => !result.ok,
  );
  if (failed && !failed.ok) {
    return (
      <>
        {header}
        <ClientsMigrationNotice message={failed.message} />
      </>
    );
  }
  if (!open.ok || !engagements.ok || !clients.ok || !people.ok) return null;

  const names = namesFrom(people.rows);
  const engagementOf = new Map<string, Engagement>(
    engagements.rows.map((row) => [row.id, row]),
  );
  const clientOf = new Map<string, ClientAccount>(
    clients.rows.map((row) => [row.id, row]),
  );

  // Leftovers on ended engagements or archived clients don't count as load.
  const items: LoadItem[] = [];
  for (const deliverable of open.rows) {
    const engagement = engagementOf.get(deliverable.engagement_id);
    const client = engagement ? clientOf.get(engagement.client_id) : undefined;
    if (engagement?.status === "ended" || client?.archived_at) continue;
    items.push({
      deliverable,
      clientName: client?.name,
      clientSlug: client?.slug,
      engagementName: engagement?.name,
    });
  }
  items.sort(byDue);
  const deliverables: Deliverable[] = items.map((item) => item.deliverable);

  const loads = ownerLoad(people.rows, deliverables, week, today);
  const over = loads.filter((load) => load.over);
  const unset = loads.filter((load) => load.capacity === null && load.due > 0);
  const unassigned = items.filter(
    (item) =>
      !item.deliverable.owner?.includes("@") &&
      isDueInWeek(item.deliverable, week),
  );
  // The edit dialog's scope line picker, for the unassigned cards.
  const lines = await loadScopeLines([
    ...new Set(unassigned.map((item) => item.deliverable.cycle_id)),
  ]);
  const linesOf = new Map<string, Pick<ScopeLine, "id" | "kind" | "label">[]>();
  if (lines.ok)
    for (const line of lines.rows) {
      const list = linesOf.get(line.cycle_id) ?? [];
      list.push({ id: line.id, kind: line.kind, label: line.label });
      linesOf.set(line.cycle_id, list);
    }
  const unassignedPoints = unassigned.reduce(
    (sum, item) => sum + sizePoints(item.deliverable),
    0,
  );

  const past = week < current;
  const headcount = (count: number) =>
    `${count} ${count === 1 ? "person" : "people"}`;
  const verb = (count: number) =>
    past ? (count === 1 ? "was" : "were") : count === 1 ? "is" : "are";
  const headline = over.length
    ? `${headcount(over.length)} ${verb(over.length)} over capacity ${words}.`
    : `Nobody ${past ? "was" : "is"} over capacity ${words}.`;
  const advice = over.length
    ? past
      ? "Worth a look before planning the next one."
      : "Move work or share it out before the Monday plan goes to the client."
    : week >= current
      ? "Fine to send the Monday plan as it stands."
      : "";

  return (
    <>
      {header}
      <ClientsLoadNotice
        show={incomplete(open, engagements, clients, people, lines)}
      />

      <div className="mb-5">
        <Notice tone={over.length ? "warning" : "info"}>
          <span className="font-medium">{headline}</span>
          {advice ? ` ${advice}` : null}
          {over.length ? (
            <> ({over.map((load) => load.name).join(", ")})</>
          ) : null}
          {unset.length ? (
            <span className="mt-1 block">
              {headcount(unset.length)} {unset.length === 1 ? "has" : "have"}{" "}
              work due but no capacity set, so they can&apos;t be checked.
            </span>
          ) : null}
        </Notice>
      </div>

      {loads.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {loads.map((load) => {
            const mine = (item: LoadItem) =>
              isOwnedBy(item.deliverable.owner, load.email);
            const due = items.filter(
              (item) => mine(item) && isDueInWeek(item.deliverable, week),
            );
            const dueIds = new Set(due.map((item) => item.deliverable.id));
            return (
              <LoadPerson
                key={load.email}
                load={load}
                due={due}
                late={items.filter(
                  (item) =>
                    mine(item) &&
                    !dueIds.has(item.deliverable.id) &&
                    isLate(item.deliverable, today),
                )}
                toReview={items.filter(
                  (item) =>
                    isOwnedBy(item.deliverable.reviewer, load.email) &&
                    item.deliverable.status === "internal_review",
                )}
                manager={manager}
                today={today}
                weekWords={words}
              />
            );
          })}
        </div>
      ) : (
        <Notice>
          Nobody has open client work or a weekly capacity yet.
          {manager
            ? " Set people's capacity under Templates, and give deliverables an owner."
            : ""}
        </Notice>
      )}

      {unassigned.length ? (
        <section aria-label="No owner yet" className="mt-8">
          <h2 className="mb-1 text-[14px] font-medium">
            No owner yet
            <span className="ml-2 font-normal tabular-nums text-[var(--i-muted)]">
              {unassigned.length} · {pointsLabel(unassignedPoints)}
            </span>
          </h2>
          <p className="mb-3 text-[12.5px] text-[var(--i-muted)]">
            Due {words} with nobody on them.{" "}
            {manager
              ? "Open one to give it an owner."
              : "A manager can give these an owner."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {unassigned.map((item) => (
              <DeliverableCard
                key={item.deliverable.id}
                deliverable={item.deliverable}
                viewer={{ email: staff.email, clients: staff.clients }}
                clientName={item.clientName}
                clientSlug={item.clientSlug}
                engagementName={item.engagementName}
                internal={isInternal(
                  engagementOf.get(item.deliverable.engagement_id)?.type,
                )}
                owners={owners}
                names={names}
                scopeLines={linesOf.get(item.deliverable.cycle_id) ?? []}
                today={today}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

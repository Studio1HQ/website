import type { Metadata } from "next";
import Link from "next/link";
import { Buildings, Plus } from "@phosphor-icons/react/dist/ssr";
import { requireCommunity } from "@/lib/internal/session";
import {
  incomplete,
  loadEvents,
  loadPartners,
  ownerChoices,
  refOptions,
} from "@/lib/internal/community/data";
import {
  PARTNER_KINDS,
  PARTNER_STAGES,
  formatDay,
  labelOf,
  todayKey,
} from "@/lib/internal/community/schema";
import { matches, one, phaseOf } from "@/lib/internal/community/stats";
import {
  Card,
  EmptyState,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import { QuickSelect } from "@/components/internal/community/quick-select";
import {
  DueDate,
  LinkTabs,
  LoadNotice,
  MigrationNotice,
  Muted,
  Owner,
  RowLink,
  SearchBox,
  Table,
  rowClass,
} from "@/components/internal/community/ui";

export const metadata: Metadata = { title: "Campus partners" };

export default async function CampusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireCommunity(), searchParams]);
  const canEdit = staff.community === "manager";
  const [partners, events, refs, owners] = await Promise.all([
    loadPartners(),
    loadEvents(),
    canEdit ? refOptions(["partner"]) : Promise.resolve({}),
    canEdit ? ownerChoices() : Promise.resolve([]),
  ]);
  const today = todayKey();
  const kind =
    PARTNER_KINDS.find((item) => item.value === one(params.kind))?.value ??
    "all";
  const stage = PARTNER_STAGES.find(
    (item) => item.value === one(params.stage),
  )?.value;
  const query = one(params.q)?.slice(0, 100) ?? "";

  const header = (
    <PageHeader
      eyebrow="Community"
      title="Campus partners"
      description="Colleges, student clubs, venues and partner communities: who you work with, who to reach next, and what they've hosted."
      actions={
        canEdit ? (
          <RecordDialog
            entity="partner"
            refs={refs}
            owners={owners}
            defaults={{
              owner: staff.email,
              kind: kind === "all" ? "college" : kind,
            }}
            goTo="/internal/community/campus/"
            trigger={
              <button type="button" className={buttonClass("accent")}>
                <Plus size={14} /> New partner
              </button>
            }
          />
        ) : null
      }
    />
  );
  if (!partners.ok) {
    return (
      <>
        {header}
        <MigrationNotice message={partners.message} />
      </>
    );
  }

  const names = new Map(
    partners.rows.map((partner) => [partner.id, partner.name]),
  );
  const hosted = new Map<string, { total: number; upcoming: number }>();
  for (const event of events.ok ? events.rows : []) {
    if (!event.partner_id || event.status === "cancelled") continue;
    const current = hosted.get(event.partner_id) ?? { total: 0, upcoming: 0 };
    current.total++;
    if (phaseOf(event, today) === "upcoming") current.upcoming++;
    hosted.set(event.partner_id, current);
  }
  const clubs = new Map<string, number>();
  for (const partner of partners.rows) {
    if (partner.parent_id)
      clubs.set(partner.parent_id, (clubs.get(partner.parent_id) ?? 0) + 1);
  }

  const searched = partners.rows.filter((partner) =>
    matches(
      query,
      partner.name,
      partner.city,
      partner.country,
      partner.tags,
      partner.owner,
      names.get(partner.parent_id ?? ""),
    ),
  );
  const ofKind = searched.filter(
    (partner) => kind === "all" || partner.kind === kind,
  );
  const rows = ofKind
    .filter((partner) => !stage || partner.stage === stage)
    .sort(
      (a, b) =>
        (a.follow_up_on ?? "9999").localeCompare(b.follow_up_on ?? "9999") ||
        a.name.localeCompare(b.name),
    );

  const link = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = {
      kind: kind === "all" ? undefined : kind,
      stage,
      q: query || undefined,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged))
      if (value && value !== "all") next.set(key, value);
    return `/internal/community/campus${next.size ? `?${next}` : ""}`;
  };

  return (
    <>
      {header}
      <LoadNotice show={incomplete(partners, events)} />
      <LinkTabs
        active={kind}
        items={[
          {
            key: "all",
            label: "All",
            count: searched.length,
            href: link({ kind: "all" }),
          },
          ...PARTNER_KINDS.map((item) => ({
            key: item.value,
            label: item.value === "club" ? "Student clubs" : `${item.label}s`,
            count: searched.filter((partner) => partner.kind === item.value)
              .length,
            href: link({ kind: item.value }),
          })),
        ]}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          action="/internal/community/campus"
          value={query}
          placeholder="Search names, cities, tags"
          keep={{ kind: kind === "all" ? undefined : kind, stage }}
        />
        <div className="flex flex-wrap gap-1">
          <Link
            href={link({ stage: undefined })}
            className={buttonClass(stage ? "ghost" : "secondary", "sm")}
          >
            Any stage
          </Link>
          {PARTNER_STAGES.map((item) => (
            <Link
              key={item.value}
              href={link({ stage: item.value })}
              className={buttonClass(
                stage === item.value ? "secondary" : "ghost",
                "sm",
              )}
            >
              {item.label}
              <span className="tabular-nums text-[var(--i-faint)]">
                {
                  ofKind.filter((partner) => partner.stage === item.value)
                    .length
                }
              </span>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        {rows.length ? (
          <Table
            head={
              <>
                <th>Name</th>
                <th>Stage</th>
                <th>Reach</th>
                <th>Events</th>
                <th>Follow up</th>
                <th>Last contact</th>
                <th>Owner</th>
              </>
            }
          >
            {rows.map((partner) => {
              const events = hosted.get(partner.id);
              const parent = partner.parent_id
                ? names.get(partner.parent_id)
                : null;
              return (
                <tr key={partner.id} className={rowClass}>
                  <td className="max-w-[20rem]">
                    <RowLink
                      href={`/internal/community/campus/${partner.id}`}
                      sub={[
                        labelOf(PARTNER_KINDS, partner.kind),
                        parent,
                        partner.city,
                        clubs.get(partner.id)
                          ? `${clubs.get(partner.id)} clubs`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      {partner.name}
                    </RowLink>
                  </td>
                  <td>
                    <QuickSelect
                      entity="partner"
                      id={partner.id}
                      value={partner.stage}
                      canEdit={canEdit}
                      label={`Stage of ${partner.name}`}
                    />
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {partner.reach !== null ? (
                      partner.reach.toLocaleString("en-IN")
                    ) : partner.capacity !== null ? (
                      `${partner.capacity.toLocaleString("en-IN")} seats`
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {events ? (
                      <>
                        {events.total}
                        {events.upcoming ? (
                          <Muted> · {events.upcoming} coming up</Muted>
                        ) : null}
                      </>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td>
                    <DueDate
                      day={partner.follow_up_on}
                      today={today}
                      done={partner.stage === "ended"}
                    />
                  </td>
                  <td className="whitespace-nowrap text-[var(--i-muted)]">
                    {formatDay(partner.last_contact_on, today)}
                  </td>
                  <td className="max-w-[9rem] text-[12.5px]">
                    <Owner owner={partner.owner} />
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState
            icon={<Buildings size={20} />}
            title={partners.rows.length ? "Nobody here" : "No partners yet"}
          >
            {partners.rows.length
              ? "Try another tab, stage or search."
              : canEdit
                ? "Add colleges, student clubs and venues. Link a club to its college, and pick the host when you add an event."
                : "Partners the community team adds show up here."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}

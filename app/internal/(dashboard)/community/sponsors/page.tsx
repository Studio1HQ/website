import type { Metadata } from "next";
import { Megaphone, Plus } from "@phosphor-icons/react/dist/ssr";
import { requireCommunity } from "@/lib/internal/session";
import {
  incomplete,
  loadSponsors,
  loadSponsorships,
  ownerChoices,
} from "@/lib/internal/community/data";
import {
  SPONSOR_STAGES,
  formatDay,
  formatTotals,
  sumMoney,
  todayKey,
  type Sponsor,
  type Sponsorship,
} from "@/lib/internal/community/schema";
import {
  matches,
  one,
  sponsorFollowUpDue,
} from "@/lib/internal/community/stats";
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
  TONES,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sponsors" };

const OPEN = ["lead", "contacted", "in_talks", "proposal"];

const VIEWS = [
  {
    key: "open",
    label: "In the pipeline",
    match: (sponsor: Sponsor) => OPEN.includes(sponsor.stage),
  },
  {
    key: "due",
    label: "Follow-ups due",
    match: (sponsor: Sponsor, today: string) =>
      sponsorFollowUpDue(sponsor, today),
  },
  {
    key: "won",
    label: "Won",
    match: (sponsor: Sponsor) => sponsor.stage === "won",
  },
  {
    key: "closed",
    label: "Lost or not now",
    match: (sponsor: Sponsor) =>
      sponsor.stage === "lost" || sponsor.stage === "paused",
  },
  { key: "all", label: "All", match: () => true },
] as const;

export default async function SponsorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireCommunity(), searchParams]);
  const canEdit = staff.community === "manager";
  const [sponsors, deals, owners] = await Promise.all([
    loadSponsors(),
    loadSponsorships(),
    canEdit ? ownerChoices() : Promise.resolve([]),
  ]);
  const today = todayKey();
  const view = VIEWS.find((item) => item.key === one(params.view)) ?? VIEWS[0];
  const query = one(params.q)?.slice(0, 100) ?? "";

  const header = (
    <PageHeader
      eyebrow="Community"
      title="Sponsors"
      description="Every company you're talking to about sponsoring: stage, the ask, contacts, outreach and follow-ups."
      actions={
        canEdit ? (
          <RecordDialog
            entity="sponsor"
            owners={owners}
            defaults={{ owner: staff.email }}
            goTo="/internal/community/sponsors/"
            trigger={
              <button type="button" className={buttonClass("accent")}>
                <Plus size={14} /> New sponsor
              </button>
            }
          />
        ) : null
      }
    />
  );
  if (!sponsors.ok) {
    return (
      <>
        {header}
        <MigrationNotice message={sponsors.message} />
      </>
    );
  }

  const dealsBySponsor = new Map<string, Sponsorship[]>();
  for (const deal of deals.ok ? deals.rows : []) {
    if (deal.status === "cancelled") continue;
    dealsBySponsor.set(deal.sponsor_id, [
      ...(dealsBySponsor.get(deal.sponsor_id) ?? []),
      deal,
    ]);
  }
  const committed = new Map(
    [...dealsBySponsor].map(([id, list]) => [id, sumMoney(list)]),
  );
  const wonTotal = sumMoney(
    sponsors.rows
      .filter((sponsor) => sponsor.stage === "won")
      .flatMap((sponsor) => dealsBySponsor.get(sponsor.id) ?? []),
  );

  const searched = sponsors.rows.filter((sponsor) =>
    matches(
      query,
      sponsor.name,
      sponsor.industry,
      sponsor.tier,
      sponsor.tags,
      sponsor.owner,
    ),
  );
  const rows = searched
    .filter((sponsor) => view.match(sponsor, today))
    .sort(
      (a, b) =>
        (a.follow_up_on ?? "9999").localeCompare(b.follow_up_on ?? "9999") ||
        a.name.localeCompare(b.name),
    );
  const link = (key: string) => {
    const next = new URLSearchParams();
    if (key !== "open") next.set("view", key);
    if (query) next.set("q", query);
    return `/internal/community/sponsors${next.size ? `?${next}` : ""}`;
  };

  // The funnel: count and asks per stage.
  const funnel = SPONSOR_STAGES.filter((stage) => stage.value !== "paused").map(
    (stage) => {
      const inStage = sponsors.rows.filter(
        (sponsor) => sponsor.stage === stage.value,
      );
      return {
        stage,
        count: inStage.length,
        ask: sumMoney(
          inStage.map((sponsor) => ({
            amount: sponsor.ask_amount,
            currency: sponsor.currency,
          })),
        ),
      };
    },
  );

  return (
    <>
      {header}
      <LoadNotice show={incomplete(sponsors, deals)} />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {funnel.map(({ stage, count, ask }) => (
          <Card key={stage.value} className="px-4 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-[var(--i-muted)]">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  TONES[stage.tone ?? "stone"].dot,
                )}
              />
              {stage.label}
            </p>
            <p className="mt-1.5 text-[20px] font-medium leading-none tabular-nums">
              {count}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-[var(--i-faint)]">
              {stage.value === "won"
                ? `${formatTotals(wonTotal)} committed`
                : count
                  ? `${formatTotals(ask, "—")} asked`
                  : "—"}
            </p>
          </Card>
        ))}
      </div>

      <LinkTabs
        active={view.key}
        items={VIEWS.map((item) => ({
          key: item.key,
          label: item.label,
          count: searched.filter((sponsor) => item.match(sponsor, today))
            .length,
          href: link(item.key),
        }))}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          action="/internal/community/sponsors"
          value={query}
          placeholder="Search companies, tiers, tags"
          keep={{ view: view.key === "open" ? undefined : view.key }}
        />
      </div>

      <Card>
        {rows.length ? (
          <Table
            head={
              <>
                <th>Company</th>
                <th>Stage</th>
                <th>Asking for</th>
                <th>Committed</th>
                <th>Follow up</th>
                <th>Last contact</th>
                <th>Owner</th>
              </>
            }
          >
            {rows.map((sponsor) => (
              <tr key={sponsor.id} className={rowClass}>
                <td className="max-w-[18rem]">
                  <RowLink
                    href={`/internal/community/sponsors/${sponsor.id}`}
                    sub={[sponsor.industry, sponsor.tier, sponsor.next_step]
                      .filter(Boolean)
                      .join(" · ")}
                  >
                    {sponsor.name}
                  </RowLink>
                </td>
                <td>
                  <QuickSelect
                    entity="sponsor"
                    id={sponsor.id}
                    value={sponsor.stage}
                    canEdit={canEdit}
                    label={`Stage of ${sponsor.name}`}
                  />
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {sponsor.ask_amount !== null ? (
                    formatTotals({ [sponsor.currency]: sponsor.ask_amount })
                  ) : (
                    <Muted>—</Muted>
                  )}
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {committed.has(sponsor.id) ? (
                    formatTotals(committed.get(sponsor.id)!)
                  ) : (
                    <Muted>—</Muted>
                  )}
                </td>
                <td>
                  <DueDate
                    day={sponsor.follow_up_on}
                    today={today}
                    done={["lost", "paused"].includes(sponsor.stage)}
                  />
                </td>
                <td className="whitespace-nowrap text-[var(--i-muted)]">
                  {formatDay(sponsor.last_contact_on, today)}
                </td>
                <td className="max-w-[9rem] text-[12.5px]">
                  <Owner owner={sponsor.owner} />
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            icon={<Megaphone size={20} />}
            title={sponsors.rows.length ? "Nobody here" : "No sponsors yet"}
          >
            {sponsors.rows.length
              ? "Try another tab or clear the search."
              : canEdit
                ? "Add the companies you want to approach. Log every email and call on their page, and set a follow-up date so nothing slips."
                : "Sponsors the community team adds show up here."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}

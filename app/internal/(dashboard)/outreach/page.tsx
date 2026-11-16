import type { Metadata } from "next";
import Link from "next/link";
import {
  Binoculars,
  Columns,
  DownloadSimple,
  Plus,
  Rows,
  UploadSimple,
} from "@phosphor-icons/react/dist/ssr";
import { saveOrg } from "@/app/internal/(dashboard)/outreach/actions";
import {
  formatDay,
  isOwnedBy,
  labelOf,
  todayKey,
} from "@/lib/internal/community/schema";
import { matches, one } from "@/lib/internal/community/stats";
import { requireOutreach } from "@/lib/internal/outreach/access";
import {
  loadMainContacts,
  loadOrgs,
  ownerChoices,
} from "@/lib/internal/outreach/data";
import { byFollowUp, followUpDue, isOpen } from "@/lib/internal/outreach/rules";
import {
  OPEN_STAGES,
  ORG_FIELDS,
  ORG_KINDS,
  ORG_STAGES,
  isOrgKind,
  type Org,
} from "@/lib/internal/outreach/schema";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import {
  DueDate,
  LinkTabs,
  Muted,
  Owner,
  RowLink,
  SearchBox,
  Stat,
  TONES,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import { FieldDialog } from "@/components/internal/outreach/field-dialog";
import { ImportDialog } from "@/components/internal/outreach/import-dialog";
import { StageSelect } from "@/components/internal/outreach/stage-select";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Outreach" };

const PATH = "/internal/outreach";

type Now = { today: string; me: string };

const VIEWS = [
  { key: "open", label: "All open", match: (org: Org) => isOpen(org.stage) },
  { key: "due", label: "Follow-ups due", match: (org: Org, now: Now) => followUpDue(org, now.today) },
  { key: "mine", label: "Mine", match: (org: Org, now: Now) => isOpen(org.stage) && isOwnedBy(org.owner, now.me) },
  { key: "won", label: "Won", match: (org: Org) => org.stage === "won" },
  {
    key: "closed",
    label: "Lost & not now",
    match: (org: Org) => org.stage === "lost" || org.stage === "not_now",
  },
] as const;

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireOutreach(), searchParams]);
  const [orgs, contacts, owners] = await Promise.all([loadOrgs(), loadMainContacts(), ownerChoices()]);
  const today = todayKey();
  const now: Now = { today, me: staff.email };
  const view = VIEWS.find((item) => item.key === one(params.view)) ?? VIEWS[0];
  const query = one(params.q)?.slice(0, 100) ?? "";
  const kind = isOrgKind(one(params.kind)) ? (one(params.kind) as Org["kind"]) : null;
  // The board is the open pipeline's columns; won and closed are lists.
  const boardable = view.key !== "won" && view.key !== "closed";
  const board = boardable && one(params.show) === "board";

  const link = (change: { view?: string; kind?: string | null; show?: "board" | "table" }) => {
    const next = new URLSearchParams();
    const nextView = change.view ?? view.key;
    if (nextView !== "open") next.set("view", nextView);
    const nextKind = change.kind === undefined ? kind : change.kind;
    if (nextKind) next.set("kind", nextKind);
    if (query) next.set("q", query);
    if ((change.show ?? (board ? "board" : "table")) === "board") next.set("show", "board");
    return `${PATH}${next.size ? `?${next}` : ""}`;
  };

  const header = (
    <PageHeader
      eyebrow="Workspaces"
      title="Outreach"
      description="Every company and creator you're talking to about working together: stage, contacts, what was said and when to follow up."
      actionsClassName="max-sm:w-full"
      actions={
        orgs.ok ? (
          <>
            <a href={`${PATH}/export`} className={buttonClass("ghost")}>
              <DownloadSimple size={14} /> Export
            </a>
            <ImportDialog
              trigger={
                <button type="button" className={buttonClass("secondary")}>
                  <UploadSimple size={14} /> Import
                </button>
              }
            />
            <FieldDialog
              fields={ORG_FIELDS}
              noun="organisation"
              owners={owners}
              defaults={{ owner: staff.email, currency: "USD" }}
              save={saveOrg.bind(null, null)}
              goTo={`${PATH}/`}
              trigger={
                <button type="button" className={buttonClass("accent")}>
                  <Plus size={14} /> Add organisation
                </button>
              }
            />
          </>
        ) : null
      }
    />
  );
  if (!orgs.ok) {
    return (
      <>
        {header}
        <Notice tone="warning">{orgs.message}</Notice>
      </>
    );
  }

  const person = new Map((contacts.ok ? contacts.rows : []).map((contact) => [contact.org_id, contact]));
  const ofKind = orgs.rows.filter((org) => !kind || org.kind === kind);
  const searched = ofKind.filter((org) => {
    const main = person.get(org.id);
    return matches(query, org.name, org.domain, org.interest, org.next_step, org.tags, org.owner, main?.name, main?.email);
  });
  const rows = searched.filter((org) => view.match(org, now)).sort(byFollowUp);

  const open = orgs.rows.filter((org) => isOpen(org.stage));
  const due = open.filter((org) => followUpDue(org, today));
  const mineDue = due.filter((org) => isOwnedBy(org.owner, staff.email)).length;
  const month = today.slice(0, 7);
  const wonThisMonth = orgs.rows.filter((org) => org.stage === "won" && org.closed_on?.startsWith(month)).length;
  const noDate = open.filter((org) => !org.follow_up_on).length;

  return (
    <>
      {header}
      {orgs.truncated || !contacts.ok ? (
        <div className="mb-5">
          <Notice tone="warning">
            Some of the outreach data couldn&apos;t be loaded, so lists and numbers on this page may be missing or too
            low. Reload in a minute.
          </Notice>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="In the pipeline"
          value={open.length}
          note={OPEN_STAGES.map((stage) => {
            const count = open.filter((org) => org.stage === stage).length;
            return count ? `${count} ${labelOf(ORG_STAGES, stage).toLowerCase()}` : null;
          })
            .filter(Boolean)
            .join(" · ")}
          href={link({ view: "open" })}
        />
        <Stat
          label="Follow-ups due"
          value={due.length}
          note={due.length ? `${mineDue} of them yours` : "Nothing to chase today"}
          accent={due.length > 0}
          href={link({ view: "due" })}
        />
        <Stat
          label="No follow-up date"
          value={noDate}
          note={noDate ? "Open, with nothing set to chase" : "Every open one has a date"}
        />
        <Stat label="Won this month" value={wonThisMonth} note="Moved to Won since the 1st" href={link({ view: "won" })} />
      </div>

      <LinkTabs
        active={view.key}
        items={VIEWS.map((item) => ({
          key: item.key,
          label: item.label,
          count: searched.filter((org) => item.match(org, now)).length,
          href: link({ view: item.key }),
        }))}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          action={PATH}
          value={query}
          placeholder="Search companies, people, tags"
          keep={{
            view: view.key === "open" ? undefined : view.key,
            kind: kind ?? undefined,
            show: board ? "board" : undefined,
          }}
        />
        <nav aria-label="Kind" className="flex flex-wrap gap-1">
          {[{ value: null, label: "Every kind" }, ...ORG_KINDS].map((option) => {
            const on = option.value === kind;
            return (
              <Link
                key={option.value ?? "all"}
                href={link({ kind: option.value })}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-lg px-2.5 text-[12.5px]",
                  on
                    ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)]"
                    : "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>
        {boardable ? (
          <div className="ml-auto flex gap-1" role="group" aria-label="Layout">
            {(
              [
                { key: "table", label: "Table", icon: <Rows size={14} /> },
                { key: "board", label: "Board", icon: <Columns size={14} /> },
              ] as const
            ).map((item) => (
              <Link
                key={item.key}
                href={link({ show: item.key })}
                aria-current={(board ? "board" : "table") === item.key ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px]",
                  (board ? "board" : "table") === item.key
                    ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)]"
                    : "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
                )}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {!rows.length ? (
        <Card>
          <EmptyState
            icon={<Binoculars size={20} />}
            title={orgs.rows.length ? "Nobody here" : "No outreach yet"}
          >
            {orgs.rows.length
              ? "Try another tab, another kind or clear the search."
              : "Add the companies and creators you want to work with, or import your sheet. Log every email and call on their page, and set a follow-up date so nothing slips."}
          </EmptyState>
        </Card>
      ) : board ? (
        // Columns side by side from lg; stacked, one stage after another, on phones.
        <div className="grid gap-3 lg:grid-cols-5">
          {OPEN_STAGES.map((stage) => {
            const option = ORG_STAGES.find((item) => item.value === stage)!;
            const cards = rows.filter((org) => org.stage === stage);
            return (
              <section key={stage} aria-label={option.label} className="min-w-0">
                <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[12.5px] font-medium">
                  <span aria-hidden className={cn("size-1.5 rounded-full", TONES[option.tone ?? "stone"].dot)} />
                  {option.label}
                  <span className="font-normal tabular-nums text-[var(--i-faint)]">{cards.length}</span>
                </h2>
                <ul className="space-y-2">
                  {cards.map((org) => (
                    <li key={org.id}>
                      <Card className="px-3.5 py-3">
                        <Link href={`${PATH}/${org.id}`} className="group block min-w-0">
                          <span className="block truncate text-[13px] font-medium group-hover:text-[var(--i-accent-text)]">
                            {org.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-[var(--i-muted)]">
                            {[labelOf(ORG_KINDS, org.kind), person.get(org.id)?.name].filter(Boolean).join(" · ")}
                          </span>
                          {org.next_step ? (
                            <span className="mt-1.5 line-clamp-2 block text-[12.5px] leading-snug text-[var(--i-ink-2)]">
                              {org.next_step}
                            </span>
                          ) : null}
                        </Link>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                          <StageSelect id={org.id} value={org.stage} name={org.name} />
                          <DueDate day={org.follow_up_on} today={today} />
                        </div>
                        <p className="mt-2 truncate text-[12px] text-[var(--i-muted)]">
                          <Owner owner={org.owner} />
                        </p>
                      </Card>
                    </li>
                  ))}
                  {cards.length ? null : (
                    <li className="rounded-xl border border-dashed border-[var(--i-line)] px-3 py-4 text-center text-[12px] text-[var(--i-faint)]">
                      Nothing here
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table
            head={
              <>
                <th>Organisation</th>
                <th>Kind</th>
                <th>Stage</th>
                <th>Next step</th>
                <th>Follow up</th>
                <th>Last contact</th>
                <th>Owner</th>
              </>
            }
          >
            {rows.map((org) => (
              <tr key={org.id} className={rowClass}>
                <td className="max-w-[16rem]">
                  <RowLink
                    href={`${PATH}/${org.id}`}
                    sub={[org.domain, person.get(org.id)?.name].filter(Boolean).join(" · ")}
                  >
                    {org.name}
                  </RowLink>
                </td>
                <td className="whitespace-nowrap text-[var(--i-ink-2)]">{labelOf(ORG_KINDS, org.kind)}</td>
                <td>
                  <StageSelect id={org.id} value={org.stage} name={org.name} />
                </td>
                <td className="max-w-[16rem]">
                  {org.stage === "lost" && org.lost_reason ? (
                    <span className="line-clamp-2 text-[var(--i-muted)]">Lost: {org.lost_reason}</span>
                  ) : org.next_step ? (
                    <span className="line-clamp-2">{org.next_step}</span>
                  ) : (
                    <Muted>—</Muted>
                  )}
                </td>
                <td>
                  <DueDate day={org.follow_up_on} today={today} done={!isOpen(org.stage)} />
                </td>
                <td className="whitespace-nowrap text-[var(--i-muted)]">{formatDay(org.last_contact_on, today)}</td>
                <td className="max-w-[9rem] text-[12.5px]">
                  <Owner owner={org.owner} />
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}

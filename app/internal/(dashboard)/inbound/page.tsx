import type { Metadata } from "next";
import { Plus, Rows, SquaresFour, Tray } from "@/components/internal/icons";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { LinkTabs } from "@/components/internal/community/ui";
import { AddLeadDialog } from "@/components/internal/inbound/add-lead-dialog";
import { AgentStatus } from "@/components/internal/inbound/agent-status";
import { BoardCard } from "@/components/internal/inbound/board-card";
import { BoardFilters } from "@/components/internal/inbound/board-filters";
import { BoardTable } from "@/components/internal/inbound/board-table";
import {
  filterCards,
  inColumn,
  lastFailure,
  parseSource,
} from "@/lib/internal/inbound/board";
import { requireInbound } from "@/lib/internal/inbound/access";
import { agentActivity, listInboundLeads } from "@/lib/internal/inbound/data";
import { visibleColumns } from "@/lib/internal/inbound/rules";
import { one } from "@/lib/internal/community/stats";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbound" };

export default async function InboundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [, params] = await Promise.all([requireInbound(), searchParams]);
  const source = parseSource(one(params.source));
  const showLost = one(params.lost) === "1";
  const view = one(params.view) === "table" ? "table" : "board";
  const [leads, activity] = await Promise.all([
    listInboundLeads(),
    agentActivity(),
  ]);
  const now = new Date();

  const href = (next: "board" | "table") => {
    const query = new URLSearchParams();
    if (source) query.set("source", source);
    if (showLost) query.set("lost", "1");
    if (next === "table") query.set("view", "table");
    return `/inbound${query.size ? `?${query}` : ""}`;
  };

  const header = (
    <PageHeader
      eyebrow="Clients"
      title="Inbound"
      description="Companies that came to us: they booked a call or wrote to the leads mailbox. The agent researches each one and drafts what to send."
      actionsClassName="max-sm:w-full"
      actions={
        <AddLeadDialog
          trigger={
            <button type="button" className={buttonClass("accent")}>
              <Plus size={14} /> Add lead
            </button>
          }
        />
      }
    />
  );

  if (!leads.ok) {
    return (
      <>
        {header}
        <Notice tone="warning">{leads.message}</Notice>
      </>
    );
  }

  const all = leads.value;
  const cards = filterCards(all, source, showLost);
  const columns = visibleColumns(showLost);

  return (
    <>
      {header}
      <AgentStatus
        activity={activity.ok ? activity.value : null}
        failure={lastFailure(all)}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2 [&>nav]:mb-0">
        <LinkTabs
          active={view}
          items={[
            {
              key: "board",
              label: "Board",
              href: href("board"),
              icon: <SquaresFour size={14} />,
            },
            {
              key: "table",
              label: "Table",
              href: href("table"),
              icon: <Rows size={14} />,
            },
          ]}
        />
        <span
          className="mx-1 hidden h-5 w-px bg-[var(--i-line)] sm:block"
          aria-hidden
        />
        <BoardFilters source={source} showLost={showLost} view={view} />
        <span className="text-[12.5px] text-[var(--i-muted)]">
          {cards.length === 1 ? "1 lead" : `${cards.length} leads`}
        </span>
      </div>

      {!cards.length ? (
        <Card>
          <EmptyState
            icon={<Tray size={20} />}
            title={all.length ? "Nobody here" : "No inbound leads yet"}
          >
            {all.length
              ? "Try another source, or show the lost ones."
              : "A booking or a mail to the leads mailbox adds a lead here. You can also add one by hand."}
          </EmptyState>
        </Card>
      ) : view === "table" ? (
        <BoardTable cards={cards} now={now} />
      ) : (
        // Columns side by side from lg, each scrolling inside itself;
        // stacked, one stage after another, on phones.
        <div
          className={cn(
            "grid gap-3",
            columns.length > 5 ? "lg:grid-cols-6" : "lg:grid-cols-5",
          )}
        >
          {columns.map((column) => {
            const inThis = inColumn(cards, column.key);
            return (
              <section
                key={column.key}
                aria-label={column.label}
                className="min-w-0"
              >
                <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[12.5px] font-medium">
                  {column.label}
                  <span className="font-normal tabular-nums text-[var(--i-faint)]">
                    {inThis.length}
                  </span>
                </h2>
                <ul className="space-y-2 lg:max-h-[calc(100vh-17rem)] lg:overflow-y-auto internal-scroll">
                  {inThis.map((card) => (
                    <li key={card.org.id}>
                      <BoardCard card={card} now={now} />
                    </li>
                  ))}
                  {inThis.length ? null : (
                    <li className="rounded-xl border border-dashed border-[var(--i-line)] px-3 py-4 text-center text-[12px] text-[var(--i-faint)]">
                      Nothing here
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

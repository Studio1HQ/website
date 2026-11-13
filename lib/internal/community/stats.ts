import {
  PARTNER_CLOSED_STAGES,
  SPONSOR_CLOSED_STAGES,
  sumMoney,
  todayKey,
  turnoutOf,
  type CommunityEvent,
  type Expense,
  type GuestCounts,
  type Partner,
  type Sponsor,
  type Sponsorship,
  type Turnout,
} from "@/lib/internal/community/schema";

/**
 * Sums the community pages share: event phases, turnout and money per
 * event. Pure; the pages load the rows and pass them in.
 */

export type Phase = "upcoming" | "past" | "idea" | "cancelled";

/** Where an event sits: ideas and cancellations aside, by its last day. */
export function phaseOf(
  event: Pick<CommunityEvent, "status" | "starts_on" | "ends_on">,
  today = todayKey(),
): Phase {
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "idea") return "idea";
  if (event.status === "done") return "past";
  const last = event.ends_on ?? event.starts_on;
  if (!last) return "upcoming";
  return last < today ? "past" : "upcoming";
}

export function turnouts(
  events: CommunityEvent[],
  guestCounts: (GuestCounts & { event_id: string })[],
  hackathonCounts: (GuestCounts & { hackathon_slug: string })[],
  today = todayKey(),
): Map<string, Turnout> {
  const guests = new Map(guestCounts.map((row) => [row.event_id, row]));
  const hackathons = new Map(
    hackathonCounts.map((row) => [row.hackathon_slug, row]),
  );
  return new Map(
    events.map((event) => [
      event.id,
      turnoutOf(
        event,
        guests.get(event.id),
        event.hackathon_slug ? hackathons.get(event.hackathon_slug) : undefined,
        today,
      ),
    ]),
  );
}

/** Amounts per currency: { INR: 5000, USD: 200 }. */
export type Totals = Record<string, number>;

export type EventMoney = {
  /** Estimates not yet owed. */
  planned: Totals;
  /** Owed or paid: what's been spent. */
  spent: Totals;
  paid: Totals;
  /** Sponsorship committed, invoiced or paid. */
  income: Totals;
  received: Totals;
};

const empty = (): EventMoney => ({
  planned: {},
  spent: {},
  paid: {},
  income: {},
  received: {},
});

/** Money per event id; "general" holds what isn't for one event. */
export function moneyByEvent(
  expenses: Expense[],
  sponsorships: Sponsorship[],
): Map<string, EventMoney> {
  const buckets = new Map<
    string,
    { expenses: Expense[]; deals: Sponsorship[] }
  >();
  const bucket = (id: string | null) => {
    const key = id ?? "general";
    if (!buckets.has(key)) buckets.set(key, { expenses: [], deals: [] });
    return buckets.get(key)!;
  };
  for (const expense of expenses)
    bucket(expense.event_id).expenses.push(expense);
  for (const deal of sponsorships) bucket(deal.event_id).deals.push(deal);
  const result = new Map<string, EventMoney>();
  for (const [key, { expenses: costs, deals }] of buckets) {
    result.set(key, moneyOf(costs, deals));
  }
  return result;
}

export function moneyOf(
  expenses: Expense[],
  sponsorships: Sponsorship[],
): EventMoney {
  if (!expenses.length && !sponsorships.length) return empty();
  return {
    planned: sumMoney(expenses.filter((item) => item.status === "planned")),
    spent: sumMoney(
      expenses.filter(
        (item) => item.status === "to_pay" || item.status === "paid",
      ),
    ),
    paid: sumMoney(expenses.filter((item) => item.status === "paid")),
    income: sumMoney(
      sponsorships.filter((item) => item.status !== "cancelled"),
    ),
    received: sumMoney(sponsorships.filter((item) => item.status === "paid")),
  };
}

export function addMoney(...totals: Totals[]): Totals {
  const result: Totals = {};
  for (const total of totals) {
    for (const [currency, amount] of Object.entries(total))
      result[currency] = (result[currency] ?? 0) + amount;
  }
  return result;
}

export function subtractMoney(a: Totals, b: Totals): Totals {
  const result: Totals = { ...a };
  for (const [currency, amount] of Object.entries(b))
    result[currency] = (result[currency] ?? 0) - amount;
  return result;
}

/** Cost per attendee in one currency, or null without both numbers. */
export function costPerHead(spent: Totals, attended: number, currency = "INR") {
  const amount = spent[currency] ?? 0;
  return attended > 0 && amount > 0 ? Math.round(amount / attended) : null;
}

/** Search across an event's name, city, venue and tags. */
export function matches(
  words: string,
  ...fields: (string | null | undefined | string[])[]
) {
  const query = words.trim().toLowerCase();
  if (!query) return true;
  const haystack = fields
    .flat()
    .filter((field): field is string => typeof field === "string")
    .join(" ")
    .toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

/** A page's search parameter as one string (the first, when repeated). */
export function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** A sponsor still in play whose follow-up date is today or earlier. */
export function sponsorFollowUpDue(
  sponsor: Pick<Sponsor, "follow_up_on" | "stage">,
  today = todayKey(),
) {
  return (
    Boolean(sponsor.follow_up_on && sponsor.follow_up_on <= today) &&
    !(SPONSOR_CLOSED_STAGES as readonly string[]).includes(sponsor.stage)
  );
}

/** A partner still in play whose follow-up date is today or earlier. */
export function partnerFollowUpDue(
  partner: Pick<Partner, "follow_up_on" | "stage">,
  today = todayKey(),
) {
  return (
    Boolean(partner.follow_up_on && partner.follow_up_on <= today) &&
    !(PARTNER_CLOSED_STAGES as readonly string[]).includes(partner.stage)
  );
}

type MoneyLine = Pick<
  Expense | Sponsorship,
  "event_id" | "paid_on" | "due_on" | "created_at"
>;

/**
 * The year a money line counts in: its event's date, else when it was
 * paid, due or added. One rule for the overview, the budget and the
 * dashboard card, so "sponsorship this year" is the same number everywhere.
 */
export function moneyYear(
  line: MoneyLine,
  eventStarts: ReadonlyMap<string, string | null>,
) {
  const starts = line.event_id ? eventStarts.get(line.event_id) : undefined;
  return (starts ?? line.paid_on ?? line.due_on ?? line.created_at).slice(0, 4);
}

/** Each event's start date by id, for moneyYear. */
export function eventStarts(
  events: readonly Pick<CommunityEvent, "id" | "starts_on">[],
) {
  return new Map(events.map((event) => [event.id, event.starts_on]));
}

/** A year's sponsorships that are still on (not cancelled). */
export function sponsorshipsIn(
  year: string,
  deals: readonly Sponsorship[],
  events: readonly Pick<CommunityEvent, "id" | "starts_on">[],
) {
  const starts = eventStarts(events);
  return deals.filter(
    (deal) => deal.status !== "cancelled" && moneyYear(deal, starts) === year,
  );
}

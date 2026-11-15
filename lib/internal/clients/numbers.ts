import type { Milestone } from "@/lib/internal/clients/schema";

/**
 * Key numbers: the counts a client cares about over time (GitHub stars,
 * Discord members, followers). Each reading is a milestone with a metric
 * and a value, so the history is kept and shows as wins too; "Update" adds
 * a new reading rather than changing the old one. Pure, for the overview
 * and the tests.
 */

export type Reading = Pick<
  Milestone,
  "id" | "happened_on" | "value" | "created_at" | "title"
>;

export type NumberRun = {
  /** As first written ("GitHub stars"). */
  metric: string;
  latest: Reading & { value: number };
  /** The reading before the latest, if any. */
  previous: (Reading & { value: number }) | null;
  first: Reading & { value: number };
  /** Every reading, oldest first. */
  readings: (Reading & { value: number })[];
};

/** "github stars " → "github stars": how readings of one number match up. */
export const metricKey = (metric: string) =>
  metric.trim().replace(/\s+/g, " ").toLowerCase();

/** One run per number that has at least one reading, latest change first. */
export function numberRuns(
  milestones: readonly Pick<
    Milestone,
    "id" | "happened_on" | "value" | "created_at" | "title" | "metric"
  >[],
): NumberRun[] {
  const runs = new Map<
    string,
    { metric: string; readings: NumberRun["readings"] }
  >();
  for (const item of milestones) {
    if (!item.metric.trim() || item.value === null) continue;
    const key = metricKey(item.metric);
    const run = runs.get(key) ?? { metric: item.metric.trim(), readings: [] };
    run.readings.push({ ...item, value: item.value });
    runs.set(key, run);
  }
  return [...runs.values()]
    .map(({ metric, readings }) => {
      const sorted = [...readings].sort(
        (a, b) =>
          a.happened_on.localeCompare(b.happened_on) ||
          a.created_at.localeCompare(b.created_at),
      );
      return {
        metric,
        readings: sorted,
        first: sorted[0],
        latest: sorted[sorted.length - 1],
        previous: sorted.length > 1 ? sorted[sorted.length - 2] : null,
      };
    })
    .sort(
      (a, b) =>
        b.latest.happened_on.localeCompare(a.latest.happened_on) ||
        a.metric.localeCompare(b.metric),
    );
}

/** "+120", "−5", "0" (a real minus sign). */
export function signed(change: number, format: (n: number) => string = String) {
  if (change > 0) return `+${format(change)}`;
  if (change < 0) return `−${format(Math.abs(change))}`;
  return "0";
}

/** The title a new reading gets: "1,600 GitHub stars". */
export function readingTitle(metric: string, value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} ${metric.trim()}`;
}

/** How much one press of − or + moves a number of this size. */
export function stepFor(value: number) {
  const size = Math.abs(value);
  return size >= 10_000 ? 100 : size >= 1000 ? 10 : 1;
}

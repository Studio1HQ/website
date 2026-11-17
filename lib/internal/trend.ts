/**
 * Small counts-over-time helpers for the Overview's sparklines and
 * up/down arrows. Pure, so the tests can check them.
 */

/**
 * How many of these timestamps fall in each of `buckets` back-to-back
 * windows of `bucketMs` ending at `nowMs`, oldest window first. Anything
 * older, in the future or unreadable is left out.
 */
export function rollingCounts(times: readonly unknown[], nowMs: number, bucketMs: number, buckets: number): number[] {
  const counts = Array.from({ length: buckets }, () => 0);
  for (const value of times) {
    const at = typeof value === "string" ? Date.parse(value) : NaN;
    if (!Number.isFinite(at) || at > nowMs) continue;
    const back = Math.floor((nowMs - at) / bucketMs);
    if (back < buckets) counts[buckets - 1 - back] += 1;
  }
  return counts;
}

/** How many of these dates fall in each of the `months` calendar months ending with `month` ("2026-11"), oldest first. */
export function monthCounts(dates: readonly unknown[], month: string, months: number): number[] {
  const [year, index] = month.split("-").map(Number);
  const keys = Array.from({ length: months }, (_, i) =>
    new Date(Date.UTC(year, index - 1 - (months - 1 - i), 1)).toISOString().slice(0, 7),
  );
  return keys.map((key) => dates.filter((value) => typeof value === "string" && value.startsWith(key)).length);
}

/** The last `span` points against the `span` before them: both sums and the difference. */
export function change(series: readonly number[], span: number) {
  const sum = (list: readonly number[]) => list.reduce((total, value) => total + value, 0);
  const now = sum(series.slice(-span));
  const before = sum(series.slice(-2 * span, -span));
  return { now, before, delta: now - before };
}

/**
 * The numbers behind the social growth chart: round tick values for its
 * y axis and how they read. Pure; components/internal/socials/growth-chart.tsx
 * draws with them.
 */

/** Round ticks covering lo..hi, in steps of 1, 2 or 5 × 10ⁿ (never under 1). */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  const top = hi > lo ? hi : lo + 1;
  const raw = (top - lo) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(
    1,
    [1, 2, 5, 10].map((times) => times * power).find((size) => size >= raw) ??
      10 * power,
  );
  const ticks: number[] = [];
  for (
    let value = Math.floor(lo / step) * step;
    value <= Math.ceil(top / step) * step;
    value += step
  )
    ticks.push(value);
  return ticks;
}

/**
 * Ticks for a line of follower counts: a little air above and below, never
 * under zero. One month alone sits in the middle.
 */
export function lineTicks(values: readonly number[]): number[] {
  if (!values.length) return niceTicks(0, 10);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.max(hi * 0.2, 5);
  return niceTicks(Math.max(0, lo - span * 0.25), hi + span * 0.25);
}

/** Ticks for gains and losses: always from or through zero. */
export function gainTicks(values: readonly number[]): number[] {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  return niceTicks(lo, hi > lo ? hi : lo + 5);
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const full = new Intl.NumberFormat("en-US");

/** An axis label: "1,240" under 10,000, "12K" from there. */
export function axisNumber(value: number) {
  return Math.abs(value) >= 10_000 ? compact.format(value) : full.format(value);
}

/** "Nov", or "Jan ’27" where a year starts (and on the first label). */
export function axisMonth(month: string, first: boolean) {
  const [year, number] = month.split("-");
  const name = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
  return first || number === "01" ? `${name} ’${year.slice(2)}` : name;
}

/**
 * The checklist a new project starts with: what's in it and how many of
 * each, like "Blogs 4, Social posts yes". It opens on the type's template
 * (its numbers are only a starting point), with the other usual kinds of
 * work below, unticked. What's ticked becomes the first month's plan; each
 * month after carries the numbers over, and they can change month to month.
 * Pure, for the dialog, the action and the tests.
 */

import {
  DELIVERABLE_KINDS,
  isMonthKey,
  labelOf,
  type DeliverableKind,
  type DueRule,
  type PersonRole,
  type TemplateLine,
} from "@/lib/internal/clients/schema";

export type PlanItem = TemplateLine & { on: boolean };

const usual = (kind: DeliverableKind, label: string, owner_role: PersonRole | null, due_rule: DueRule): TemplateLine => ({
  kind,
  label,
  quantity: 1,
  owner_role,
  due_rule,
});

/** The kinds of work most projects pick from, in the order the checklist shows them. */
export const USUAL_LINES: readonly TemplateLine[] = [
  usual("blog", "Blogs", "writer", "weekly"),
  usual("social_post", "Social posts", "socials", "weekly"),
  usual("video", "Videos", "devrel", "weekly"),
  usual("demo", "Demos or sample apps", "devrel", "mid_month"),
  usual("cookbook", "Cookbooks", "devrel", "weekly"),
  usual("launch_post", "Launch posts", "socials", "per_launch"),
  usual("reddit_post", "Reddit posts", "socials", "weekly"),
  usual("community_post", "Community posts", "socials", "weekly"),
  usual("outreach", "Community outreach", "devrel", "weekly"),
  usual("talk", "Events or talks", "devrel", "milestone"),
  usual("case_study", "Case studies", "writer", "end_of_month"),
  usual("report", "Monthly report", "founder", "end_of_month"),
];

/** The most lines a plan can have (as many as a template). */
export const MAX_PLAN_LINES = 20;

/**
 * The checklist for a type's template: its lines first (ticked when the
 * template plans some), then the usual kinds it doesn't have, unticked. An
 * unticked line offers 1 when ticked.
 */
export function planFrom(template: readonly TemplateLine[]): PlanItem[] {
  const items: PlanItem[] = template.map((line) => ({ ...line, on: line.quantity > 0, quantity: line.quantity > 0 ? line.quantity : 1 }));
  const have = new Set(template.map((line) => line.kind));
  for (const line of USUAL_LINES) if (!have.has(line.kind)) items.push({ ...line, on: false });
  return items;
}

/** One more line of a kind the checklist doesn't show, ticked. */
export function withKind(items: readonly PlanItem[], kind: DeliverableKind): PlanItem[] {
  return [...items, { kind, label: labelOf(DELIVERABLE_KINDS, kind), quantity: 1, owner_role: null, due_rule: "weekly", on: true }];
}

/** The ticked lines with a number, as the plan to save (1 to 999 each). */
export function planLines(items: readonly PlanItem[]): TemplateLine[] {
  return items
    .filter((item) => item.on && item.quantity > 0)
    .map(({ on: _on, ...line }) => ({ ...line, quantity: Math.min(999, Math.max(1, Math.round(line.quantity))) }));
}

/** A new project's first month: this month, or its start month when that's later. */
export function firstMonthFor(startsOn: string | null | undefined, current: string) {
  const month = typeof startsOn === "string" ? startsOn.slice(0, 7) : "";
  return isMonthKey(month) && month > current ? month : current;
}

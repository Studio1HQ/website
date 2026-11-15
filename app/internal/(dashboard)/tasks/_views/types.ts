import type { Staff } from "@/lib/internal/session";
import type { TaskViewer } from "@/lib/internal/tasks/access";
import type { VisiblePerson } from "@/lib/internal/tasks/load";

/** What every Tasks view gets from the page. */
export type ViewProps = {
  staff: Staff;
  viewer: TaskViewer;
  /** Whose tasks the page is showing. */
  person: VisiblePerson;
  /** The viewer's own tasks. */
  own: boolean;
  /** Everyone the viewer may see (themselves first). */
  people: VisiblePerson[];
  /** The page's search params, one value each. */
  params: Record<string, string>;
  /** IST. */
  today: string;
};

/** In tab order. The week calendar is where people add and update their tasks; it's the default. */
export const VIEWS = [
  { key: "week", label: "Week" },
  { key: "board", label: "Board" },
  { key: "month", label: "Month" },
] as const;

export type ViewKey = (typeof VIEWS)[number]["key"] | "team";

export function isViewKey(value: unknown): value is ViewKey {
  return value === "team" || VIEWS.some((view) => view.key === value);
}

import type { Deliverable } from "@/lib/internal/clients/schema";
import {
  STUDIO_LINK,
  TASK_AREAS,
  engagementLabel,
  forKey,
  forLabel,
  isClientKey,
  type LinkOption,
  type CommunityCard,
  type EngagementLabel,
  type Task,
  type WorkLog,
} from "@/lib/internal/tasks/shared";

/**
 * Turns one person's board data into what the board and the log dialog
 * show: labels for each card, the cards time can be logged on, and minutes
 * logged per card. Pure.
 */
export function boardPieces(
  board: {
    tasks: readonly Task[];
    deliverables: readonly Deliverable[];
    reviewing: readonly Deliverable[];
    community: readonly CommunityCard[];
    engagements: ReadonlyMap<string, EngagementLabel>;
  },
  logs: readonly Pick<WorkLog, "task_id" | "deliverable_id" | "community_task_id" | "minutes">[],
) {
  const { engagements } = board;

  const taskFor = (task: Task) => {
    const key = forKey(task);
    return { forLabel: forLabel(key, engagements), client: isClientKey(key, engagements) };
  };

  const deliverable = (row: Deliverable) => {
    const engagement = engagements.get(row.engagement_id);
    return {
      deliverable: row,
      clientName: engagement?.internal ? "Studio1" : (engagement?.client ?? "A client"),
      clientSlug: engagement?.clientSlug,
      engagementName: engagement?.name ?? "",
      internal: engagement?.internal ?? false,
      forLabel: forLabel(`e:${row.engagement_id}`, engagements),
    };
  };

  const minutes: Record<string, number> = {};
  const add = (key: string, value: number) => (minutes[key] = (minutes[key] ?? 0) + value);
  for (const log of logs) {
    if (log.task_id) add(`task:${log.task_id}`, log.minutes);
    else if (log.community_task_id) add(`community:${log.community_task_id}`, log.minutes);
    // A task that's part of a deliverable counts there too.
    if (log.deliverable_id) add(`deliverable:${log.deliverable_id}`, log.minutes);
  }

  const reviewingIds = new Set(board.reviewing.map((row) => row.id));
  const targets = [
    ...board.tasks
      .filter((task) => task.status !== "done")
      .map((task) => ({
        kind: "task" as const,
        id: task.id,
        title: task.title,
        for: taskFor(task).forLabel,
        finishable: true,
        engagementId: task.engagement_id,
      })),
    ...[...board.deliverables, ...board.reviewing.filter((row) => !board.deliverables.some((own) => own.id === row.id))]
      .filter((row) => row.status !== "published")
      .map((row) => ({
        kind: "deliverable" as const,
        id: row.id,
        title: reviewingIds.has(row.id) && !board.deliverables.some((own) => own.id === row.id) ? `Review: ${row.title}` : row.title,
        for: deliverable(row).forLabel,
        finishable: false,
        engagementId: row.engagement_id,
      })),
    ...board.community
      .filter((card) => card.status !== "done")
      .map((card) => ({
        kind: "community" as const,
        id: card.id,
        title: card.title,
        for: "Community task list",
        finishable: true,
        engagementId: null,
      })),
  ];

  return { taskFor, deliverable, minutes, targets };
}

/**
 * Everything a line of work can be tied to, for the one "For" picker:
 * Studio1 (and its areas), the person's open client deliverables (owned or
 * waiting on their review), the clients themselves, their open tasks and
 * the community tasks given to them. `clients` is the running engagements
 * (left empty for people who can't open client work).
 */
export function linkOptions(
  board: {
    tasks: readonly Task[];
    deliverables: readonly Deliverable[];
    reviewing: readonly Deliverable[];
    community: readonly CommunityCard[];
    engagements: ReadonlyMap<string, EngagementLabel>;
  },
  clients: readonly Pick<EngagementLabel, "id" | "client" | "name" | "internal">[],
): LinkOption[] {
  const { engagements } = board;
  const options: LinkOption[] = [
    { value: STUDIO_LINK, label: "Studio1", group: "studio", client: false },
    ...TASK_AREAS.filter((area) => area.value !== "other").map((area) => ({
      value: `s:${area.value}`,
      label: `Studio1 · ${area.label}`,
      group: "studio" as const,
      client: false,
    })),
  ];
  const seen = new Set<string>();
  for (const row of [...board.deliverables, ...board.reviewing]) {
    if (row.status === "published" || seen.has(row.id)) continue;
    seen.add(row.id);
    const engagement = engagements.get(row.engagement_id);
    const reviewing = !board.deliverables.some((own) => own.id === row.id);
    options.push({
      value: `d:${row.id}`,
      label: reviewing ? `Review: ${row.title}` : row.title,
      group: "deliverable",
      hint: engagement ? (engagement.internal ? engagementLabel(engagement) : engagement.client) : undefined,
      client: !engagement?.internal,
    });
  }
  for (const engagement of clients) {
    options.push({
      value: `e:${engagement.id}`,
      label: engagementLabel(engagement),
      group: "client",
      hint: engagement.internal ? undefined : engagement.client,
      client: !engagement.internal,
    });
  }
  for (const task of board.tasks) {
    if (task.status === "done") continue;
    options.push({
      value: `t:${task.id}`,
      label: task.title,
      group: "task",
      hint: forLabel(forKey(task), engagements),
      client: isClientKey(forKey(task), engagements),
    });
  }
  for (const card of board.community) {
    if (card.status === "done") continue;
    options.push({ value: `c:${card.id}`, label: card.title, group: "community", hint: "Community task list", client: false });
  }
  return options;
}

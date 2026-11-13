import type { Metadata } from "next";
import { requireCommunity } from "@/lib/internal/session";
import {
  incomplete,
  loadEvents,
  loadPartners,
  loadSponsors,
  loadTasks,
  ownerChoices,
  refOptions,
} from "@/lib/internal/community/data";
import { PageHeader } from "@/components/internal/ui";
import { TaskBoard } from "@/components/internal/community/task-board";
import {
  LoadNotice,
  MigrationNotice,
} from "@/components/internal/community/ui";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const staff = await requireCommunity();
  const canEdit = staff.community === "manager";
  const [tasks, events, sponsors, partners, refs, owners] = await Promise.all([
    loadTasks(),
    loadEvents(),
    loadSponsors(),
    loadPartners(),
    refOptions(["event", "sponsor", "partner"]),
    ownerChoices(),
  ]);

  const names: Record<string, string> = {};
  for (const list of [events, sponsors, partners]) {
    if (list.ok) for (const row of list.rows) names[row.id] = row.name;
  }

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Tasks"
        description={
          canEdit
            ? "Who does what by when. Link a task to an event, sponsor or partner so it shows on their page too."
            : "Your community tasks. Tick them off or move them along as you go."
        }
      />
      <LoadNotice
        show={tasks.ok && incomplete(tasks, events, sponsors, partners)}
      />
      {tasks.ok ? (
        <TaskBoard
          tasks={tasks.rows}
          me={staff.email}
          canEdit={canEdit}
          refs={refs}
          owners={owners}
          names={names}
        />
      ) : (
        <MigrationNotice message={tasks.message} />
      )}
    </>
  );
}

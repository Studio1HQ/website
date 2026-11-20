import { Notice } from "@/components/internal/ui";
import { Board, type BoardDeliverable } from "@/components/internal/tasks/board";
import { canChangeTask, canGiveTask } from "@/lib/internal/tasks/access";
import { choicesFor, engagementChoices } from "@/lib/internal/tasks/data";
import { loadBoard, teammates, thisWeek } from "@/lib/internal/tasks/load";
import { boardPieces } from "@/lib/internal/tasks/board-data";
import type { ViewProps } from "./types";

/**
 * The board: this week. Open work from the person's own tasks, the client
 * deliverables they own and the community tasks assigned to them, plus
 * what they finished this week.
 */
export async function BoardView({ staff, viewer, person, own, people, today }: ViewProps) {
  const week = thisWeek();
  const canAdd = canGiveTask(viewer, person.email, person.guarded);
  const [board, choices, team] = await Promise.all([
    loadBoard(person.email, week),
    staff.clients && canAdd ? engagementChoices().then((list) => choicesFor(staff.clientScope, list)) : Promise.resolve([]),
    teammates(),
  ]);

  if (board.missing) {
    return <Notice tone="warning">{board.failed}</Notice>;
  }

  const pieces = boardPieces(board, []);
  const names = Object.fromEntries(people.map((item) => [item.email.toLowerCase(), item.name || item.email]));

  return (
    <>
      {board.failed ? (
        <div className="mb-4">
          <Notice tone="warning">{board.failed} Some cards may be missing.</Notice>
        </div>
      ) : null}
      <Board
        person={{ email: person.email, name: person.name || person.email, own }}
        viewer={{ email: staff.email, clients: staff.clients, community: staff.community }}
        canAdd={canAdd}
        today={today}
        tasks={board.tasks.map((task) => ({
          task,
          ...pieces.taskFor(task),
          changeable: canChangeTask(viewer, task),
        }))}
        deliverables={board.deliverables.map(pieces.deliverable) satisfies BoardDeliverable[]}
        reviewing={board.reviewing.map(pieces.deliverable)}
        community={board.community}
        forOptions={choices}
        targets={own ? pieces.targets : []}
        names={names}
        team={team}
      />
    </>
  );
}

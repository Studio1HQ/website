"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import {
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  DotsThree,
  ListChecks,
  PencilSimple,
  Plus,
  Prohibit,
  X,
} from "@/components/internal/icons";
import { saveDeliverable as saveDeliverableAction } from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import { parseCount } from "@/lib/internal/clients/clean";
import {
  canChangeDeliverable,
  scopeLineProgress,
  type ClientsAccess,
} from "@/lib/internal/clients/rules";
import {
  CONTENT_TYPES,
  DELIVERABLE_KINDS,
  POST_KINDS,
  WRITTEN_KINDS,
  formatDay,
  labelOf,
  liveLinks,
  personName,
  platformOf,
  publishedBy,
  todayKey,
  type Deliverable,
  type DeliverableKind,
  type ScopeLine,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import { DateField } from "@/components/internal/pickers";
import { KindIcon } from "@/components/internal/clients/kind-icon";
import {
  PlatformChip,
  PlatformChips,
} from "@/components/internal/clients/platform-chip";
import {
  Card,
  ExternalLink,
  buttonClass,
  inputClass,
} from "@/components/internal/ui";
import { DueDate, Meter } from "@/components/internal/community/ui";
import { DeliverableFlags, OwnerName } from "@/components/internal/clients/ui";
import {
  FormDialog,
  FormField,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";
import { BlockDialog } from "@/components/internal/clients/block-dialog";
import { DeliverableDialog } from "@/components/internal/clients/deliverable-dialog";
import { MoveStatusMenu } from "@/components/internal/clients/move-status-menu";
import {
  RemoveLineButton,
  ScopeLineDialog,
} from "@/components/internal/clients/scope-lines";

const saveDeliverable = guarded(saveDeliverableAction);

/**
 * A month's work for one engagement, as one list: a group per part of the
 * plan ("Blogs: 1 of 4 published"), its pieces numbered in the order they
 * were added, and an Add button on its header that opens a small dialog.
 * Work outside the plan sits in its own group at the end. Clicking a piece
 * opens every field; the status pill moves it along.
 */

type Viewer = { email: string; clients: ClientsAccess };

type Shared = {
  cycleId: string;
  viewer: Viewer;
  internal: boolean;
  owners: readonly string[];
  names: Readonly<Record<string, string>>;
  scopeLines: readonly Pick<ScopeLine, "id" | "kind" | "label">[];
  today: string;
  /** The DevRel tracker migration has run: type, views, more links. */
  devrel: boolean;
};

/** "Blog" → "blog", "Cookbook PR" → "cookbook PR"; names keep their capital. */
function kindWord(kind: DeliverableKind) {
  const label = labelOf(DELIVERABLE_KINDS, kind);
  if (/^(Reddit|GitHub)\b/.test(label)) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/** The quiet "+ Add" button on a not-started line. */
const addButtonClass =
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] text-[var(--i-muted)] transition-colors hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]";

const byAdded = (a: Deliverable, b: Deliverable) =>
  a.created_at.localeCompare(b.created_at);

export function MonthWork({
  cycleId,
  lines,
  deliverables,
  viewer,
  internal,
  owners,
  names,
  canEditPlan,
  devrel = false,
}: {
  cycleId: string;
  lines: readonly ScopeLine[];
  deliverables: readonly Deliverable[];
  viewer: Viewer;
  internal: boolean;
  owners: readonly string[];
  names: Readonly<Record<string, string>>;
  /** Client managers change the plan (the lines and their numbers). */
  canEditPlan: boolean;
  devrel?: boolean;
}) {
  const today = todayKey();
  const ordered = [...lines].sort((a, b) => a.position - b.position);
  const known = new Set(ordered.map((line) => line.id));
  const outside = deliverables
    .filter((item) => !item.scope_line_id || !known.has(item.scope_line_id))
    .sort(byAdded);
  const shared: Shared = {
    cycleId,
    viewer,
    internal,
    owners,
    names,
    scopeLines: ordered,
    today,
    devrel,
  };
  const nextPosition = ordered.length
    ? Math.max(...ordered.map((line) => line.position)) + 1
    : 0;
  const empty = !ordered.length && !deliverables.length;

  // One column: each part of the plan in its own section, in the plan's
  // order, then anything outside the plan, then the parts not started yet.
  const groups = ordered.map((line) => ({
    line,
    items: deliverables.filter((item) => item.scope_line_id === line.id).sort(byAdded),
  }));
  const filled = groups.filter((group) => group.items.length);
  const quiet = groups.filter((group) => !group.items.length);

  return (
    <section aria-label="The month's work" className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-1">
        {canEditPlan ? (
          <ScopeLineDialog
            cycleId={cycleId}
            position={nextPosition}
            trigger={
              <button type="button" className={buttonClass("ghost", "sm")}>
                <Plus size={13} /> Add to the plan
              </button>
            }
          />
        ) : null}
        <DeliverableDialog
          cycleId={cycleId}
          scopeLines={ordered}
          owners={owners}
          names={names}
          access={viewer.clients}
          me={viewer.email}
          title="Add work"
          devrel={devrel}
          trigger={
            <button type="button" className={buttonClass("secondary", "sm")}>
              <Plus size={13} />
              {ordered.length ? "Add something else" : "Add work"}
            </button>
          }
        />
      </div>

      {empty ? (
        <Card>
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <ListChecks size={20} className="text-[var(--i-muted)]" />
            <p className="mt-2 text-[13.5px] font-medium">Nothing planned yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--i-muted)]">
              {canEditPlan
                ? "Add what the contract covers this month, like 4 blogs. Then add each one here as it starts."
                : "A client manager sets this month's plan."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filled.map(({ line, items }) => (
            <PlanGroup key={line.id} line={line} items={items} all={false} canEditPlan={canEditPlan} {...shared} />
          ))}
          {outside.length ? (
            <Card className="min-w-0">
              <div className="flex items-center gap-3 border-b border-[var(--i-line)] px-5 py-3">
                <h3 className="text-[13.5px] font-medium">Not in the plan</h3>
                <span className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
                  {outside.filter((item) => item.status === "published").length} live
                </span>
              </div>
              <Pieces
                name="Not in the plan"
                items={outside}
                layout={outside.every((item) => WRITTEN_KINDS.has(item.kind)) ? "work" : "compact"}
                posts={false}
                written={outside.every((item) => WRITTEN_KINDS.has(item.kind))}
                all={false}
                {...shared}
              />
            </Card>
          ) : null}
          {quiet.length ? (
            <Card className="min-w-0">
              <div className="px-5 pb-1 pt-3.5">
                <h3 className="text-[13.5px] font-medium">Not started yet</h3>
              </div>
              <ul className="pb-1.5">
                {quiet.map(({ line }) => (
                  <QuietLine key={line.id} line={line} canEditPlan={canEditPlan} {...shared} />
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </section>
  );
}

/** Change or remove a part of the plan; shows on hover. */
function PlanTools({
  line,
  name,
  cycleId,
}: {
  line: ScopeLine;
  name: string;
  cycleId: string;
}) {
  return (
    <span className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/plan:opacity-100 max-md:opacity-100">
      <ScopeLineDialog
        cycleId={cycleId}
        line={line}
        trigger={
          <button
            type="button"
            aria-label={`Change ${name}`}
            title="Change the number or name"
            className={buttonClass("ghost", "sm")}
          >
            <PencilSimple size={13} />
          </button>
        }
      />
      <RemoveLineButton id={line.id} name={name} />
    </span>
  );
}

/** A part of the plan with nothing in it yet: one line in "Not started yet". */
function QuietLine({
  line,
  canEditPlan,
  ...shared
}: Shared & { line: ScopeLine; canEditPlan: boolean }) {
  const name = line.label || labelOf(DELIVERABLE_KINDS, line.kind);
  const posts = POST_KINDS.has(line.kind);
  return (
    <li
      aria-label={name}
      className="group/plan flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-1.5"
    >
      <span className="flex min-w-0 items-center gap-2 truncate text-[13px] text-[var(--i-ink-2)]">
        <KindIcon kind={line.kind} size={14} />
        {name}
      </span>
      <span className="text-[12px] tabular-nums text-[var(--i-faint)]">
        {line.planned > 0 ? `0 of ${line.planned}` : "none planned"}
      </span>
      <span className="flex-1" />
      {posts ? (
        <QuickPost line={line} added={0} compact {...shared} />
      ) : (
        <QuickAdd line={line} added={0} compact {...shared} />
      )}
      {canEditPlan ? (
        <PlanTools line={line} name={name} cycleId={shared.cycleId} />
      ) : null}
    </li>
  );
}

/**
 * One part of the plan as its own card: a header (name, "2 of 4", a small
 * bar, views, the add button) and the pieces. Written work is the
 * tracker's table, posts a table of views, and the rest (PRs, demos,
 * calls) compact two-line rows.
 */
function PlanGroup({
  line,
  items,
  all,
  canEditPlan,
  ...shared
}: Shared & {
  line: ScopeLine;
  items: readonly Deliverable[];
  /** Every piece on the card, not the short list. */
  all: boolean;
  canEditPlan: boolean;
}) {
  const progress = scopeLineProgress(line, items);
  const name = line.label || labelOf(DELIVERABLE_KINDS, line.kind);
  const posts = POST_KINDS.has(line.kind);
  const views = shared.devrel ? viewsOf(items) : 0;
  return (
    <Card aria-label={name} className="group/plan min-w-0">
      <section aria-label={name}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--i-line)] px-5 py-3">
          <h3 className="flex items-center gap-2 text-[13.5px] font-medium">
            <KindIcon kind={line.kind} />
            {name}
          </h3>
          <span className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
            {line.planned > 0
              ? progress.done > line.planned
                ? // More than planned reads as a mistake as "4 of 2".
                  `${progress.done} live · ${line.planned} planned`
                : `${progress.done} of ${line.planned}`
              : `${progress.done} live`}
          </span>
          {line.planned > 0 ? (
            <span className="w-16">
              <Meter
                value={Math.min(progress.done, line.planned)}
                max={line.planned}
                label={
                  progress.done > line.planned
                    ? `${progress.done} done, ${line.planned} planned`
                    : `${progress.done} of ${line.planned} done`
                }
              />
            </span>
          ) : null}
          {progress.approved ? (
            <span className="text-[12px] text-[var(--i-faint)]">
              +{progress.approved} approved
            </span>
          ) : null}
          {views > 0 ? (
            <span className="text-[12px] tabular-nums text-[var(--i-muted)]">
              {counts.format(views)} views
            </span>
          ) : null}
          <span className="flex-1" />
          {canEditPlan ? (
            <PlanTools line={line} name={name} cycleId={shared.cycleId} />
          ) : null}
          {posts ? (
            <QuickPost
              line={line}
              added={items.length}
              lastOwner={items.at(-1)?.owner}
              {...shared}
            />
          ) : (
            <QuickAdd
              line={line}
              added={items.length}
              lastOwner={items.at(-1)?.owner}
              {...shared}
            />
          )}
        </div>
        {line.notes ? (
          <p className="px-5 pt-2 text-[12px] text-[var(--i-faint)]">
            {line.notes}
          </p>
        ) : null}
        <Pieces
          name={name}
          items={items}
          // Posts as a table of views; writing as the tracker's table; the rest (PRs, demos, calls) as a list.
          layout={posts ? "posts" : WRITTEN_KINDS.has(line.kind) && line.kind !== "report" ? "work" : "compact"}
          posts={posts}
          written={WRITTEN_KINDS.has(line.kind)}
          all={all}
          {...shared}
        />
      </section>
    </Card>
  );
}

/** How many pieces a card shows before "Show all". */
const SHORT_LIST = 5;

/** A piece's number in its part of the plan, by id. */
type Numbers = ReadonlyMap<string, number>;

/**
 * A card's pieces. Up to five show on the card: the posts with the most
 * views, or the newest of anything else, each with its own number. "Show
 * all" opens the whole list in a large dialog. With one kind picked at the
 * top, the card shows every piece.
 */
function Pieces({
  name,
  items,
  layout,
  posts,
  written,
  all,
  ...shared
}: Shared & {
  name: string;
  items: readonly Deliverable[];
  layout: "compact" | "posts" | "work";
  posts: boolean;
  written: boolean;
  all: boolean;
}) {
  const [open, setOpen] = useState(false);
  const numbers: Numbers = new Map(
    items.map((item, index) => [item.id, index + 1]),
  );
  const list = (
    shown: readonly Deliverable[],
    as: "compact" | "posts" | "work",
  ) =>
    as === "compact" ? (
      <CompactList items={shown} numbers={numbers} {...shared} />
    ) : as === "posts" ? (
      <PostTable items={shown} numbers={numbers} {...shared} />
    ) : (
      <WorkTable
        items={shown}
        written={written}
        numbers={numbers}
        {...shared}
      />
    );
  if (all || items.length <= SHORT_LIST) return list(items, layout);

  const short = posts
    ? [...items]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, SHORT_LIST)
    : items.slice(-SHORT_LIST);
  const views = shared.devrel && posts ? viewsOf(items) : 0;
  return (
    <>
      {list(short, layout)}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <div className="border-t border-[var(--i-line)] px-4 py-1.5">
          <Dialog.Trigger asChild>
            <button type="button" className={addButtonClass}>
              <DotsThree size={14} weight="bold" className="shrink-0" />
              Show all {items.length}
              <span className="text-[var(--i-faint)]">
                {posts ? "· top 5 by views here" : "· newest 5 here"}
              </span>
            </button>
          </Dialog.Trigger>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content
            className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(1100px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
              <Dialog.Title className="min-w-0 truncate text-[15px] font-medium">
                {name}
              </Dialog.Title>
              <Dialog.Description className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
                {items.length} in all
                {views > 0 ? ` · ${counts.format(views)} views` : ""}
              </Dialog.Description>
              <span className="flex-1" />
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {list(items, posts ? "posts" : "work")}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/** Pieces as two-line rows, for the half-width cards. */
function CompactList({
  items,
  numbers,
  ...shared
}: Shared & { items: readonly Deliverable[]; numbers?: Numbers }) {
  return (
    <ol className="divide-y divide-[var(--i-line)]">
      {items.map((item, index) => (
        <CompactRow
          key={item.id}
          number={numbers?.get(item.id) ?? index + 1}
          deliverable={item}
          {...shared}
        />
      ))}
    </ol>
  );
}

/**
 * Title, and on the right the views (a live post) or the stage; under it
 * who did it, where it went live (colored chips) and the day.
 */
function CompactRow({
  number,
  deliverable,
  viewer,
  internal,
  owners,
  names,
  scopeLines,
  today,
  devrel,
}: Shared & { number: number; deliverable: Deliverable }) {
  const [editing, setEditing] = useState(false);
  const canChange = canChangeDeliverable(viewer, deliverable);
  const live = deliverable.status === "published";
  const links = live ? liveLinks(deliverable) : [];
  const day = live
    ? deliverable.published_at
      ? todayKey(new Date(deliverable.published_at))
      : null
    : deliverable.due_on;
  const showViews = devrel && live && POST_KINDS.has(deliverable.kind);
  const note = deliverable.notes.split("\n")[0]?.trim();
  return (
    <li className="group/row flex gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--i-hover)]">
      <span className="w-4 shrink-0 pt-px text-[12px] tabular-nums text-[var(--i-faint)]">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 break-words text-left text-[13.5px] font-medium leading-snug text-[var(--i-ink)] hover:text-[var(--i-accent-text)]"
          >
            {deliverable.title}
          </button>
          <span className="shrink-0">
            {showViews ? (
              <span className="flex items-center gap-1 text-[12px] text-[var(--i-muted)]">
                <ViewsCell
                  deliverable={deliverable}
                  canChange={canChange}
                  placeholder="—"
                />
                views
              </span>
            ) : (
              <MoveStatusMenu
                deliverable={deliverable}
                internal={internal}
                canChange={canChange}
                align="end"
              />
            )}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--i-muted)]">
          {deliverable.owner ? (
            <OwnerName email={deliverable.owner} names={names} />
          ) : null}
          <PlatformChips urls={links} />
          {day ? (
            <span className="tabular-nums">
              {live ? (
                formatDay(day, today)
              ) : (
                <>
                  Due <DueDate day={day} today={today} />
                </>
              )}
            </span>
          ) : null}
          {!live ? (
            <DeliverableFlags deliverable={deliverable} today={today} />
          ) : null}
        </div>
        {note ? (
          <p
            className="mt-0.5 truncate text-[12px] text-[var(--i-faint)]"
            title={deliverable.notes}
          >
            {note}
          </p>
        ) : null}
      </div>
      <DeliverableDialog
        deliverable={deliverable}
        access={viewer.clients}
        canChange={canChange}
        owners={owners}
        names={names}
        scopeLines={scopeLines}
        devrel={devrel}
        open={editing}
        onOpenChange={setEditing}
      />
    </li>
  );
}

/** Headings for a table that only screen readers need; they set the widths. */
function QuietHead({
  columns,
}: {
  columns: readonly (readonly [string, string])[];
}) {
  return (
    <thead>
      <tr className="h-0">
        {columns.map(([label, width]) => (
          <th key={label} className={cn("p-0 font-normal", width)}>
            <span className="sr-only">{label}</span>
          </th>
        ))}
      </tr>
    </thead>
  );
}

const rowClass = cn(
  "group/row border-t border-[var(--i-line)] align-middle transition-colors hover:bg-[var(--i-hover)] md:[&>td]:py-2 md:[&>td]:pr-4",
  "max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1.5 max-md:px-5 max-md:py-2.5 max-md:[&>td]:p-0",
);

/**
 * The pieces as a table (a stacked list on phones): number, title (with its
 * type, doc and flags), owner, stage, due, and where it went live. Blank
 * cells stay blank.
 */
function WorkTable({
  items,
  written,
  numbers,
  ...shared
}: Shared & {
  items: readonly Deliverable[];
  written: boolean;
  numbers?: Numbers;
}) {
  return (
    <table className="w-full border-collapse text-left text-[13px] max-md:block">
      <QuietHead
        columns={[
          ["Number", "w-10 md:pl-5"],
          [written ? "Topic" : "Item", ""],
          [written ? "Writer" : "Owner", "w-32"],
          ["Stage", "w-40"],
          ["Due", "w-24"],
          ["Published", "w-40"],
          ["Blocked", "w-10"],
        ]}
      />
      <tbody className="max-md:block">
        {items.map((item, index) => (
          <WorkRow
            key={item.id}
            number={numbers?.get(item.id) ?? index + 1}
            deliverable={item}
            written={written}
            {...shared}
          />
        ))}
      </tbody>
    </table>
  );
}

/** One piece of work as a table row. */
function WorkRow({
  number,
  deliverable,
  written,
  viewer,
  internal,
  owners,
  names,
  scopeLines,
  today,
  devrel,
}: Shared & { number: number; deliverable: Deliverable; written: boolean }) {
  const [editing, setEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const canChange = canChangeDeliverable(viewer, deliverable);
  const live = deliverable.status === "published";
  const found = live ? publishedBy(deliverable.published_url) : null;
  // Written pieces: their site or our Medium/dev.to; anything else: the platform.
  const where =
    found && !written
      ? {
          ...found,
          where: platformOf(deliverable.published_url) ?? found.where,
        }
      : found;
  const links = [
    [written ? "Doc" : "Draft", deliverable.draft_url],
    ["Review copy", deliverable.review_url],
    ["PR", deliverable.pr_url],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const note = deliverable.notes.split("\n")[0]?.trim();
  return (
    <tr
      className={cn(
        rowClass,
        deliverable.blocked && !live && "bg-rose-50/40 dark:bg-rose-500/5",
      )}
    >
      <td className="text-[12px] tabular-nums text-[var(--i-faint)] md:pl-5">
        {number}
      </td>
      <td className="min-w-0 max-md:flex-1 max-md:basis-[calc(100%-2rem)]">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 break-words text-left text-[13.5px] font-medium leading-snug text-[var(--i-ink)] hover:text-[var(--i-accent-text)]"
          >
            {deliverable.title}
          </button>
          {written && devrel && deliverable.content_type ? (
            <span className="shrink-0 text-[11.5px] text-[var(--i-muted)]">
              {labelOf(CONTENT_TYPES, deliverable.content_type)}
            </span>
          ) : null}
        </span>
        {links.length || (!live && hasFlags(deliverable, today)) ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--i-muted)]">
            {!live ? (
              <DeliverableFlags deliverable={deliverable} today={today} />
            ) : null}
            {links.map(([label, href]) => (
              <ExternalLink key={label} href={href}>
                {label}
              </ExternalLink>
            ))}
          </span>
        ) : null}
        {note ? (
          <span
            className="mt-0.5 block max-w-[36rem] truncate text-[12px] text-[var(--i-faint)]"
            title={deliverable.notes}
          >
            {note}
          </span>
        ) : null}
      </td>
      <td className="max-w-[8rem] text-[12.5px] max-md:empty:hidden">
        {deliverable.owner ? (
          <OwnerName email={deliverable.owner} names={names} />
        ) : null}
      </td>
      <td>
        <MoveStatusMenu
          deliverable={deliverable}
          internal={internal}
          canChange={canChange}
          align="end"
        />
      </td>
      <td className="whitespace-nowrap text-[12.5px] text-[var(--i-muted)] max-md:empty:hidden">
        {deliverable.due_on && !live ? (
          <>
            Due <DueDate day={deliverable.due_on} today={today} />
          </>
        ) : null}
      </td>
      <td className="text-[12.5px] max-md:empty:hidden">
        {live ? (
          <span className="flex flex-col">
            {deliverable.published_url ? (
              <span>
                <PlatformChip
                  url={deliverable.published_url}
                  label={where?.where}
                />
              </span>
            ) : (
              "Live"
            )}
            <span className="text-[11.5px] text-[var(--i-muted)]">
              {where && written
                ? where.by === "studio1"
                  ? "By us"
                  : "By the client"
                : ""}
              {where && written && deliverable.published_at ? " · " : ""}
              {deliverable.published_at
                ? formatDay(todayKey(new Date(deliverable.published_at)), today)
                : ""}
            </span>
            {devrel ? (
              <span className="mt-0.5">
                <ViewsCell
                  deliverable={deliverable}
                  canChange={canChange}
                  align="start"
                />
              </span>
            ) : null}
          </span>
        ) : deliverable.status === "approved" ? (
          <span className="text-emerald-700 dark:text-emerald-300">
            Ready to publish
          </span>
        ) : null}
      </td>
      <td className="md:!pr-4">
        {canChange && !live ? (
          <button
            type="button"
            onClick={() => setBlocking(true)}
            aria-label={
              deliverable.blocked
                ? "Blocked: change or unblock"
                : "Mark as blocked"
            }
            title={
              deliverable.blocked
                ? "Blocked: change or unblock"
                : "Mark as blocked"
            }
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-opacity hover:bg-[var(--i-hover)] focus-visible:opacity-100",
              deliverable.blocked
                ? "text-rose-600 dark:text-rose-300"
                : "text-[var(--i-faint)] opacity-0 group-hover/row:opacity-100 max-md:hidden",
            )}
          >
            <Prohibit size={14} />
          </button>
        ) : null}
        <DeliverableDialog
          deliverable={deliverable}
          access={viewer.clients}
          canChange={canChange}
          owners={owners}
          names={names}
          scopeLines={scopeLines}
          devrel={devrel}
          open={editing}
          onOpenChange={setEditing}
        />
        {canChange ? (
          <BlockDialog
            deliverable={deliverable}
            open={blocking}
            onOpenChange={setBlocking}
          />
        ) : null}
      </td>
    </tr>
  );
}

function hasFlags(item: Deliverable, today: string) {
  return (
    item.blocked ||
    Boolean(item.due_on && item.due_on < today) ||
    Boolean(
      item.status === "client_review" &&
      item.client_due_on &&
      item.client_due_on < today,
    )
  );
}

/** The "+ Add" button: on a card's header, or quieter on a not-started line. */
function AddTrigger({
  label,
  compact,
  ...props
}: { label: string; compact: boolean } & ComponentProps<"button">) {
  // The dialog passes its click handler and ref through `props`.
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={compact ? addButtonClass : buttonClass("secondary", "sm")}
    >
      <Plus size={compact ? 12 : 13} className="shrink-0" />
      Add
    </button>
  );
}

/**
 * "Add blog 2 of 4": a small dialog with a title and an owner. The owner
 * starts as whoever did the last one in this part of the plan, else the
 * viewer. Members always own what they add. "More fields" opens the full
 * form with what's typed so far.
 */
function QuickAdd({
  line,
  added,
  cycleId,
  viewer,
  owners,
  names,
  scopeLines,
  compact = false,
  lastOwner,
  devrel,
}: Shared & {
  line: ScopeLine;
  added: number;
  compact?: boolean;
  lastOwner?: string | null;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const manager = viewer.clients === "manager";
  const startOwner = lastOwner || viewer.email;
  const [owner, setOwner] = useState(startOwner);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [full, setFull] = useState(false);
  const [open, setOpen] = useDialogOpen(() => {
    setTitle("");
    setError(null);
    setOwner(startOwner);
  });

  const word = kindWord(line.kind);
  const next = added + 1;
  const label =
    line.planned > 0 && next <= line.planned
      ? `Add ${word} ${next} of ${line.planned}`
      : added
        ? `Add another ${word}`
        : `Add a ${word}`;

  const ownerOptions = [
    ...new Set([viewer.email, ...owners].map((email) => email.toLowerCase())),
  ]
    .map((email) => ({ value: email, label: personName(email, names) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give it a title.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await saveDeliverable(null, {
        cycle_id: cycleId,
        scope_line_id: line.id,
        kind: line.kind,
        title: title.trim(),
        owner: manager ? owner : viewer.email,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast(
        "success",
        `${labelOf(DELIVERABLE_KINDS, line.kind)} ${next} added`,
      );
      setOpen(false);
      afterSave();
    });
  };

  // The full form sits outside the small one: React events bubble through
  // portals, so a dialog inside would submit this form too.
  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<AddTrigger label={label} compact={compact} />}
        title={label}
        description="A title and an owner. More fields opens the full form."
        width="sm"
        onSubmit={submit}
        busy={busy}
        error={error}
        submitLabel="Add"
        footerStart={
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setFull(true);
            }}
            className={buttonClass("ghost")}
          >
            More fields
          </button>
        }
      >
        <FormField id={`add-title-${line.id}`} label="Title" required>
          <input
            id={`add-title-${line.id}`}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder={`Title of ${word} ${next}`}
            className={inputClass()}
            autoFocus
          />
        </FormField>
        {manager ? (
          <FormField id={`add-owner-${line.id}`} label="Owner">
            <Select
              id={`add-owner-${line.id}`}
              value={owner.toLowerCase()}
              onChange={setOwner}
              options={ownerOptions}
            />
          </FormField>
        ) : null}
      </FormDialog>
      <DeliverableDialog
        cycleId={cycleId}
        scopeLines={scopeLines}
        owners={owners}
        names={names}
        access={viewer.clients}
        me={viewer.email}
        title={label}
        devrel={devrel}
        defaults={{
          title: title.trim(),
          kind: line.kind,
          scope_line_id: line.id,
          owner: manager ? owner : viewer.email,
        }}
        open={full}
        onOpenChange={setFull}
      />
    </>
  );
}

/** Views across these posts (blank counts as 0). */
export function viewsOf(items: readonly Pick<Deliverable, "views">[]) {
  return items.reduce((sum, item) => sum + (item.views ?? 0), 0);
}

const counts = new Intl.NumberFormat("en-US");

/**
 * Posts as a table (the Notion "Social post tracker"): what it was, who
 * posted it, where (a chip per link), views (typed in place) and the day.
 */
function PostTable({
  items,
  numbers,
  ...shared
}: Shared & { items: readonly Deliverable[]; numbers?: Numbers }) {
  return (
    <table className="w-full border-collapse text-left text-[13px] max-md:block">
      <QuietHead
        columns={[
          ["Number", "w-10 md:pl-5"],
          ["Post", ""],
          ["Posted by", "w-32"],
          ["Where", "w-44"],
          ...(shared.devrel ? [["Views", "w-32"] as const] : []),
          ["Date", "w-20"],
        ]}
      />
      <tbody className="max-md:block">
        {items.map((item, index) => (
          <PostRow
            key={item.id}
            number={numbers?.get(item.id) ?? index + 1}
            deliverable={item}
            {...shared}
          />
        ))}
      </tbody>
    </table>
  );
}

function PostRow({
  number,
  deliverable,
  viewer,
  internal,
  owners,
  names,
  scopeLines,
  today,
  devrel,
}: Shared & { number: number; deliverable: Deliverable }) {
  const [editing, setEditing] = useState(false);
  const canChange = canChangeDeliverable(viewer, deliverable);
  const live = deliverable.status === "published";
  const links = liveLinks(deliverable);
  const note = deliverable.notes.split("\n")[0]?.trim();
  const day = live
    ? deliverable.published_at
      ? todayKey(new Date(deliverable.published_at))
      : null
    : deliverable.due_on;
  return (
    <tr className={rowClass}>
      <td className="text-[12px] tabular-nums text-[var(--i-faint)] md:pl-5">
        {number}
      </td>
      <td className="min-w-0 max-md:flex-1 max-md:basis-[calc(100%-2rem)]">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block max-w-full break-words text-left text-[13.5px] font-medium leading-snug text-[var(--i-ink)] hover:text-[var(--i-accent-text)]"
        >
          {deliverable.title}
        </button>
        {note ? (
          <span
            className="mt-0.5 block max-w-[36rem] truncate text-[12px] text-[var(--i-faint)]"
            title={deliverable.notes}
          >
            {note}
          </span>
        ) : null}
        <DeliverableDialog
          deliverable={deliverable}
          access={viewer.clients}
          canChange={canChange}
          owners={owners}
          names={names}
          scopeLines={scopeLines}
          devrel={devrel}
          open={editing}
          onOpenChange={setEditing}
        />
      </td>
      <td className="max-w-[8rem] text-[12.5px] max-md:empty:hidden">
        {deliverable.owner ? (
          <OwnerName email={deliverable.owner} names={names} />
        ) : null}
      </td>
      <td>
        {links.length ? (
          <span className="flex flex-wrap gap-1">
            <PlatformChips urls={links} />
          </span>
        ) : (
          <MoveStatusMenu
            deliverable={deliverable}
            internal={internal}
            canChange={canChange}
            align="end"
          />
        )}
      </td>
      {devrel ? (
        <td className="whitespace-nowrap">
          <ViewsCell deliverable={deliverable} canChange={canChange} />
        </td>
      ) : null}
      <td className="whitespace-nowrap text-[12.5px] text-[var(--i-muted)] max-md:empty:hidden md:!pr-5">
        {day ? formatDay(day, today) : null}
      </td>
    </tr>
  );
}

/**
 * Views, typed in place: saved when the box loses focus or on Enter.
 * "end" right-aligns it for a Views column; "start" lines its text up with
 * the lines above it when it sits under a chip.
 */
function ViewsCell({
  deliverable,
  canChange,
  placeholder = "Add views",
  align = "end",
}: {
  deliverable: Deliverable;
  canChange: boolean;
  placeholder?: string;
  align?: "start" | "end";
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const saved = deliverable.views ?? null;
  const shown = (views: number | null) =>
    views === null ? "" : counts.format(views);
  const [value, setValue] = useState(shown(saved));
  // The number the box counts as saved: the page's, or the one just saved
  // here until the page catches up.
  const [kept, setKept] = useState(saved);
  const [seen, setSeen] = useState(saved);
  const [busy, start] = useTransition();
  // A save elsewhere (the dialog, logging a post) changed it: follow, so the
  // next blur doesn't write the old number back.
  if (saved !== seen) {
    setSeen(saved);
    setKept(saved);
    setValue(shown(saved));
  }
  if (!canChange)
    return (
      <span className="text-[12.5px] tabular-nums">
        {saved === null ? "—" : counts.format(saved)}
      </span>
    );
  const save = () => {
    const typed = value.trim();
    const next = typed ? parseCount(typed) : null;
    // The same number, however it's typed ("7000", "7,000", "7k"): tidy it.
    if (typed === shown(kept) || (next !== null && next === kept)) {
      setValue(shown(kept));
      return;
    }
    start(async () => {
      const result = await saveDeliverable(deliverable.id, { views: typed });
      if (!result.ok) {
        toast("error", result.message);
        setValue(shown(kept));
        return;
      }
      // Show what was saved ("7k" → "7,000"), so leaving the box again
      // doesn't save it a second time.
      if (!typed || next !== null) {
        setKept(next);
        setValue(shown(next));
      }
      afterSave();
    });
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={`Views on ${deliverable.title}`}
      value={value}
      disabled={busy}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      placeholder={placeholder}
      maxLength={20}
      className={cn(
        inputClass("xs"),
        "w-24 border-transparent bg-transparent tabular-nums shadow-none hover:border-[var(--i-line-strong)] focus:border-[var(--i-line-strong)] focus:bg-[var(--i-panel)]",
        align === "start"
          ? "-ml-2 h-6 w-28 text-left text-[12px]"
          : "text-right max-md:w-28 max-md:text-left",
      )}
    />
  );
}

/**
 * "Log post 3 of 4", in a dialog: what it was, its link(s), views and who
 * posted it. With a link it's saved as published; without one it's planned.
 */
function QuickPost({
  line,
  added,
  cycleId,
  viewer,
  owners,
  names,
  devrel,
  lastOwner,
  compact = false,
}: Shared & {
  line: ScopeLine;
  added: number;
  lastOwner?: string | null;
  compact?: boolean;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const manager = viewer.clients === "manager";
  const startOwner = lastOwner || viewer.email;
  const [title, setTitle] = useState("");
  const [links, setLinks] = useState("");
  const [views, setViews] = useState("");
  const [postedOn, setPostedOn] = useState(todayKey());
  const [owner, setOwner] = useState(startOwner);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setTitle("");
    setLinks("");
    setViews("");
    setPostedOn(todayKey());
    setError(null);
    setOwner(startOwner);
  });

  const word = kindWord(line.kind);
  const next = added + 1;
  const label =
    line.planned > 0 && next <= line.planned
      ? `Log ${word} ${next} of ${line.planned}`
      : `Log another ${word}`;
  const ownerOptions = [
    ...new Set([viewer.email, ...owners].map((email) => email.toLowerCase())),
  ]
    .map((email) => ({ value: email, label: personName(email, names) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Say what the post was.");
      return;
    }
    const urls = links.split(/[\s,]+/).filter(Boolean);
    if (urls.length > 1 && !devrel) {
      setError(
        "One link for now: more links come with the DevRel tracker update.",
      );
      return;
    }
    setError(null);
    start(async () => {
      const result = await saveDeliverable(null, {
        cycle_id: cycleId,
        scope_line_id: line.id,
        kind: line.kind,
        title: title.trim(),
        owner: manager ? owner : viewer.email,
        ...(urls.length
          ? {
              status: "published",
              published_url: urls[0],
              published_on: postedOn,
              ...(devrel ? { extra_urls: urls.slice(1), views } : {}),
            }
          : {}),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", urls.length ? "Post logged" : "Post added to the plan");
      setOpen(false);
      afterSave();
    });
  };

  const id = (field: string) => `post-${field}-${line.id}`;
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<AddTrigger label={label} compact={compact} />}
      title={label}
      description="What the post was, its links, when it went up, its views and who posted it."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel="Log it"
    >
      <FormField id={id("title")} label="What it was" required wide>
        <input
          id={id("title")}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Launch thread, Reddit post in r/LLMDevs…"
          className={inputClass()}
          autoFocus
        />
      </FormField>
      <FormField
        id={id("links")}
        label={devrel ? "Link(s)" : "Link"}
        wide
        help={
          devrel
            ? "A space between links. Leave empty if it isn't up yet: it's saved as planned."
            : "Leave empty if it isn't up yet: it's saved as planned."
        }
      >
        <input
          id={id("links")}
          type="text"
          inputMode="url"
          value={links}
          onChange={(event) => setLinks(event.target.value)}
          placeholder="https://x.com/…"
          className={inputClass()}
        />
      </FormField>
      <FormField id={id("date")} label="Posted on">
        <DateField
          id={id("date")}
          value={postedOn}
          onChange={setPostedOn}
          max={todayKey()}
          required
          aria-label="Posted on"
        />
      </FormField>
      {devrel ? (
        <FormField id={id("views")} label="Views">
          <input
            id={id("views")}
            type="text"
            inputMode="numeric"
            value={views}
            onChange={(event) => setViews(event.target.value)}
            placeholder="7k"
            maxLength={20}
            className={cn(inputClass(), "tabular-nums")}
          />
        </FormField>
      ) : null}
      {manager ? (
        <FormField id={id("owner")} label="Posted by">
          <Select
            id={id("owner")}
            value={owner.toLowerCase()}
            onChange={setOwner}
            options={ownerOptions}
          />
        </FormField>
      ) : null}
    </FormDialog>
  );
}

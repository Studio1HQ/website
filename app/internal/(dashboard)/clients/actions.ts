"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { inScope, type ClientScope } from "@/lib/internal/clients/scope";
import { canSeeMoney, requireClients, staffName } from "@/lib/internal/session";
import {
  cleanBlock,
  cleanClient,
  cleanCycleNotes,
  cleanDeliverable,
  cleanEngagement,
  cleanInvoice,
  cleanMilestone,
  cleanMove,
  cleanPartner,
  cleanPerson,
  cleanScopeLine,
  cleanTemplateLines,
  DEVREL_FIELDS,
  isUuid,
  liveAt,
  looksLikeSecret,
  uniqueSlug,
} from "@/lib/internal/clients/clean";
import {
  ensureNextCycles,
  lastMonthLines,
  linesFromLastMonth,
  linesFromTemplate,
} from "@/lib/internal/clients/cycles";
import {
  TABLES,
  deleteRecord,
  getClient,
  getCycle,
  getDeliverable,
  getEngagement,
  getScopeLine,
  insertMany,
  insertRecord,
  devrelReady,
  getMilestone,
  getPartner,
  loadCycles,
  loadScopeLines,
  loadEngagements,
  loadTemplates,
  logStatusEvent,
  resetTemplateRow,
  saveTemplateRow,
  savePersonRow,
  takenSlugs,
  updateRecord,
} from "@/lib/internal/clients/data";
import { clientLogo } from "@/lib/internal/clients/logo";
import { notify } from "@/lib/internal/notifications/data";
import {
  MEMBER_FIELDS,
  blockProblem,
  canChangeDeliverable,
  clashText,
  editClashes,
  memberMayStartAt,
  isInternal,
  moveProblem,
  type ClientsAccess,
} from "@/lib/internal/clients/rules";
import {
  CYCLE_STATES,
  ENGAGEMENT_TYPES,
  WAITS_ON,
  isMonthKey,
  isOption,
  labelOf,
  monthOf,
  monthLabel,
  shiftMonth,
  templateFor,
  customTypeKey,
  engagementTypes,
  isCustomType,
  todayKey,
  type ActionResult,
  type Deliverable,
  type DeliverableStatus,
  statusLabel,
  type DeliverableKind,
} from "@/lib/internal/clients/schema";
import {
  blockLine,
  clientsSlackReady,
  postToClients,
  statusLine,
} from "@/lib/internal/clients/slack";

/**
 * Client work writes. Server actions are public endpoints, so each one
 * checks the session here: managers (client_manager, and admins) change
 * anything; members add deliverables and move along (status, links, dates,
 * blocked) only the ones they own or review. Every input is checked by
 * clean.ts and the rules in rules.ts; every status change and block/unblock
 * writes a status event, and posts a line to Slack when that's set up.
 */

const DENIED: ActionResult = {
  ok: false,
  message: "You can see client work but not change this. Ask a client manager.",
};

const NOT_YOURS: ActionResult = {
  ok: false,
  message: "You can only change deliverables you own or review.",
};

const UNKNOWN: ActionResult = {
  ok: false,
  message: "That isn't there any more. Reload the page.",
};

const TRY_AGAIN: ActionResult = {
  ok: false,
  message: "Couldn't check that just now. Try again in a minute.",
};

function refresh() {
  revalidatePath("/internal/clients", "layout");
}

async function manager() {
  const staff = await requireClients();
  return staff.clients === "manager" ? staff : null;
}

function asInput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function idOf(value: unknown) {
  return typeof value === "string" && isUuid(value)
    ? value.toLowerCase()
    : null;
}

type Viewer = {
  email: string;
  clients: ClientsAccess;
  clientScope: ClientScope;
};

/**
 * Refuses work on a client this person wasn't given (Client team members
 * an admin scoped on People), as if it weren't there.
 */
async function outOfScope(
  staff: Pick<Viewer, "clientScope">,
  engagementId: string,
): Promise<ActionResult | null> {
  if (staff.clientScope === null) return null;
  const engagement = await getEngagement(engagementId);
  if (engagement === "error") return TRY_AGAIN;
  return engagement && inScope(staff.clientScope, engagement.client_id)
    ? null
    : UNKNOWN;
}

/** Loads a deliverable and checks this person may change it. */
async function changeable(
  staff: Viewer,
  id: unknown,
): Promise<
  { ok: true; deliverable: Deliverable } | { ok: false; result: ActionResult }
> {
  const key = idOf(id);
  if (!key) return { ok: false, result: UNKNOWN };
  const deliverable = await getDeliverable(key);
  if (deliverable === "error") return { ok: false, result: TRY_AGAIN };
  if (!deliverable) return { ok: false, result: UNKNOWN };
  if (!canChangeDeliverable(staff, deliverable))
    return { ok: false, result: NOT_YOURS };
  const outside = await outOfScope(staff, deliverable.engagement_id);
  if (outside) return { ok: false, result: outside };
  return { ok: true, deliverable };
}

/** The client's name and the deliverable's title, for a Slack line. */
async function slackContext(
  deliverable: Pick<Deliverable, "engagement_id" | "title">,
) {
  const engagement = await getEngagement(deliverable.engagement_id);
  if (!engagement || engagement === "error")
    return { client: "", title: deliverable.title };
  const client = await getClient(engagement.client_id);
  return {
    client: client && client !== "error" ? client.name : "",
    title: deliverable.title,
  };
}

/**
 * Puts a deliverable's news on someone's bell (its new owner or reviewer,
 * or whoever a move hands it to), after the response. Never the person who
 * did it. The body is the piece and its client; it opens the client's page.
 */
function tellAbout(
  deliverable: Pick<Deliverable, "engagement_id" | "title">,
  to: readonly (string | null | undefined)[],
  by: string,
  title: string,
) {
  if (!to.some((email) => email && email.toLowerCase() !== by)) return;
  after(async () => {
    const engagement = await getEngagement(deliverable.engagement_id);
    const client =
      engagement && engagement !== "error"
        ? await getClient(engagement.client_id)
        : null;
    const found = client && client !== "error" ? client : null;
    await notify(to, by, {
      kind: "deliverable",
      title,
      body: found ? `${deliverable.title} · ${found.name}` : deliverable.title,
      href: found ? `/internal/clients/${found.slug}` : "/internal/tasks",
    });
  });
}

/* ---------------------------------------------------------------- clients */

/** Adds a client (no id) or changes one. */
export async function saveClient(
  id: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = id ? idOf(id) : null;
  if (id && !key) return UNKNOWN;
  const clean = cleanClient(asInput(values), key ? "update" : "create");
  if (!clean.ok) return clean;
  if (!key) {
    const taken = await takenSlugs();
    if (!taken) return TRY_AGAIN;
    clean.row.slug = uniqueSlug(String(clean.row.slug), taken);
  }
  const result = key
    ? await updateRecord(TABLES.clients, "client", key, clean.row, staff.email)
    : await insertRecord(TABLES.clients, "client", clean.row, staff.email);
  if (!result.ok) return result;
  refresh();
  // Fetch the website's logo now, after the reply, so the client's pages
  // show it on first open instead of fetching it then.
  const website = clean.row.website;
  if (typeof website === "string" && website)
    after(() => clientLogo(website).then(() => undefined));
  return key
    ? { ...result, message: "Client saved" }
    : { ...result, slug: String(clean.row.slug), message: "Client added" };
}

/** Hides a client from the lists (or brings it back). Their work stays for past reports. */
export async function archiveClient(
  id: unknown,
  archived: unknown = true,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = idOf(id);
  if (!key) return UNKNOWN;
  const result = await updateRecord(
    TABLES.clients,
    "client",
    key,
    { archived_at: archived === false ? null : new Date().toISOString() },
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return {
    ok: true,
    message: archived === false ? "Client back on the list" : "Client archived",
  };
}

/* ------------------------------------------------------------ engagements */

export async function saveEngagement(
  id: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = id ? idOf(id) : null;
  if (id && !key) return UNKNOWN;
  const input = asInput(values);
  // The contract is money: only the founders see or set its link.
  if (!canSeeMoney(staff)) delete input.contract_url;
  const clean = cleanEngagement(input, key ? "update" : "create");
  if (!clean.ok) return clean;
  if (key) {
    // Dates are judged with the saved ones when only one changes.
    const saved = await getEngagement(key);
    if (saved === "error") return TRY_AGAIN;
    if (!saved) return UNKNOWN;
    const starts =
      (clean.row.starts_on as string | null | undefined) ?? saved.starts_on;
    const ends =
      "ends_on" in clean.row
        ? (clean.row.ends_on as string | null)
        : saved.ends_on;
    if (starts && ends && ends < starts)
      return { ok: false, message: "It can't end before it starts." };
  }
  const result = key
    ? await updateRecord(
        TABLES.engagements,
        "engagement",
        key,
        clean.row,
        staff.email,
      )
    : await insertRecord(
        TABLES.engagements,
        "engagement",
        clean.row,
        staff.email,
      );
  if (!result.ok) return result;
  refresh();
  return { ...result, message: key ? "Engagement saved" : "Engagement added" };
}

/* ----------------------------------------------------------------- cycles */

/**
 * Starts a month for one engagement with last month's scope lines, or its
 * type's template when there was no last month (or none with
 * `fromTemplate: false`): Active when the month has
 * begun, Planning when it's still ahead.
 */
export async function createCycle(
  engagementId: unknown,
  month: unknown,
  fromTemplate: unknown = true,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = idOf(engagementId);
  if (!key) return UNKNOWN;
  if (!isMonthKey(month)) return { ok: false, message: "Pick a valid month." };
  const engagement = await getEngagement(key);
  if (engagement === "error") return TRY_AGAIN;
  if (!engagement) return UNKNOWN;
  const created = await insertRecord(
    TABLES.cycles,
    "month",
    // This month or a past one is already under way: straight to Active.
    // Next month waits in Planning until it begins.
    {
      engagement_id: key,
      month,
      state: month <= monthOf(todayKey()) ? "active" : "planning",
    },
    staff.email,
  );
  if (!created.ok || !created.id) return created;
  let warning: string | undefined;
  if (fromTemplate !== false) {
    // Last month's numbers are this client's agreed scope; the type's
    // template is only for a first month.
    const [templates, carried] = await Promise.all([
      loadTemplates(),
      lastMonthLines([key], month),
    ]);
    // A failed read must not quietly swap the saved plan for the built-in one.
    const readable =
      carried !== null && (templates.ok || Boolean(templates.missing));
    const before = carried?.get(key);
    const lines = before?.length
      ? linesFromLastMonth(before, created.id)
      : linesFromTemplate(
          templateFor(engagement.type, templates.ok ? templates.rows : [])
            .lines,
          created.id,
        );
    const added = readable
      ? await insertMany(TABLES.lines, "scope line", lines, staff.email)
      : { ok: false as const };
    if (!added.ok)
      warning =
        "The month was started, but its scope lines weren't added. Add them by hand.";
  }
  refresh();
  return { ok: true, id: created.id, message: "Month started", warning };
}

export async function setCycleState(
  cycleId: unknown,
  state: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = idOf(cycleId);
  if (!key) return UNKNOWN;
  if (!isOption(CYCLE_STATES, state))
    return { ok: false, message: "Pick a valid state." };
  const result = await updateRecord(
    TABLES.cycles,
    "month",
    key,
    { state },
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return {
    ok: true,
    message: `Month moved to ${labelOf(CYCLE_STATES, state)}`,
  };
}

/** The agreed scope note and/or the retro note. */
export async function saveCycleNotes(
  cycleId: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = idOf(cycleId);
  if (!key) return UNKNOWN;
  const clean = cleanCycleNotes(asInput(values));
  if (!clean.ok) return clean;
  if (!Object.keys(clean.row).length)
    return { ok: false, message: "Nothing to save." };
  const result = await updateRecord(
    TABLES.cycles,
    "month",
    key,
    clean.row,
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Notes saved" };
}

/** The invoice flag (not sent, sent, paid) and its link. No amounts. The founders only. */
export async function setInvoice(
  cycleId: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff || !canSeeMoney(staff))
    return { ok: false, message: "Only Arindam or Amitesh can change the invoice." };
  const key = idOf(cycleId);
  if (!key) return UNKNOWN;
  const clean = cleanInvoice(asInput(values));
  if (!clean.ok) return clean;
  const result = await updateRecord(
    TABLES.cycles,
    "month",
    key,
    clean.row,
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Invoice updated" };
}

/* ------------------------------------------------------------ scope lines */

/** Adds a scope line (no id; values need cycle_id) or changes one. */
export async function saveScopeLine(
  id: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = id ? idOf(id) : null;
  if (id && !key) return UNKNOWN;
  const clean = cleanScopeLine(asInput(values), key ? "update" : "create");
  if (!clean.ok) return clean;
  const result = key
    ? await updateRecord(
        TABLES.lines,
        "scope line",
        key,
        clean.row,
        staff.email,
      )
    : await insertRecord(TABLES.lines, "scope line", clean.row, staff.email);
  if (!result.ok) return result;
  refresh();
  return { ...result, message: key ? "Scope saved" : "Scope line added" };
}

/** Removes a scope line; its deliverables stay, without a line. */
export async function removeScopeLine(id: unknown): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = idOf(id);
  if (!key) return UNKNOWN;
  const result = await deleteRecord(TABLES.lines, "scope line", key);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Scope line removed" };
}

/* ----------------------------------------------------------- deliverables */

/**
 * Adds a deliverable (no id; values need cycle_id) or changes one. Members
 * may add one they own or review, and change only dates, links and notes
 * on their own; managers change anything. The status changes through
 * moveDeliverable, the blocked flag through setBlocked/clearBlocked.
 *
 * `seen`, when changing one: what the dialog showed for each field it sends
 * (formValueOf). A field someone else changed since then isn't written over:
 * the save stops and says so (editClashes).
 */
export async function saveDeliverable(
  id: unknown,
  values: unknown,
  seen?: unknown,
): Promise<ActionResult> {
  const staff = await requireClients();
  const key = id ? idOf(id) : null;
  if (id && !key) return UNKNOWN;
  const input = asInput(values);
  if (!(await devrelReady()))
    for (const field of DEVREL_FIELDS) delete input[field];

  if (!key) {
    const clean = cleanDeliverable(input, "create");
    if (!clean.ok) return clean;
    const row = clean.row;
    if (staff.clients !== "manager") {
      if (!row.owner) row.owner = staff.email;
      if (
        !canChangeDeliverable(
          staff,
          row as Pick<Deliverable, "owner" | "reviewer">,
        )
      )
        return {
          ok: false,
          message: "Add yourself as the owner or the reviewer.",
        };
      if (
        !memberMayStartAt(
          (row.status ?? "planned") as DeliverableStatus,
          row.kind as DeliverableKind,
        )
      )
        return {
          ok: false,
          message:
            "Start it at Planned, In progress or In review. A client manager adds work that's already approved or live.",
        };
    }
    const cycle = await getCycle(String(row.cycle_id));
    if (cycle === "error") return TRY_AGAIN;
    if (!cycle) return UNKNOWN;
    const outside = await outOfScope(staff, cycle.engagement_id);
    if (outside) return outside;
    if (row.scope_line_id) {
      const line = await getScopeLine(String(row.scope_line_id));
      if (line === "error") return TRY_AGAIN;
      if (!line || line.cycle_id !== cycle.id)
        return { ok: false, message: "Pick a scope line from this month." };
    } else if (!("scope_line_id" in input)) {
      // Added from elsewhere (Tasks) with no say on the plan: count it
      // toward the month's line of the same kind, so a blog added there
      // shows as "Blog 2 of 4". An explicit blank stays outside the plan.
      const lines = await loadScopeLines([cycle.id]);
      const match = lines.ok
        ? lines.rows.find((line) => line.kind === row.kind)
        : undefined;
      if (match) row.scope_line_id = match.id;
    }
    const now = new Date().toISOString();
    const live = liveAt(row.published_on, todayKey());
    if (!live.ok) return live;
    delete row.published_on;
    const result = await insertRecord(
      TABLES.deliverables,
      "deliverable",
      {
        ...row,
        engagement_id: cycle.engagement_id,
        status_changed_at: now,
        ...(row.status === "published" ? { published_at: live.at } : {}),
      },
      staff.email,
    );
    if (!result.ok || !result.id) return result;
    await logStatusEvent({
      deliverable_id: result.id,
      kind: "created",
      to_status: row.status as DeliverableStatus,
      by: staff.email,
    });
    // Adding work to a month that has begun means it's under way.
    if (cycle.state === "planning" && cycle.month <= monthOf(todayKey()))
      await updateRecord(
        TABLES.cycles,
        "month",
        cycle.id,
        { state: "active" },
        staff.email,
      );
    const created = {
      engagement_id: cycle.engagement_id,
      title: String(row.title ?? ""),
    };
    const who = staffName(staff);
    tellAbout(
      created,
      [row.owner as string | null],
      staff.email,
      `${who} made you the owner of a deliverable`,
    );
    if (row.reviewer && row.reviewer !== row.owner)
      tellAbout(
        created,
        [row.reviewer as string | null],
        staff.email,
        `${who} made you the reviewer of a deliverable`,
      );
    refresh();
    return { ...result, message: "Deliverable added" };
  }

  const found = await changeable(staff, key);
  if (!found.ok) return found.result;
  const { deliverable } = found;
  const clashes = editClashes(deliverable, asInput(seen), input);
  if (clashes.length)
    return {
      ok: false,
      message: `Someone else changed ${clashText(clashes)} since you opened this. Close it and open it again to see their change, then make yours.`,
    };
  const clean = cleanDeliverable(input, "update");
  if (!clean.ok) return clean;
  let patch = clean.row;
  delete patch.published_on;
  if (staff.clients !== "manager") {
    const allowed = new Set<string>(MEMBER_FIELDS);
    const blocked = Object.keys(patch).filter(
      (field) =>
        !allowed.has(field) &&
        patch[field] !== deliverable[field as keyof Deliverable],
    );
    if (blocked.length)
      return {
        ok: false,
        message:
          "You can change dates, links and notes here. Ask a client manager for the rest.",
      };
    patch = Object.fromEntries(
      Object.entries(patch).filter(([field]) => allowed.has(field)),
    );
  }
  if (
    deliverable.status === "published" &&
    "published_url" in patch &&
    !patch.published_url
  )
    return {
      ok: false,
      message: "A published deliverable keeps its live link.",
    };
  if (
    patch.scope_line_id &&
    patch.scope_line_id !== deliverable.scope_line_id
  ) {
    const line = await getScopeLine(String(patch.scope_line_id));
    if (line === "error") return TRY_AGAIN;
    if (!line || line.cycle_id !== deliverable.cycle_id)
      return { ok: false, message: "Pick a scope line from this month." };
  }
  if (!Object.keys(patch).length)
    return { ok: true, id: key, message: "Nothing changed" };
  const result = await updateRecord(
    TABLES.deliverables,
    "deliverable",
    key,
    patch,
    staff.email,
  );
  if (!result.ok) return result;
  if (typeof patch.owner === "string" && patch.owner !== deliverable.owner)
    tellAbout(
      deliverable,
      [patch.owner],
      staff.email,
      `${staffName(staff)} made you the owner of a deliverable`,
    );
  if (
    typeof patch.reviewer === "string" &&
    patch.reviewer !== deliverable.reviewer
  )
    tellAbout(
      deliverable,
      [patch.reviewer],
      staff.email,
      `${staffName(staff)} made you the reviewer of a deliverable`,
    );
  refresh();
  return { ...result, message: "Deliverable saved" };
}

/** Deletes a deliverable and its history. Managers only. */
export async function removeDeliverable(id: unknown): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const key = idOf(id);
  if (!key) return UNKNOWN;
  const result = await deleteRecord(TABLES.deliverables, "deliverable", key);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Deliverable deleted" };
}

/**
 * Moves an unfinished deliverable into the month after its own, so work that
 * slipped stops counting against a month that's over. Managers only. The
 * next month is started first if it isn't there (active engagements); the
 * piece joins that month's scope line of the same kind, if there is one.
 * Its due date and week are cleared: they belonged to the old month.
 */
export async function moveToNextMonth(id: unknown): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const found = await changeable(staff, id);
  if (!found.ok) return found.result;
  const { deliverable } = found;
  if (deliverable.status === "published")
    return { ok: false, message: "It's published: it stays in its month." };
  const cycle = await getCycle(deliverable.cycle_id);
  if (cycle === "error") return TRY_AGAIN;
  if (!cycle) return UNKNOWN;
  const month = shiftMonth(cycle.month, 1);
  const findNext = () =>
    loadCycles({ engagementIds: [deliverable.engagement_id], month });
  let next = await findNext();
  if (!next.ok) return TRY_AGAIN;
  if (!next.rows.length) {
    const made = await ensureNextCycles({
      month,
      by: staff.email,
      engagementIds: [deliverable.engagement_id],
    });
    if (!made.ok) return TRY_AGAIN;
    next = await findNext();
    if (!next.ok) return TRY_AGAIN;
  }
  const target = next.rows[0];
  if (!target)
    return {
      ok: false,
      message: `Start ${monthLabel(month)} for this engagement first.`,
    };
  const lines = await loadScopeLines([target.id]);
  const line = lines.ok
    ? lines.rows.find((item) => item.kind === deliverable.kind)
    : undefined;
  const result = await updateRecord(
    TABLES.deliverables,
    "deliverable",
    deliverable.id,
    {
      cycle_id: target.id,
      scope_line_id: line?.id ?? null,
      due_on: null,
      week: null,
    },
    staff.email,
    // Only if it's still where we found it.
    { cycle_id: `eq.${deliverable.cycle_id}` },
  );
  if (!result.ok) return result;
  refresh();
  return {
    ok: true,
    id: deliverable.id,
    message: `Moved to ${monthLabel(month)}. Give it a new due date.`,
  };
}

/**
 * Moves a deliverable to another status. values: { to, published_url?,
 * client_due_on?, comment? }. Checks the move is allowed from where it is
 * (internal engagements may skip Client review) and that it has what the
 * move needs; saves only if nobody moved it meanwhile; logs a status event;
 * posts a line to Slack afterwards.
 */
export async function moveDeliverable(
  id: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await requireClients();
  const found = await changeable(staff, id);
  if (!found.ok) return found.result;
  const { deliverable } = found;
  const move = cleanMove(asInput(values));
  if (!move.ok) return move;
  const engagement = await getEngagement(deliverable.engagement_id);
  if (engagement === "error") return TRY_AGAIN;
  const internal = Boolean(engagement && isInternal(engagement.type));
  const problem = moveProblem(deliverable, move.to, move, {
    internal,
    today: todayKey(),
  });
  if (problem) return { ok: false, message: problem };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: move.to,
    status_changed_at: now,
  };
  if (move.published_url) patch.published_url = move.published_url;
  if (move.client_due_on) patch.client_due_on = move.client_due_on;
  if (move.to === "published") {
    const live = liveAt(move.published_on, todayKey());
    if (!live.ok) return live;
    patch.published_at = live.at;
  }
  const result = await updateRecord(
    TABLES.deliverables,
    "deliverable",
    deliverable.id,
    patch,
    staff.email,
    {
      status: `eq.${deliverable.status}`,
    },
  );
  if (!result.ok) {
    return result.message === UNKNOWN.message
      ? {
          ok: false,
          message: "Someone else moved it just now. Reload to see where it is.",
        }
      : result;
  }
  await logStatusEvent({
    deliverable_id: deliverable.id,
    kind: "status",
    from_status: deliverable.status,
    to_status: move.to,
    comment: move.comment,
    by: staff.email,
  });
  const by = staffName(staff);
  after(async () => {
    if (!clientsSlackReady()) return;
    const context = await slackContext(deliverable);
    await postToClients(
      statusLine({
        ...context,
        from: deliverable.status,
        to: move.to,
        by,
        kind: deliverable.kind,
      }),
    );
  });
  if (move.to === "internal_review")
    tellAbout(
      deliverable,
      [deliverable.reviewer],
      staff.email,
      `${by} sent you a deliverable to review`,
    );
  if (move.to === "changes_requested")
    tellAbout(
      deliverable,
      [deliverable.owner],
      staff.email,
      `${by} asked for changes on your deliverable`,
    );
  refresh();
  return {
    ok: true,
    id: deliverable.id,
    message: `Moved to ${statusLabel(move.to, deliverable.kind)}`,
  };
}

/** Flags a deliverable blocked. values: { reason, waits_on }. */
export async function setBlocked(
  id: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await requireClients();
  const found = await changeable(staff, id);
  if (!found.ok) return found.result;
  const { deliverable } = found;
  const block = cleanBlock(asInput(values));
  if (!block.ok) return block;
  const problem = blockProblem(block);
  if (problem) return { ok: false, message: problem };
  const result = await updateRecord(
    TABLES.deliverables,
    "deliverable",
    deliverable.id,
    {
      blocked: true,
      block_reason: block.reason,
      waits_on: block.waits_on,
      // A changed reason keeps the day it was first blocked.
      blocked_at:
        deliverable.blocked && deliverable.blocked_at
          ? deliverable.blocked_at
          : new Date().toISOString(),
    },
    staff.email,
  );
  if (!result.ok) return result;
  await logStatusEvent({
    deliverable_id: deliverable.id,
    kind: "blocked",
    from_status: deliverable.status,
    to_status: deliverable.status,
    comment: `Waiting on ${labelOf(WAITS_ON, block.waits_on).toLowerCase()}: ${block.reason}`,
    by: staff.email,
  });
  const by = staffName(staff);
  after(async () => {
    if (!clientsSlackReady()) return;
    const context = await slackContext(deliverable);
    await postToClients(
      blockLine({
        ...context,
        blocked: true,
        waitsOn: labelOf(WAITS_ON, block.waits_on).toLowerCase(),
        reason: block.reason,
        by,
      }),
    );
  });
  refresh();
  return { ok: true, message: "Marked as blocked" };
}

/** Clears the blocked flag, with an optional comment on what unblocked it. */
export async function clearBlocked(
  id: unknown,
  comment: unknown = "",
): Promise<ActionResult> {
  const staff = await requireClients();
  const found = await changeable(staff, id);
  if (!found.ok) return found.result;
  const { deliverable } = found;
  if (!deliverable.blocked) return { ok: true, message: "It wasn't blocked" };
  const note =
    typeof comment === "string"
      ? comment.replace(/\s+/g, " ").trim().slice(0, 500)
      : "";
  if (note && looksLikeSecret(note))
    return {
      ok: false,
      message: "That looks like a password or a key. Leave it out.",
    };
  const result = await updateRecord(
    TABLES.deliverables,
    "deliverable",
    deliverable.id,
    { blocked: false, block_reason: "", waits_on: null, blocked_at: null },
    staff.email,
  );
  if (!result.ok) return result;
  await logStatusEvent({
    deliverable_id: deliverable.id,
    kind: "unblocked",
    from_status: deliverable.status,
    to_status: deliverable.status,
    comment: note,
    by: staff.email,
  });
  const by = staffName(staff);
  after(async () => {
    if (!clientsSlackReady()) return;
    const context = await slackContext(deliverable);
    await postToClients(blockLine({ ...context, blocked: false, by }));
  });
  refresh();
  return { ok: true, message: "Unblocked" };
}

/* -------------------------------------------------- templates and people */

/** Saves a type's scope template. values: { lines: TemplateLine[], rhythm? }. */
export async function saveTemplate(
  type: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  if (!isOption(ENGAGEMENT_TYPES, type) && !isCustomType(type))
    return { ok: false, message: "Unknown engagement type." };
  const input = asInput(values);
  const lines = cleanTemplateLines(input.lines);
  if (!lines.ok) return lines;
  const rhythm =
    typeof input.rhythm === "string"
      ? input.rhythm.replace(/\s+/g, " ").trim().slice(0, 300)
      : "";
  if (looksLikeSecret(rhythm))
    return {
      ok: false,
      message:
        "That looks like a password or a key. Don't store those here: share them in a password manager.",
    };
  const result = await saveTemplateRow(
    { engagement_type: type, lines: lines.lines, rhythm },
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return {
    ok: true,
    message: "Template saved. It applies from the next month started.",
  };
}

/**
 * Makes a new template (a team-made engagement type) with a name, starting
 * empty or as a copy of another. values: { name, from? }.
 */
export async function createTemplate(values: unknown): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const input = asInput(values);
  const name =
    typeof input.name === "string"
      ? input.name.replace(/\s+/g, " ").trim().slice(0, 60)
      : "";
  if (name.length < 2)
    return { ok: false, message: "Give the template a name." };
  if (looksLikeSecret(name))
    return {
      ok: false,
      message: "That looks like a password or a key. Pick another name.",
    };
  const key = customTypeKey(name);
  if (!key)
    return { ok: false, message: "Use letters or numbers in the name." };
  const saved = await loadTemplates();
  if (!saved.ok) return { ok: false, message: saved.message };
  const taken = engagementTypes(saved.rows).some(
    (type) =>
      type.value === key || type.label.toLowerCase() === name.toLowerCase(),
  );
  if (taken)
    return { ok: false, message: "A template with that name already exists." };
  const from = input.from;
  const start =
    isOption(ENGAGEMENT_TYPES, from) || isCustomType(from)
      ? templateFor(from, saved.rows)
      : { lines: [], rhythm: "" };
  const result = await saveTemplateRow(
    { engagement_type: key, name, lines: start.lines, rhythm: start.rhythm },
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: `${name} added. Edit it to set its lines.` };
}

/**
 * Goes back to the built-in template for a type. A team-made type is
 * removed instead, unless an engagement still uses it.
 */
export async function resetTemplate(type: unknown): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const own = isCustomType(type);
  if (!isOption(ENGAGEMENT_TYPES, type) && !own)
    return { ok: false, message: "Unknown engagement type." };
  if (own) {
    const engagements = await loadEngagements();
    if (!engagements.ok) return { ok: false, message: engagements.message };
    const using = engagements.rows.filter((row) => row.type === type).length;
    if (using)
      return {
        ok: false,
        message: `${using === 1 ? "1 engagement uses" : `${using} engagements use`} this template. Change ${using === 1 ? "its" : "their"} type first.`,
      };
  }
  const result = await resetTemplateRow(type);
  if (!result.ok) return result;
  refresh();
  return {
    ok: true,
    message: own ? "Template removed" : "Back to the built-in template",
  };
}

/** Saves a person's capacity row. values: { email, name?, role, weekly_capacity, slack_user_id?, active? }. */
export async function savePerson(values: unknown): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const clean = cleanPerson(asInput(values));
  if (!clean.ok) return clean;
  const result = await savePersonRow(clean.row, staff.email);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Capacity saved" };
}

/* ------------------------------------------------------------ month & week */

/**
 * Starts next month (or `month`) for every active engagement that hasn't
 * got it, from the templates. The same as the cron on the 25th.
 */
export async function startNextMonth(month?: unknown): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const target = isMonthKey(month) ? month : shiftMonth(monthOf(todayKey()), 1);
  const result = await ensureNextCycles({ month: target, by: staff.email });
  if (!result.ok) return result;
  refresh();
  if (!result.created && !result.failed)
    return {
      ok: true,
      message: "Every active engagement already has that month",
    };
  return {
    ok: true,
    message: `Started ${result.created} ${result.created === 1 ? "engagement" : "engagements"}`,
    warning: result.failed
      ? `${result.failed} couldn't be started. Try again in a minute.`
      : undefined,
  };
}

/* ------------------------------------------------------- DevRel tracker */

/** May this person change this partner row or milestone? */
function mayChange(
  staff: Viewer,
  row: { owner?: string | null; created_by: string | null },
) {
  if (staff.clients === "manager") return true;
  const me = staff.email.toLowerCase();
  // A row with an owner is the owner's: whoever added it can't take back
  // one a manager has handed to someone else.
  if (row.owner) return row.owner.toLowerCase() === me;
  return row.created_by?.toLowerCase() === me;
}

/** Checks the engagement exists, and is this person's to add to, before something is added to it. */
async function engagementCheck(
  staff: Pick<Viewer, "clientScope">,
  id: unknown,
): Promise<ActionResult | null> {
  const key = idOf(id);
  if (!key) return { ok: false, message: "Pick an engagement." };
  const engagement = await getEngagement(key);
  if (engagement === "error") return TRY_AGAIN;
  if (!engagement || !inScope(staff.clientScope, engagement.client_id))
    return UNKNOWN;
  return null;
}

/**
 * Adds a milestone (no id) or changes one. Anyone in client work adds them;
 * a client manager or whoever added it changes or removes it.
 */
export async function saveMilestone(
  id: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await requireClients();
  const input = asInput(values);
  if (!id) {
    const clean = cleanMilestone(input, "create");
    if (!clean.ok) return clean;
    const problem = await engagementCheck(staff, clean.row.engagement_id);
    if (problem) return problem;
    const result = await insertRecord(
      TABLES.milestones,
      "milestone",
      clean.row,
      staff.email,
    );
    if (!result.ok) return result;
    refresh();
    return { ...result, message: "Milestone added" };
  }
  const key = idOf(id);
  if (!key) return UNKNOWN;
  const found = await getMilestone(key);
  if (found === "error") return TRY_AGAIN;
  if (!found) return UNKNOWN;
  const outside = await outOfScope(staff, found.engagement_id);
  if (outside) return outside;
  if (!mayChange(staff, found))
    return { ok: false, message: "Ask a client manager to change this one." };
  const clean = cleanMilestone(input, "update");
  if (!clean.ok) return clean;
  const result = await updateRecord(
    TABLES.milestones,
    "milestone",
    key,
    clean.row,
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return { ...result, message: "Milestone saved" };
}

export async function removeMilestone(id: unknown): Promise<ActionResult> {
  const staff = await requireClients();
  const key = idOf(id);
  if (!key) return UNKNOWN;
  const found = await getMilestone(key);
  if (found === "error") return TRY_AGAIN;
  if (!found) return UNKNOWN;
  const outside = await outOfScope(staff, found.engagement_id);
  if (outside) return outside;
  if (!mayChange(staff, found))
    return { ok: false, message: "Ask a client manager to remove this one." };
  const result = await deleteRecord(TABLES.milestones, "milestone", key);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Milestone removed" };
}

/**
 * Adds a partner (no id) or changes one. Members add ones they run (they're
 * the owner) and change those; client managers change any.
 */
export async function savePartner(
  id: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await requireClients();
  const input = asInput(values);
  const manages = staff.clients === "manager";
  if (!id) {
    const clean = cleanPartner(input, "create");
    if (!clean.ok) return clean;
    const row = clean.row;
    if (!row.owner) row.owner = staff.email;
    if (
      !manages &&
      String(row.owner).toLowerCase() !== staff.email.toLowerCase()
    )
      return {
        ok: false,
        message:
          "Add yourself as the one who runs it, or ask a client manager.",
      };
    const problem = await engagementCheck(staff, row.engagement_id);
    if (problem) return problem;
    const result = await insertRecord(
      TABLES.partners,
      "partner",
      row,
      staff.email,
    );
    if (!result.ok) return result;
    refresh();
    return { ...result, message: "Partner added" };
  }
  const key = idOf(id);
  if (!key) return UNKNOWN;
  const found = await getPartner(key);
  if (found === "error") return TRY_AGAIN;
  if (!found) return UNKNOWN;
  const outside = await outOfScope(staff, found.engagement_id);
  if (outside) return outside;
  if (!mayChange(staff, found))
    return {
      ok: false,
      message: "You can change the partners you run. Ask a client manager.",
    };
  const clean = cleanPartner(input, "update");
  if (!clean.ok) return clean;
  if (
    !manages &&
    "owner" in clean.row &&
    String(clean.row.owner ?? "").toLowerCase() !== staff.email.toLowerCase()
  )
    return {
      ok: false,
      message: "Ask a client manager to hand it to someone else.",
    };
  if (!Object.keys(clean.row).length)
    return { ok: true, id: key, message: "Nothing changed" };
  const result = await updateRecord(
    TABLES.partners,
    "partner",
    key,
    clean.row,
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return { ...result, message: "Partner saved" };
}

export async function removePartner(id: unknown): Promise<ActionResult> {
  const staff = await requireClients();
  const key = idOf(id);
  if (!key) return UNKNOWN;
  const found = await getPartner(key);
  if (found === "error") return TRY_AGAIN;
  if (!found) return UNKNOWN;
  const outside = await outOfScope(staff, found.engagement_id);
  if (outside) return outside;
  if (!mayChange(staff, found))
    return { ok: false, message: "Ask a client manager to remove this one." };
  const result = await deleteRecord(TABLES.partners, "partner", key);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Partner removed" };
}

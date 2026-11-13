/**
 * A small in-memory stand-in for lib/supabase-server.ts, for tests of the
 * team and money code that reads and writes several tables in a row (sending
 * a payslip, taking in an invoice email). It understands the PostgREST
 * filters that code uses: eq, neq, gt, gte, lt, lte, is.null, in.(…) and the
 * one `or=(a.eq."x",b.eq."x")` form. Not for production code.
 *
 *   vi.mock("@/lib/supabase-server", async () => (await import("@/lib/internal/team/test-db")).fakeSupabase);
 */

type Row = Record<string, unknown>;

const tables = new Map<string, Row[]>();

/** Columns the real tables fill in when a row is added without them. */
const DEFAULTS: Record<string, Row> = {
  team_people: { name: "", kind: "employee", designation: "", active: true, earnings: [], deductions: [] },
  team_payslips: { status: "draft", sent_at: null, sent_by: null, resend_id: null },
  team_reimbursements: { status: "submitted", month: null, note: "", currency: "INR" },
  payments: { status: "due", direction: "out", note: "", currency: "INR", flagged: null },
  payees: { active: true, notes: "" },
};

/** Columns that must be unique, per table: a second row with the same values is refused (23505). */
const UNIQUE: Record<string, string[][]> = {
  team_people: [["email"]],
  team_payslips: [["email", "month"]],
  team_attendance: [["email", "day"]],
  team_reimbursements: [["inbound_id"]],
  payments: [["inbound_id"]],
  internal_members: [["email"]],
};

/** Tables that answer every request with an error, to test what happens when a read or write fails. */
const failing = new Set<string>();
/** Writes to refuse: return true from a hook to make that update fail. */
let updateHook: ((table: string, patch: Row) => boolean) | null = null;

export const db = {
  reset() {
    tables.clear();
    failing.clear();
    updateHook = null;
  },
  rows(table: string): Row[] {
    let rows = tables.get(table);
    if (!rows) tables.set(table, (rows = []));
    return rows;
  },
  add(table: string, ...rows: Row[]) {
    for (const row of rows) db.rows(table).push(withDefaults(table, row));
  },
  fail(table: string, on = true) {
    if (on) failing.add(table);
    else failing.delete(table);
  },
  failUpdates(hook: ((table: string, patch: Row) => boolean) | null) {
    updateHook = hook;
  },
};

function withDefaults(table: string, row: Row): Row {
  return { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...(DEFAULTS[table] ?? {}), ...row };
}

const unquote = (value: string) => value.replace(/^"(.*)"$/, "$1").replace(/\\(["\\])/g, "$1");

function test(row: Row, column: string, filter: string): boolean {
  const cell = row[column];
  const text = cell === null || cell === undefined ? null : String(cell);
  if (filter === "is.null") return text === null;
  const dot = filter.indexOf(".");
  const op = filter.slice(0, dot);
  const value = filter.slice(dot + 1);
  if (op === "in") {
    const list = value.replace(/^\(|\)$/g, "").split(",").map(unquote);
    return text !== null && list.includes(text);
  }
  const wanted = unquote(value);
  if (op === "eq") return text === wanted;
  if (op === "neq") return text !== wanted;
  if (text === null) return false;
  if (op === "gt") return text > wanted;
  if (op === "gte") return text >= wanted;
  if (op === "lt") return text < wanted;
  if (op === "lte") return text <= wanted;
  throw new Error(`test-db: unknown filter ${filter}`);
}

function matches(row: Row, query: URLSearchParams): boolean {
  for (const [key, value] of query) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (key === "or") {
      const parts = value.replace(/^\(|\)$/g, "").split(",");
      const any = parts.some((part) => {
        const dot = part.indexOf(".");
        return test(row, part.slice(0, dot), part.slice(dot + 1));
      });
      if (!any) return false;
      continue;
    }
    if (!test(row, key, value)) return false;
  }
  return true;
}

function clash(table: string, row: Row, except?: Row) {
  return (UNIQUE[table] ?? []).some((columns) =>
    db.rows(table).some(
      (other) =>
        other !== except &&
        columns.every((column) => row[column] !== null && row[column] !== undefined && other[column] === row[column]),
    ),
  );
}

const down = (table: string) => ({ ok: false as const, message: `500 test-db: ${table} is down` });

export const fakeSupabase = {
  isSupabaseConfigured: () => true,

  inList(values: string[]) {
    return `in.(${values.map((value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")})`;
  },

  async insertRow(table: string, row: Row) {
    if (failing.has(table)) return { ...down(table), duplicate: false };
    const full = withDefaults(table, row);
    if (clash(table, full)) return { ok: false as const, duplicate: true, message: "409 23505 duplicate key" };
    db.rows(table).push(full);
    return { ok: true as const };
  },

  async insertRows(table: string, rows: Row[]) {
    if (failing.has(table)) return down(table);
    for (const row of rows) db.rows(table).push(withDefaults(table, row));
    return { ok: true as const };
  },

  async upsertRows(table: string, rows: Row[], options: { onConflict: string; keepExisting?: boolean }) {
    if (failing.has(table)) return down(table);
    const keys = options.onConflict.split(",");
    for (const row of rows) {
      const existing = db.rows(table).find((other) => keys.every((key) => other[key] === row[key]));
      if (!existing) db.rows(table).push(withDefaults(table, row));
      else if (!options.keepExisting) Object.assign(existing, row);
    }
    return { ok: true as const };
  },

  async selectRows(table: string, query: URLSearchParams) {
    if (failing.has(table)) return down(table);
    let rows = db.rows(table).filter((row) => matches(row, query));
    const order = query.get("order");
    if (order) {
      const sorts = order.split(",").map((part) => part.split("."));
      rows = [...rows].sort((a, b) => {
        for (const [column, direction] of sorts) {
          const left = String(a[column] ?? "");
          const right = String(b[column] ?? "");
          if (left !== right) return (left < right ? -1 : 1) * (direction === "desc" ? -1 : 1);
        }
        return 0;
      });
    }
    const total = rows.length;
    const limit = Number(query.get("limit") ?? "1000");
    return { ok: true as const, rows: rows.slice(0, limit).map((row) => ({ ...row })), total };
  },

  async updateRows(table: string, query: URLSearchParams, patch: Row) {
    if (failing.has(table) || updateHook?.(table, patch)) return down(table);
    const rows = db.rows(table).filter((row) => matches(row, query));
    for (const row of rows) Object.assign(row, patch);
    return { ok: true as const, count: rows.length };
  },

  async deleteRows(table: string, query: URLSearchParams) {
    if (failing.has(table)) return down(table);
    const all = db.rows(table);
    const gone = all.filter((row) => matches(row, query));
    tables.set(
      table,
      all.filter((row) => !gone.includes(row)),
    );
    return { ok: true as const, count: gone.length };
  },

  async uploadFile() {
    return { ok: true as const };
  },
  async downloadFile() {
    return { ok: false as const, notFound: true, message: "404" };
  },
  async removeFiles() {},
  async signedFileUrl() {
    return { ok: false as const, message: "test-db has no files" };
  },
};

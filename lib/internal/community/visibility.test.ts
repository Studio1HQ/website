import { describe, expect, it } from "vitest";
import {
  ENTITIES,
  isEntityKey,
  type CommunityEvent,
  type EntityKey,
  type Sponsor,
} from "@/lib/internal/community/schema";
import {
  canActOnTask,
  isMoneyEntity,
  moneyFields,
  seesMoney,
  visibleFields,
  visibleRows,
  visibleTasks,
  withoutMoney,
  writesMoney,
} from "@/lib/internal/community/visibility";

const entities = Object.keys(ENTITIES).filter(isEntityKey);

describe("money marks in the schema", () => {
  it("marks every amount and currency field as money", () => {
    for (const entity of entities) {
      for (const field of ENTITIES[entity].fields) {
        if (field.type === "money" || field.type === "currency")
          expect(field.money, `${entity}.${field.key}`).toBe(true);
      }
    }
  });

  it("treats sponsorships and expenses as money all through", () => {
    expect(entities.filter(isMoneyEntity)).toEqual(["sponsorship", "expense"]);
  });

  it("knows which fields of the other records are money", () => {
    const keys = (entity: EntityKey) =>
      moneyFields(entity).map((field) => field.key);
    expect(keys("event")).toEqual(["budget", "currency"]);
    expect(keys("sponsor")).toEqual(["ask_amount", "currency"]);
    expect(keys("task")).toEqual([]);
    expect(keys("partner")).toEqual([]);
  });
});

describe("seesMoney", () => {
  it("is for managers only", () => {
    expect(seesMoney("manager")).toBe(true);
    expect(seesMoney("viewer")).toBe(false);
    expect(seesMoney(null)).toBe(false);
    expect(seesMoney(undefined)).toBe(false);
  });
});

describe("withoutMoney", () => {
  const event = {
    id: "e1",
    name: "Meetup",
    capacity: 80,
    budget: 120000,
    currency: "USD",
  } as CommunityEvent;
  const sponsor = {
    id: "s1",
    name: "Acme",
    tier: "Gold",
    ask_amount: 5000,
    currency: "USD",
  } as Sponsor;

  it("blanks an event's budget and currency and keeps the rest", () => {
    const [row] = withoutMoney("event", [event]);
    expect(row).toEqual({
      id: "e1",
      name: "Meetup",
      capacity: 80,
      budget: null,
      currency: "INR",
    });
    // The original row is untouched.
    expect(event.budget).toBe(120000);
  });

  it("blanks a sponsor's ask", () => {
    const [row] = withoutMoney("sponsor", [sponsor]);
    expect(row.ask_amount).toBeNull();
    expect(row.currency).toBe("INR");
    expect(row.name).toBe("Acme");
    expect(JSON.stringify(row)).not.toContain("5000");
  });

  it("returns no sponsorships or expenses at all", () => {
    expect(
      withoutMoney("sponsorship", [{ id: "d1", amount: 900, in_kind: "" }]),
    ).toEqual([]);
    expect(
      withoutMoney("expense", [{ id: "x1", amount: 40, vendor: "Cafe" }]),
    ).toEqual([]);
  });

  it("leaves records without money as they are", () => {
    const task = { id: "t1", title: "Book the hall", owner: null };
    expect(withoutMoney("task", [task])).toEqual([task]);
  });
});

describe("visibleRows and visibleFields", () => {
  const event = { id: "e1", budget: 500, currency: "USD" };

  it("gives managers everything", () => {
    expect(visibleRows("event", [event], "manager")).toEqual([event]);
    expect(visibleFields("event", "manager")).toBe(ENTITIES.event.fields);
    expect(visibleFields("expense", "manager")).toBe(ENTITIES.expense.fields);
  });

  it("gives interns no money", () => {
    expect(visibleRows("event", [event], "viewer")).toEqual([
      { id: "e1", budget: null, currency: "INR" },
    ]);
    expect(visibleRows("expense", [{ id: "x1", amount: 1 }], "viewer")).toEqual(
      [],
    );
    const keys = visibleFields("event", "viewer").map((field) => field.key);
    expect(keys).not.toContain("budget");
    expect(keys).not.toContain("currency");
    expect(keys).toContain("name");
    expect(
      visibleFields("sponsor", "viewer").map((field) => field.key),
    ).not.toContain("ask_amount");
    expect(visibleFields("sponsorship", "viewer")).toEqual([]);
    expect(visibleFields("expense", null)).toEqual([]);
    expect(visibleFields("task", "viewer")).toEqual(ENTITIES.task.fields);
  });
});

describe("writesMoney", () => {
  it("is true for any sponsorship or expense, and for money fields", () => {
    expect(writesMoney("expense", { status: "paid" })).toBe(true);
    expect(writesMoney("sponsorship", {})).toBe(true);
    expect(writesMoney("event", { budget: "100" })).toBe(true);
    expect(writesMoney("sponsor", { currency: "USD" })).toBe(true);
    expect(writesMoney("event", { status: "done" })).toBe(false);
    expect(writesMoney("task", { status: "done" })).toBe(false);
  });
});

describe("tasks", () => {
  const tasks = [
    { id: "1", owner: "intern@studio1hq.com" },
    { id: "2", owner: "Intern@Studio1HQ.com " },
    { id: "3", owner: "lead@studio1hq.com" },
    { id: "4", owner: null },
    { id: "5", owner: "Intern" },
  ];
  const intern = {
    email: "intern@studio1hq.com",
    community: "viewer",
  } as const;
  const manager = {
    email: "lead@studio1hq.com",
    community: "manager",
  } as const;

  it("gives an intern only the tasks assigned to them", () => {
    expect(visibleTasks(tasks, intern).map((task) => task.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("gives managers every task", () => {
    expect(visibleTasks(tasks, manager)).toHaveLength(5);
  });

  it("lets an intern act on their own tasks only", () => {
    expect(canActOnTask(tasks[0], intern)).toBe(true);
    expect(canActOnTask(tasks[2], intern)).toBe(false);
    expect(canActOnTask(tasks[3], intern)).toBe(false);
    expect(canActOnTask(tasks[4], intern)).toBe(false);
    expect(canActOnTask(tasks[2], manager)).toBe(true);
    expect(canActOnTask(tasks[3], manager)).toBe(true);
    expect(canActOnTask(tasks[0], { email: "", community: "viewer" })).toBe(
      false,
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", async () => (await import("@/lib/internal/team/test-db")).fakeSupabase);

const { db } = await import("@/lib/internal/team/test-db");
const { ensureOwnersOnTeam, getPerson, listPeople, listPeoplePay, reviewerProblem, teamAccessFor } = await import("@/lib/internal/team/people");

beforeEach(() => {
  db.reset();
  db.add(
    "team_people",
    { email: "e@studio1hq.com", name: "Esha", earnings: [{ label: "Basic", amount: 50000 }] },
    { email: "i@studio1hq.com", name: "Ira", kind: "intern", reviewer: "e@studio1hq.com", earnings: [{ label: "Stipend", amount: 15000 }] },
    { email: "j@studio1hq.com", name: "Jay", kind: "intern", reviewer: "writer@gmail.com" },
    { email: "gone@studio1hq.com", name: "Gul", active: false },
  );
});

describe("the team list", () => {
  it("never hands salary lines to anything but payroll", async () => {
    const people = await listPeople();
    expect(people.ok && people.people.every((person) => !("earnings" in person) && !("deductions" in person))).toBe(true);
    const one = await getPerson("i@studio1hq.com");
    expect(one && "earnings" in one).toBe(false);
    const access = await teamAccessFor("e@studio1hq.com");
    expect(access.person && "earnings" in access.person).toBe(false);

    const pay = await listPeoplePay();
    expect(pay.ok && pay.people.find((person) => person.email === "i@studio1hq.com")?.earnings).toEqual([{ label: "Stipend", amount: 15000 }]);
  });

  it("gives a reviewer their interns, but not to an outside address", async () => {
    expect((await teamAccessFor("e@studio1hq.com")).interns).toEqual(["i@studio1hq.com"]);
    expect((await teamAccessFor("writer@gmail.com")).interns).toEqual([]);
  });

  it("only takes a reviewer who's at Studio1 and still around", async () => {
    expect(await reviewerProblem("arindam@studio1hq.com")).toBeNull();
    expect(await reviewerProblem("e@studio1hq.com")).toBeNull();
    expect(await reviewerProblem("writer@gmail.com")).not.toBeNull();
    expect(await reviewerProblem("gone@studio1hq.com")).not.toBeNull();
    expect(await reviewerProblem("nobody@studio1hq.com")).not.toBeNull();
    db.add("internal_members", { email: "m@studio1hq.com", status: "active", roles: ["hiring_viewer"] });
    expect(await reviewerProblem("m@studio1hq.com")).toBeNull();
    db.add("internal_members", { email: "off@studio1hq.com", status: "disabled", roles: ["hiring_viewer"] });
    expect(await reviewerProblem("off@studio1hq.com")).not.toBeNull();
  });
});

describe("the founders on the team list", () => {
  it("adds whichever founder is missing, once, and leaves an existing row alone", async () => {
    db.add("team_people", { email: "amitesh@studio1hq.com", name: "Amitesh A", designation: "CEO", active: false });
    await ensureOwnersOnTeam();
    await ensureOwnersOnTeam();
    const founders = db.rows("team_people").filter((row) => String(row.email).match(/^(arindam|amitesh)@/));
    expect(founders).toHaveLength(2);
    expect(founders.find((row) => row.email === "arindam@studio1hq.com")).toMatchObject({ name: "Arindam", kind: "employee", designation: "Co-founder", active: true });
    expect(founders.find((row) => row.email === "amitesh@studio1hq.com")).toMatchObject({ name: "Amitesh A", designation: "CEO", active: false });
    // Payroll then lists the founder, ready for salary lines.
    const pay = await listPeoplePay();
    expect(pay.ok && pay.people.some((person) => person.email === "arindam@studio1hq.com" && person.earnings.length === 0)).toBe(true);
  });
});

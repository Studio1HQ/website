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

describe("keeping the roster and dashboard access in step", async () => {
  const { addMissingMembers, addToTeam, ensureOnTeam } = await import("@/lib/internal/team/people");
  const { addMember, decideMember, inviteMember } = await import("@/lib/internal/members");

  it("puts someone approved on the team list once, and never brings back someone who left", async () => {
    expect(await addToTeam("kat@studio1hq.com", "", "arindam@studio1hq.com")).toBe(true);
    expect(await addToTeam("kat@studio1hq.com", "Kat", "arindam@studio1hq.com")).toBe(false);
    expect(db.rows("team_people").find((row) => row.email === "kat@studio1hq.com")).toMatchObject({ name: "Kat", kind: "employee", active: true });
    expect(await addToTeam("gone@studio1hq.com", "", "arindam@studio1hq.com")).toBe(false);
    expect(db.rows("team_people").find((row) => row.email === "gone@studio1hq.com")?.active).toBe(false);
    // And the person then has My day.
    expect((await teamAccessFor("kat@studio1hq.com")).person?.email).toBe("kat@studio1hq.com");
  });

  it("adds a signed-in member missing from the list only once per server, retrying after a failure", async () => {
    db.fail("team_people");
    expect(await ensureOnTeam("new@studio1hq.com", "New Person")).toBe(false);
    db.fail("team_people", false);
    expect(await ensureOnTeam("new@studio1hq.com", "New Person")).toBe(true);
    expect(await ensureOnTeam("new@studio1hq.com", "New Person")).toBe(false);
    expect(db.rows("team_people").filter((row) => row.email === "new@studio1hq.com")).toHaveLength(1);
  });

  it("lets staff be approved or invited with no areas (My day and Tasks), but not outside writers", async () => {
    db.add("internal_members", { email: "p@studio1hq.com", status: "pending", roles: [] });
    expect((await decideMember("p@studio1hq.com", { status: "active", roles: [] }, "arindam@studio1hq.com")).ok).toBe(true);
    expect((await inviteMember("q@studio1hq.com", [], "arindam@studio1hq.com")).ok).toBe(true);
    expect((await inviteMember("writer@gmail.com", [], "arindam@studio1hq.com")).ok).toBe(false);
    db.add("internal_members", { email: "w@gmail.com", status: "active", roles: ["blog_writer"] });
    expect((await decideMember("w@gmail.com", { status: "active", roles: [] }, "arindam@studio1hq.com")).ok).toBe(false);
  });

  it("gives someone from People a member row on their first change, and won't write over one that turned up", async () => {
    expect((await addMember("e@studio1hq.com", { status: "active", roles: ["client_member"] }, "arindam@studio1hq.com")).ok).toBe(true);
    expect(db.rows("internal_members").find((row) => row.email === "e@studio1hq.com")).toMatchObject({ status: "active", roles: ["client_member"] });
    const again = await addMember("e@studio1hq.com", { status: "disabled", roles: [] }, "arindam@studio1hq.com");
    expect(again.ok).toBe(false);
    expect(db.rows("internal_members").find((row) => row.email === "e@studio1hq.com")?.status).toBe("active");
    expect((await addMember("arindam@studio1hq.com", { status: "active", roles: [] }, "amitesh@studio1hq.com")).ok).toBe(false);
  });

  it("fills People with every approved Studio1 member missing from it, and nobody else", async () => {
    const members = [
      { email: "kathank@studio1hq.com", name: "", status: "active" as const },
      { email: "e@studio1hq.com", name: "Esha", status: "active" as const },
      { email: "gone@studio1hq.com", name: "", status: "active" as const },
      { email: "wait@studio1hq.com", name: "", status: "pending" as const },
      { email: "off@studio1hq.com", name: "", status: "disabled" as const },
      { email: "writer@gmail.com", name: "", status: "active" as const },
    ];
    const people = await listPeople();
    expect(people.ok).toBe(true);
    const added = await addMissingMembers(members, people.ok ? people.people : [], "arindam@studio1hq.com");
    expect(added).toEqual(["kathank@studio1hq.com"]);
    expect(db.rows("team_people").find((row) => row.email === "kathank@studio1hq.com")).toMatchObject({ name: "Kathank", active: true });
    expect(db.rows("team_people").find((row) => row.email === "gone@studio1hq.com")?.active).toBe(false);
    // In step now: a second run adds nobody.
    const again = await listPeople();
    expect(await addMissingMembers(members, again.ok ? again.people : [], "arindam@studio1hq.com")).toEqual([]);
  });
});

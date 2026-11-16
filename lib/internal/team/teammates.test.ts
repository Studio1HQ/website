import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", async () => (await import("@/lib/internal/team/test-db")).fakeSupabase);

const { db } = await import("@/lib/internal/team/test-db");
const { addTeammate, mergeTeam, saveTeammate, setTeammateOn } = await import("@/lib/internal/team/teammates");
const { listMembers } = await import("@/lib/internal/members");
const { listPeople } = await import("@/lib/internal/team/people");

const founder = { email: "arindam@studio1hq.com", owner: true };
const admin = { email: "ada@studio1hq.com", owner: false };

const person = (email: string) => db.rows("team_people").find((row) => row.email === email);
const member = (email: string) => db.rows("internal_members").find((row) => row.email === email);

async function team() {
  const [people, members] = await Promise.all([listPeople(), listMembers()]);
  return mergeTeam(people.ok ? people.people : [], members ?? []);
}

beforeEach(() => {
  db.reset();
  db.add(
    "team_people",
    { email: "arindam@studio1hq.com", name: "Arindam" },
    { email: "ada@studio1hq.com", name: "Ada" },
    { email: "kat@studio1hq.com", name: "Kat" },
    { email: "gone@studio1hq.com", name: "Gul", active: false },
  );
  db.add(
    "internal_members",
    { email: "ada@studio1hq.com", status: "active", roles: ["admin"], requested_at: "2026-11-01T00:00:00Z" },
    { email: "kat@studio1hq.com", status: "active", roles: ["client_member"], requested_at: "2026-11-02T00:00:00Z" },
    { email: "wait@studio1hq.com", status: "pending", roles: [], requested_at: "2026-11-10T00:00:00Z" },
    { email: "writer@gmail.com", status: "active", roles: ["blog_writer"], requested_at: "2026-11-03T00:00:00Z" },
  );
});

describe("the one team list", () => {
  it("shows the roster and the members as one row each, waiting first and those turned off last", async () => {
    const rows = await team();
    expect(rows.map((row) => [row.email, row.status])).toEqual([
      ["wait@studio1hq.com", "pending"],
      ["arindam@studio1hq.com", "owner"],
      ["ada@studio1hq.com", "active"],
      ["kat@studio1hq.com", "active"],
      ["writer@gmail.com", "active"],
      ["gone@studio1hq.com", "off"],
    ]);
    expect(rows.find((row) => row.email === "kat@studio1hq.com")).toMatchObject({ name: "Kat", roles: ["client_member"], outside: false });
    expect(rows.find((row) => row.email === "writer@gmail.com")).toMatchObject({ person: null, outside: true, roles: ["blog_writer"] });
  });
});

describe("adding someone", () => {
  it("puts a Studio1 address on the roster with its details and the areas picked, in one go", async () => {
    const added = await addTeammate(admin, {
      email: "New.Person@studio1hq.com",
      name: "New Person",
      kind: "intern",
      reviewer: "kat@studio1hq.com",
      designation: "Writer",
      roles: ["blog_writer", "client_member"],
    });
    expect(added).toEqual({ ok: true, email: "new.person@studio1hq.com", roles: ["blog_writer", "client_member"] });
    expect(person("new.person@studio1hq.com")).toMatchObject({ name: "New Person", kind: "intern", reviewer: "kat@studio1hq.com", active: true });
    expect(member("new.person@studio1hq.com")).toMatchObject({ status: "active", roles: ["blog_writer", "client_member"], invited_by: admin.email });
  });

  it("lets any admin add staff with no areas, but keeps Admin, Team tasks and outside writers with the founders", async () => {
    expect((await addTeammate(admin, { email: "plain@studio1hq.com", roles: [] })).ok).toBe(true);
    expect(person("plain@studio1hq.com")?.name).toBe("Plain");

    expect((await addTeammate(admin, { email: "boss@studio1hq.com", roles: ["admin"] })).ok).toBe(false);
    expect((await addTeammate(admin, { email: "lead@studio1hq.com", roles: ["tasks_viewer"] })).ok).toBe(false);
    expect((await addTeammate(admin, { email: "pen@gmail.com", roles: ["blog_writer"] })).ok).toBe(false);
    // A refused add writes nothing.
    expect(person("boss@studio1hq.com")).toBeUndefined();
    expect(member("pen@gmail.com")).toBeUndefined();

    const outside = await addTeammate(founder, { email: "pen@gmail.com", name: "Pen", roles: ["admin", "client_manager"] });
    expect(outside).toMatchObject({ ok: true, roles: ["blog_writer"] });
    expect(person("pen@gmail.com")).toBeUndefined();
  });

  it("won't add someone who's already on the team, or a founder", async () => {
    expect(await addTeammate(founder, { email: "kat@studio1hq.com" })).toMatchObject({ ok: false, message: expect.stringContaining("already on the team") });
    expect((await addTeammate(founder, { email: "gone@studio1hq.com" })).ok).toBe(false);
    expect((await addTeammate(founder, { email: "writer@gmail.com" })).ok).toBe(false);
    expect((await addTeammate(admin, { email: "amitesh@studio1hq.com" })).ok).toBe(false);
  });

  it("approves someone who asked earlier when they're added", async () => {
    expect((await addTeammate(admin, { email: "wait@studio1hq.com", roles: ["hiring_viewer"] })).ok).toBe(true);
    expect(member("wait@studio1hq.com")).toMatchObject({ status: "active", roles: ["hiring_viewer"] });
    expect(person("wait@studio1hq.com")?.active).toBe(true);
  });
});

describe("changing someone", () => {
  it("saves details and access together, and approves someone waiting", async () => {
    const saved = await saveTeammate(admin, { email: "kat@studio1hq.com", name: "Kathan", designation: "DevRel", roles: ["client_manager"] });
    expect(saved.ok).toBe(true);
    expect(person("kat@studio1hq.com")).toMatchObject({ name: "Kathan", designation: "DevRel" });
    expect(member("kat@studio1hq.com")?.roles).toEqual(["client_manager"]);

    expect(await saveTeammate(admin, { email: "wait@studio1hq.com", roles: [] })).toEqual({ ok: true, message: "Approved" });
    expect(member("wait@studio1hq.com")?.status).toBe("active");
    // On the dashboard but not the roster yet: saving puts them there.
    expect(person("wait@studio1hq.com")?.active).toBe(true);
  });

  it("checks access before writing anything", async () => {
    const refused = await saveTeammate(admin, { email: "kat@studio1hq.com", name: "Changed", roles: ["admin"] });
    expect(refused.ok).toBe(false);
    expect(person("kat@studio1hq.com")?.name).toBe("Kat");
    expect((await saveTeammate(admin, { email: "ada@studio1hq.com", name: "Ada", roles: [] })).ok).toBe(false);
    expect(member("ada@studio1hq.com")?.roles).toEqual(["admin"]);
    // Off people, the founders' access and your own stay as they are.
    expect((await saveTeammate(founder, { email: "gone@studio1hq.com", roles: ["client_member"] })).ok).toBe(false);
    expect((await saveTeammate(founder, { email: "arindam@studio1hq.com", name: "Arindam M", roles: [] })).ok).toBe(true);
    expect(person("arindam@studio1hq.com")?.name).toBe("Arindam M");
  });

  it("gives someone only on the roster a member row on their first change", async () => {
    db.add("team_people", { email: "solo@studio1hq.com", name: "Solo" });
    expect((await saveTeammate(admin, { email: "solo@studio1hq.com", name: "Solo", roles: ["hiring_viewer"] })).ok).toBe(true);
    expect(member("solo@studio1hq.com")).toMatchObject({ status: "active", roles: ["hiring_viewer"] });
  });
});

describe("turning someone off and back on", () => {
  it("takes them off both lists at once, and brings back what they had", async () => {
    expect((await setTeammateOn(founder, "kat@studio1hq.com", false)).ok).toBe(true);
    expect(member("kat@studio1hq.com")).toMatchObject({ status: "disabled", roles: ["client_member"] });
    expect(person("kat@studio1hq.com")?.active).toBe(false);
    expect((await team()).find((row) => row.email === "kat@studio1hq.com")?.status).toBe("off");

    expect((await setTeammateOn(founder, "kat@studio1hq.com", true)).ok).toBe(true);
    expect(member("kat@studio1hq.com")).toMatchObject({ status: "active", roles: ["client_member"] });
    expect(person("kat@studio1hq.com")?.active).toBe(true);
  });

  it("brings back someone who'd only been marked as left, and keeps someone only on the roster out at sign-in", async () => {
    expect((await setTeammateOn(founder, "gone@studio1hq.com", true)).ok).toBe(true);
    expect(person("gone@studio1hq.com")?.active).toBe(true);
    db.add("team_people", { email: "solo@studio1hq.com", name: "Solo" });
    expect((await setTeammateOn(founder, "solo@studio1hq.com", false)).ok).toBe(true);
    expect(member("solo@studio1hq.com")?.status).toBe("disabled");
  });

  it("is the founders' call, never on themselves", async () => {
    expect((await setTeammateOn(admin, "kat@studio1hq.com", false)).ok).toBe(false);
    expect((await setTeammateOn(founder, "arindam@studio1hq.com", false)).ok).toBe(false);
    expect((await setTeammateOn(founder, "amitesh@studio1hq.com", false)).ok).toBe(false);
    expect(member("kat@studio1hq.com")?.status).toBe("active");
  });
});

describe("giving a Client team member only some clients", () => {
  const measure = "11111111-1111-4111-8111-111111111111";
  const nebius = "22222222-2222-4222-8222-222222222222";
  beforeEach(() => {
    db.add("client_accounts", { id: measure, name: "Measure", slug: "measure", archived_at: null }, { id: nebius, name: "Nebius", slug: "nebius", archived_at: null });
  });

  it("saves the clients with the roles when someone is added, and only for Own work", async () => {
    expect((await addTeammate(admin, { email: "shiv@studio1hq.com", roles: ["client_member"], client_ids: [nebius] })).ok).toBe(true);
    expect(member("shiv@studio1hq.com")).toMatchObject({ roles: ["client_member"], client_ids: [nebius] });
    expect((await team()).find((row) => row.email === "shiv@studio1hq.com")?.clientIds).toEqual([nebius]);

    // A manager runs every client: any list sent is dropped.
    expect((await addTeammate(founder, { email: "lead@studio1hq.com", roles: ["client_manager"], client_ids: [nebius] })).ok).toBe(true);
    expect(member("lead@studio1hq.com")?.client_ids ?? null).toBeNull();
  });

  it("refuses clients that aren't there, before writing anything", async () => {
    const bad = await addTeammate(admin, { email: "x@studio1hq.com", roles: ["client_member"], client_ids: ["33333333-3333-4333-8333-333333333333"] });
    expect(bad.ok).toBe(false);
    expect((await addTeammate(admin, { email: "x@studio1hq.com", roles: ["client_member"], client_ids: ["nope"] })).ok).toBe(false);
    expect(person("x@studio1hq.com")).toBeUndefined();
    expect(member("x@studio1hq.com")).toBeUndefined();
  });

  it("changes someone's clients on their own, and clears them when they stop being Client team", async () => {
    expect((await saveTeammate(admin, { email: "kat@studio1hq.com", name: "Kat", roles: ["client_member"], client_ids: [measure, nebius] })).ok).toBe(true);
    expect(member("kat@studio1hq.com")?.client_ids).toEqual([measure, nebius]);
    expect((await saveTeammate(admin, { email: "kat@studio1hq.com", name: "Kat", roles: ["client_member"], client_ids: [measure] })).ok).toBe(true);
    expect(member("kat@studio1hq.com")?.client_ids).toEqual([measure]);
    expect((await saveTeammate(admin, { email: "kat@studio1hq.com", name: "Kat", roles: ["client_manager"], client_ids: [measure] })).ok).toBe(true);
    expect(member("kat@studio1hq.com")).toMatchObject({ roles: ["client_manager"], client_ids: null });
  });

  it("keeps an admin's other limits: no scoping another admin", async () => {
    expect((await saveTeammate(admin, { email: "ada@studio1hq.com", name: "Ada", roles: ["admin"], client_ids: [measure] })).ok).toBe(true);
    // Admins see every client, so nothing was written for them.
    expect(member("ada@studio1hq.com")?.client_ids ?? null).toBeNull();
  });
});


describe("writes that hold to what was read", async () => {
  const { decideMember, inviteMember } = await import("@/lib/internal/members");
  const measure = "11111111-1111-4111-8111-111111111111";

  it("won't put back Team tasks a founder took away after the read", async () => {
    db.add("internal_members", { email: "assoc@studio1hq.com", status: "active", roles: ["client_member"] });
    // Read when they still had Team tasks; a founder removed it since.
    const stale = await decideMember(
      "assoc@studio1hq.com",
      { status: "active", roles: ["client_member", "tasks_viewer"] },
      admin.email,
      { statusWas: "active", tasksViewer: true },
    );
    expect(stale.ok).toBe(false);
    expect(member("assoc@studio1hq.com")?.roles).toEqual(["client_member"]);
  });

  it("won't let an invite write over a row that appeared after the check", async () => {
    db.add("internal_members", { email: "late@studio1hq.com", status: "disabled", roles: [] });
    expect((await inviteMember("late@studio1hq.com", ["client_member"], admin.email, undefined, "none")).ok).toBe(false);
    expect(member("late@studio1hq.com")?.status).toBe("disabled");
  });

  it("clears an old client list when someone is added back with every client", async () => {
    db.add("client_accounts", { id: measure, name: "Measure", slug: "measure", archived_at: null });
    db.add("internal_members", { email: "back@studio1hq.com", status: "pending", roles: [], client_ids: [measure] });
    expect((await addTeammate(founder, { email: "back@studio1hq.com", roles: ["client_member"] })).ok).toBe(true);
    expect(member("back@studio1hq.com")).toMatchObject({ status: "active", client_ids: null });
  });

  it("says so when access comes back but the roster write fails", async () => {
    db.add("internal_members", { email: "noroster@studio1hq.com", status: "disabled", roles: [] });
    db.fail("team_people");
    const result = await setTeammateOn(founder, "noroster@studio1hq.com", true);
    db.fail("team_people", false);
    expect(result.ok).toBe(false);
    expect(member("noroster@studio1hq.com")?.status).toBe("active");
  });
});

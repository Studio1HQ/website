import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Staff } from "@/lib/internal/session";
import type { TeamPerson } from "@/lib/internal/team/shared";

vi.mock("@/lib/supabase-server", async () => (await import("@/lib/internal/team/test-db")).fakeSupabase);
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { db } = await import("@/lib/internal/team/test-db");
const { dayStatusFor, endDayFor, startDayFor } = await import("@/lib/internal/team/day-clock");

const EMAIL = "e@studio1hq.com";
const person: TeamPerson = {
  email: EMAIL,
  name: "Esha",
  employee_code: null,
  photo_path: null,
  kind: "employee",
  designation: "",
  joined_on: null,
  reviewer: null,
  active: true,
  updated_at: "",
};
const staff = { email: EMAIL, roles: [], interns: [], person } as unknown as Staff;

/** The clock at an IST date and time ("2026-11-25", "00:30"). */
function at(date: string, time: string) {
  vi.setSystemTime(new Date(`${date}T${time}:00+05:30`));
}

function row(day: string) {
  return db.rows("team_attendance").find((entry) => entry.day === day) ?? null;
}

function log(day: string, slots: { start: string; end: string | null }[], more: Record<string, unknown> = {}) {
  db.add("team_attendance", {
    email: EMAIL,
    day,
    kind: "work",
    leave_type: null,
    start_time: slots[0]?.start ?? null,
    end_time: slots[slots.length - 1]?.end ?? null,
    slots,
    active_minutes: null,
    note: "",
    logged_by: EMAIL,
    ...more,
  });
}

beforeEach(() => {
  db.reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the day clock", () => {
  it("starts and ends a slot on today", async () => {
    at("2026-11-24", "09:30");
    expect(await startDayFor(staff, person)).toEqual({ ok: true, message: "Started at 09:30" });
    expect((await startDayFor(staff, person)).ok).toBe(false);
    at("2026-11-24", "18:00");
    expect(await endDayFor(staff, person)).toEqual({ ok: true, message: "Ended at 18:00" });
    expect(row("2026-11-24")).toMatchObject({ slots: [{ start: "09:30", end: "18:00" }], end_time: "18:00", active_minutes: 510 });
    expect(await endDayFor(staff, person)).toEqual({ ok: false, message: "Nothing's running. Start another slot first." });
  });

  it("says to start first when nothing is running on either day", async () => {
    at("2026-11-25", "00:30");
    expect(await endDayFor(staff, person)).toEqual({ ok: false, message: "Start your day first." });
    log("2026-11-24", [{ start: "09:30", end: "18:00" }]);
    expect(await endDayFor(staff, person)).toEqual({ ok: false, message: "Start your day first." });
  });

  it("ends a slot started yesterday on yesterday's row, after midnight", async () => {
    log("2026-11-24", [{ start: "10:00", end: "13:00" }, { start: "22:00", end: null }], { active_minutes: 180 });
    at("2026-11-25", "00:30");
    expect(await dayStatusFor(person)).toEqual({ ok: true, running: "22:00", minutes: 330, leave: false });
    expect(await endDayFor(staff, person)).toEqual({ ok: true, message: "Ended at 00:30" });
    expect(row("2026-11-24")).toMatchObject({
      slots: [{ start: "10:00", end: "13:00" }, { start: "22:00", end: "00:30" }],
      start_time: "10:00",
      end_time: "00:30",
      active_minutes: 330,
    });
    // Nothing was written on today, and the clock is free again.
    expect(row("2026-11-25")).toBeNull();
    expect(await dayStatusFor(person)).toEqual({ ok: true, running: null, minutes: 0, leave: false });
    expect((await startDayFor(staff, person)).ok).toBe(true);
  });

  it("won't start a second slot while yesterday's is still running", async () => {
    log("2026-11-24", [{ start: "22:00", end: null }]);
    at("2026-11-25", "00:30");
    expect(await startDayFor(staff, person)).toEqual({
      ok: false,
      message: "You're already working, since 22:00 yesterday. End that slot first.",
    });
    expect(row("2026-11-25")).toBeNull();
  });

  it("treats a slot left open for a whole day as forgotten", async () => {
    log("2026-11-24", [{ start: "09:30", end: null }]);
    at("2026-11-25", "09:45");
    expect(await dayStatusFor(person)).toEqual({ ok: true, running: null, minutes: 0, leave: false });
    expect(await endDayFor(staff, person)).toEqual({ ok: false, message: "Start your day first." });
    expect(await startDayFor(staff, person)).toEqual({ ok: true, message: "Started at 09:45" });
    expect(row("2026-11-24")).toMatchObject({ slots: [{ start: "09:30", end: null }] });
  });

  it("keeps yesterday's locks: a payslip made, or a day someone else logged", async () => {
    log("2026-11-30", [{ start: "22:00", end: null }]);
    db.add("team_payslips", { email: EMAIL, month: "2026-11-01" });
    at("2026-12-01", "00:30");
    expect(await endDayFor(staff, person)).toEqual({
      ok: false,
      message: "That month's payslip is already made, so its days are locked. Ask an admin.",
    });
    expect(row("2026-11-30")).toMatchObject({ slots: [{ start: "22:00", end: null }] });

    db.reset();
    log("2026-11-24", [{ start: "22:00", end: null }], { logged_by: "admin@studio1hq.com" });
    at("2026-11-25", "00:30");
    expect(await endDayFor(staff, person)).toEqual({ ok: false, message: "Someone else logged that day. Ask an admin to change it." });
  });

  it("still ends yesterday's slot when today is a leave day", async () => {
    log("2026-11-24", [{ start: "22:00", end: null }]);
    db.add("team_attendance", { email: EMAIL, day: "2026-11-25", kind: "leave", leave_type: "paid", slots: [], note: "", logged_by: EMAIL });
    at("2026-11-25", "00:30");
    expect(await dayStatusFor(person)).toEqual({ ok: true, running: "22:00", minutes: 150, leave: false });
    expect((await endDayFor(staff, person)).ok).toBe(true);
    expect(row("2026-11-24")).toMatchObject({ end_time: "00:30", active_minutes: 150 });
    expect(await dayStatusFor(person)).toEqual({ ok: true, running: null, minutes: 0, leave: true });
  });
});

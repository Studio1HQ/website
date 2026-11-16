import { describe, expect, it } from "vitest";
import { canPlanCalls, canSeeAllCalls, canSeeCalls } from "@/lib/internal/calls/access";
import {
  attendees,
  callState,
  cleanCall,
  cleanLink,
  daysLabel,
  googleCalendarLink,
  hasEnded,
  hourRange,
  isIn,
  layoutDay,
  monthGridDays,
  nextOccurrence,
  occurrences,
  occursOn,
  repeatLabel,
  timeRange,
  type Call,
  type CallChange,
} from "@/lib/internal/calls/shared";

function call(values: Partial<Call> = {}): Call {
  return {
    id: "c1",
    created_at: "",
    updated_at: "",
    created_by: "nancy@studio1hq.com",
    updated_by: null,
    title: "Studio1 Eng Sync",
    about: "",
    link: "https://meet.google.com/abc-defg-hij",
    host: null,
    people: ["arindam@studio1hq.com", "harshal@studio1hq.com"],
    whole_team: false,
    repeat: "weekly",
    days: [1, 2, 3, 5, 6],
    every_weeks: 1,
    starts_on: "2026-10-16",
    ends_on: null,
    start_time: "15:00",
    minutes: 30,
    ...values,
  };
}

function change(values: Partial<CallChange>): CallChange {
  return {
    id: "x",
    call_id: "c1",
    on_day: "2026-11-16",
    cancelled: false,
    moved_day: null,
    moved_time: null,
    note: "",
    created_by: "nancy@studio1hq.com",
    ...values,
  };
}

describe("labels", () => {
  it("names day sets the way people say them", () => {
    expect(daysLabel([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(daysLabel([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(daysLabel([1, 2, 3, 4, 5, 6])).toBe("Mon–Sat");
    expect(daysLabel([1, 2, 3, 5, 6])).toBe("Mon–Wed, Fri, Sat");
    expect(daysLabel([2, 4])).toBe("Tue, Thu");
  });

  it("writes time ranges with the period once when it's shared", () => {
    expect(timeRange("15:00", 30)).toBe("3–3:30 PM");
    expect(timeRange("23:00", 60)).toBe("11 PM–12 AM");
    expect(timeRange("11:30", 60)).toBe("11:30 AM–12:30 PM");
    expect(timeRange("09:00", 15)).toBe("9–9:15 AM");
  });

  it("says how a call repeats", () => {
    expect(repeatLabel(call())).toBe("Every Mon–Wed, Fri, Sat · 3–3:30 PM");
    expect(repeatLabel(call({ days: [1, 2, 3, 4, 5, 6], start_time: "23:00", minutes: 60 }))).toBe("Every Mon–Sat · 11 PM–12 AM");
    expect(repeatLabel(call({ days: [1, 2, 3, 4, 5] }), false)).toBe("Weekdays");
    expect(repeatLabel(call({ days: [5], every_weeks: 2 }), false)).toBe("Every other week, Fri");
    expect(repeatLabel(call({ repeat: "once", starts_on: "2026-11-19" }), false)).toBe("Once, Thu 19 Nov");
  });
});

describe("which days a call is on", () => {
  it("follows the weekdays, from the start day on, until the end", () => {
    const eng = call();
    expect(occursOn(eng, "2026-11-16")).toBe(true); // Mon
    expect(occursOn(eng, "2026-11-19")).toBe(false); // Thu
    expect(occursOn(eng, "2026-11-22")).toBe(false); // Sun
    expect(occursOn(eng, "2026-10-12")).toBe(false); // before it started
    expect(occursOn(call({ ends_on: "2026-11-17" }), "2026-11-18")).toBe(false);
  });

  it("skips the off weeks of an every-other-week call, counted from its first week", () => {
    const fortnightly = call({ days: [5], every_weeks: 2, starts_on: "2026-11-04" });
    expect(occursOn(fortnightly, "2026-11-06")).toBe(true);
    expect(occursOn(fortnightly, "2026-11-13")).toBe(false);
    expect(occursOn(fortnightly, "2026-11-20")).toBe(true);
  });

  it("puts a one-off call on its day only", () => {
    const once = call({ repeat: "once", days: [], starts_on: "2026-11-19" });
    expect(occursOn(once, "2026-11-19")).toBe(true);
    expect(occursOn(once, "2026-11-26")).toBe(false);
  });
});

describe("a week of calls", () => {
  const week = ["2026-11-16", "2026-11-22"] as const;

  it("lists every day of the series in order", () => {
    const list = occurrences([call(), call({ id: "c2", title: "Daily Sync", days: [1, 2, 3, 4, 5, 6], start_time: "23:00", minutes: 60 })], [], ...week);
    expect(list.filter((item) => item.call_id === "c1").map((item) => item.day)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-20",
      "2026-11-21",
    ]);
    expect(list.filter((item) => item.call_id === "c2")).toHaveLength(6);
    // Monday: the 3 PM call before the 11 PM one.
    expect(list.slice(0, 2).map((item) => item.call_id)).toEqual(["c1", "c2"]);
  });

  it("keeps a cancelled day, marked off", () => {
    const list = occurrences([call()], [change({ on_day: "2026-11-17", cancelled: true, note: "Travel" })], ...week);
    const tuesday = list.find((item) => item.on_day === "2026-11-17");
    expect(tuesday?.cancelled).toBe(true);
    expect(tuesday?.note).toBe("Travel");
    expect(list.filter((item) => !item.cancelled)).toHaveLength(4);
  });

  it("shows a moved day where it went and says where it was", () => {
    const list = occurrences([call()], [change({ on_day: "2026-11-17", moved_day: "2026-11-19", moved_time: "16:00" })], ...week);
    expect(list.find((item) => item.on_day === "2026-11-17")).toMatchObject({
      day: "2026-11-19",
      start: "16:00",
      moved_from: { day: "2026-11-17", start: "15:00" },
    });
    expect(list.some((item) => item.day === "2026-11-17")).toBe(false);
  });

  it("takes in a day moved here from another week, and drops one moved away", () => {
    const changes = [
      change({ on_day: "2026-11-13", moved_day: "2026-11-19" }), // last Fri → this Thu
      change({ on_day: "2026-11-20", moved_day: "2026-11-24" }), // this Fri → next Tue
    ];
    const list = occurrences([call()], changes, ...week);
    expect(list.map((item) => item.day)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-21"]);
  });

  it("only moves the time when the day stays", () => {
    const list = occurrences([call()], [change({ on_day: "2026-11-18", moved_time: "17:30" })], ...week);
    expect(list.find((item) => item.on_day === "2026-11-18")).toMatchObject({ day: "2026-11-18", start: "17:30" });
  });

  it("finds the next time a call happens, skipping cancelled days", () => {
    const eng = call();
    expect(nextOccurrence(eng, [], "2026-11-19")?.day).toBe("2026-11-20");
    expect(nextOccurrence(eng, [change({ on_day: "2026-11-20", cancelled: true })], "2026-11-19")?.day).toBe("2026-11-21");
    expect(nextOccurrence(call({ repeat: "once", days: [], starts_on: "2026-11-10" }), [], "2026-11-19")).toBeNull();
    expect(hasEnded(call({ repeat: "once", days: [], starts_on: "2026-11-10" }), "2026-11-19")).toBe(true);
    expect(hasEnded(eng, "2026-11-19")).toBe(false);
  });
});

describe("calendar layout", () => {
  it("shows whole weeks around a month, Monday first", () => {
    const days = monthGridDays("2026-11");
    expect(days[0]).toBe("2026-10-26");
    expect(days.at(-1)).toBe("2026-12-06");
    expect(days).toHaveLength(42);
    expect(monthGridDays("2027-02")).toHaveLength(28); // 1 Feb 2027 is a Monday, the 28th a Sunday
  });

  it("cascades a later call over an earlier one, splits ones that start together", () => {
    const placed = layoutDay([
      { key: "eng", start: "15:00", minutes: 30 },
      { key: "kathank", start: "15:15", minutes: 45 },
      { key: "late", start: "23:00", minutes: 60 },
    ]);
    expect(placed.eng).toEqual({ col: 0, cols: 2, width: "under" });
    expect(placed.kathank).toEqual({ col: 1, cols: 2, width: "full" });
    expect(placed.late).toEqual({ col: 0, cols: 1, width: "full" });

    const together = layoutDay([
      { key: "a", start: "15:00", minutes: 60 },
      { key: "b", start: "15:00", minutes: 30 },
      { key: "c", start: "15:30", minutes: 30 },
      { key: "d", start: "16:00", minutes: 30 },
    ]);
    expect(together.a).toEqual({ col: 0, cols: 2, width: "split" }); // b starts with it
    expect(together.b).toEqual({ col: 1, cols: 2, width: "full" });
    expect(together.c).toEqual({ col: 1, cols: 2, width: "full" }); // b's column is free again at 3:30
    expect(together.d).toEqual({ col: 0, cols: 1, width: "full" }); // starts as the others end
  });

  it("stretches the hours to fit every call, within the day", () => {
    expect(hourRange([])).toEqual({ from: 9, to: 19 });
    expect(hourRange([{ start: "23:00", minutes: 60 }, { start: "07:30", minutes: 30 }])).toEqual({ from: 7, to: 24 });
    expect(hourRange([{ start: "23:30", minutes: 90 }])).toEqual({ from: 9, to: 24 });
  });
});

describe("who's in and what's on now", () => {
  it("counts people, the host and the whole team", () => {
    expect(isIn(call(), "Harshal@studio1hq.com")).toBe(true);
    expect(isIn(call(), "nancy@studio1hq.com")).toBe(false);
    expect(isIn(call({ host: "nancy@studio1hq.com" }), "nancy@studio1hq.com")).toBe(true);
    expect(isIn(call({ whole_team: true, people: [] }), "anyone@studio1hq.com")).toBe(true);
    expect(attendees(call({ host: "nancy@studio1hq.com" }), [])).toEqual([
      "nancy@studio1hq.com",
      "arindam@studio1hq.com",
      "harshal@studio1hq.com",
    ]);
    expect(attendees(call({ whole_team: true, people: ["shivay@gmail.com"] }), ["a@studio1hq.com", "b@studio1hq.com"])).toEqual([
      "a@studio1hq.com",
      "b@studio1hq.com",
      "shivay@gmail.com",
    ]);
  });

  it("knows live, soon, past and later", () => {
    const item = { day: "2026-11-16", start: "15:00", minutes: 30, cancelled: false };
    expect(callState(item, { date: "2026-11-16", time: "14:40" })).toBe("later");
    expect(callState(item, { date: "2026-11-16", time: "14:50" })).toBe("soon");
    expect(callState(item, { date: "2026-11-16", time: "15:10" })).toBe("live");
    expect(callState(item, { date: "2026-11-16", time: "15:30" })).toBe("past");
    expect(callState(item, { date: "2026-11-17", time: "09:00" })).toBe("past");
    expect(callState({ ...item, cancelled: true }, { date: "2026-11-16", time: "15:10" })).toBe("later");
  });
});

describe("checking a call as typed", () => {
  const typed = {
    title: "  Studio1   Eng Sync ",
    repeat: "weekly",
    days: [6, 1, 2, 2, 9],
    every_weeks: 1,
    starts_on: "2026-11-16",
    ends_on: null,
    start_time: "15:00",
    minutes: 30,
    people: ["Arindam@studio1hq.com", "arindam@studio1hq.com", "nancy@studio1hq.com"],
    host: "nancy@studio1hq.com",
    whole_team: false,
    link: "meet.google.com/abc-defg-hij",
    about: "",
  };

  it("cleans names, days, people and the link", () => {
    const result = cleanCall(typed);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.call).toMatchObject({
      title: "Studio1 Eng Sync",
      days: [1, 2, 6],
      people: ["arindam@studio1hq.com"],
      host: "nancy@studio1hq.com",
      link: "https://meet.google.com/abc-defg-hij",
    });
  });

  it("says what's missing or wrong", () => {
    expect(cleanCall({ ...typed, title: " " })).toMatchObject({ ok: false });
    expect(cleanCall({ ...typed, days: [] })).toMatchObject({ ok: false, message: "Pick at least one day of the week." });
    expect(cleanCall({ ...typed, start_time: "25:00" })).toMatchObject({ ok: false });
    expect(cleanCall({ ...typed, minutes: 0 })).toMatchObject({ ok: false });
    expect(cleanCall({ ...typed, people: [], host: null })).toMatchObject({ ok: false, message: "Add who's in the call." });
    expect(cleanCall({ ...typed, people: ["not an email"] })).toMatchObject({ ok: false });
    expect(cleanCall({ ...typed, ends_on: "2026-11-01" })).toMatchObject({ ok: false });
    expect(cleanCall({ ...typed, about: "password: hunter2hunter2" })).toMatchObject({ ok: false });
    expect(cleanCall({ ...typed, people: [], host: null, whole_team: true }).ok).toBe(true);
  });

  it("keeps one-off calls to their day", () => {
    const result = cleanCall({ ...typed, repeat: "once", days: [1, 2], ends_on: "2026-12-01" });
    expect(result.ok && result.call).toMatchObject({ repeat: "once", days: [], ends_on: null });
  });

  it("takes only http(s) links without logins", () => {
    expect(cleanLink("")).toEqual({ ok: true, link: "" });
    expect(cleanLink("javascript:alert(1)").ok).toBe(false);
    expect(cleanLink("https://me:pw@zoom.us/j/1").ok).toBe(false);
  });
});

describe("Google Calendar link", () => {
  it("fills in the series from its first real day, in IST, with the guests", () => {
    const url = new URL(googleCalendarLink(call({ starts_on: "2026-11-19" }), ["a@studio1hq.com"]));
    expect(url.searchParams.get("dates")).toBe("20261120T150000/20261120T153000");
    expect(url.searchParams.get("ctz")).toBe("Asia/Kolkata");
    expect(url.searchParams.get("recur")).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,FR,SA");
    expect(url.searchParams.get("add")).toBe("a@studio1hq.com");
  });

  it("ends a late call on the next day", () => {
    const url = new URL(googleCalendarLink(call({ start_time: "23:00", minutes: 60, starts_on: "2026-11-16" }), []));
    expect(url.searchParams.get("dates")).toBe("20261116T230000/20261117T000000");
  });
});

describe("access", () => {
  const base = { roles: [] as never[], status: "active", person: null, interns: [] as string[] };

  it("shows calls to Studio1 people with a way in, not to outside writers", () => {
    expect(canSeeCalls({ ...base, email: "kathank@studio1hq.com", roles: ["blog_writer"] as never[] })).toBe(true);
    expect(canSeeCalls({ ...base, email: "nancy@studio1hq.com", status: "pending", person: {} })).toBe(true);
    expect(canSeeCalls({ ...base, email: "writer@gmail.com", roles: ["blog_writer"] as never[] })).toBe(false);
    expect(canSeeCalls({ ...base, email: "gone@studio1hq.com", status: "disabled", person: {} })).toBe(false);
  });

  it("shows every call only to the founders and the associate (not other admins)", () => {
    expect(canSeeAllCalls({ email: "amitesh@studio1hq.com", status: "owner", roles: ["admin"] })).toBe(true);
    expect(canSeeAllCalls({ email: "nancy@studio1hq.com", status: "active", roles: ["tasks_viewer"] })).toBe(true);
    expect(canSeeAllCalls({ email: "lead@studio1hq.com", status: "active", roles: ["admin"] })).toBe(false);
    expect(canSeeAllCalls({ email: "kathank@studio1hq.com", status: "active", roles: ["client_member"] })).toBe(false);
  });

  it("lets the founders and the associate plan, nobody else", () => {
    expect(canPlanCalls({ email: "arindam@studio1hq.com", status: "owner", roles: ["admin"] })).toBe(true);
    expect(canPlanCalls({ email: "nancy@studio1hq.com", status: "active", roles: ["tasks_viewer"] })).toBe(true);
    expect(canPlanCalls({ email: "lead@studio1hq.com", status: "active", roles: ["admin"] })).toBe(false);
    expect(canPlanCalls({ email: "kathank@studio1hq.com", status: "active", roles: ["client_member"] })).toBe(false);
  });
});

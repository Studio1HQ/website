import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", async () => (await import("@/lib/internal/team/test-db")).fakeSupabase);

const { db } = await import("@/lib/internal/team/test-db");
const { purgeRejectedApplications, retentionCutoff } = await import("@/lib/internal/retention");

const NOW = new Date("2026-11-30T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

beforeEach(() => {
  db.reset();
  db.add(
    "job_applications",
    { id: "old-rejected", review_status: "rejected", updated_at: daysAgo(16), resume_path: "a/cv.pdf", email: "Old@Example.com", name: "Old One", email_updates: true, created_at: daysAgo(40) },
    { id: "old-rejected-2", review_status: "rejected", updated_at: daysAgo(20), resume_path: null, email: "quiet@example.com", name: "Quiet", email_updates: false, created_at: daysAgo(30) },
    { id: "fresh-rejected", review_status: "rejected", updated_at: daysAgo(14), resume_path: "b/cv.pdf" },
    { id: "old-shortlisted", review_status: "shortlisted", updated_at: daysAgo(40), resume_path: "c/cv.pdf" },
    { id: "old-new", review_status: "new", updated_at: daysAgo(90), resume_path: null },
  );
  db.add(
    "internal_email_log",
    { id: "l1", source_table: "job_applications", record_id: "old-rejected" },
    { id: "l2", source_table: "job_applications", record_id: "fresh-rejected" },
    { id: "l3", source_table: "devrel_cohort_applications", record_id: "old-rejected" },
  );
});

describe("the rejected-applications clean-up", () => {
  it("counts 15 days back from now", () => {
    expect(retentionCutoff(NOW)).toBe("2026-11-15T12:00:00.000Z");
  });

  it("deletes only applications rejected and untouched for over 15 days", async () => {
    const result = await purgeRejectedApplications(NOW);
    expect(result).toEqual({ ok: true, deleted: 2, files: 1 });
    expect(db.rows("job_applications").map((row) => row.id).sort()).toEqual(["fresh-rejected", "old-new", "old-shortlisted"]);
    expect(db.rows("internal_email_log").map((row) => row.id).sort()).toEqual(["l2", "l3"]);
  });

  it("does nothing, and says so, when the read fails", async () => {
    db.fail("job_applications");
    const result = await purgeRejectedApplications(NOW);
    expect(result.ok).toBe(false);
    expect(result.deleted).toBe(0);
  });

  it("keeps each deleted applicant's email, with what they ticked about future emails", async () => {
    await purgeRejectedApplications(NOW);
    const kept = db.rows("kept_contacts");
    expect(kept.map((row) => [row.email, row.name, row.email_updates]).sort()).toEqual([
      ["old@example.com", "Old One", true],
      ["quiet@example.com", "Quiet", false],
    ]);
  });

  it("doesn't opt back in someone who was kept and has since changed", async () => {
    db.add("kept_contacts", { email: "old@example.com", name: "Old One", email_updates: false });
    await purgeRejectedApplications(NOW);
    expect(db.rows("kept_contacts").find((row) => row.email === "old@example.com")?.email_updates).toBe(false);
  });

  it("deletes nothing when the contacts can't be kept", async () => {
    db.fail("kept_contacts");
    const result = await purgeRejectedApplications(NOW);
    expect(result.ok).toBe(false);
    expect(db.rows("job_applications")).toHaveLength(5);
  });

  it("drops the kept contact of someone who unsubscribed while the job ran", async () => {
    const fake = (await import("@/lib/internal/team/test-db")).fakeSupabase;
    const keep = fake.upsertRows;
    // The unsubscribe lands after the job has read the entry, before it deletes it.
    fake.upsertRows = async (table, rows, options) => {
      const result = await keep(table, rows, options);
      for (const row of db.rows("job_applications")) if (row.id === "old-rejected") row.email_updates = false;
      return result;
    };
    try {
      await purgeRejectedApplications(NOW);
    } finally {
      fake.upsertRows = keep;
    }
    expect(db.rows("kept_contacts").map((row) => row.email)).toEqual(["quiet@example.com"]);
  });

  it("drops it too when that entry is also moved out of Rejected, so it isn't deleted", async () => {
    const fake = (await import("@/lib/internal/team/test-db")).fakeSupabase;
    const keep = fake.upsertRows;
    // Unsubscribed, and someone shortlisted the entry, while the job ran.
    fake.upsertRows = async (table, rows, options) => {
      const result = await keep(table, rows, options);
      for (const row of db.rows("job_applications")) {
        if (row.id === "old-rejected") Object.assign(row, { email_updates: false, review_status: "shortlisted" });
      }
      return result;
    };
    try {
      await purgeRejectedApplications(NOW);
    } finally {
      fake.upsertRows = keep;
    }
    expect(db.rows("job_applications").some((row) => row.id === "old-rejected")).toBe(true);
    expect(db.rows("kept_contacts").map((row) => row.email)).toEqual(["quiet@example.com"]);
  });
});

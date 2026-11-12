/**
 * What someone applied for, as the emails name it: "Content Lead",
 * "Studio1 AI Hackathon", "DevRel Cohort 01". Pure, so the bulk email
 * dialog can preview it in the browser.
 */
export function programOf(section: { key: string }, record: Record<string, unknown>) {
  if (section.key === "jobs") return String(record.job_title ?? "the role");
  if (section.key === "hackathons") return String(record.hackathon_name ?? "the hackathon");
  if (section.key === "cohort") return `DevRel ${String(record.cohort ?? "Cohort")}`;
  return "Studio1";
}

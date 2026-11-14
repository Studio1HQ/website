import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/internal/profile-form";
import { Card, CardTitle, PageHeader } from "@/components/internal/ui";
import { ROLE_INFO, isOwner } from "@/lib/internal/roles";
import { canSeeMoney, isAdmin, requireMember, staffName } from "@/lib/internal/session";
import { PERSON_KINDS } from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "Your profile" };

/**
 * Everyone's own page: their name and photo, and what their roles let them
 * open. Roles themselves are changed by the founders on /internal/team.
 */
export default async function ProfilePage() {
  const staff = await requireMember();
  const owner = isOwner(staff.email);

  const access: { label: string; description: string }[] = owner
    ? [{ label: "Founder", description: "Everything, including Money (payroll, expense claims and payments) and who gets access." }]
    : staff.roles.map((role) => ({ label: ROLE_INFO[role].label, description: ROLE_INFO[role].description }));
  if (staff.person && !owner) {
    access.push({
      label: `${PERSON_KINDS[staff.person.kind]} on the team list`,
      description:
        staff.person.kind === "intern"
          ? "My day shows your hours and leave; your reviewer logs them."
          : "My day: log your hours and leave, claim expenses and find your payslips.",
    });
  }
  if (staff.interns.length) {
    access.push({
      label: "Intern reviewer",
      description: `You log the days of ${staff.interns.length} ${staff.interns.length === 1 ? "intern" : "interns"} on People.`,
    });
  }

  return (
    <>
      <PageHeader
        title="Your profile"
        description="Your name and photo show across the dashboard. What you can open is set by Arindam and Amitesh."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle>You</CardTitle>
          <ProfileForm email={staff.email} name={staffName(staff)} saved={staff.person?.name || staff.name} person={staff.person} admin={isAdmin(staff)} />
        </Card>
        <Card>
          <CardTitle>What you can open</CardTitle>
          <dl className="space-y-4 p-5">
            {access.map((item) => (
              <div key={item.label}>
                <dt className="text-[13px] font-medium">{item.label}</dt>
                <dd className="mt-1 text-[12.5px] leading-relaxed text-[var(--i-muted)]">{item.description}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-[var(--i-line)] px-5 py-3 text-[12.5px] text-[var(--i-muted)]">
            {canSeeMoney(staff) ? (
              <>
                Add people and change their roles on{" "}
                <Link href="/internal/team" className="text-[var(--i-ink-2)] underline underline-offset-2">
                  Team &amp; roles
                </Link>
                .
              </>
            ) : (
              "Need something else? Ask Arindam or Amitesh to change your roles."
            )}
          </p>
        </Card>
      </div>
    </>
  );
}

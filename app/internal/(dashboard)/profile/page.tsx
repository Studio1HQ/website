import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/internal/profile-form";
import { Card, CardTitle, PageHeader } from "@/components/internal/ui";
import { AREAS, AREA_KEYS, ROLE_INFO, areaAccess, isOwner, levelInfo } from "@/lib/internal/roles";
import { isAdmin, requireMember, staffName } from "@/lib/internal/session";
import { PERSON_KINDS } from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "Your profile" };

/**
 * Everyone's own page: their name and photo, and what their roles let them
 * open, in the same words as the team list on People (where an admin
 * changes it).
 */
export default async function ProfilePage() {
  const staff = await requireMember();
  const owner = isOwner(staff.email);

  const access: { label: string; description: string }[] = owner
    ? [{ label: "Founder", description: "Everything, including Money (payroll, expense claims and payments) and who gets access." }]
    : [
        ...(staff.roles.includes("admin") ? [{ label: ROLE_INFO.admin.label, description: ROLE_INFO.admin.description }] : []),
        // One line per area they can open, at the level they hold (Admin: the top one).
        ...AREA_KEYS.flatMap((key) => {
          const info = levelInfo(key, areaAccess(staff.roles, key));
          return info ? [{ label: `${AREAS[key].label}: ${info.label}`, description: info.description }] : [];
        }),
      ];
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
        description="Your name and photo show across the dashboard. What you can open is set on People by an admin."
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
            {isAdmin(staff) ? (
              <>
                Add people and change what they can open on{" "}
                <Link href="/internal/people" className="text-[var(--i-ink-2)] underline underline-offset-2">
                  People
                </Link>
                .
              </>
            ) : (
              "Need something else? Ask Arindam, Amitesh or an admin to change your access."
            )}
          </p>
        </Card>
      </div>
    </>
  );
}

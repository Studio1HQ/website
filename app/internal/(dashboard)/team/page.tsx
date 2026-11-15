import type { Metadata } from "next";
import { listMembers } from "@/lib/internal/members";
import { isOwner } from "@/lib/internal/roles";
import { requireStaff } from "@/lib/internal/session";
import { TeamView } from "@/components/internal/team-view";
import { Notice, PageHeader } from "@/components/internal/ui";

export const metadata: Metadata = { title: "Team & roles" };

export default async function TeamPage() {
  const admin = await requireStaff("admin");
  const members = await listMembers();
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Team & roles"
        description="One row per person, one column per area: pick what each person can open in Hiring, Blog, Community and Clients, and who sees the team's tasks. Anyone who signs in with an @studio1hq.com address has no access by default: they wait here until an admin approves them. Admins change access; only Arindam and Amitesh can invite people, turn access off or decide who's an admin."
      />
      {members ? (
        <TeamView members={members} me={admin.email} canManage={isOwner(admin.email)} />
      ) : (
        <Notice tone="error">
          Couldn&apos;t load the team. Run the team migration in Supabase
          (<code className="text-[12px]">20261112130000_internal_team.sql</code>) if you haven&apos;t yet.
        </Notice>
      )}
    </>
  );
}

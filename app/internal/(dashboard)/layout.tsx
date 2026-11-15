import { Suspense } from "react";
import Link from "next/link";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import Logo from "@/components/ui/svgs/logo";
import { InternalNav } from "@/components/internal/nav";
import { MobileNavButton, MobileNavClose, MobileNavPanel, MobileNavProvider } from "@/components/internal/mobile-nav";
import { NavProgress, RefreshButton } from "@/components/internal/nav-progress";
import { ToastProvider } from "@/components/internal/toast";
import { Avatar } from "@/components/internal/ui";
import { blogBadge } from "@/lib/internal/blog/data";
import { clientNeeds } from "@/lib/internal/clients/data";
import { communityBadges } from "@/lib/internal/community/data";
import { awaitingCounts } from "@/lib/internal/data";
import { pendingCount } from "@/lib/internal/members";
import { rolesLabel } from "@/lib/internal/roles";
import { canSeeMoney, homeFor, isAdmin, requireMember, staffName, type Staff } from "@/lib/internal/session";
import { teamBadges } from "@/lib/internal/team/badges";
import { canSeeOthers } from "@/lib/internal/tasks/access";
import { taskNeeds } from "@/lib/internal/tasks/needs";
import { PERSON_KINDS, photoUrl } from "@/lib/internal/team/shared";
import { signOut } from "./actions";

type Counts = {
  awaiting: Awaited<ReturnType<typeof awaitingCounts>>;
  requests: number;
  blog: number;
  money: { payroll: number; payments: number };
  community: { tasks: number; sponsors: number; partners: number };
  clients: { late: number; toReview: number };
  /** Reports due (yours) plus reports to read (founders). */
  tasks: number;
};

const NO_COUNTS: Counts = {
  awaiting: {},
  requests: 0,
  blog: 0,
  money: { payroll: 0, payments: 0 },
  community: { tasks: 0, sponsors: 0, partners: 0 },
  clients: { late: 0, toReview: 0 },
  tasks: 0,
};

/** Tasks is for everyone on the team list, and anyone who sees others' tasks. */
function seesTasks(staff: Staff) {
  return staff.person !== null || canSeeOthers({ email: staff.email, roles: staff.roles, status: staff.status, interns: staff.interns });
}

/** The sidebar's links for this person, with whatever counts are known. */
function Sidebar({ staff, counts }: { staff: Staff; counts: Counts }) {
  const admin = isAdmin(staff);
  const home = homeFor(staff);
  return (
    <InternalNav
      awaiting={counts.awaiting}
      role={staff.role}
      blog={staff.blog}
      blogBadge={counts.blog}
      admin={admin}
      requests={counts.requests}
      team={{
        me: staff.person !== null,
        tasks: seesTasks(staff),
        tasksBadge: counts.tasks,
        people: admin || staff.interns.length > 0,
        money: canSeeMoney(staff),
        payrollBadge: counts.money.payroll,
        paymentsBadge: counts.money.payments,
      }}
      community={staff.community ? { access: staff.community, ...counts.community } : null}
      clients={staff.clients ? { access: staff.clients, ...counts.clients } : null}
      home={home}
      overview={home === "/internal"}
    />
  );
}

/** Reads the counts (only the ones this person's sidebar shows). */
async function SidebarWithCounts({ staff }: { staff: Staff }) {
  const [awaiting, requests, blog, money, community, clients, tasks] = await Promise.all([
    staff.role || staff.community ? awaitingCounts() : Promise.resolve(NO_COUNTS.awaiting),
    isAdmin(staff) ? pendingCount() : Promise.resolve(0),
    staff.blog ? blogBadge(staff) : Promise.resolve(0),
    canSeeMoney(staff) ? teamBadges() : Promise.resolve(NO_COUNTS.money),
    staff.community ? communityBadges(staff.email) : Promise.resolve(NO_COUNTS.community),
    staff.clients ? clientNeeds(staff.email) : Promise.resolve(NO_COUNTS.clients),
    seesTasks(staff) ? taskNeeds(staff) : Promise.resolve(null),
  ]);
  return (
    <Sidebar
      staff={staff}
      counts={{
        awaiting,
        requests,
        blog,
        money,
        community,
        clients: { late: clients.late, toReview: clients.toReview },
        tasks: tasks ? tasks.reportsDue.length + tasks.reportsToRead : 0,
      }}
    />
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pages check their own access; the shell only needs someone with a role.
  const staff = await requireMember();
  const name = staffName(staff);
  const home = homeFor(staff);

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <MobileNavProvider>
        {/* Phones: a top bar; the sidebar opens from its menu button. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-[var(--i-line)] bg-[var(--i-sidebar)] px-2 print:hidden md:hidden">
          <MobileNavButton />
          <Link href={home} className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1">
            <Logo className="size-6 shrink-0" />
            <span className="truncate text-[14px] font-medium">Studio1</span>
          </Link>
          <div className="ml-auto flex items-center">
            <RefreshButton className="size-10 rounded-lg" />
            <Link
              href="/internal/profile"
              aria-label="Your profile"
              className="flex size-10 items-center justify-center rounded-lg hover:bg-[var(--i-hover)]"
            >
              <Avatar name={name} email={staff.email} size={28} src={photoUrl(staff.person)} />
            </Link>
          </div>
        </header>
        <div className="md:flex">
          <MobileNavPanel className="px-3 pb-3 pt-2 md:py-4">
            <div className="mb-4 flex items-center justify-between gap-3 px-1.5 md:mb-6">
              <Link href={home} className="flex items-center gap-2.5 py-1">
                <Logo className="size-7" />
                <span className="leading-tight">
                  <span className="block text-[14px] font-medium">Studio1</span>
                  <span className="block text-[11.5px] text-[var(--i-muted)]">Internal dashboard</span>
                </span>
              </Link>
              <MobileNavClose />
            </div>
            {/* A long sidebar scrolls on its own; the profile stays at the foot. */}
            <div className="-mx-3 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              {/* The links show at once; their counts arrive when they're read. */}
              <Suspense fallback={<Sidebar staff={staff} counts={NO_COUNTS} />}>
                <SidebarWithCounts staff={staff} />
              </Suspense>
            </div>
            <div className="flex items-center gap-2.5 border-t border-[var(--i-line)] px-1.5 pt-3 md:border-t-0 md:pt-4">
              <Link
                href="/internal/profile"
                title="Your profile"
                className="-mx-1.5 -my-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <Avatar name={name} email={staff.email} size={28} src={photoUrl(staff.person)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium">{name}</p>
                  <p className="truncate text-[11.5px] text-[var(--i-muted)]">
                    {staff.localPreview
                      ? "Local preview"
                      : staff.roles.length
                        ? rolesLabel(staff.roles)
                        : staff.person
                          ? PERSON_KINDS[staff.person.kind]
                          : "Intern reviewer"}
                    {staff.status === "owner" ? " · Owner" : ""}
                  </p>
                </div>
              </Link>
              <RefreshButton className="hidden md:flex" />
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex size-10 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-black/[0.04] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.06] md:size-7 md:rounded-md"
                >
                  <SignOut size={16} />
                </button>
              </form>
            </div>
          </MobileNavPanel>
          <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-9 print:p-0">
            <div className="mx-auto max-w-[1280px]">{children}</div>
          </main>
        </div>
      </MobileNavProvider>
    </ToastProvider>
  );
}

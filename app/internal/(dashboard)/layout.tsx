import { NotificationBell } from "@/components/internal/notification-bell";
import { bellFor } from "@/lib/internal/notifications/data";
import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { AccountMenu } from "@/components/internal/account-menu";
import { CommandSearch } from "@/components/internal/command-search";
import { CustomiseSidebar } from "@/components/internal/customise-sidebar";
import Logo from "@/components/ui/svgs/logo";
import { InternalNav } from "@/components/internal/nav";
import { KeepFresh } from "@/components/internal/keep-fresh";
import { MobileNavButton, MobileNavClose, MobileNavPanel, MobileNavProvider } from "@/components/internal/mobile-nav";
import { NavProgress, RefreshButton } from "@/components/internal/nav-progress";
import { TeamPhotosProvider } from "@/components/internal/team-photos";
import { ToastProvider } from "@/components/internal/toast";
import { Avatar } from "@/components/internal/ui";
import { blogBadge } from "@/lib/internal/blog/data";
import { clientNeeds } from "@/lib/internal/clients/data";
import { communityBadges } from "@/lib/internal/community/data";
import { awaitingCounts } from "@/lib/internal/data";
import { pendingCount } from "@/lib/internal/members";
import { isStaffEmail, rolesLabel } from "@/lib/internal/roles";
import {
  canEditJobBoard,
  canSeeInfluencers,
  canSeeMoney,
  canSeeOutreach,
  canSeeSocials,
  homeFor,
  isAdmin,
  requireMember,
  staffName,
  type Staff,
} from "@/lib/internal/session";
import { isSidebarCollapsed, SIDEBAR_COOKIE, SIDEBAR_FADE } from "@/lib/internal/sidebar";
import { cn } from "@/lib/utils";
import { teamBadges } from "@/lib/internal/team/badges";
import { canSeeOthers } from "@/lib/internal/tasks/access";
import { canSeeCalls } from "@/lib/internal/calls/access";
import { taskNeeds } from "@/lib/internal/tasks/needs";
import { outreachDue } from "@/lib/internal/outreach/data";
import { teamPhotos } from "@/lib/internal/team/photos";
import { PERSON_KINDS, photoUrl } from "@/lib/internal/team/shared";
import { signOut } from "./actions";

type Counts = {
  awaiting: Awaited<ReturnType<typeof awaitingCounts>>;
  requests: number;
  blog: number;
  money: { payroll: number; payments: number };
  community: { tasks: number; sponsors: number; partners: number };
  clients: { late: number; toReview: number };
  /** My outreach follow-ups due (people given Outreach). */
  outreach: number;
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
  outreach: 0,
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
        calls: canSeeCalls(staff),
        people: admin || staff.interns.length > 0,
        money: canSeeMoney(staff),
        payrollBadge: counts.money.payroll,
        paymentsBadge: counts.money.payments,
      }}
      community={staff.community ? { access: staff.community, ...counts.community } : null}
      clients={staff.clients ? { access: staff.clients, ...counts.clients } : null}
      outreach={canSeeOutreach(staff) ? { due: counts.outreach } : null}
      influencers={canSeeInfluencers(staff)}
      socials={canSeeSocials(staff)}
      jobBoard={canEditJobBoard(staff)}
      home={home}
      overview={home === "/"}
    />
  );
}

/** Reads the counts (only the ones this person's sidebar shows). */
async function SidebarWithCounts({ staff }: { staff: Staff }) {
  const [awaiting, requests, blog, money, community, clients, tasks, outreach] = await Promise.all([
    staff.role || staff.community ? awaitingCounts() : Promise.resolve(NO_COUNTS.awaiting),
    isAdmin(staff) ? pendingCount() : Promise.resolve(0),
    staff.blog ? blogBadge(staff) : Promise.resolve(0),
    canSeeMoney(staff) ? teamBadges() : Promise.resolve(NO_COUNTS.money),
    staff.community ? communityBadges(staff.email) : Promise.resolve(NO_COUNTS.community),
    staff.clients ? clientNeeds(staff.email, staff.clientScope) : Promise.resolve(NO_COUNTS.clients),
    seesTasks(staff) ? taskNeeds(staff) : Promise.resolve(null),
    canSeeOutreach(staff) ? outreachDue(staff.email) : Promise.resolve(0),
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
        outreach,
        // Late tasks badge; ones due today are an ordinary day and don't.
        tasks: tasks ? tasks.reportsDue.length + tasks.reportsToRead + tasks.tasksLate : 0,
      }}
    />
  );
}

/**
 * The bell with this person's notifications. Read once per request (the
 * phone bar and the desktop page corner each show one), and streamed in so it never
 * holds the page up.
 */
async function BellFor({ email, side, className }: { email: string; side: "bottom" | "right"; className?: string }) {
  const bell = await bellFor(email);
  return <NotificationBell items={bell.items} unread={bell.unread} side={side} className={className} />;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pages check their own access; the shell only needs someone with a role.
  const staff = await requireMember();
  // Team photos by email (kept, so usually no extra read). Only for
  // @studio1hq.com: outside writers would otherwise get the team's addresses.
  const photos = isStaffEmail(staff.email) ? await teamPhotos() : {};
  const name = staffName(staff);
  const home = homeFor(staff);
  // Desktop sidebar folded to its icons, as this person left it.
  const collapsed = isSidebarCollapsed((await cookies()).get(SIDEBAR_COOKIE)?.value);

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <KeepFresh />
      <MobileNavProvider collapsed={collapsed}>
        {/* Phones: a top bar; the sidebar opens from its menu button. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-[var(--i-line)] bg-[var(--i-sidebar)] px-2 print:hidden md:hidden">
          <MobileNavButton />
          <Link href={home} className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1">
            <Logo className="size-6 shrink-0" />
            <span className="truncate text-[14px] font-medium">Studio1</span>
          </Link>
          <div className="ml-auto flex items-center">
            <Suspense fallback={null}>
              <BellFor email={staff.email} side="bottom" className="size-10" />
            </Suspense>
            <RefreshButton className="size-10 rounded-lg" />
            <Link
              href="/profile"
              aria-label="Your profile"
              className="flex size-10 items-center justify-center rounded-lg hover:bg-[var(--i-hover)]"
            >
              <Avatar name={name} email={staff.email} size={28} src={photoUrl(staff.person)} />
            </Link>
          </div>
        </header>
        <div className="md:flex md:min-h-screen md:bg-[var(--i-sidebar)]">
          {/* Folded (desktop), the md:group-data-[collapsed=true]/sidebar:
              classes leave just the icons: the logo on top, the avatar below.
              The logo and avatar sit 16px in (px-1), centred on the 60px
              folded sidebar, so they hold still while it narrows. */}
          <MobileNavPanel className="px-3 pb-3 pt-2 md:py-4">
            <div className="mb-4 flex items-center justify-between gap-3 px-1 md:mb-6">
              <Link href={home} className="flex items-center gap-2.5 py-1">
                <Logo className="size-7 shrink-0" />
                <span className={cn("whitespace-nowrap text-[17px] font-medium tracking-[-0.02em]", SIDEBAR_FADE)}>
                  Studio1
                </span>
              </Link>
              {/* Search, left of the fold button (fixed at the header's right). */}
              <CommandSearch className="ml-auto hidden md:mr-7 md:flex md:group-data-[collapsed=true]/sidebar:hidden" />
              <CustomiseSidebar />
              <MobileNavClose />
            </div>
            {/* A long sidebar scrolls on its own; the profile stays at the foot.
                The 4px of top room (pulled back up) keeps the first link's
                outline and shadow from being clipped by the scroll edge. */}
            <div className="-mx-3 -mt-1 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2 pt-1 internal-scroll internal-scroll-fade">
              {/* The links show at once; their counts arrive when they're read. */}
              <Suspense fallback={<Sidebar staff={staff} counts={NO_COUNTS} />}>
                <SidebarWithCounts staff={staff} />
              </Suspense>
            </div>
            {/* The account: opens a menu upwards (profile, refresh, sign out). */}
            <div className="border-t border-[var(--i-line)] px-1 pt-3 md:border-t-0 md:pt-3">
              <AccountMenu
                name={name}
                email={staff.email}
                photo={photoUrl(staff.person)}
                home={home}
                me={staff.person !== null}
                signOut={signOut}
                detail={
                  (staff.localPreview
                    ? "Local preview"
                    : staff.roles.length
                      ? rolesLabel(staff.roles)
                      : staff.person
                        ? PERSON_KINDS[staff.person.kind]
                        : "Intern reviewer") + (staff.status === "owner" ? " · Owner" : "")
                }
              />
            </div>
          </MobileNavPanel>
          {/* The page: one card with the same gap on both sides at every width
              (24px, 32px from lg, 40px from 2xl), and its content centred in it
              (1280px at most). Reload and the bell sit in the card's top-right
              corner, level with the page title (headers keep clear of them), and
              scroll away with the page (z-40: over the blog editor's sticky bar).
              Phones have both in the top bar. */}
          <main className="min-w-0 flex-1 px-4 pb-12 pt-5 sm:px-6 sm:pt-6 md:my-2 md:mr-2 md:min-h-[calc(100vh-16px)] md:rounded-[14px] md:border md:border-[var(--i-line)] md:bg-[var(--i-bg)] md:relative md:px-6 md:pt-6 md:shadow-[0_12px_32px_-20px_rgba(28,25,23,0.22)] lg:px-8 lg:pt-7 2xl:px-10 print:m-0 print:border-0 print:p-0 print:shadow-none">
            <div className="pointer-events-none absolute right-4 top-4 z-40 hidden items-center gap-2 md:flex print:hidden">
              <RefreshButton className="pointer-events-auto size-9 rounded-full bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)] hover:bg-[var(--i-hover)]" />
              <Suspense fallback={<span className="size-9" />}>
                <BellFor email={staff.email} side="bottom" className="pointer-events-auto size-9 rounded-full bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)] hover:bg-[var(--i-hover)]" />
              </Suspense>
            </div>
            <div className="mx-auto max-w-[1280px]">
              <TeamPhotosProvider photos={photos}>{children}</TeamPhotosProvider>
            </div>
          </main>
        </div>
      </MobileNavProvider>
    </ToastProvider>
  );
}

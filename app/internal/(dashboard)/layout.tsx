import { Suspense } from "react";
import Link from "next/link";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import Logo from "@/components/ui/svgs/logo";
import { InternalNav } from "@/components/internal/nav";
import { NavProgress, RefreshButton } from "@/components/internal/nav-progress";
import { ToastProvider } from "@/components/internal/toast";
import { Avatar } from "@/components/internal/ui";
import { blogBadge } from "@/lib/internal/blog/data";
import { communityBadges } from "@/lib/internal/community/data";
import { awaitingCounts } from "@/lib/internal/data";
import { pendingCount } from "@/lib/internal/members";
import { rolesLabel } from "@/lib/internal/roles";
import { canSeeMoney, homeFor, isAdmin, requireMember, staffName, type Staff } from "@/lib/internal/session";
import { teamBadges } from "@/lib/internal/team/badges";
import { PERSON_KINDS, photoUrl } from "@/lib/internal/team/shared";
import { signOut } from "./actions";

type Counts = {
  awaiting: Awaited<ReturnType<typeof awaitingCounts>>;
  requests: number;
  blog: number;
  money: { payroll: number; payments: number };
  community: { tasks: number; sponsors: number; partners: number };
};

const NO_COUNTS: Counts = {
  awaiting: {},
  requests: 0,
  blog: 0,
  money: { payroll: 0, payments: 0 },
  community: { tasks: 0, sponsors: 0, partners: 0 },
};

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
        people: admin || staff.interns.length > 0,
        money: canSeeMoney(staff),
        payrollBadge: counts.money.payroll,
        paymentsBadge: counts.money.payments,
      }}
      community={staff.community ? { access: staff.community, ...counts.community } : null}
      home={home}
      overview={home === "/internal"}
    />
  );
}

/** Reads the counts (only the ones this person's sidebar shows). */
async function SidebarWithCounts({ staff }: { staff: Staff }) {
  const [awaiting, requests, blog, money, community] = await Promise.all([
    staff.role || staff.community ? awaitingCounts() : Promise.resolve(NO_COUNTS.awaiting),
    isAdmin(staff) ? pendingCount() : Promise.resolve(0),
    staff.blog ? blogBadge(staff) : Promise.resolve(0),
    canSeeMoney(staff) ? teamBadges() : Promise.resolve(NO_COUNTS.money),
    staff.community ? communityBadges(staff.email) : Promise.resolve(NO_COUNTS.community),
  ]);
  return <Sidebar staff={staff} counts={{ awaiting, requests, blog, money, community }} />;
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
      <div className="md:flex">
        <aside className="border-b border-[var(--i-line)] bg-[var(--i-sidebar)] px-3 pb-2 pt-3 print:hidden md:sticky md:top-0 md:flex md:h-screen md:w-[236px] md:shrink-0 md:flex-col md:border-b-0 md:border-r md:px-3 md:py-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1.5 md:mb-6">
            <Link href={home} className="flex items-center gap-2.5">
              <Logo className="size-7" />
              <span className="leading-tight">
                <span className="block text-[14px] font-medium">Studio1</span>
                <span className="block text-[11.5px] text-[var(--i-muted)]">Internal dashboard</span>
              </span>
            </Link>
            <Link
              href="/internal/profile"
              aria-label="Your profile"
              className="ml-auto md:hidden"
            >
              <Avatar name={name} email={staff.email} size={28} src={photoUrl(staff.person)} />
            </Link>
            <RefreshButton className="size-8 md:hidden" />
            <form action={signOut} className="md:hidden">
              <button
                type="submit"
                aria-label="Sign out"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
              >
                <SignOut size={17} />
              </button>
            </form>
          </div>
          {/* The links show at once; their counts arrive when they're read. */}
          <Suspense fallback={<Sidebar staff={staff} counts={NO_COUNTS} />}>
            <SidebarWithCounts staff={staff} />
          </Suspense>
          <div className="mt-auto hidden items-center gap-2.5 rounded-lg px-1.5 pt-4 md:flex">
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
            <RefreshButton />
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-black/[0.04] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.06]"
              >
                <SignOut size={16} />
              </button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-9 print:p-0">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}

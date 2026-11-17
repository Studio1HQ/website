"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bank,
  Binoculars,
  Briefcase,
  Buildings,
  CalendarBlank,
  CalendarCheck,
  ChartLineUp,
  CheckSquare,
  Coins,
  Compass,
  Megaphone,
  EnvelopeOpen,
  EnvelopeSimple,
  FileText,
  Folders,
  Gauge,
  Handshake,
  IdentificationCard,
  Kanban,
  NotePencil,
  Receipt,
  SlidersHorizontal,
  SquaresFour,
  Trophy,
  UsersThree,
  VideoCamera,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import { atLeast, type BlogAccess, type Role } from "@/lib/internal/roles";
import {
  SECTIONS,
  SECTION_ORDER,
  type SectionKey,
} from "@/lib/internal/sections";
import { HoverLink, LinkPending } from "@/components/internal/nav-progress";
import { cn } from "@/lib/utils";

const ICONS: Record<SectionKey, Icon> = {
  jobs: Briefcase,
  hackathons: Trophy,
  cohort: UsersThree,
  subscribers: EnvelopeSimple,
  "partner-pool": Handshake,
};

function NavLink({
  href,
  label,
  icon: IconComponent,
  badge,
  badgeTitle,
  active,
}: {
  href: string;
  label: string;
  icon: Icon;
  badge?: number;
  badgeTitle?: string;
  active: boolean;
}) {
  return (
    <HoverLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-[14px] transition-colors md:h-8 md:text-[13.5px]",
        active
          ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)]"
          : "text-[var(--i-ink-2)] hover:bg-black/[0.035] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.05]",
      )}
    >
      <IconComponent
        size={16}
        weight={active ? "fill" : "regular"}
        className={
          active
            ? "text-[var(--i-accent)]"
            : "text-[var(--i-muted)] group-hover:text-[var(--i-ink-2)]"
        }
        aria-hidden
      />
      <span className="flex-1">{label}</span>
      <LinkPending />
      {badge ? (
        <span
          className="ml-2 rounded-full bg-[var(--i-accent-soft)] px-1.5 text-[11px] font-medium leading-[18px] tabular-nums text-[var(--i-accent-text)]"
          title={badgeTitle ?? `${badge} new`}
        >
          {badge}
        </span>
      ) : null}
    </HoverLink>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

/** The client-work pages with a link of their own (the rest highlight Overview). */
const CLIENT_PAGES = [
  "/internal/clients/board",
  "/internal/clients/load",
  "/internal/clients/reports",
  "/internal/clients/templates",
];

export type TeamNav = {
  /** On the team list: My day. */
  me: boolean;
  /** On the team list, or sees others' tasks: Tasks. */
  tasks: boolean;
  /** Your late tasks, reports due (yours) or waiting to be read (founders). */
  tasksBadge: number;
  /** Everyone at Studio1: the internal calls calendar. */
  calls: boolean;
  /** Admins and intern reviewers: People. */
  people: boolean;
  /** Admins: the Money section (payroll and payments), with their counts. */
  money: boolean;
  payrollBadge: number;
  paymentsBadge: number;
};

export type CommunityNav = {
  access: "manager" | "viewer";
  /** My tasks due today or late. */
  tasks: number;
  /** Follow-ups due. */
  sponsors: number;
  partners: number;
};

export type ClientsNav = {
  access: "manager" | "member";
  /** My deliverables past due. */
  late: number;
  /** Items in internal review waiting on me as the reviewer. */
  toReview: number;
};

export function InternalNav({
  awaiting,
  role,
  blog,
  blogBadge,
  admin,
  requests,
  team,
  community,
  clients = null,
  outreach = null,
  home,
  overview,
}: {
  awaiting: Partial<Record<SectionKey, number>>;
  /** Pipelines level; null hides the pipelines (blog-only people). */
  role: Role | null;
  blog: BlogAccess | null;
  /** Posts waiting for this person: reviews for reviewers, news for writers. */
  blogBadge: number;
  admin: boolean;
  requests: number;
  team: TeamNav;
  community: CommunityNav | null;
  /** Client work, with my late and to-review counts; null without access. */
  clients?: ClientsNav | null;
  /** Outreach (admins), with my follow-ups due; null without access. */
  outreach?: { due: number } | null;
  /** Where this person's dashboard starts; the sections link back to it. */
  home: string;
  /** Show the Overview link: everyone whose home is the Overview. */
  overview: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/internal"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const groups = ["Pipelines", "Audiences"] as const;

  // Community, Clients and Money are sections of their own: inside one, the
  // sidebar shows only that section's pages, so the main sidebar stays
  // short. Hackathon registrations belong to Community.
  const section =
    (isActive("/internal/community") || isActive(SECTIONS.hackathons.path)) && community
      ? "community"
      : isActive("/internal/clients") && clients
        ? "clients"
        : isActive("/internal/money") && team.money
          ? "money"
          : null;
  const sectionName = section === "money" ? "Money" : section === "clients" ? "Clients" : "Community";
  if (section) {
    const back = !home.startsWith(`/internal/${section}`);
    return (
      <nav
        aria-label={sectionName}
        className="flex flex-col"
      >
        {back ? (
          <Link
            href={home}
            className="mb-1 flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-[13px] text-[var(--i-muted)] hover:bg-black/[0.035] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.05] md:h-8"
          >
            <ArrowLeft size={14} aria-hidden /> Dashboard
          </Link>
        ) : null}
        <p className="flex items-center gap-2 px-2.5 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">
          {sectionName}
        </p>
        <div className="flex flex-col gap-0.5">
          {section === "clients" && clients ? (
            <>
              <NavLink
                href="/internal/clients"
                label="Overview"
                icon={Folders}
                badge={clients.late}
                badgeTitle={`${clients.late} of your deliverables late`}
                active={pathname === "/internal/clients" || (isActive("/internal/clients") && !CLIENT_PAGES.some((page) => isActive(page)))}
              />
              <NavLink
                href="/internal/clients/board"
                label="This week"
                icon={CalendarBlank}
                active={isActive("/internal/clients/board")}
              />
              <NavLink
                href="/internal/clients/load"
                label="Owner load"
                icon={Gauge}
                badge={clients.toReview}
                badgeTitle={`${clients.toReview} waiting for your review`}
                active={isActive("/internal/clients/load")}
              />
              <NavLink
                href="/internal/clients/reports"
                label="Monthly report"
                icon={FileText}
                active={isActive("/internal/clients/reports")}
              />
              {clients.access === "manager" ? (
                <NavLink
                  href="/internal/clients/templates"
                  label="Templates & capacity"
                  icon={SlidersHorizontal}
                  active={isActive("/internal/clients/templates")}
                />
              ) : null}
            </>
          ) : section === "money" ? (
            <>
              <NavLink href="/internal/money" label="Overview" icon={Bank} active={pathname === "/internal/money"} />
              <NavLink
                href="/internal/money/payroll"
                label="Payroll"
                icon={Receipt}
                badge={team.payrollBadge}
                badgeTitle={`${team.payrollBadge} expense ${team.payrollBadge === 1 ? "claim" : "claims"} waiting`}
                active={isActive("/internal/money/payroll")}
              />
              <NavLink
                href="/internal/money/payments"
                label="Payments"
                icon={Wallet}
                badge={team.paymentsBadge}
                badgeTitle={`${team.paymentsBadge} to pay`}
                active={isActive("/internal/money/payments")}
              />
            </>
          ) : community ? (
            <>
              <NavLink
                href="/internal/community"
                label="Overview"
                icon={Compass}
                active={pathname === "/internal/community"}
              />
              <NavLink
                href="/internal/community/events"
                label="Events"
                icon={CalendarBlank}
                active={isActive("/internal/community/events")}
              />
              <NavLink
                href={SECTIONS.hackathons.path}
                label="Hackathon sign-ups"
                icon={Trophy}
                badge={awaiting.hackathons}
                badgeTitle={`${awaiting.hackathons ?? 0} new ${awaiting.hackathons === 1 ? "registration" : "registrations"} to review`}
                active={isActive(SECTIONS.hackathons.path)}
              />
              <NavLink
                href="/internal/community/sponsors"
                label="Sponsors"
                icon={Megaphone}
                badge={community.sponsors}
                badgeTitle={`${community.sponsors} ${community.sponsors === 1 ? "follow-up" : "follow-ups"} due`}
                active={isActive("/internal/community/sponsors")}
              />
              <NavLink
                href="/internal/community/campus"
                label="Campus partners"
                icon={Buildings}
                badge={community.partners}
                badgeTitle={`${community.partners} ${community.partners === 1 ? "follow-up" : "follow-ups"} due`}
                active={isActive("/internal/community/campus")}
              />
              {/* Money stays with the manager: interns have no Budget page. */}
              {community.access === "manager" ? (
                <NavLink
                  href="/internal/community/budget"
                  label="Budget"
                  icon={Coins}
                  active={isActive("/internal/community/budget")}
                />
              ) : null}
              <NavLink
                href="/internal/community/tasks"
                label="Tasks"
                icon={CheckSquare}
                badge={community.tasks}
                badgeTitle={`${community.tasks} of your tasks due or late`}
                active={isActive("/internal/community/tasks")}
              />
              <NavLink
                href="/internal/community/analytics"
                label="Analytics"
                icon={ChartLineUp}
                active={isActive("/internal/community/analytics")}
              />
              {/* Managers email hackathon registrants; without a hiring
                  role they have no Settings group to find this under. */}
              {community.access === "manager" ? (
                <NavLink
                  href="/internal/templates"
                  label="Email templates"
                  icon={EnvelopeOpen}
                  active={isActive("/internal/templates")}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </nav>
    );
  }

  const moneyBadge = team.payrollBadge + team.paymentsBadge;
  const clientsBadge = clients ? clients.late + clients.toReview : 0;
  const hackathonsNew = community ? (awaiting.hackathons ?? 0) : 0;
  const communityBadge = community ? community.tasks + community.sponsors + community.partners + hackathonsNew : 0;

  return (
    <nav
      aria-label="Dashboard"
      className="flex flex-col"
    >
      {overview ? (
        <NavLink
          href="/internal"
          label="Overview"
          icon={SquaresFour}
          active={isActive("/internal")}
        />
      ) : null}
      {clients || blog || community || team.money || outreach ? (
        <NavGroup title="Workspaces">
          {clients ? (
            <NavLink
              href="/internal/clients"
              label="Clients"
              icon={Folders}
              badge={clientsBadge}
              badgeTitle={[
                clients.late ? `${clients.late} of your deliverables late` : null,
                clients.toReview ? `${clients.toReview} waiting for your review` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              active={false}
            />
          ) : null}
          {outreach ? (
            <NavLink
              href="/internal/outreach"
              label="Outreach"
              icon={Binoculars}
              badge={outreach.due}
              badgeTitle={`${outreach.due} of your follow-ups due`}
              active={isActive("/internal/outreach")}
            />
          ) : null}
          {outreach ? (
            // Admins, like Outreach.
            <NavLink
              href="/internal/socials"
              label="Social growth"
              icon={ChartLineUp}
              active={isActive("/internal/socials")}
            />
          ) : null}
          {blog ? (
            <NavLink
              href="/internal/blog"
              label="Blog"
              icon={NotePencil}
              badge={blogBadge}
              badgeTitle={
                blog === "reviewer"
                  ? `${blogBadge} waiting for review`
                  : `${blogBadge} with feedback`
              }
              active={isActive("/internal/blog")}
            />
          ) : null}
          {community ? (
            <NavLink
              href="/internal/community"
              label="Community"
              icon={Compass}
              badge={communityBadge}
              badgeTitle={[
                community.tasks ? `${community.tasks} of your tasks due or late` : null,
                community.sponsors + community.partners
                  ? `${community.sponsors + community.partners} follow-ups due`
                  : null,
                hackathonsNew
                  ? `${hackathonsNew} new hackathon ${hackathonsNew === 1 ? "registration" : "registrations"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              active={false}
            />
          ) : null}
          {team.money ? (
            <NavLink
              href="/internal/money"
              label="Money"
              icon={Bank}
              badge={moneyBadge}
              badgeTitle={[
                team.payrollBadge ? `${team.payrollBadge} expense ${team.payrollBadge === 1 ? "claim" : "claims"} waiting` : null,
                team.paymentsBadge ? `${team.paymentsBadge} to pay` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              active={false}
            />
          ) : null}
        </NavGroup>
      ) : null}
      {groups
        .filter((group) =>
          SECTION_ORDER.some(
            (key) =>
              SECTIONS[key].group === group &&
              atLeast(role, SECTIONS[key].minRole),
          ),
        )
        .map((group) => (
          <div key={group} className="mt-5">
            <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">
              {group}
            </p>
            <div className="flex flex-col gap-0.5">
              {SECTION_ORDER.filter(
                (key) =>
                  SECTIONS[key].group === group &&
                  atLeast(role, SECTIONS[key].minRole),
              ).map((key) => (
                <NavLink
                  key={key}
                  href={SECTIONS[key].path}
                  label={SECTIONS[key].nav}
                  icon={ICONS[key]}
                  badge={awaiting[key]}
                  active={isActive(SECTIONS[key].path)}
                />
              ))}
            </div>
          </div>
        ))}
      {team.me || team.people || team.tasks || team.calls ? (
        <NavGroup title="Team">
          {team.me ? (
            <NavLink href="/internal/me" label="My day" icon={CalendarCheck} active={isActive("/internal/me")} />
          ) : null}
          {team.tasks ? (
            <NavLink
              href="/internal/tasks"
              label="Tasks"
              icon={Kanban}
              badge={team.tasksBadge}
              badgeTitle={`${team.tasksBadge} late task${team.tasksBadge === 1 ? "" : "s"} or report${team.tasksBadge === 1 ? "" : "s"} to see to`}
              active={isActive("/internal/tasks")}
            />
          ) : null}
          {team.calls ? (
            <NavLink href="/internal/calls" label="Calls" icon={VideoCamera} active={isActive("/internal/calls")} />
          ) : null}
          {team.people ? (
            <NavLink
              href="/internal/people"
              label="People"
              icon={IdentificationCard}
              badge={admin ? requests : undefined}
              badgeTitle={`${requests} waiting for access`}
              active={isActive("/internal/people")}
            />
          ) : null}
        </NavGroup>
      ) : null}
      {role ? (
        <div className="mt-5">
          <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">
            Settings
          </p>
          <div className="flex flex-col gap-0.5">
            <NavLink
              href="/internal/templates"
              label="Email templates"
              icon={EnvelopeOpen}
              active={isActive("/internal/templates")}
            />
          </div>
        </div>
      ) : null}
    </nav>
  );
}

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
  Files,
  Folders,
  Gauge,
  Handshake,
  IdentificationCard,
  Kanban,
  NotePencil,
  Receipt,
  ShareNetwork,
  SlidersHorizontal,
  SquaresFour,
  Trophy,
  UserSound,
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
import { SIDEBAR_EASE, SIDEBAR_FADE } from "@/lib/internal/sidebar";
import { cn } from "@/lib/utils";

const ICONS: Record<SectionKey, Icon> = {
  jobs: Briefcase,
  hackathons: Trophy,
  cohort: UsersThree,
  subscribers: EnvelopeSimple,
  "partner-pool": Handshake,
};

/*
 * Desktop with the sidebar folded down to its icons (see MobileNavPanel).
 * The icons never move: the sidebar narrows around them while names and
 * counts fade (still read by screen readers; names show as tooltips via
 * data-tip), a count turns into a dot and group titles fold into a rule.
 */
const FOLDED_SHOW = cn("opacity-0 transition-opacity", SIDEBAR_EASE, "md:group-data-[collapsed=true]/sidebar:opacity-100");

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
  const count = badge ? (badgeTitle || `${badge} new`) : null;
  return (
    <HoverLink
      href={href}
      aria-current={active ? "page" : undefined}
      data-tip={count ? `${label} · ${count}` : label}
      className={cn(
        "group flex h-10 shrink-0 items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg px-2.5 text-[14px] transition-colors md:h-8 md:text-[13.5px]",
        active
          ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)]"
          : "text-[var(--i-ink-2)] hover:bg-black/[0.035] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.05]",
      )}
    >
      <span className="relative flex shrink-0">
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
        {badge ? (
          <span
            aria-hidden
            className={cn(
              "absolute -right-1 -top-1 size-2 rounded-full bg-[var(--i-accent)] ring-2",
              active ? "ring-[var(--i-panel)]" : "ring-[var(--i-sidebar)]",
              FOLDED_SHOW,
            )}
          />
        ) : null}
      </span>
      <span className={cn("flex-1", SIDEBAR_FADE)}>{label}</span>
      <LinkPending />
      {badge ? (
        <span
          className={cn(
            "ml-2 rounded-full bg-[var(--i-accent-soft)] px-1.5 text-[11px] font-medium leading-[18px] tabular-nums text-[var(--i-accent-text)]",
            SIDEBAR_FADE,
          )}
          title={count ?? undefined}
        >
          {badge}
        </span>
      ) : null}
    </HoverLink>
  );
}

/**
 * A group title. Folded, it shrinks to nothing (rows 1fr → 0fr, so the
 * links below glide up instead of jumping) while it fades.
 */
function GroupTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-rows-[1fr] transition-[grid-template-rows,opacity]",
        SIDEBAR_EASE,
        "md:group-data-[collapsed=true]/sidebar:grid-rows-[0fr] md:group-data-[collapsed=true]/sidebar:opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <p
          className={cn(
            "whitespace-nowrap px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]",
            className,
          )}
        >
          {children}
        </p>
      </div>
    </div>
  );
}

/**
 * The short line between groups once their titles fold away: sits in the
 * gap above whatever follows it (`className` sets how far up).
 */
function FoldedRule({ className }: { className: string }) {
  return (
    <span aria-hidden className="relative mx-2.5 block h-0">
      <span className={cn("absolute inset-x-0 h-px bg-[var(--i-line)]", FOLDED_SHOW, className)} />
    </span>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <FoldedRule className="-top-2.5" />
      <GroupTitle>{title}</GroupTitle>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

/** The client-work pages with a link of their own (the rest highlight Overview). */
const CLIENT_PAGES = [
  "/clients/board",
  "/clients/load",
  "/clients/reports",
  "/clients/templates",
];

/** The blog pages with a link of their own; Posts covers the list and every post's editor. */
const BLOG_PAGES = ["/blog/stats", "/blog/external"];

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
  influencers = false,
  socials = false,
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
  /** Outreach, with my follow-ups due; null without access (given one by one, Admin alone isn't enough). */
  outreach?: { due: number } | null;
  /** Influencers: given one by one, like Outreach. */
  influencers?: boolean;
  /** Social growth: given one by one, like Outreach. */
  socials?: boolean;
  /** Where this person's dashboard starts; the sections link back to it. */
  home: string;
  /** Show the Overview link: everyone whose home is the Overview. */
  overview: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const groups = ["Pipelines", "Audiences"] as const;

  // Community, Clients, Money and Blog are sections of their own: inside
  // one, the sidebar shows only that section's pages, so the main sidebar
  // stays short. Hackathon registrations belong to Community.
  const section =
    (isActive("/community") || isActive(SECTIONS.hackathons.path)) && community
      ? "community"
      : isActive("/clients") && clients
        ? "clients"
        : isActive("/money") && team.money
          ? "money"
          : isActive("/blog") && blog
            ? "blog"
            : null;
  const sectionName =
    section === "money"
      ? "Money"
      : section === "clients"
        ? "Clients"
        : section === "blog"
          ? "Blog"
          : "Community";
  if (section) {
    const back = !home.startsWith(`/${section}`);
    return (
      <nav
        aria-label={sectionName}
        className="flex flex-col"
      >
        {back ? (
          <>
            <Link
              href={home}
              data-tip="Back to the dashboard"
              className="mb-3 flex h-10 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg px-2.5 text-[13px] text-[var(--i-muted)] transition-colors hover:bg-black/[0.035] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.05] md:h-8"
            >
              {/* 1px in, so the 14px arrow centres on the 16px icons below. */}
              <ArrowLeft size={14} aria-hidden className="ml-px shrink-0" />
              <span className={SIDEBAR_FADE}>Dashboard</span>
            </Link>
            <FoldedRule className="-top-1.5" />
          </>
        ) : null}
        <GroupTitle className={back ? "pt-1" : "pt-3"}>{sectionName}</GroupTitle>
        <div className="flex flex-col gap-0.5">
          {section === "clients" && clients ? (
            <>
              <NavLink
                href="/clients"
                label="Overview"
                icon={Folders}
                badge={clients.late}
                badgeTitle={`${clients.late} of your deliverables late`}
                active={pathname === "/clients" || (isActive("/clients") && !CLIENT_PAGES.some((page) => isActive(page)))}
              />
              <NavLink
                href="/clients/board"
                label="This week"
                icon={CalendarBlank}
                active={isActive("/clients/board")}
              />
              <NavLink
                href="/clients/load"
                label="Owner load"
                icon={Gauge}
                badge={clients.toReview}
                badgeTitle={`${clients.toReview} waiting for your review`}
                active={isActive("/clients/load")}
              />
              <NavLink
                href="/clients/reports"
                label="Monthly report"
                icon={FileText}
                active={isActive("/clients/reports")}
              />
              {clients.access === "manager" ? (
                <NavLink
                  href="/clients/templates"
                  label="Templates & capacity"
                  icon={SlidersHorizontal}
                  active={isActive("/clients/templates")}
                />
              ) : null}
            </>
          ) : section === "blog" && blog ? (
            <>
              {/* Writers have no Google numbers: Posts is their whole section. */}
              {blog === "reviewer" ? (
                <NavLink href="/blog" label="Overview" icon={NotePencil} active={pathname === "/blog"} />
              ) : null}
              <NavLink
                href="/blog/posts"
                label="Posts"
                icon={Files}
                badge={blogBadge}
                badgeTitle={
                  blog === "reviewer"
                    ? `${blogBadge} waiting for review`
                    : `${blogBadge} with feedback`
                }
                active={
                  pathname !== "/blog" &&
                  !BLOG_PAGES.some((page) => isActive(page))
                }
              />
              {blog === "reviewer" ? (
                <>
                  <NavLink href="/blog/stats" label="Stats" icon={ChartLineUp} active={isActive("/blog/stats")} />
                  <NavLink
                    href="/blog/external"
                    label="External"
                    icon={ShareNetwork}
                    active={isActive("/blog/external")}
                  />
                </>
              ) : null}
            </>
          ) : section === "money" ? (
            <>
              <NavLink href="/money" label="Overview" icon={Bank} active={pathname === "/money"} />
              <NavLink
                href="/money/payroll"
                label="Payroll"
                icon={Receipt}
                badge={team.payrollBadge}
                badgeTitle={`${team.payrollBadge} expense ${team.payrollBadge === 1 ? "claim" : "claims"} waiting`}
                active={isActive("/money/payroll")}
              />
              <NavLink
                href="/money/payments"
                label="Payments"
                icon={Wallet}
                badge={team.paymentsBadge}
                badgeTitle={`${team.paymentsBadge} to pay`}
                active={isActive("/money/payments")}
              />
            </>
          ) : community ? (
            <>
              <NavLink
                href="/community"
                label="Overview"
                icon={Compass}
                active={pathname === "/community"}
              />
              <NavLink
                href="/community/events"
                label="Events"
                icon={CalendarBlank}
                active={isActive("/community/events")}
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
                href="/community/sponsors"
                label="Sponsors"
                icon={Megaphone}
                badge={community.sponsors}
                badgeTitle={`${community.sponsors} ${community.sponsors === 1 ? "follow-up" : "follow-ups"} due`}
                active={isActive("/community/sponsors")}
              />
              <NavLink
                href="/community/campus"
                label="Campus partners"
                icon={Buildings}
                badge={community.partners}
                badgeTitle={`${community.partners} ${community.partners === 1 ? "follow-up" : "follow-ups"} due`}
                active={isActive("/community/campus")}
              />
              {/* Money stays with the manager: interns have no Budget page. */}
              {community.access === "manager" ? (
                <NavLink
                  href="/community/budget"
                  label="Budget"
                  icon={Coins}
                  active={isActive("/community/budget")}
                />
              ) : null}
              <NavLink
                href="/community/tasks"
                label="Tasks"
                icon={CheckSquare}
                badge={community.tasks}
                badgeTitle={`${community.tasks} of your tasks due or late`}
                active={isActive("/community/tasks")}
              />
              <NavLink
                href="/community/analytics"
                label="Analytics"
                icon={ChartLineUp}
                active={isActive("/community/analytics")}
              />
              {/* Managers email hackathon registrants; without a hiring
                  role they have no Settings group to find this under. */}
              {community.access === "manager" ? (
                <NavLink
                  href="/templates"
                  label="Email templates"
                  icon={EnvelopeOpen}
                  active={isActive("/templates")}
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
          href="/"
          label="Overview"
          icon={SquaresFour}
          active={isActive("/")}
        />
      ) : null}
      {clients || blog || community || team.money || outreach || influencers || socials ? (
        <NavGroup title="Workspaces">
          {clients ? (
            <NavLink
              href="/clients"
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
              href="/outreach"
              label="Outreach"
              icon={Binoculars}
              badge={outreach.due}
              badgeTitle={`${outreach.due} of your follow-ups due`}
              active={isActive("/outreach")}
            />
          ) : null}
          {influencers ? (
            <NavLink
              href="/influencers"
              label="Influencers"
              icon={UserSound}
              active={isActive("/influencers")}
            />
          ) : null}
          {socials ? (
            <NavLink
              href="/socials"
              label="Social growth"
              icon={ChartLineUp}
              active={isActive("/socials")}
            />
          ) : null}
          {blog ? (
            <NavLink
              href="/blog"
              label="Blog"
              icon={NotePencil}
              badge={blogBadge}
              badgeTitle={
                blog === "reviewer"
                  ? `${blogBadge} waiting for review`
                  : `${blogBadge} with feedback`
              }
              active={isActive("/blog")}
            />
          ) : null}
          {community ? (
            <NavLink
              href="/community"
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
              href="/money"
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
          <NavGroup key={group} title={group}>
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
          </NavGroup>
        ))}
      {team.me || team.people || team.tasks || team.calls ? (
        <NavGroup title="Team">
          {team.me ? (
            <NavLink href="/me" label="My day" icon={CalendarCheck} active={isActive("/me")} />
          ) : null}
          {team.tasks ? (
            <NavLink
              href="/tasks"
              label="Tasks"
              icon={Kanban}
              badge={team.tasksBadge}
              badgeTitle={`${team.tasksBadge} late task${team.tasksBadge === 1 ? "" : "s"} or report${team.tasksBadge === 1 ? "" : "s"} to see to`}
              active={isActive("/tasks")}
            />
          ) : null}
          {team.calls ? (
            <NavLink href="/calls" label="Calls" icon={VideoCamera} active={isActive("/calls")} />
          ) : null}
          {team.people ? (
            <NavLink
              href="/people"
              label="People"
              icon={IdentificationCard}
              badge={admin ? requests : undefined}
              badgeTitle={`${requests} waiting for access`}
              active={isActive("/people")}
            />
          ) : null}
        </NavGroup>
      ) : null}
      {role ? (
        <NavGroup title="Settings">
          <NavLink
            href="/templates"
            label="Email templates"
            icon={EnvelopeOpen}
            active={isActive("/templates")}
          />
        </NavGroup>
      ) : null}
    </nav>
  );
}

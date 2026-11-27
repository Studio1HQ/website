"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useSyncExternalStore } from "react";
import {
  CaretRight,
  type Icon,
  Nav,
} from "@/components/internal/icons";
import { useSidebarCollapsed } from "@/components/internal/mobile-nav";
import { useHiddenSections } from "@/components/internal/sidebar-prefs";
import { atLeast, type BlogAccess, type Role } from "@/lib/internal/roles";
import { SECTIONS, type SectionKey } from "@/lib/internal/sections";
import { HoverLink } from "@/components/internal/nav-progress";
import { SIDEBAR_EASE, SIDEBAR_FADE } from "@/lib/internal/sidebar";
import { cn } from "@/lib/utils";

const ICONS: Record<SectionKey, Icon> = {
  jobs: Nav.UserSearch,
  hackathons: Nav.Trophy,
  cohort: Nav.GraduationCap,
  campus: Nav.ClipboardList,
  subscribers: Nav.Mail,
  "partner-pool": Nav.Handshake,
};

/*
 * Desktop with the sidebar folded down to its icons (see MobileNavPanel).
 * The icons never move: the sidebar narrows around them while names and
 * counts fade (still read by screen readers; names show as tooltips via
 * data-tip), a count turns into a dot and group titles fold into a rule.
 */
const FOLDED_SHOW = cn(
  "opacity-0 transition-opacity",
  SIDEBAR_EASE,
  "md:group-data-[collapsed=true]/sidebar:opacity-100",
);

/** True inside a section's opened pages: rows render as quiet sub-rows. */
const InSubNav = createContext(false);

/**
 * A row's count: a small solid circle with the number (wider for 10+),
 * the same orange as the bell's unread dot. Still, no glow.
 */
function Count({ children, title, className }: { children: number; title: string | null; className?: string }) {
  return (
    <span
      title={title ?? undefined}
      className={cn(
        "inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--i-accent)] px-[5px] text-[10.5px] font-semibold leading-none tabular-nums text-white",
        className,
      )}
    >
      {children > 99 ? "99+" : children}
    </span>
  );
}

function NavLink({
  href,
  label,
  icon: IconComponent,
  badge,
  badgeTitle,
  active,
  open = false,
}: {
  href: string;
  label: string;
  icon: Icon;
  badge?: number;
  badgeTitle?: string;
  active: boolean;
  /** This section is open (one of its pages is showing): bold, no pill. */
  open?: boolean;
}) {
  const count = badge ? badgeTitle || `${badge} new` : null;
  const sub = useContext(InSubNav);
  if (sub) {
    return (
      <HoverLink
        href={href}
        data-tip={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/sub relative ml-[14px] flex h-9 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg pl-2 pr-2 text-[14px] transition-colors",
          active
            ? "bg-black/[0.06] font-medium text-[var(--i-ink)] dark:bg-white/[0.09]"
            : "text-[var(--i-muted)] hover:bg-black/[0.03] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.04]",
        )}
      >
        {/* the tree: a curved branch off the section's line, and the line
            carrying on down to the next page (hidden after the last one) */}
        <span
          aria-hidden
          data-elbow
          className="pointer-events-none absolute -left-[14px] top-0 h-1/2 w-[10px] rounded-bl-[7px] border-b border-l border-[var(--i-line-strong,var(--i-line))]"
        />
        <span
          aria-hidden
          data-trunk
          className="pointer-events-none absolute -left-[14px] bottom-0 top-1/2 border-l border-[var(--i-line-strong,var(--i-line))]"
        />
        <IconComponent
          size={16}
          weight="regular"
          aria-hidden
          className={cn(
            "shrink-0 transition-colors",
            active ? "text-[var(--i-ink)]" : "text-[var(--i-faint)] group-hover/sub:text-[var(--i-muted)]",
          )}
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge ? (
          <Count title={count}>{badge}</Count>
        ) : null}
      </HoverLink>
    );
  }
  return (
    <HoverLink
      href={href}
      aria-current={active ? "page" : undefined}
      data-tip={count ? `${label} · ${count}` : label}
      className={cn(
        "group flex h-10 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-[9px] text-[15px] transition-colors md:h-9 md:text-[14.5px]",
        open
          ? "font-medium text-[var(--i-ink)] hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
          : active
            ? "bg-black/[0.06] font-medium text-[var(--i-ink)] dark:bg-white/[0.09]"
            : "text-[var(--i-ink-2)] hover:bg-black/[0.035] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.05]",
      )}
    >
      <span className="relative flex shrink-0">
        <IconComponent
          size={18}
          weight="regular"
          className={
            active || open
              ? "text-[var(--i-ink)]"
              : "text-[var(--i-muted)] group-hover:text-[var(--i-ink-2)]"
          }
          aria-hidden
        />
        {badge ? (
          <span
            aria-hidden
            className={cn(
              "absolute -right-1 -top-1 size-2 rounded-full bg-[var(--i-accent)] ring-2",
              "ring-[var(--i-sidebar)]",
              FOLDED_SHOW,
            )}
          />
        ) : null}
      </span>
      <span className={cn("flex-1", SIDEBAR_FADE)}>{label}</span>
      {badge ? (
        <Count title={count} className={cn("ml-2", SIDEBAR_FADE)}>
          {badge}
        </Count>
      ) : null}
    </HoverLink>
  );
}

/**
 * A group title, and the switch for its section: click it to fold the
 * section's links away or bring them back (a chevron shows which). Folded to
 * icons, the title shrinks to nothing (rows 1fr → 0fr, so the links below
 * glide up instead of jumping) while it fades.
 */
function GroupTitle({
  children,
  icon: GroupIcon,
  open,
  onToggle,
}: {
  children: React.ReactNode;
  icon?: Icon;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "grid grid-rows-[1fr] transition-[grid-template-rows,opacity]",
        SIDEBAR_EASE,
        "md:group-data-[collapsed=true]/sidebar:grid-rows-[0fr] md:group-data-[collapsed=true]/sidebar:opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {/* A row of its own: the section's icon, its name, and an arrow that
            turns down while it's open, so a closed sidebar still reads as a
            menu rather than a list of labels. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="group/title mb-1 flex h-7 w-full items-center gap-2.5 whitespace-nowrap rounded-md px-[10px] text-left text-[12px] font-medium tracking-[0.01em] text-[var(--i-faint)] transition-colors hover:text-[var(--i-muted)]"
        >
          {GroupIcon ? <GroupIcon size={14} aria-hidden className="shrink-0" /> : null}
          <span className="flex-1">{children}</span>
          <CaretRight
            size={13}
            aria-hidden
            className={cn("shrink-0 transition-transform duration-200", open && "rotate-90")}
          />
        </button>
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
      <span
        className={cn(
          "absolute inset-x-0 h-px bg-[var(--i-line)]",
          FOLDED_SHOW,
          className,
        )}
      />
    </span>
  );
}

/** Each section's icon, on its heading row. */
const GROUP_ICONS: Record<string, Icon> = {
  Work: Nav.CalendarClock,
  Clients: Nav.Briefcase,
  Marketing: Nav.Radio,
  Community: Nav.HeartHandshake,
  Team: Nav.Network,
  Settings: Nav.Cog,
};

/** The sections someone has closed, kept in this browser ("|"-separated titles). */
const CLOSED_KEY = "studio1-sidebar-closed";
const closedListeners = new Set<() => void>();

function subscribeClosed(listener: () => void) {
  closedListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    closedListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readClosed() {
  try {
    return localStorage.getItem(CLOSED_KEY) ?? "";
  } catch {
    return "";
  }
}

function setClosed(title: string, closed: boolean) {
  const titles = new Set(readClosed().split("|").filter(Boolean));
  if (closed) titles.add(title);
  else titles.delete(title);
  try {
    localStorage.setItem(CLOSED_KEY, [...titles].join("|"));
  } catch {
    // private window or blocked storage: the section still toggles until reload
  }
  closedListeners.forEach((listener) => listener());
}

function NavGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  // Open on the server and on first paint; a closed one folds once the browser says so.
  const closed = useSyncExternalStore(subscribeClosed, readClosed, () => "").split("|").includes(title);
  const folded = useSidebarCollapsed();
  // Switched off in Customise sidebar: kept in the page (hidden), so the
  // dialog can still list it to switch back on.
  const off = useHiddenSections().includes(title);
  return (
    <div className="mt-5" data-group={title} hidden={off}>
      <FoldedRule className="-top-2.5" />
      <GroupTitle icon={GROUP_ICONS[title]} open={!closed} onToggle={() => setClosed(title, !closed)}>
        {title}
      </GroupTitle>
      {/* Folded to icons, every section shows: there are no titles to reopen them by. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity]",
          SIDEBAR_EASE,
          closed
            ? "grid-rows-[0fr] opacity-0 md:group-data-[collapsed=true]/sidebar:grid-rows-[1fr] md:group-data-[collapsed=true]/sidebar:opacity-100"
            : "grid-rows-[1fr] opacity-100",
        )}
        inert={closed && !folded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * A section's own pages, opened in place under its link while you're in
 * it: the rows ease open (grid 0fr → 1fr) and sit on a thin guide line.
 */
function SubNav({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-subnav
      className={cn(
        "grid transition-[grid-template-rows,opacity]",
        SIDEBAR_EASE,
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        // Folded to icons, a section's pages stay out of the way.
        "md:group-data-[collapsed=true]/sidebar:hidden",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">
        {/* The tree hangs from the section icon's centre (10px in + 8px). The
            first branch reaches up to meet the icon; the last has no trunk. */}
        <div className="mb-1.5 ml-[17.5px] mt-0.5 flex flex-col [&>*:first-child_[data-elbow]]:-top-1.5 [&>*:first-child_[data-elbow]]:h-[calc(50%+6px)] [&>*:last-child_[data-trunk]]:hidden">
          <InSubNav.Provider value>{children}</InSubNav.Provider>
        </div>
      </div>
    </div>
  );
}

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
  inbound = null,
  influencers = false,
  socials = false,
  jobBoard = false,
  home: _home,
  overview,
}: {
  awaiting: Partial<Record<SectionKey, number>>;
  /** Form sections level (applicants, subscribers); null hides them (blog-only people). */
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
  /** Inbound, with the held mail waiting for a decision; null without access. Settings is for the founders. */
  inbound?: { held: number; settings: boolean } | null;
  /** Influencers: given one by one, like Outreach. */
  influencers?: boolean;
  /** Social growth: given one by one, like Outreach. */
  socials?: boolean;
  /** The public DevRel jobs board's listings: given on People, or Admin. */
  jobBoard?: boolean;
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
  // A form section's link (applicants, subscribers, …), for whoever's role opens it.
  const showSection = (key: SectionKey) => atLeast(role, SECTIONS[key].minRole);
  const sectionLink = (key: SectionKey) =>
    showSection(key) ? (
      <NavLink
        href={SECTIONS[key].path}
        label={SECTIONS[key].nav}
        icon={ICONS[key]}
        badge={awaiting[key]}
        active={isActive(SECTIONS[key].path)}
      />
    ) : null;

  // Community, Clients, Money and Blog open their pages in place, under
  // their link, while you're inside them. Hackathon registrations belong
  // to Community.
  const section =
    (isActive("/community") || isActive(SECTIONS.hackathons.path)) && community
      ? "community"
      : isActive("/clients") && clients
        ? "clients"
        : isActive("/inbound") && inbound
          ? "inbound"
          : isActive("/money") && team.money
            ? "money"
            : isActive("/blog") && blog
              ? "blog"
              : null;
  const moneyBadge = team.payrollBadge + team.paymentsBadge;
  const clientsBadge = clients ? clients.late + clients.toReview : 0;
  // A project's month (/clients/<company>/<YYYY-MM>) is under Projects;
  // the rest of Clients (each company, Templates) is under Companies.
  const clientPage = isActive("/clients/stats")
    ? "stats"
    : isActive("/clients/projects") ||
        /^\/clients\/[^/]+\/\d{4}-\d{2}(\/|$)/.test(pathname)
      ? "projects"
      : "companies";
  const hackathonsNew = community ? (awaiting.hackathons ?? 0) : 0;
  const campusNew = community ? (awaiting.campus ?? 0) : 0;
  const communityBadge = community
    ? community.tasks + community.sponsors + community.partners + hackathonsNew + campusNew
    : 0;

  return (
    <nav aria-label="Dashboard" className="flex flex-col">
      {overview ? (
        <NavLink
          href="/"
          label="Overview"
          icon={Nav.LayoutDashboard}
          active={isActive("/")}
        />
      ) : null}
      {/* Work: what you're doing today. */}
      {team.me || team.tasks || team.calls ? (
        <NavGroup title="Work">
          {team.me ? (
            <NavLink
              href="/me"
              label="My day"
              icon={Nav.Sun}
              active={isActive("/me")}
            />
          ) : null}
          {team.tasks ? (
            <NavLink
              href="/tasks"
              label="Tasks"
              icon={Nav.SquareCheckBig}
              badge={team.tasksBadge}
              badgeTitle={`${team.tasksBadge} late task${team.tasksBadge === 1 ? "" : "s"} or report${team.tasksBadge === 1 ? "" : "s"} to see to`}
              active={isActive("/tasks")}
            />
          ) : null}
          {team.calls ? (
            <NavLink
              href="/calls"
              label="Calls"
              icon={Nav.Phone}
              active={isActive("/calls")}
            />
          ) : null}
        </NavGroup>
      ) : null}
      {/* Clients: winning and delivering paid work. */}
      {clients || outreach || inbound ? (
        <NavGroup title="Clients">
          {clients ? (
            <>
              <NavLink
                href="/clients"
                label="Clients"
                icon={Nav.Building2}
                badge={clientsBadge}
                badgeTitle={[
                  clients.late
                    ? `${clients.late} of your deliverables late`
                    : null,
                  clients.toReview
                    ? `${clients.toReview} waiting for your review`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                active={false}
                open={section === "clients"}
              />
              <SubNav open={section === "clients"}>
                <NavLink
                  href="/clients"
                  label="Companies"
                  icon={Nav.Building}
                  active={clientPage === "companies"}
                />
                <NavLink
                  href="/clients/projects"
                  label="Projects"
                  icon={Nav.FolderKanban}
                  badge={clientsBadge}
                  badgeTitle={[
                    clients.late
                      ? `${clients.late} of your deliverables late`
                      : null,
                    clients.toReview
                      ? `${clients.toReview} waiting for your review`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  active={clientPage === "projects"}
                />
                <NavLink
                  href="/clients/stats"
                  label="Stats"
                  icon={Nav.ChartColumn}
                  active={clientPage === "stats"}
                />
              </SubNav>
            </>
          ) : null}
          {outreach ? (
            <NavLink
              href="/outreach"
              label="Outreach"
              icon={Nav.Target}
              badge={outreach.due}
              badgeTitle={`${outreach.due} of your follow-ups due`}
              active={isActive("/outreach")}
            />
          ) : null}
          {inbound ? (
            <>
              <NavLink
                href="/inbound"
                label="Inbound"
                icon={Nav.MailOpen}
                badge={inbound.held}
                badgeTitle={`${inbound.held} mail${inbound.held === 1 ? "" : "s"} waiting for a decision`}
                active={false}
                open={section === "inbound"}
              />
              <SubNav open={section === "inbound"}>
                <NavLink
                  href="/inbound"
                  label="Board"
                  icon={Nav.FolderKanban}
                  active={
                    isActive("/inbound") &&
                    !["/inbound/review", "/inbound/stats", "/inbound/settings"].some(isActive)
                  }
                />
                <NavLink
                  href="/inbound/review"
                  label="Review"
                  icon={Nav.ListChecks}
                  badge={inbound.held}
                  badgeTitle={`${inbound.held} mail${inbound.held === 1 ? "" : "s"} waiting for a decision`}
                  active={isActive("/inbound/review")}
                />
                <NavLink
                  href="/inbound/stats"
                  label="Stats"
                  icon={Nav.ChartColumn}
                  active={isActive("/inbound/stats")}
                />
                {inbound.settings ? (
                  <NavLink
                    href="/inbound/settings"
                    label="Settings"
                    icon={Nav.Cog}
                    active={isActive("/inbound/settings")}
                  />
                ) : null}
              </SubNav>
            </>
          ) : null}
        </NavGroup>
      ) : null}
      {/* Marketing: Studio1's own brand. */}
      {blog || socials || influencers || showSection("subscribers") ? (
        <NavGroup title="Marketing">
          {blog ? (
            <>
              <NavLink
                href="/blog"
                label="Blog"
                icon={Nav.Newspaper}
                badge={blogBadge}
                badgeTitle={
                  blog === "reviewer"
                    ? `${blogBadge} waiting for review`
                    : `${blogBadge} with feedback`
                }
                active={false}
                open={section === "blog"}
              />
              <SubNav open={section === "blog"}>
                {/* Writers have no Google numbers: Posts is their whole section. */}
                {blog === "reviewer" ? (
                  <NavLink
                    href="/blog"
                    label="Overview"
                    icon={Nav.LayoutList}
                    active={pathname === "/blog"}
                  />
                ) : null}
                <NavLink
                  href="/blog/posts"
                  label="Posts"
                  icon={Nav.FileText}
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
                    <NavLink
                      href="/blog/stats"
                      label="Stats"
                      icon={Nav.ChartColumn}
                      active={isActive("/blog/stats")}
                    />
                    <NavLink
                      href="/blog/external"
                      label="External"
                      icon={Nav.Globe}
                      active={isActive("/blog/external")}
                    />
                  </>
                ) : null}
              </SubNav>
            </>
          ) : null}
          {socials ? (
            <NavLink
              href="/socials"
              label="Social growth"
              icon={Nav.TrendingUp}
              active={isActive("/socials")}
            />
          ) : null}
          {influencers ? (
            <NavLink
              href="/influencers"
              label="Influencers"
              icon={Nav.Megaphone}
              active={isActive("/influencers")}
            />
          ) : null}
          {sectionLink("subscribers")}
        </NavGroup>
      ) : null}
      {/* Community: our programs and the people in them. */}
      {community ||
      showSection("cohort") ||
      showSection("partner-pool") ||
      jobBoard ? (
        <NavGroup title="Community">
          {community ? (
            <>
              <NavLink
                href="/community"
                label="Community"
                icon={Nav.UsersRound}
                badge={communityBadge}
                badgeTitle={[
                  community.tasks
                    ? `${community.tasks} of your tasks due or late`
                    : null,
                  community.sponsors + community.partners
                    ? `${community.sponsors + community.partners} follow-ups due`
                    : null,
                  hackathonsNew
                    ? `${hackathonsNew} new hackathon ${hackathonsNew === 1 ? "registration" : "registrations"}`
                    : null,
                  campusNew
                    ? `${campusNew} new campus ${campusNew === 1 ? "application" : "applications"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                active={false}
                open={section === "community"}
              />
              <SubNav open={section === "community"}>
                <NavLink
                  href="/community"
                  label="Overview"
                  icon={Nav.LayoutList}
                  active={pathname === "/community"}
                />
                <NavLink
                  href="/community/events"
                  label="Events"
                  icon={Nav.CalendarDays}
                  active={isActive("/community/events")}
                />
                <NavLink
                  href={SECTIONS.hackathons.path}
                  label="Hackathon sign-ups"
                  icon={Nav.Trophy}
                  badge={awaiting.hackathons}
                  badgeTitle={`${awaiting.hackathons ?? 0} new ${awaiting.hackathons === 1 ? "registration" : "registrations"} to review`}
                  active={isActive(SECTIONS.hackathons.path)}
                />
                <NavLink
                  href="/community/sponsors"
                  label="Sponsors"
                  icon={Nav.HandCoins}
                  badge={community.sponsors}
                  badgeTitle={`${community.sponsors} ${community.sponsors === 1 ? "follow-up" : "follow-ups"} due`}
                  active={isActive("/community/sponsors")}
                />
                <NavLink
                  href={SECTIONS.campus.path}
                  label={SECTIONS.campus.nav}
                  icon={ICONS.campus}
                  badge={awaiting.campus}
                  badgeTitle={`${awaiting.campus ?? 0} new ${awaiting.campus === 1 ? "application" : "applications"} to review`}
                  active={isActive(SECTIONS.campus.path)}
                />
                <NavLink
                  href="/community/campus"
                  label="Campus partners"
                  icon={Nav.School}
                  badge={community.partners}
                  badgeTitle={`${community.partners} ${community.partners === 1 ? "follow-up" : "follow-ups"} due`}
                  active={isActive("/community/campus")}
                />
                {/* Money stays with the manager: interns have no Budget page. */}
                {community.access === "manager" ? (
                  <NavLink
                    href="/community/budget"
                    label="Budget"
                    icon={Nav.PiggyBank}
                    active={isActive("/community/budget")}
                  />
                ) : null}
                <NavLink
                  href="/community/tasks"
                  label="Tasks"
                  icon={Nav.ListChecks}
                  badge={community.tasks}
                  badgeTitle={`${community.tasks} of your tasks due or late`}
                  active={isActive("/community/tasks")}
                />
                <NavLink
                  href="/community/analytics"
                  label="Analytics"
                  icon={Nav.ChartColumn}
                  active={isActive("/community/analytics")}
                />
              </SubNav>
            </>
          ) : null}
          {sectionLink("cohort")}
          {sectionLink("partner-pool")}
          {jobBoard ? (
            <NavLink
              href="/job-board"
              label="DevRel jobs"
              icon={Nav.BriefcaseBusiness}
              active={isActive("/job-board")}
            />
          ) : null}
        </NavGroup>
      ) : null}
      {/* Team: who works here, who wants to, and how they're paid. */}
      {team.people || showSection("jobs") || team.money ? (
        <NavGroup title="Team">
          {team.people ? (
            <NavLink
              href="/people"
              label="People"
              icon={Nav.Contact}
              badge={admin ? requests : undefined}
              badgeTitle={`${requests} waiting for access`}
              active={isActive("/people")}
            />
          ) : null}
          {sectionLink("jobs")}
          {team.money ? (
            <>
              <NavLink
                href="/money"
                label="Money"
                icon={Nav.Banknote}
                badge={moneyBadge}
                badgeTitle={[
                  team.payrollBadge
                    ? `${team.payrollBadge} expense ${team.payrollBadge === 1 ? "claim" : "claims"} waiting`
                    : null,
                  team.paymentsBadge ? `${team.paymentsBadge} to pay` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                active={false}
                open={section === "money"}
              />
              <SubNav open={section === "money"}>
                <NavLink
                  href="/money"
                  label="Overview"
                  icon={Nav.LayoutList}
                  active={pathname === "/money"}
                />
                <NavLink
                  href="/money/payroll"
                  label="Payroll"
                  icon={Nav.ReceiptText}
                  badge={team.payrollBadge}
                  badgeTitle={`${team.payrollBadge} expense ${team.payrollBadge === 1 ? "claim" : "claims"} waiting`}
                  active={isActive("/money/payroll")}
                />
                <NavLink
                  href="/money/payments"
                  label="Payments"
                  icon={Nav.CreditCard}
                  badge={team.paymentsBadge}
                  badgeTitle={`${team.paymentsBadge} to pay`}
                  active={isActive("/money/payments")}
                />
              </SubNav>
            </>
          ) : null}
        </NavGroup>
      ) : null}
      {/* Settings: everyone has Connections; Email templates is for the
          hiring roles and community managers (who email registrants). */}
      <NavGroup title="Settings">
        {role || community?.access === "manager" ? (
          <NavLink
            href="/templates"
            label="Email templates"
            icon={Nav.MailOpen}
            active={isActive("/templates")}
          />
        ) : null}
        <NavLink
          href="/connections"
          label="Connections"
          icon={Nav.Plug}
          active={isActive("/connections")}
        />
      </NavGroup>
    </nav>
  );
}

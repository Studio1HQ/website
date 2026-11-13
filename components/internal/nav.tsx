"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bank,
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
  Handshake,
  IdentificationCard,
  NotePencil,
  Receipt,
  SquaresFour,
  Trophy,
  UserGear,
  UsersThree,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import { atLeast, type BlogAccess, type Role } from "@/lib/internal/roles";
import {
  SECTIONS,
  SECTION_ORDER,
  type SectionKey,
} from "@/lib/internal/sections";
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
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-[13.5px] transition-colors",
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
      {badge ? (
        <span
          className="ml-2 rounded-full bg-[var(--i-accent-soft)] px-1.5 text-[11px] font-medium leading-[18px] tabular-nums text-[var(--i-accent-text)]"
          title={badgeTitle ?? `${badge} new`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="contents md:mt-5 md:block">
      <p className="hidden px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)] md:block">
        {title}
      </p>
      <div className="contents md:flex md:flex-col md:gap-0.5">{children}</div>
    </div>
  );
}

export type TeamNav = {
  /** On the team list: My day. */
  me: boolean;
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

export function InternalNav({
  awaiting,
  role,
  blog,
  blogBadge,
  admin,
  requests,
  team,
  community,
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

  // Community and Money are sections of their own: inside one, the sidebar
  // shows only that section's pages, so the main sidebar stays short.
  // Hackathon registrations belong to Community.
  const section =
    (isActive("/internal/community") || isActive(SECTIONS.hackathons.path)) && community
      ? "community"
      : isActive("/internal/money") && team.money
        ? "money"
        : null;
  if (section) {
    const back = !home.startsWith(`/internal/${section}`);
    return (
      <nav
        aria-label={section === "money" ? "Money" : "Community"}
        className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0"
      >
        {back ? (
          <Link
            href={home}
            className="flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-[13px] text-[var(--i-muted)] hover:bg-black/[0.035] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.05] md:mb-1"
          >
            <ArrowLeft size={14} aria-hidden /> Dashboard
          </Link>
        ) : null}
        <p className="hidden items-center gap-2 px-2.5 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)] md:flex">
          {section === "money" ? "Money" : "Community"}
        </p>
        <div className="contents md:flex md:flex-col md:gap-0.5">
          {section === "money" ? (
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
              <NavLink
                href="/internal/community/budget"
                label="Budget"
                icon={Coins}
                active={isActive("/internal/community/budget")}
              />
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
            </>
          ) : null}
        </div>
      </nav>
    );
  }

  const moneyBadge = team.payrollBadge + team.paymentsBadge;
  const hackathonsNew = community ? (awaiting.hackathons ?? 0) : 0;
  const communityBadge = community ? community.tasks + community.sponsors + community.partners + hackathonsNew : 0;

  return (
    <nav
      aria-label="Dashboard"
      className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0"
    >
      {overview ? (
        <NavLink
          href="/internal"
          label="Overview"
          icon={SquaresFour}
          active={isActive("/internal")}
        />
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
          <div key={group} className="contents md:mt-5 md:block">
            <p className="hidden px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)] md:block">
              {group}
            </p>
            <div className="contents md:flex md:flex-col md:gap-0.5">
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
      {blog ? (
        <div className="contents md:mt-5 md:block">
          <p className="hidden px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)] md:block">
            Content
          </p>
          <div className="contents md:flex md:flex-col md:gap-0.5">
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
          </div>
        </div>
      ) : null}
      {team.me || team.people ? (
        <NavGroup title="Team">
          {team.me ? (
            <NavLink href="/internal/me" label="My day" icon={CalendarCheck} active={isActive("/internal/me")} />
          ) : null}
          {team.people ? (
            <NavLink
              href="/internal/people"
              label="People"
              icon={IdentificationCard}
              active={isActive("/internal/people")}
            />
          ) : null}
        </NavGroup>
      ) : null}
      {community || team.money ? (
        <NavGroup title="Areas">
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
      {role || community ? (
        <div className="contents md:mt-5 md:block">
          <p className="hidden px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)] md:block">
            Settings
          </p>
          <div className="contents md:flex md:flex-col md:gap-0.5">
            <NavLink
              href="/internal/templates"
              label="Email templates"
              icon={EnvelopeOpen}
              active={isActive("/internal/templates")}
            />
            {admin ? (
              <NavLink
                href="/internal/team"
                label="Team access"
                icon={UserGear}
                badge={requests}
                active={isActive("/internal/team")}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </nav>
  );
}

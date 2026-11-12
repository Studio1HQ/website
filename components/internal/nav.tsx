"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  EnvelopeOpen,
  EnvelopeSimple,
  Handshake,
  NotePencil,
  SquaresFour,
  Trophy,
  UserGear,
  UsersThree,
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

export function InternalNav({
  awaiting,
  role,
  blog,
  blogBadge,
  admin,
  requests,
}: {
  awaiting: Partial<Record<SectionKey, number>>;
  /** Pipelines level; null hides the pipelines (blog-only people). */
  role: Role | null;
  blog: BlogAccess | null;
  /** Posts waiting for this person: reviews for reviewers, news for writers. */
  blogBadge: number;
  admin: boolean;
  requests: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/internal"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const groups = ["Pipelines", "Audiences"] as const;

  return (
    <nav
      aria-label="Dashboard"
      className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0"
    >
      {role ? (
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
      {role ? (
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
                label="Team"
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

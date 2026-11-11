"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconChevronDown,
  IconChevronRight,
  IconMenu2,
} from "@tabler/icons-react";
import { navItems, type NavItem, type NavLink } from "@/constants/data";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import { PAPER_SCOPE, unprefixPath } from "@/lib/paper";
import { useIsPaper } from "@/components/paper/paper-chrome-context";
import Logo from "../ui/svgs/logo";
import { MailIcon } from "@/components/ui/mail-icon";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { useTranslations } from "next-intl";


/** Paper colours for the mobile menu, including the hover/accent tone. */
const MOBILE_PAPER_SCOPE = {
  ...PAPER_SCOPE,
  "--accent": "36 25% 89%",
  "--accent-foreground": "0 0% 8%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "0 0% 8%",
} as CSSProperties;
const navTitleKeys: Record<string, string> = {
  "About Us": "about",
  "AEO Agency": "aeo",
  "All Services": "allServices",
  "Case Studies": "caseStudies",
  "Client Work": "clientWork",
  "Developer Relations & Growth": "devrel",
  "Developer Video Production": "video",
  "Documentation & DX Audits": "docs",
  "GitHub Growth": "githubGrowth",
  "Influencer Management": "influencer",
  "Content Distribution": "distribution",
  "Our Blog": "blog",
  "Product Launch": "productLaunch",
  "Reddit Marketing": "redditMarketing",
  "Technical Content Marketing": "technicalContent",
  Content: "content",
  Home: "home",
  Overview: "overview",
  Process: "process",
  Product: "product",
  Proof: "proof",
  Results: "results",
  Services: "services",
};

const navDescriptionKeys: Record<string, string> = {
  "Tutorials and guides we write for clients": "clientWork",
  "Proof from docs, DevRel, launch, and content work": "caseStudies",
  "Articles and insights from the Studio1 team": "blog",
};

function translatedNavTitle(
  title: string,
  t: ReturnType<typeof useTranslations>,
) {
  const key = navTitleKeys[title];
  return key ? t(`items.${key}`) : title;
}

function translatedNavDescription(
  description: string,
  t: ReturnType<typeof useTranslations>,
) {
  const key = navDescriptionKeys[description];
  return key ? t(`descriptions.${key}`) : description;
}

const triggerClass = cn(
  "relative flex items-center justify-center px-2 py-1 text-sm transition-colors duration-200 hover:text-primary group-hover/nav:text-primary",
  "after:absolute after:-bottom-0.5 after:left-2 after:right-2 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-gradient-to-r after:from-primary after:to-primary1 after:transition-transform after:duration-300 hover:after:scale-x-100 group-hover/nav:after:scale-x-100",
);

/** Dropdown shell: opens on hover, and on keyboard focus inside the item. */
const dropdownClass = cn(
  "absolute top-full pt-4 origin-top",
  "opacity-0 -translate-y-1 scale-95 pointer-events-none",
  "transition-all duration-300 ease-out",
  "group-hover/nav:opacity-100 group-hover/nav:translate-y-0 group-hover/nav:scale-100 group-hover/nav:pointer-events-auto",
  "group-focus-within/nav:opacity-100 group-focus-within/nav:translate-y-0 group-focus-within/nav:scale-100 group-focus-within/nav:pointer-events-auto",
);

const paperCard =
  "rounded-[6px] bg-white text-[#141414] shadow-[0_24px_50px_-28px_rgba(20,20,20,0.35)] ring-1 ring-[#141414]/10";
const paperLabel =
  "px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#141414]/45";

/** One service link in a dropdown pane. */
function MenuLink({
  child,
  isPaper,
  current,
  t,
  rowHeight = false,
}: {
  child: NavLink;
  isPaper: boolean;
  current: boolean;
  t: ReturnType<typeof useTranslations>;
  /** Match the group rail's row height, so both panes line up. */
  rowHeight?: boolean;
}) {
  return (
    <Link
      href={child.path}
      aria-current={current ? "page" : undefined}
      className={cn(
        "group/item flex w-full items-start gap-2.5 px-3 py-2.5 transition-colors duration-200",
        isPaper
          ? "items-center gap-3 rounded-[6px] py-2 text-[14px] text-[#141414] hover:bg-[#f4efe7]/60"
          : "text-muted-foreground hover:text-foreground",
        rowHeight && "h-[54px] py-0",
        current && (isPaper ? "bg-[#f4efe7]/60" : "text-foreground"),
      )}
    >
      {isPaper ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-[#f6f3ee] shadow-[inset_0_2px_6px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08)] transition-colors duration-200 group-hover/item:text-[#f97316]",
            current ? "text-[#f97316]" : "text-[#141414]/75",
          )}
        >
          <child.icon weight="duotone" className="size-[18px]" />
        </span>
      ) : (
        <child.icon
          weight="duotone"
          className="mt-0.5 size-5 shrink-0 transition-colors duration-200 group-hover/item:text-primary"
        />
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="whitespace-nowrap text-sm font-medium">
          {translatedNavTitle(child.title, t)}
        </span>
        {child.description ? (
          <span
            className={cn(
              "whitespace-nowrap text-xs leading-snug",
              isPaper ? "text-[#141414]/55" : "text-muted-foreground/80",
            )}
          >
            {translatedNavDescription(child.description, t)}
          </span>
        ) : null}
      </span>
      {isPaper ? (
        <IconArrowUpRight
          aria-hidden
          className="ml-auto size-3.5 shrink-0 text-[#141414]/40 opacity-0 transition-all duration-200 group-hover/item:translate-x-0.5 group-hover/item:opacity-100"
        />
      ) : null}
    </Link>
  );
}

/**
 * Two-pane menu for an item with groups: the groups sit in a rail on the
 * left, and hovering (or focusing) one shows its services on the right.
 * It opens on the group holding the current page, else the first.
 */
function GroupedNavItem({
  item,
  isPaper,
  path,
}: {
  item: NavItem;
  isPaper: boolean;
  path: string;
}) {
  const t = useTranslations("Nav");
  const groups = item.groups ?? [];
  const currentGroup = Math.max(
    0,
    groups.findIndex((group) =>
      group.children.some((child) => child.path === path),
    ),
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? currentGroup;
  const group = groups[active];
  if (!group) return null;
  const panelId = `nav-${group.key}-panel`;

  return (
    <div
      className="relative group/nav"
      // Each time the menu opens, start from the current page's group.
      onMouseEnter={() => setHovered(null)}
    >
      <button type="button" className={triggerClass}>
        {translatedNavTitle(item.title, t)}
        <IconChevronDown className="ml-1 mt-0.5 size-4 transition-transform duration-300 group-hover/nav:rotate-180" />
      </button>
      <div className={cn(dropdownClass, "left-1/2 -translate-x-1/2")}>
        <div
          className={cn(
            "grid w-[43rem] grid-cols-[18.5rem_minmax(0,1fr)] overflow-hidden",
            isPaper
              ? paperCard
              : "rounded-[6px] border bg-background shadow-lg",
          )}
        >
          {/* Rail: one row per group */}
          <div
            className={cn(
              "flex flex-col p-2",
              isPaper ? "bg-[#f6f3ee]/70" : "border-r bg-muted/40",
            )}
          >
            <p
              className={cn(paperLabel, !isPaper && "text-muted-foreground/70")}
            >
              {translatedNavTitle(item.title, t)}
            </p>
            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label={translatedNavTitle(item.title, t)}
              className="flex flex-col gap-1"
            >
              {groups.map((entry, index) => {
                const selected = index === active;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    role="tab"
                    id={`nav-${entry.key}-tab`}
                    aria-selected={selected}
                    aria-controls={`nav-${entry.key}-panel`}
                    onMouseEnter={() => setHovered(index)}
                    onFocus={() => setHovered(index)}
                    onClick={() => setHovered(index)}
                    className={cn(
                      "flex h-[54px] items-center gap-3 rounded-[6px] px-2.5 text-left transition-colors duration-200",
                      selected
                        ? isPaper
                          ? "bg-white shadow-[0_1px_0_rgba(20,20,20,0.06)] ring-1 ring-[#141414]/[0.08]"
                          : "bg-background ring-1 ring-border"
                        : isPaper
                          ? "hover:bg-white/60"
                          : "hover:bg-background/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-[6px] transition-colors duration-200",
                        selected
                          ? "bg-[#f97316] text-white"
                          : isPaper
                            ? "bg-white text-[#141414]/60 ring-1 ring-[#141414]/[0.08]"
                            : "bg-background text-muted-foreground ring-1 ring-border",
                      )}
                    >
                      <entry.icon weight="duotone" className="size-[17px]" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[14px] font-medium leading-tight">
                        {t(`groups.${entry.key}.title`)}
                      </span>
                      <span
                        className={cn(
                          "whitespace-nowrap text-[12px] leading-snug",
                          isPaper
                            ? "text-[#141414]/55"
                            : "text-muted-foreground/80",
                        )}
                      >
                        {t(`groups.${entry.key}.description`)}
                      </span>
                    </span>
                    <IconChevronRight
                      aria-hidden
                      className={cn(
                        "ml-auto size-3.5 shrink-0 transition-all duration-200",
                        selected
                          ? "translate-x-0 text-[#f97316] opacity-100"
                          : "-translate-x-1 opacity-0",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {item.allLink ? (
              <Link
                href={item.allLink.path}
                className={cn(
                  "group/all mt-3 flex items-center gap-2 border-t px-3 pb-1.5 pt-3 text-[13px] font-medium transition-colors duration-200",
                  isPaper
                    ? "border-[#141414]/10 text-[#141414]/70 hover:text-[#141414]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.allLink.icon weight="duotone" className="size-4" />
                {translatedNavTitle(item.allLink.title, t)}
                <IconArrowRight
                  aria-hidden
                  className="ml-auto size-3.5 text-[#f97316] transition-transform duration-200 group-hover/all:translate-x-0.5"
                />
              </Link>
            ) : null}
          </div>

          {/* Pane: the active group's services */}
          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={`nav-${group.key}-tab`}
            className={cn("p-2", !isPaper && "px-1 py-1.5")}
          >
            <div
              key={group.key}
              className="duration-200 animate-in fade-in slide-in-from-left-1"
            >
              <p
                className={cn(
                  paperLabel,
                  !isPaper && "text-muted-foreground/70",
                )}
              >
                {t(`groups.${group.key}.title`)}
              </p>
              <div className="flex flex-col gap-1">
                {group.children.map((child) => (
                  <MenuLink
                    key={child.path}
                    child={child}
                    isPaper={isPaper}
                    current={child.path === path}
                    t={t}
                    rowHeight
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNavLink({
  child,
  onNavigate,
  t,
}: {
  child: NavLink;
  onNavigate: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Link
      href={child.path}
      onClick={onNavigate}
      className="flex items-start px-3 py-2.5 group gap-2.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
    >
      <child.icon
        weight="duotone"
        className="mt-0.5 size-5 shrink-0 transition-colors duration-200 group-hover:text-primary"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">
          {translatedNavTitle(child.title, t)}
        </span>
        {child.description ? (
          <span className="text-xs leading-snug text-muted-foreground/80">
            {translatedNavDescription(child.description, t)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export default function Navbar() {
  const t = useTranslations("Nav");
  const headerRef = useRef<HTMLElement | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname() || "/";
  const path = unprefixPath(pathname);
  const isHome = path === "/";
  const isPaper = useIsPaper();
  const isBlogPost = /^\/blog\/(?!page\/)[^/]+/.test(
    pathname.replace(/^\/(fr|es|hi|zh)(?=\/|$)/, ""),
  );
  const [hasHero, setHasHero] = useState(isHome);
  const [pastHero, setPastHero] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollingDown, setScrollingDown] = useState(false);

  // Over a dark hero the bar floats transparently. On the homepage it turns
  // glass once the night-sky hero is passed; on inner pages (NightHeader) it
  // turns glass the moment you start scrolling. Past the hero it tucks away
  // while scrolling down and returns when scrolling up.
  useEffect(() => {
    // Blog posts are docs-style reading pages: the bar stays solid glass there.
    const hero =
      isHome || isBlogPost
        ? null
        : document.querySelector<HTMLElement>(".s1-night");
    const heroActive = isHome || (isPaper && !isBlogPost) || Boolean(hero);
    setHasHero(heroActive);
    if (!heroActive) {
      setPastHero(false);
      return;
    }
    let lastY = window.scrollY;
    const update = () => {
      const y = window.scrollY;
      const threshold = hero
        ? hero.getBoundingClientRect().bottom + y - 80
        : window.innerHeight * 0.8;
      setPastHero(y > threshold);
      setScrolled(y > 8);
      if (Math.abs(y - lastY) > 6) {
        setScrollingDown(y > lastY);
        lastY = y;
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isHome, isBlogPost, isPaper, pathname]);

  // The paper home gets its bar as soon as you start scrolling.
  const overHero =
    hasHero && !(isHome && !isPaper ? pastHero : scrolled) && !isMenuOpen;
  const tuckedAway = hasHero && pastHero && scrollingDown && !isMenuOpen;

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !headerRef.current?.contains(target)) {
        setIsMenuOpen(false);
        setHoveredItem(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setHoveredItem(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
    setHoveredItem(null);
  };

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed left-0 right-0 top-0 z-[550] border-b py-2 transition-[background-color,border-color,transform] duration-500",
          tuckedAway && "-translate-y-full",
          overHero
            ? isPaper
              ? // Paper design preview: ink text over the light canvas.
                "border-transparent bg-transparent text-[#1b1714]"
              : "dark border-transparent bg-transparent text-white"
            : isPaper
              ? // Paper bar: same sheet as the page, no bottom rule, ink text.
                "border-transparent bg-[#f4efe7] text-[#1b1714]"
              : cn("border-border/50", "bg-background"),
        )}
      >
        <nav
          className={cn(
            "z-20 mx-auto flex h-16 max-w-7xl items-center justify-between rounded-[6px] px-4",
          )}
        >
          <Link href={"/"} className="flex justify-between gap-2 items-center">
            <Logo className="size-8" />
            <span className="text-2xl font-medium">Studio1</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center justify-between gap-8 font-medium lg:flex">
            {navItems.map((item) =>
              item.groups ? (
                <GroupedNavItem
                  key={item.title}
                  item={item}
                  isPaper={isPaper}
                  path={path}
                />
              ) : (
                <div key={item.title} className="relative group/nav">
                  {item.children ? (
                    <button type="button" className={triggerClass}>
                      {translatedNavTitle(item.title, t)}
                      <IconChevronDown className="ml-1 mt-0.5 size-4 transition-transform duration-300 group-hover/nav:rotate-180" />
                    </button>
                  ) : (
                    <Link href={item.path} className={triggerClass}>
                      {translatedNavTitle(item.title, t)}
                    </Link>
                  )}
                  {item.children && (
                    <div className={cn(dropdownClass, "left-0")}>
                      <div
                        className={cn(
                          isPaper
                            ? // Paper menu: the hero's white card, square, hairline ring.
                              cn(paperCard, "p-2")
                            : "rounded-[6px] border bg-background px-1 py-1.5 shadow-lg",
                          item.children.some((child) =>
                            Boolean(child.description),
                          )
                            ? "w-max min-w-[24rem]"
                            : "min-w-[17rem]",
                          isPaper && "[&>a]:min-w-[19rem]",
                        )}
                      >
                        {isPaper ? (
                          <p className={paperLabel}>
                            {translatedNavTitle(item.title, t)}
                          </p>
                        ) : null}
                        {item.children.map((child) => (
                          <MenuLink
                            key={child.title}
                            child={child}
                            isPaper={isPaper}
                            current={false}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          <div className="hidden items-center justify-between gap-3 lg:flex">
            <LanguageSwitcher compact />
            {isPaper ? (
              // Paper: dark pill that turns orange on hover.
              <a
                href="mailto:contact@studio1hq.com"
                className="group relative isolate inline-flex h-10 overflow-hidden rounded-full"
              >
                <span className="relative inline-flex h-full items-center gap-1 overflow-hidden rounded-full bg-[#1b1714] px-5 text-[14px] font-medium text-[#f4efe7] transition-colors duration-300 group-hover:bg-[#f97316]">
                  {t("contact")} <MailIcon className="ml-1" />
                </span>
              </a>
            ) : (
              <Button
                asChild
                className={cn(
                  "group h-10 rounded-full border-0 px-5 font-medium text-white",
                  isPaper
                    ? "bg-[#1b1714] text-[#f4efe7] hover:bg-[#f97316]"
                    : "s1-glass-btn hover:bg-transparent",
                )}
              >
                <a href="mailto:contact@studio1hq.com">
                  {t("contact")} <MailIcon className="ml-1" />
                </a>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className={cn(
                "rounded-md p-2",
                // Phones keep the hover state after a tap; on paper it must
                // stay light even when the phone is in dark mode.
                isPaper ? "hover:bg-[#141414]/[0.06]" : "hover:bg-accent",
              )}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <IconMenu2 className="size-6" />
            </button>
          </div>
        </nav>

        {/* Mobile Navigation. On paper pages the panel is pinned to the paper
            palette, so a phone in dark mode doesn't paint it near-black under
            the ink-coloured links. */}
        <div
          data-lenis-prevent
          style={isPaper ? MOBILE_PAPER_SCOPE : undefined}
          className={cn(
            "border bg-background pb-6 shadow-2xl transition-all duration-300 lg:hidden",
            isMenuOpen
              ? "block max-h-[calc(100vh-5rem)] translate-y-4 overflow-y-auto"
              : "hidden",
          )}
        >
          <div className="px-4 py-2 space-y-2">
            {navItems.map((item) => (
              <div key={item.title} className="space-y-2">
                {item.children || item.groups ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-4 py-2 text-left hover:bg-accent"
                    aria-expanded={hoveredItem === item.title}
                    onClick={() => {
                      setHoveredItem(
                        hoveredItem === item.title ? null : item.title,
                      );
                    }}
                  >
                    {translatedNavTitle(item.title, t)}
                    <IconChevronDown
                      className={cn(
                        "size-4 transition-transform duration-200",
                        hoveredItem === item.title && "rotate-180",
                      )}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.path}
                    className="flex items-center justify-between rounded-md px-4 py-2 hover:bg-accent"
                    onClick={closeMobileMenu}
                  >
                    {translatedNavTitle(item.title, t)}
                  </Link>
                )}
                {item.children && hoveredItem === item.title && (
                  <div className="pl-4 space-y-0.5">
                    {item.children.map((child) => (
                      <MobileNavLink
                        key={child.title}
                        child={child}
                        onNavigate={closeMobileMenu}
                        t={t}
                      />
                    ))}
                  </div>
                )}
                {item.groups && hoveredItem === item.title && (
                  <div className="space-y-3 pl-4">
                    {item.allLink ? (
                      <MobileNavLink
                        child={item.allLink}
                        onNavigate={closeMobileMenu}
                        t={t}
                      />
                    ) : null}
                    {item.groups.map((group) => (
                      <div key={group.key} className="space-y-0.5">
                        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                          {t(`groups.${group.key}.title`)}
                        </p>
                        {group.children.map((child) => (
                          <MobileNavLink
                            key={child.path}
                            child={child}
                            onNavigate={closeMobileMenu}
                            t={t}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-2">
              <LanguageSwitcher inline />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 rounded-[6px] bg-accent/50 p-2">
              <Button
                asChild
                className="group s1-glass-btn h-10 rounded-full border-0 px-5 font-medium text-white hover:bg-transparent"
              >
                <a
                  href="mailto:contact@studio1hq.com"
                  onClick={closeMobileMenu}
                >
                  {t("contact")} <MailIcon className="ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

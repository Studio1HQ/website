"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { IconChevronDown, IconMenu2 } from "@tabler/icons-react";
import { navItems } from "@/constants/data";
import { cn } from "@/lib/utils";
import Logo from "../ui/svgs/logo";
import { MailIcon } from "@/components/ui/mail-icon";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { useTranslations } from "next-intl";

const navTitleKeys: Record<string, string> = {
  "About Us": "about",
  "Case Studies": "caseStudies",
  "Client Work": "clientWork",
  "Developer Relations & Growth": "devrel",
  "Developer Video Production": "video",
  "Documentation & DX Audits": "docs",
  "Our Blog": "blog",
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

function translatedNavTitle(title: string, t: ReturnType<typeof useTranslations>) {
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

export default function Navbar() {
  const t = useTranslations("Nav");
  const headerRef = useRef<HTMLElement | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname() || "/";
  const isHome =
    (pathname.replace(/^\/(fr|es|hi|zh)(?=\/|$)/, "") || "/") === "/";
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
    const hero = isHome || isBlogPost ? null : document.querySelector<HTMLElement>(".s1-night");
    const heroActive = isHome || Boolean(hero);
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
  }, [isHome, isBlogPost, pathname]);

  const overHero = hasHero && !(isHome ? pastHero : scrolled) && !isMenuOpen;
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
            ? "dark border-transparent bg-transparent text-white"
            : cn(
                "border-border/50 backdrop-blur-2xl",
                "bg-background/80",
              ),
        )}
      >
        <nav
          className={cn(
            "z-20 mx-auto flex h-16 items-center justify-between rounded-2xl px-4",
            // Blog posts use a wider docs layout: match its side columns so the
            // logo and Contact button line up with the left and right rails.
            isBlogPost ? "max-w-[1680px] xl:px-7" : "max-w-7xl",
          )}
        >
          <Link href={"/"} className="flex justify-between gap-2 items-center">
            <Logo className="size-8" />
            <span className="text-2xl font-medium">Studio1</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center justify-between gap-8 font-medium lg:flex">
            {navItems.map((item) => (
              <div key={item.title} className="relative group/nav">
                {item.children ? (
                  <button
                    type="button"
                    className={cn(
                      "relative flex items-center justify-center px-2 py-1 text-sm transition-colors duration-200 hover:text-primary group-hover/nav:text-primary",
                      "after:absolute after:-bottom-0.5 after:left-2 after:right-2 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-gradient-to-r after:from-primary after:to-primary1 after:transition-transform after:duration-300 hover:after:scale-x-100 group-hover/nav:after:scale-x-100",
                    )}
                  >
                    {translatedNavTitle(item.title, t)}
                    <IconChevronDown className="ml-1 mt-0.5 size-4 transition-transform duration-300 group-hover/nav:rotate-180" />
                  </button>
                ) : (
                  <Link
                    href={item.path}
                    className={cn(
                      "relative flex items-center justify-center px-2 py-1 text-sm transition-colors duration-200 hover:text-primary group-hover/nav:text-primary",
                      "after:absolute after:-bottom-0.5 after:left-2 after:right-2 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-gradient-to-r after:from-primary after:to-primary1 after:transition-transform after:duration-300 hover:after:scale-x-100 group-hover/nav:after:scale-x-100",
                    )}
                  >
                    {translatedNavTitle(item.title, t)}
                  </Link>
                )}
                {item.children && (
                  <div
                    className={cn(
                      "absolute top-full left-0 pt-4 origin-top",
                      "opacity-0 -translate-y-1 scale-95 pointer-events-none",
                      "transition-all duration-300 ease-out",
                      "group-hover/nav:opacity-100 group-hover/nav:translate-y-0 group-hover/nav:scale-100 group-hover/nav:pointer-events-auto",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg border bg-background/95 px-1 py-1.5 shadow-lg backdrop-blur-xl",
                        item.children.some(
                          (child) =>
                            "description" in child && Boolean(child.description),
                        )
                          ? "w-max min-w-[24rem]"
                          : "min-w-[17rem]",
                      )}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.title}
                          href={child.path}
                          className="group/item flex w-full items-start gap-2.5 px-3 py-2.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
                        >
                          <child.icon
                            weight="duotone"
                            className="mt-0.5 size-5 shrink-0 transition-colors duration-200 group-hover/item:text-primary"
                          />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="whitespace-nowrap text-sm font-medium">
                              {translatedNavTitle(child.title, t)}
                            </span>
                            {"description" in child && child.description ? (
                              <span className="whitespace-nowrap text-xs leading-snug text-muted-foreground/80">
                                {translatedNavDescription(child.description, t)}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden items-center justify-between gap-3 lg:flex">
            <LanguageSwitcher compact />
            <Button asChild className="group s1-glass-btn h-10 rounded-full border-0 px-5 font-medium text-white hover:bg-transparent">
              <a href="mailto:contact@studio1hq.com">
                {t("contact")} <MailIcon className="ml-1" />
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className="rounded-md p-2 hover:bg-accent"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <IconMenu2 className="size-6" />
            </button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div
          data-lenis-prevent
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
                {item.children ? (
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
                      <Link
                        key={child.title}
                        href={child.path}
                        onClick={closeMobileMenu}
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
                          {"description" in child && child.description ? (
                            <span className="text-xs leading-snug text-muted-foreground/80">
                              {translatedNavDescription(child.description, t)}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-2">
              <LanguageSwitcher inline />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 rounded-3xl bg-accent/50 p-2">
              <Button asChild className="group s1-glass-btn h-10 rounded-full border-0 px-5 font-medium text-white hover:bg-transparent">
                <a href="mailto:contact@studio1hq.com" onClick={closeMobileMenu}>
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

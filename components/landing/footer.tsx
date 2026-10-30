"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import {
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconBrandYoutube,
  IconNews,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Logo from "../ui/svgs/logo";
import { Num } from "@/components/ui/num";
import { Container, EASE } from "@/components/home/ui";
import { useRef } from "react";
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

const WORDMARK = "Studio1".split("");

/** One letter: rises from below the baseline as `progress` goes from start to end. */
function WordmarkLetter({
  letter,
  progress,
  start,
}: {
  letter: string;
  progress: MotionValue<number>;
  start: number;
}) {
  const y = useTransform(progress, [start, start + 0.45], ["108%", "0%"]);
  const rotate = useTransform(progress, [start, start + 0.45], [8, 0]);
  return (
    <span className="inline-block overflow-hidden pb-[0.06em] align-top">
      <motion.span
        className="inline-block origin-bottom-left"
        style={{ y, rotate }}
      >
        {letter}
      </motion.span>
    </span>
  );
}

/**
 * Big footer wordmark, tied to scroll: letters rise in a staggered wave and an
 * ember gradient fills them from the bottom as the page reaches its end.
 * Scrolling back reverses it, so it never looks stuck halfway.
 */
function FooterWordmark() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });
  const still = useMotionValue(1);
  const p = reduceMotion ? still : progress;
  const fill = useTransform(p, [0.45, 1], ["100%", "0%"]);
  const fillMask = useMotionTemplate`linear-gradient(0deg, black 0%, black calc(100% - ${fill}), transparent calc(100% - ${fill}))`;

  const row = (
    <>
      {WORDMARK.map((letter, index) => (
        <WordmarkLetter
          key={index}
          letter={letter}
          progress={p}
          start={index * 0.06}
        />
      ))}
    </>
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative select-none text-center text-[clamp(72px,19vw,290px)] font-medium leading-[0.9] tracking-[-0.025em]"
    >
      <div className="text-white/[0.09]">{row}</div>
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(180deg,#fdba74_0%,#f97316_45%,#9a3412_100%)] bg-clip-text text-transparent"
        style={{ WebkitMaskImage: fillMask, maskImage: fillMask }}
      >
        {row}
      </motion.div>
    </div>
  );
}

const SOCIAL_LINKS = [
  {
    href: "https://www.linkedin.com/company/studio1hq/",
    label: "LinkedIn",
    icon: IconBrandLinkedin,
  },
  { href: "https://x.com/Studio1HQ", label: "Twitter", icon: IconBrandX },
  {
    href: "https://www.instagram.com/studio1_hq/",
    label: "Instagram",
    icon: IconBrandInstagram,
  },
  {
    href: "https://www.youtube.com/@studio1hq/",
    label: "YouTube",
    icon: IconBrandYoutube,
  },
  { href: "https://dev.to/studio1hq", label: "Blogs", icon: IconNews },
] as const;

const SERVICE_LINKS = [
  { key: "technicalContent", href: "/technical-content-marketing" },
  { key: "devrel", href: "/developer-relations-growth-campaigns" },
  { key: "video", href: "/developer-video-production" },
  { key: "docs", href: "/developer-documentation-dx-audit" },
] as const;

const COMPANY_NAV_LINKS = [
  { key: "about", href: "/about-us" },
  { key: "caseStudies", href: "/case-studies" },
  { key: "blog", href: "/blog" },
  { key: "product", href: "/product" },
] as const;

const heading =
  "text-[11px] font-medium uppercase tracking-[0.14em] text-white/40";
const linkClass =
  "text-[15px] text-white/70 transition-colors duration-200 hover:text-white";

export default function Footer() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const reduceMotion = useReducedMotion();
  // One trigger for the wordmark and the copyright row so they never desync.
  const bottomRef = useRef<HTMLDivElement>(null);
  const bottomInView = useInView(bottomRef, { once: true, amount: 0.2 });

  return (
    <footer className="relative overflow-hidden bg-[#07050a] text-white dark:bg-[var(--home-cream)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[360px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.18),transparent_65%)] blur-2xl"
      />

      <Container className="relative">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 pb-12 pt-16 sm:gap-x-10 sm:pt-20 lg:grid-cols-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr] xl:gap-y-14 xl:pb-14 xl:pt-24">
          {/* Brand + contact */}
          <div className="col-span-2 lg:col-span-3 xl:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <Logo className="size-8" />
              <span className="text-[22px] font-medium tracking-[-0.04em]">
                Studio1
              </span>
            </Link>
            <p className="mt-5 max-w-[320px] text-[15px] leading-[1.6] text-white/55">
              {t("description")}
            </p>

            <a
              href="mailto:contact@studio1hq.com"
              className="s1-glass-btn-light group mt-8 flex max-w-[340px] items-center justify-between gap-4 rounded-[6px] px-5 py-4"
            >
              <span>
                <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
                  {nav("contact")}
                </span>
                <span className="mt-1 block text-[16px] font-medium tracking-[-0.02em]">
                  contact@studio1hq.com
                </span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#140e0a] transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight weight="bold" className="size-4" />
              </span>
            </a>
          </div>

          <nav aria-label={nav("items.services")}>
            <p className={heading}>{nav("items.services")}</p>
            <ul className="mt-6 space-y-3.5">
              {SERVICE_LINKS.map((link) => (
                <li key={link.key}>
                  <Link href={link.href} className={linkClass}>
                    {nav(`items.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Studio1">
            <p className={heading}>Studio1</p>
            <ul className="mt-6 space-y-3.5">
              {COMPANY_NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <Link href={link.href} className={linkClass}>
                    {nav(`items.${link.key}`)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/careers" className={linkClass}>
                  {t("links.careers")}
                </Link>
              </li>
              <li>
                <Link href="/devrel-jobs" className={linkClass}>
                  {t("links.devrelJobs")}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="col-span-2 lg:col-span-1">
            <p className={heading}>Follow us</p>
            {/* Icon row on small screens, labelled list on large ones */}
            <ul className="mt-6 flex flex-wrap gap-2.5 lg:block lg:space-y-3.5">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={`${linkClass} group inline-flex items-center gap-3`}
                  >
                    <span className="flex size-11 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/10 transition-colors duration-300 group-hover:bg-[#f97316] group-hover:text-white group-hover:ring-transparent lg:size-8 lg:rounded-lg">
                      <Icon className="size-[18px] lg:size-4" />
                    </span>
                    <span className="hidden lg:inline">
                      {label === "Blogs"
                        ? "DEV"
                        : label === "Twitter"
                          ? "X"
                          : label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div ref={bottomRef}>
          <FooterWordmark />

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={
              bottomInView || reduceMotion ? { opacity: 1, y: 0 } : undefined
            }
            transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
            className="flex flex-col gap-3 pb-8 pr-14 pt-4 sm:pr-16 md:flex-row md:items-center md:justify-between"
          >
            <p className="text-[13px] text-white/45">
              ©<Num>{new Date().getFullYear()}</Num> Studio1. {t("rights")}
            </p>
            <nav className="flex gap-6">
              <Link
                href="/terms"
                className="text-[13px] text-white/45 transition-colors hover:text-white"
              >
                {t("legal.terms")}
              </Link>
              <Link
                href="/privacy"
                className="text-[13px] text-white/45 transition-colors hover:text-white"
              >
                {t("legal.privacy")}
              </Link>
            </nav>
          </motion.div>
        </div>
      </Container>
    </footer>
  );
}

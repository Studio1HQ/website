"use client";

import { MachineToggle } from "@/components/paper/machine-view";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SocialBubble } from "@/components/ui/social-bubble";
import { cn } from "@/lib/utils";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ArrowBendDownRight, ArrowUpRight } from "@phosphor-icons/react";
import {
  IconBrandGithub,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconBrandYoutube,
  IconNews,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/home/ui";
import { GRAIN, INK, PAPER, PRINT } from "./paper-hero";

const SOCIAL_LINKS = [
  {
    href: "https://www.linkedin.com/company/studio1hq/",
    label: "LinkedIn",
    icon: IconBrandLinkedin,
  },
  { href: "https://x.com/Studio1HQ", label: "X", icon: IconBrandX },
  {
    href: "https://github.com/Studio1HQ",
    label: "GitHub",
    icon: IconBrandGithub,
  },
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
  { href: "https://dev.to/studio1hq", label: "DEV", icon: IconNews },
] as const;

/** Open-source projects Studio1 runs, linked so people and AI crawlers can find them. */
const OPEN_SOURCE_LINKS = [
  {
    href: "https://github.com/Arindam200/awesome-ai-apps",
    label: "Awesome AI Apps",
    // Lives on GitHub; the project has no mark of its own
    logo: <IconBrandGithub aria-hidden className="size-3.5 text-[#141414]" />,
  },
  {
    href: "https://awesomellmbenchmarks.com/",
    label: "Awesome LLM Benchmarks",
    // The site's own icon, from awesomellmbenchmarks.com
    logo: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/assets/logos/oss/awesome-llm-benchmarks.png" alt="" className="size-3.5 object-contain" />
    ),
  },
];

type GroupLink = {
  href: string;
  native?: boolean;
  external?: boolean;
  logo?: ReactNode;
  /** A short tag after the label, e.g. "New". */
  badge?: string;
} & (
  | { key: string; scope: "nav" | "footer"; label?: never }
  | { label: string; key?: never; scope?: never }
);

/*
 * The footer links, grouped by what a visitor is looking for. Each inner
 * array is one column; a column can hold more than one group.
 */
const LINK_GROUPS: { title: string; links: GroupLink[] }[][] = [
  [
    {
      title: "Content",
      links: [
        { key: "technicalContent", scope: "nav", href: "/technical-content-marketing" },
        { key: "video", scope: "nav", href: "/developer-video-production" },
        { key: "docs", scope: "nav", href: "/developer-documentation-dx-audit" },
        { key: "distribution", scope: "nav", href: "/developer-content-distribution" },
      ],
    },
    {
      title: "Open Source",
      links: OPEN_SOURCE_LINKS.map(({ href, label, logo }) => ({
        href,
        label,
        logo,
        native: true,
        external: true,
      })),
    },
  ],
  [
    {
      title: "Growth",
      links: [
        { key: "devrel", scope: "nav", href: "/developer-relations-growth-campaigns" },
        { key: "githubGrowth", scope: "nav", href: "/github-growth-agency" },
        { key: "productLaunch", scope: "nav", href: "/product-launch-service" },
        { key: "aeo", scope: "nav", href: "/aeo-agency" },
        { key: "redditMarketing", scope: "nav", href: "/reddit-marketing-agency" },
        { key: "influencer", scope: "nav", href: "/influencer-marketing-agency" },
      ],
    },
  ],
  [
    {
      title: "Company",
      links: [
        { key: "about", scope: "nav", href: "/about-us" },
        { label: "Team", href: "/team" },
        { key: "caseStudies", scope: "nav", href: "/case-studies" },
        { key: "results", scope: "nav", href: "/results" },
        { key: "testimonials", scope: "nav", href: "/testimonials" },
        { key: "product", scope: "nav", href: "/product" },
      ],
    },
  ],
  [
    {
      title: "Resources",
      links: [
        { key: "blog", scope: "nav", href: "/blog" },
        { label: "Events", href: "/events", badge: "New" },
        { label: "Calendar", href: "/calendar", badge: "New" },
        { key: "openSource", scope: "footer", href: "/oss", badge: "New" },
        { key: "brandAssets", scope: "footer", href: "/brand", native: true, badge: "New" },
      ],
    },
    {
      title: "Careers",
      links: [
        { key: "careers", scope: "footer", href: "/careers", badge: "New" },
        { key: "devrelJobs", scope: "footer", href: "/devrel-jobs", badge: "New" },
        { key: "devrelCohort", scope: "footer", href: "/devrel-cohort" },
      ],
    },
  ],
];

/** Card heading: a quiet label in ink above softer grey links. */
const heading = "text-[14px] font-medium tracking-[-0.01em] text-[#141414]";
const LIST = "mt-5 grid gap-y-2.5";

/** Footer link: a small curved arrow leads each link and slides in on hover. */
function FooterLink({
  href,
  children,
  native = false,
  external = false,
  logo,
}: {
  href: string;
  children: ReactNode;
  /** A page outside the Next app (served from public/), so a full load. */
  native?: boolean;
  /** Another site: opens in a new tab. */
  external?: boolean;
  /** The project's own mark, shown before the label. */
  logo?: ReactNode;
}) {
  const Anchor = native ? "a" : Link;
  return (
    <Anchor
      href={href}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
      className="group inline-flex items-start gap-1.5 text-[14px] leading-[1.5] text-[#141414]/70 transition-colors duration-200 hover:text-[#141414]"
    >
      {/* A project with its own mark leads with the mark instead */}
      {logo ? null : (
        <ArrowBendDownRight
          aria-hidden
          weight="bold"
          className="mt-[3px] size-3.5 shrink-0 -translate-x-0.5 opacity-40 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          style={{ color: PRINT }}
        />
      )}
      {logo ? (
        <span className="mr-1 flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-[#f6f3ee] shadow-[inset_0_1px_2px_rgba(20,20,20,0.10)]">
          {logo}
        </span>
      ) : null}
      <span className="transition-transform duration-300 group-hover:translate-x-0.5">
        {children}
      </span>
    </Anchor>
  );
}

/** The Studio1 mark, filled in the print orange. */
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={PRINT}
        d="M0 35C0 16.6807 14.0744 1.64844 32 0.126953V141H51.0523C52.4308 137.344 54.7446 133.689 57.9938 130.033C61.1446 126.508 64.6892 123.44 68.6277 120.829C72.5662 118.349 76.3569 116.782 80 116.129V86.7544C75.4708 87.9292 71.3846 89.6919 67.7415 92.0415C64 94.5225 60.7508 97.46 57.9938 100.854C56.5345 102.72 55.2545 104.659 54.1539 106.671V0H125C144.33 0 160 15.6699 160 35V125C160 144.33 144.33 160 125 160H124V18H104.948C103.569 21.6816 101.255 25.3628 98.0062 29.0444C94.8554 32.5942 91.3108 35.6841 87.3723 38.314C83.4338 40.812 79.6431 42.3896 76 43.0474V72.6304C80.5292 71.4473 84.6154 69.6724 88.2585 67.3057C92 64.8076 95.2492 61.8491 98.0062 58.4307C99.4655 56.5513 100.745 54.5986 101.846 52.5723V160H35C15.67 160 0 144.33 0 125V35Z"
      />
    </svg>
  );
}

/** One letter of the wordmark, rising out of its line a beat after the last. */
function RisingLetter({
  progress,
  index,
  children,
  still,
  className,
}: {
  progress: MotionValue<number>;
  index: number;
  children: ReactNode;
  still: boolean;
  className?: string;
}) {
  const start = 0.08 + index * 0.055;
  const y = useTransform(progress, [start, start + 0.42], ["105%", "0%"]);
  return (
    <motion.span
      className={cn("inline-block will-change-transform", className)}
      style={still ? undefined : { y }}
    >
      {children}
    </motion.span>
  );
}

const WORD = ["S", "t", "u", "d", "i", "o", "1"];

/**
 * The footer signature: the mark and "Studio1", sized so the line runs
 * exactly from the left edge of the content to the right. The mark turns
 * in first, then the letters rise one by one as the footer scrolls up.
 */
function FooterWordmark({
  progress,
  still,
}: {
  progress: MotionValue<number>;
  still: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null);

  // Measure the line at 100px and scale it to the box, on load and resize.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const probe = probeRef.current;
    if (!box || !probe) return;
    const fit = () => setSize((100 * box.clientWidth) / probe.scrollWidth);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, []);

  const markScale = useTransform(progress, [0, 0.45], [0.55, 1]);
  const markRotate = useTransform(progress, [0, 0.45], [-18, 0]);
  const markOpacity = useTransform(progress, [0, 0.3], [0, 1]);

  const line = (probe: boolean) => (
    <>
      <span className="mr-[0.07em] inline-flex size-[0.74em] shrink-0 translate-y-[-0.06em] self-end">
        {probe ? (
          <span className="size-full" />
        ) : (
          <motion.span
            className="block size-full"
            style={
              still
                ? undefined
                : { scale: markScale, rotate: markRotate, opacity: markOpacity }
            }
          >
            <Mark className="size-full" />
          </motion.span>
        )}
      </span>
      {WORD.map((letter, i) =>
        probe ? (
          <span key={i} style={i === 6 ? { color: PRINT } : undefined}>
            {letter}
          </span>
        ) : (
          <RisingLetter
            key={i}
            index={i}
            progress={progress}
            still={still}
            className={i === 6 ? "text-[#f97316]" : undefined}
          >
            {letter}
          </RisingLetter>
        ),
      )}
    </>
  );

  return (
    <div ref={boxRef} aria-hidden className="relative select-none">
      {/* Invisible copy at a fixed size, only for measuring */}
      <span
        ref={probeRef}
        className="pointer-events-none invisible absolute left-0 top-0 inline-flex whitespace-nowrap font-medium leading-[0.86] tracking-[-0.06em]"
        style={{ fontSize: 100 }}
      >
        {line(true)}
      </span>
      <span
        className="flex overflow-hidden whitespace-nowrap pb-[0.03em] font-medium leading-[0.86] tracking-[-0.06em]"
        style={{ fontSize: size ?? "clamp(72px,19vw,290px)" }}
      >
        {line(false)}
      </span>
    </div>
  );
}

/** Footer for the paper design: ruled columns and a giant inked wordmark. */
export default function PaperFooter() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const reduceMotion = useReducedMotion();
  const markRef = useRef<HTMLDivElement>(null);
  // The wordmark slides up into place as the footer scrolls in.
  const { scrollYProgress } = useScroll({
    target: markRef,
    offset: ["start end", "end end"],
  });
  // Rises gently into place, fully visible by the time the footer is in view.
  const markProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.6,
  });
  // Numbered after the page's last section, so it reads "10" on the home page.
  const pathname = usePathname();
  const [index, setIndex] = useState(10);
  useEffect(() => {
    const sections = document.querySelectorAll("[data-index-bar]").length;
    if (sections > 0) setIndex(sections + 1);
  }, [pathname]);

  return (
    <footer
      className="relative isolate overflow-hidden"
      style={{ background: PAPER, color: INK }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <Container>
        <div
          className="pt-4 text-[13px] font-medium"
          style={{ borderColor: INK }}
        >
          <span className="tabular-nums" style={{ color: PRINT }}>
            {String(index).padStart(2, "0")}
          </span>
          <span className="mx-3 text-[#141414]/40">—</span>
          Studio1
        </div>

        {/* The mark and the wordmark, edge to edge, rising in as you scroll */}
        <div ref={markRef} className="relative mt-10 py-4 md:py-6">
          <FooterWordmark progress={markProgress} still={!!reduceMotion} />
        </div>

        {/* Contact on the left, the link columns on the right */}
        <div className="grid gap-x-14 gap-y-12 pb-14 pt-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] xl:gap-x-10">
          <div className="flex flex-col gap-6">
            <p className={heading}>Studio1</p>
            <p className="-mt-2 max-w-[300px] text-[14px] leading-[1.6] text-[#141414]/60">
              {t("description")}
            </p>
            <ul aria-label="Follow us" className="mt-1 flex flex-nowrap items-center gap-1">
              {SOCIAL_LINKS.map(({ href, label, icon: SocialIcon }) => (
                <li key={label}>
                  <SocialBubble href={href} label={label} size="sm">
                    <SocialIcon aria-hidden className="size-4" stroke={1.7} />
                  </SocialBubble>
                </li>
              ))}
            </ul>
            <a
              href="mailto:contact@studio1hq.com"
              className="group inline-flex w-fit items-center gap-2.5 rounded-full py-1.5 pl-4 pr-1.5 text-[14px] font-medium transition-colors hover:opacity-90"
              style={{ background: PRINT, color: "#fff" }}
            >
              contact@studio1hq.com
              <span className="flex size-7 items-center justify-center rounded-full bg-[#0d0d0d] text-white transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight weight="bold" className="size-3.5" />
              </span>
            </a>
          </div>

          {/* The links, grouped by what they are for */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-12 md:grid-cols-4 xl:contents">
            {LINK_GROUPS.map((column, c) => (
              <div key={c} className="flex flex-col gap-10">
                {column.map((group) => (
                  <nav key={group.title} aria-label={group.title}>
                    <p className={heading}>{group.title}</p>
                    <ul className={LIST}>
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <FooterLink
                            href={link.href}
                            native={link.native}
                            external={link.external}
                            logo={link.logo}
                          >
                            {"key" in link && link.key
                              ? link.scope === "nav"
                                ? nav(`items.${link.key}`)
                                : t(`links.${link.key}`)
                              : link.label}
                            {link.badge ? (
                              <span className="ml-2 inline-flex -translate-y-px items-center rounded-[4px] bg-[#141414] px-1.5 py-[3px] align-middle text-[10px] font-semibold leading-none text-white">
                                {link.badge}
                              </span>
                            ) : null}
                          </FooterLink>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Copyright left, the switch centred as in the machine view, legal right */}
        <div className="flex flex-col items-start gap-4 pb-8 pt-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          <p className="text-[13px] text-[#141414]/55">
            © {new Date().getFullYear()} Studio1. {t("rights")}
          </p>
          <MachineToggle />
          <div className="flex items-center gap-6 md:justify-self-end">
            <Link href="/terms" className="text-[13px] text-[#141414]/55 hover:text-[#141414]">
              {t("legal.terms")}
            </Link>
            <Link href="/privacy" className="text-[13px] text-[#141414]/55 hover:text-[#141414]">
              {t("legal.privacy")}
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

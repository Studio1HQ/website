"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowBendDownRight, ArrowUpRight } from "@phosphor-icons/react";
import {
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconBrandYoutube,
  IconNews,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/svgs/logo";
import { Container } from "@/components/home/ui";
import { GRAIN, INK, PAPER, PRINT, SelectionFrame } from "./paper-hero";

const SOCIAL_LINKS = [
  {
    href: "https://www.linkedin.com/company/studio1hq/",
    label: "LinkedIn",
    icon: IconBrandLinkedin,
  },
  { href: "https://x.com/Studio1HQ", label: "X", icon: IconBrandX },
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

const SERVICE_LINKS = [
  { key: "technicalContent", href: "/technical-content-marketing" },
  { key: "devrel", href: "/developer-relations-growth-campaigns" },
  { key: "video", href: "/developer-video-production" },
  { key: "docs", href: "/developer-documentation-dx-audit" },
] as const;

const COMPANY_LINKS = [
  { key: "about", href: "/about-us" },
  { key: "caseStudies", href: "/case-studies" },
  { key: "blog", href: "/blog" },
  { key: "product", href: "/product" },
] as const;

const heading =
  "text-[12px] font-medium uppercase tracking-[0.14em] text-[#141414]/45";
/** Footer link: a curved arrow slides in on hover to show it redirects. */
function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 text-[15px] transition-colors duration-200 hover:text-[#f97316]"
    >
      <ArrowBendDownRight
        aria-hidden
        weight="bold"
        className="size-3.5 -translate-x-1 opacity-40 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        style={{ color: PRINT }}
      />
      <span className="transition-transform duration-300 group-hover:translate-x-0.5">
        {children}
      </span>
    </Link>
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
  const y = useTransform(scrollYProgress, [0, 1], [40, 0]);
  const fade = useTransform(scrollYProgress, [0, 0.6], [0, 1]);

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
          <span style={{ color: PRINT }}>10</span>
          <span className="mx-3 text-[#141414]/40">—</span>
          Studio1
        </div>

        <div
          className="grid grid-cols-2 gap-2 xl:grid-cols-4"
          style={{ marginTop: 40 }}
        >
          <div className="col-span-2 flex flex-col justify-between gap-10 rounded-[6px] bg-white/80 p-7 ring-1 ring-inset ring-[#141414]/10 xl:col-span-1">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <Logo className="size-8" />
                <span className="text-[22px] font-medium tracking-[-0.04em]">
                  Studio1
                </span>
              </Link>
              <p className="mt-5 max-w-[300px] text-[15px] leading-[1.6] text-[#141414]/60">
                {t("description")}
              </p>
            </div>
            <a
              href="mailto:contact@studio1hq.com"
              className="group inline-flex w-fit items-center gap-3 rounded-full py-2 pl-5 pr-2 text-[15px] font-medium transition-colors hover:opacity-90"
              style={{ background: PRINT, color: "#fff" }}
            >
              contact@studio1hq.com
              <span className="flex size-8 items-center justify-center rounded-full bg-[#0d0d0d] text-white transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight weight="bold" className="size-4" />
              </span>
            </a>
          </div>

          <nav
            aria-label={nav("items.services")}
            className="rounded-[6px] bg-white/80 p-7 ring-1 ring-inset ring-[#141414]/10"
          >
            <p className={heading}>{nav("items.services")}</p>
            <ul className="mt-6 space-y-3.5">
              {SERVICE_LINKS.map((item) => (
                <li key={item.key}>
                  <FooterLink href={item.href}>
                    {nav(`items.${item.key}`)}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav
            aria-label="Studio1"
            className="rounded-[6px] bg-white/80 p-7 ring-1 ring-inset ring-[#141414]/10"
          >
            <p className={heading}>Studio1</p>
            <ul className="mt-6 space-y-3.5">
              {COMPANY_LINKS.map((item) => (
                <li key={item.key}>
                  <FooterLink href={item.href}>
                    {nav(`items.${item.key}`)}
                  </FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="/careers">{t("links.careers")}</FooterLink>
              </li>
              <li>
                <FooterLink href="/devrel-jobs">
                  {t("links.devrelJobs")}
                </FooterLink>
              </li>
            </ul>
          </nav>

          <div className="col-span-2 rounded-[6px] bg-white/80 p-7 ring-1 ring-inset ring-[#141414]/10 xl:col-span-1">
            <p className={heading}>Follow us</p>
            <ul className="mt-6 flex flex-wrap gap-2 xl:block xl:space-y-3">
              {SOCIAL_LINKS.map(({ href, label, icon: SocialIcon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group inline-flex items-center gap-3 text-[15px] transition-colors duration-200 hover:text-[#f97316]"
                  >
                    <span className="flex size-10 items-center justify-center rounded-[6px] bg-[#f6f3ee] text-[#141414]/75 shadow-[inset_0_2px_6px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08),inset_0_-1px_0_#fff,0_1px_0_rgba(255,255,255,0.95)] transition-colors group-hover:text-[#f97316]">
                      <SocialIcon className="size-4" />
                    </span>
                    <span className="hidden xl:inline">{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Giant inked wordmark in a selection frame */}
        <div ref={markRef} className="relative mt-10 pb-4 pt-2">
          <motion.div>
            <SelectionFrame
              label="studio1-wordmark"
              labelPosition="top-left"
              className="px-2"
            >
              <span
                aria-hidden
                className="block select-none text-center text-[clamp(72px,20vw,300px)] font-medium leading-[0.86] tracking-[-0.06em]"
              >
                Studio<span style={{ color: PRINT }}>1</span>
              </span>
            </SelectionFrame>
          </motion.div>
        </div>

        <div className="flex flex-col gap-3 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#141414]/55">
            © {new Date().getFullYear()} Studio1. {t("rights")}
          </p>
          <nav className="flex gap-6 text-[13px] text-[#141414]/55">
            <Link href="/terms" className="hover:text-[#141414]">
              {t("legal.terms")}
            </Link>
            <Link href="/privacy" className="hover:text-[#141414]">
              {t("legal.privacy")}
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

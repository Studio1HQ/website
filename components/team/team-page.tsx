"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  GlobeSimple,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { DitherField } from "@/components/home/dither-field";
import { PixelPortrait } from "@/components/about-us/pixel-portrait";
import { DotWord } from "@/components/team/dot-word";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import {
  IndexBar,
  PaperCta,
  PaperSection,
} from "@/components/paper/paper-sections";
import { TEAM, type TeamMember } from "@/data/team";
import { PAPER_SCOPE } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** Head-and-shoulders as a dot grid: the open seat's dithered portrait. */
const COLS = 60;
const ROWS = 66;
function inSilhouette(x: number, y: number) {
  // Head: an ellipse; neck; shoulders: a wide rounded mound at the bottom
  const head = ((x - 30) / 12.4) ** 2 + ((y - 24) / 15.2) ** 2 <= 1;
  const neck = Math.abs(x - 30) <= 5.2 && y >= 36 && y <= 46;
  const shoulders = ((x - 30) / 27) ** 2 + ((y - 68) / 22) ** 2 <= 1;
  return head || neck || shoulders;
}
const DOTS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const x = i % COLS;
  const y = Math.floor(i / COLS);
  return inSilhouette(x, y) ? [x, y] : null;
}).filter(Boolean) as [number, number][];

function DotSilhouette({ coarse = false }: { coarse?: boolean }) {
  // Small tiles use every other dot, so the pattern reads without shimmer
  const dots = coarse
    ? DOTS.filter(([x, y]) => x % 2 === 0 && y % 2 === 0)
    : DOTS;
  return (
    <svg
      aria-hidden
      viewBox={`-1 -1 ${COLS + 1} ${ROWS + 1}`}
      className="absolute inset-x-[14%] bottom-0 top-[14%] h-auto w-[72%]"
    >
      {dots.map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={coarse ? 0.8 : 0.42}
          fill="#141414"
          fillOpacity={0.32}
        />
      ))}
    </svg>
  );
}

const socials = (links: TeamMember["links"]) => [
  { href: links?.x, label: "X", Icon: XLogo, weight: "bold" as const },
  {
    href: links?.linkedin,
    label: "LinkedIn",
    Icon: LinkedinLogo,
    weight: "fill" as const,
  },
  {
    href: links?.website,
    label: "Website",
    Icon: GlobeSimple,
    weight: "bold" as const,
  },
];

function PersonCard({ member }: { member: TeamMember }) {
  return (
    <>
      <div
        className="relative aspect-[4/4.4] overflow-hidden rounded-[6px]"
        style={{
          background: "linear-gradient(180deg, #e6e3de 0%, #d8d4ce 100%)",
        }}
      >
        {member.open || !member.portrait ? (
          <>
            <DotSilhouette />
            <span className="absolute left-3 top-3 rounded-full border border-dashed border-[#141414]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#141414]/55">
              Open seat
            </span>
          </>
        ) : (
          <PixelPortrait src={member.portrait} alt={member.name ?? ""} />
        )}
        {/* Engraved glass, as on the About Us portraits */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[6px] shadow-[inset_0_6px_16px_rgba(20,20,20,0.16),inset_0_1px_3px_rgba(20,20,20,0.18),inset_0_-1px_0_rgba(255,255,255,0.7)] ring-1 ring-inset ring-white/50"
        />
      </div>

      {/* Name and role on the left, links on the right, top-aligned */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[15px] font-medium leading-[1.3] tracking-[-0.01em]",
              member.open ? "text-[#141414]/40" : "text-[#141414]",
            )}
          >
            {member.open ? "Coming soon" : member.name}
          </p>
          <p className="mt-1 text-[13px] leading-[1.4] text-[#141414]/50">
            {member.role}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {socials(member.links).map(({ href, label, Icon, weight }) =>
            href ? (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${member.name} on ${label}`}
                className="flex size-8 items-center justify-center rounded-full bg-[#141414]/[0.04] shadow-[inset_0_1px_2px_rgba(20,20,20,0.12),inset_0_-1px_0_rgba(255,255,255,0.85)] ring-1 ring-inset ring-[#141414]/[0.06] text-[#141414]/60 transition-colors duration-200 hover:bg-[#141414] hover:text-white"
              >
                <Icon weight={weight} className="size-[17px]" />
              </Link>
            ) : (
              // Link not added yet: the same chip, quieter and not clickable
              <span
                key={label}
                aria-hidden
                title={`${label} coming soon`}
                className="flex size-8 items-center justify-center rounded-full bg-[#141414]/[0.04] shadow-[inset_0_1px_2px_rgba(20,20,20,0.12),inset_0_-1px_0_rgba(255,255,255,0.85)] ring-1 ring-inset ring-[#141414]/[0.06] cursor-default text-[#141414]/25"
              >
                <Icon weight={weight} className="size-[17px]" />
              </span>
            ),
          )}
        </div>
      </div>
    </>
  );
}

/** The team, tier by tier from the founders down, with open seats shown. */
export function TeamPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div style={PAPER_SCOPE}>
      <PaperPageHeader className="pb-16 pt-32 md:pb-24 md:pt-40">
        <Container>
          {/* Studio1, in orange dots, across the full width; Team beneath */}
          <h1 className="sr-only">Studio1 Team</h1>
          <DotWord text="Studio1" />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6 md:mt-8">
            <motion.p
              aria-hidden
              className="text-[56px] font-medium leading-[0.9] tracking-[-0.06em] sm:text-[96px] lg:text-[128px]"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
            >
              Team
            </motion.p>
            <motion.p
              className="max-w-[340px] pb-2 text-[17px] leading-[1.55] text-[#141414]/65"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1 }}
            >
              The people behind the work.
            </motion.p>
          </div>
          {/* Who we are, how we work, and the open seats: three paper sheets */}
          <div className="mt-12 grid gap-3 sm:grid-cols-2 md:mt-20 md:gap-4 lg:grid-cols-3">
            {[
              {
                body: (
                  <p className="text-[19px] font-medium leading-[1.4] tracking-[-0.02em] text-white">
                    Studio1 is a remote team of writers, developer advocates and
                    builders, based across India.
                  </p>
                ),
              },
              {
                body: (
                  <p className="text-[15px] leading-[1.6] text-[#141414]/60">
                    We bring together engineers, technical writers, designers
                    and video producers to help developers find, understand and
                    adopt the tools they build with.
                  </p>
                ),
              },
              {
                body: (
                  <>
                    <p className="text-[15px] font-medium text-white">
                      Studio1 is hiring.
                    </p>
                    <p className="mt-1 text-[14px] leading-[1.55] text-white/85">
                      Want to work with this team? See the open and upcoming
                      roles on our careers page.
                    </p>
                    <Link
                      href="/careers"
                      className="mt-5 flex h-11 items-center justify-center gap-2 rounded-[6px] bg-[#141414] text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_-14px_rgba(20,20,20,0.7)] transition-colors hover:bg-[#2a2522]"
                    >
                      View open roles
                      <ArrowUpRight weight="bold" className="size-4" />
                    </Link>
                  </>
                ),
              },
            ].map((panel, i) => (
              <motion.div
                key={i}
                className={cn("flex", i === 0 && "sm:col-span-2 lg:col-span-1")}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.8, ease: EASE, delay: i * 0.08 }}
              >
                {/* Sheets cut like the home hero's service cards: a hairline,
                    dots fading in from the right. The outer two are printed in
                    the logo orange, the middle one is plain paper. */}
                <div
                  className={cn(
                    "relative isolate flex-1 overflow-hidden rounded-[6px] p-6 ring-1 ring-inset md:p-7 [&>*:not(canvas)]:relative",
                    i === 1
                      ? "bg-white/80 ring-[#141414]/10"
                      : "bg-[#f97316] ring-[#c2410c]/25",
                  )}
                >
                  <DitherField
                    still
                    strength={1.8}
                    seed={i * 1.7}
                    colors={i === 1 ? undefined : ["#fdba74", "#ffedd5"]}
                    className="absolute inset-y-0 right-0 -z-10 h-full w-[55%] opacity-80 [mask-image:linear-gradient(to_left,black_30%,transparent)]"
                  />
                  {panel.body}
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </PaperPageHeader>

      {TEAM.map((tier, t) => (
        <PaperSection
          key={tier.title}
          id={t === 0 ? "founders" : undefined}
          tone="paper"
          className="scroll-mt-24 !pt-6"
        >
          <Container>
            <IndexBar
              index={t + 1}
              name={tier.title}
              aside={tier.description}
            />
            <ul
              className={cn(
                "mt-8 gap-4 md:gap-6",
                // Fewer, larger cards at the top of the hierarchy; the
                // smaller tiers stay centred however many people they hold
                "flex flex-wrap justify-center",
                t === 0 && "mx-auto max-w-[880px]",
              )}
            >
              {tier.members.map((member, i) => (
                <motion.li
                  key={`${member.role}-${i}`}
                  className={cn(
                    "w-[calc(50%-8px)]",
                    t === 0
                      ? "md:w-[calc(50%-12px)]"
                      : "md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)]",
                  )}
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.8, ease: EASE, delay: i * 0.06 }}
                >
                  <PersonCard member={member} />
                </motion.li>
              ))}
            </ul>
          </Container>
        </PaperSection>
      ))}

      <PaperSection tone="paper" className="!pt-0">
        <Container>
          <Link
            href="/careers"
            className="group flex flex-wrap items-center justify-between gap-4 rounded-[6px] bg-[#fbf9f5] p-6 shadow-[0_30px_60px_-46px_rgba(20,20,20,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/80 md:p-8"
          >
            <span>
              <span className="block text-[24px] font-medium tracking-[-0.04em]">
                Want to work with this team?
              </span>
              <span className="mt-1 block text-[15px] text-[#141414]/60">
                See open and upcoming roles, and how we hire.
              </span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#141414] px-5 py-3 text-[14px] font-medium text-white transition-colors group-hover:bg-[#f97316]">
              View careers
              <ArrowUpRight weight="bold" className="size-4" />
            </span>
          </Link>
        </Container>
      </PaperSection>

      <PaperCta />
    </div>
  );
}

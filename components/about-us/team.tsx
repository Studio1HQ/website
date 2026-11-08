"use client";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import {
  ArrowUpRight,
  GlobeSimple,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import { teamMembers } from "@/constants/data";
import { cn } from "@/lib/utils";
import { PixelPortrait } from "@/components/about-us/pixel-portrait";
import { Container, EASE } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";

type TeamProps = {
  showHeader?: boolean;
  className?: string;
};

type Member = (typeof teamMembers)[number];

/** The founders shown on About Us. */
const LEADERS = teamMembers.filter((member) => member.name !== "Shivay Lamba");

const socials = (member: Member) => [
  {
    href: member.social.twitter,
    label: "X (Twitter)",
    Icon: XLogo,
    weight: "bold" as const,
  },
  {
    href: member.social.linkedin,
    label: "LinkedIn",
    Icon: LinkedinLogo,
    weight: "fill" as const,
  },
  {
    href: member.social.website,
    label: "Website",
    Icon: GlobeSimple,
    weight: "bold" as const,
  },
];

/* Pixel-dithered portraits, ink dots on a transparent ground. */
const DITHER: Record<string, string> = {
  "Arindam Majumder": "/assets/team/arindam-majumder.webp?v=11",
  "Amitesh Anand": "/assets/team/amitesh-anand.webp?v=11",
  "Shivay Lamba": "/assets/team/shivay-lamba.webp?v=11",
};

function LeaderCard({ member }: { member: Member }) {
  const portrait = DITHER[member.name] ?? member.image;

  return (
    <>
      <div
        className="relative aspect-[4/4.4] overflow-hidden rounded-[6px]"
        style={{
          background: "linear-gradient(180deg, #e6e3de 0%, #d8d4ce 100%)",
        }}
      >
        {/* Ordered-dither portrait; its pixels shift around the cursor */}
        <PixelPortrait src={portrait} alt={member.name} />
        {/* Engraved glass: inner shadow along the top, light catch below */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[6px] bg-gradient-to-b from-white/25 via-transparent to-transparent shadow-[inset_0_6px_16px_rgba(20,20,20,0.16),inset_0_1px_3px_rgba(20,20,20,0.18),inset_0_-1px_0_rgba(255,255,255,0.7)] ring-1 ring-inset ring-white/50"
        />
      </div>

      {/* Name, role and links */}
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-medium leading-[1.25] tracking-[-0.02em] text-[#141414] md:text-[18px]">
            {member.name}
          </p>
          <p className="mt-0.5 text-[14px] leading-[1.4] text-[#141414]/55">
            {member.role}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {socials(member).map(({ href, label, Icon, weight }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${member.name} on ${label}`}
              className="flex size-8 items-center justify-center rounded-full bg-[#141414]/[0.04] text-[#141414]/60 shadow-[inset_0_1px_2px_rgba(20,20,20,0.12),inset_0_-1px_0_rgba(255,255,255,0.85)] ring-1 ring-inset ring-[#141414]/[0.06] transition-colors duration-200 hover:bg-[#141414] hover:text-white"
            >
              <Icon weight={weight} className="size-[17px]" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

/** Speaker-style portrait cards: a B&W photo on a print-orange panel. */
function TeamPanel() {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  // Across the section's pass through the screen: hands glide in, rest,
  // then glide back out the way they came.
  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ["start end", "end start"],
  });
  const pass = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 24,
    mass: 0.8,
  });
  const reach = useTransform(pass, [0.05, 0.32, 0.68, 0.95], [1, 0, 0, 1]);
  const handLeftX = useTransform(reach, (v) => `${-v * 70}%`);
  const handRightX = useTransform(reach, (v) => `${v * 70}%`);
  const handOpacity = useTransform(reach, [0, 1], [1, 0]);
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <div ref={panelRef} className="relative isolate">
      {/* The reaching hands from the home hero: they slide in from the
          screen edges as the founders scroll into view */}
      {(["left", "right"] as const).map((side) => (
        <motion.span
          key={side}
          aria-hidden
          style={
            reduceMotion
              ? undefined
              : {
                  x: side === "left" ? handLeftX : handRightX,
                  opacity: handOpacity,
                }
          }
          className={cn(
            "pointer-events-none absolute top-[calc(44%-105px)] -z-10 hidden h-[210px] xl:block",
            side === "left"
              ? "left-[calc(50%-50vw)] right-[calc(50%+488px)] [mask-image:linear-gradient(to_right,transparent,black_45%)]"
              : "left-[calc(50%+488px)] right-[calc(50%-50vw)] [mask-image:linear-gradient(to_left,transparent,black_45%)]",
          )}
        >
          {/* The hero's reaching hand, in its peach print colour */}
          <motion.span
            className="absolute inset-0 will-change-transform"
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{
              duration: 7,
              ease: "easeInOut",
              repeat: Infinity,
              delay: side === "left" ? 0 : 0.9,
            }}
            style={{
              background: "linear-gradient(90deg, #f7b98e, #f39a5f)",
              maskImage: `url(/assets/site/hand-${side}.png)`,
              WebkitMaskImage: `url(/assets/site/hand-${side}.png)`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: side === "left" ? "right center" : "left center",
              WebkitMaskPosition:
                side === "left" ? "right center" : "left center",
            }}
          />
        </motion.span>
      ))}
      <ul className="mx-auto grid max-w-[880px] grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        {LEADERS.map((member, index) => (
          <motion.li key={member.name} {...enter(index * 0.1)}>
            <LeaderCard member={member} />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export const Team = ({ showHeader = true, className }: TeamProps) => {
  return (
    <PaperSection tone="paper" className={cn("py-10 md:py-14", className)}>
      <Container>
        {showHeader ? (
          <>
            <IndexBar index={2} name="Leadership team" />
            <SectionHead
              title={
                <>
                  Meet Our <Accent>Leadership Team</Accent>
                </>
              }
              description="We’re a team of writers, engineers and DevRels who care about clarity, craft and developer outcomes."
            />
          </>
        ) : null}

        <div className={cn(showHeader && "mt-10 md:mt-12")}>
          <TeamPanel />
        </div>

        {showHeader ? (
          <div className="mt-10 flex justify-center md:mt-12">
            <Link
              href="/team"
              className="group inline-flex h-11 items-center gap-2 rounded-full bg-[#141414] pl-5 pr-4 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_-14px_rgba(20,20,20,0.7)] transition-colors duration-200 hover:bg-[#f97316]"
            >
              Meet the full team
              <ArrowUpRight
                weight="bold"
                className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        ) : null}
      </Container>
    </PaperSection>
  );
};

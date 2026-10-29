"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
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
  "Arindam Majumder": "/assets/dither/arindam-dither.png",
  "Amitesh Anand": "/assets/dither/amitesh-dither.png",
  "Shivay Lamba": "/assets/dither/shivay-dither.png",
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
        <div className="mt-0.5 flex shrink-0 items-center gap-2.5">
          {socials(member).map(({ href, label, Icon, weight }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${member.name} on ${label}`}
              className="text-[#141414]/45 transition-colors duration-200 hover:text-[#141414]"
            >
              <Icon weight={weight} className="size-4" />
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
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <div className="relative isolate">
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
      </Container>
    </PaperSection>
  );
};

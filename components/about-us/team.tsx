"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  GlobeSimple,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import { teamMembers } from "@/constants/data";
import { cn } from "@/lib/utils";
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

/** One leader: framed halftone portrait that drifts as you scroll. */
function LeaderCard({ member }: { member: Member }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.14, 1.02, 1.1]);
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

  return (
    <>
      <div
        ref={ref}
        className="relative aspect-[4/5.4] overflow-hidden rounded-[28px] border-[3px] border-[#141414] bg-[#f97316] shadow-[0_24px_44px_-28px_rgba(20,20,20,0.55)] md:rounded-[36px]"
      >
        <motion.div
          className="absolute inset-0"
          style={reduceMotion ? undefined : { scale, y }}
        >
          <Image
            src={member.image}
            alt={member.name}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            className="object-cover object-top grayscale contrast-[1.08]"
          />
        </motion.div>
        {/* Fine, even halftone over the whole print */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-45 mix-blend-multiply [background-image:radial-gradient(circle,rgba(20,20,20,0.85)_0.7px,transparent_1px)] [background-size:4px_4px]"
        />
      </div>

      {/* Role, name and links */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#141414]/50">
            {member.role}
          </p>
          <p className="mt-1 text-[20px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[22px]">
            {member.name}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {socials(member).map(({ href, label, Icon, weight }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${member.name} on ${label}`}
              className="flex size-8 items-center justify-center rounded-full text-[#141414] ring-1 ring-inset ring-[#141414]/15 transition-colors hover:bg-[#141414] hover:text-white"
            >
              <Icon weight={weight} className="size-[14px]" />
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
    <div className="relative">
      {/* Faint dot grid behind the cards */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10 opacity-60 [background-image:radial-gradient(rgba(20,20,20,0.12)_1px,transparent_1px)] [background-size:12px_12px] [mask-image:radial-gradient(70%_80%_at_50%_50%,black,transparent)]"
      />
      <ul className="mx-auto grid max-w-[960px] grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
        {teamMembers.map((member, index) => (
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

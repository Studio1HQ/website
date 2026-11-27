"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ChalkboardTeacher,
  HandHeart,
  Compass,
  Gift,
  Handshake,
  Megaphone,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { SeeRolesButton, Underlined } from "@/components/careers/careers-page";
import { CampusForm } from "@/components/community/campus/campus-form";
import { Container, EASE } from "@/components/home/ui";
import { GRAIN, INK, PAPER, PRINT } from "@/components/paper/paper-hero";
import {
  Accent,
  FAINT,
  IndexBar,
  MUTED,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { PaperServiceFaq } from "@/components/pages/shared/paper-service-kit";
import { PARTNERING } from "@/lib/campus-application";
import { cn } from "@/lib/utils";

const CONTACT = "contact@studio1hq.com";
const P = (path: string) => `/assets/events/${path}.webp`;

/**
 * Scroll-in: a slow rise, once. `initial` never depends on reduced motion
 * (that breaks hydration); reduced motion just makes it instant.
 */
function rise(reduce: boolean, delay = 0) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: reduce ? { duration: 0 } : { duration: 1, ease: EASE, delay },
  } as const;
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const PRINTS: { src: string; caption: string; rotate: number }[] = [
  {
    src: P("synchronicity-s2/01"),
    caption: "Jadavpur University, Kolkata",
    rotate: -7,
  },
  {
    src: P("scee-hackathon/01"),
    caption: "A talk at SCEE Hackathon",
    rotate: -3,
  },
  { src: P("aki-hacks/03"), caption: "AKI Hacks, Hacktoberfest", rotate: 1.5 },
  { src: P("hackspire-2/02"), caption: "Mentoring at Hackspire", rotate: 4 },
  {
    src: P("synchronicity-s2/02"),
    caption: "Prizes at Synchronicity S2",
    rotate: 8,
  },
];

function Hero() {
  const reduce = !!useReducedMotion();
  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden"
      style={{ background: PAPER, color: INK }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      {/* a warm glow behind the prints */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%] [background:radial-gradient(ellipse_60%_70%_at_50%_100%,rgba(249,115,22,0.18),transparent_72%)]"
      />
      <Container className="flex flex-col items-center pb-16 pt-32 text-center md:pb-24 md:pt-40">
        <p className="flex items-center gap-3 text-[13px] font-medium">
          <span className="size-2 rounded-full" style={{ background: PRINT }} />
          Studio1 Across the Campus
          <span aria-hidden className="hidden text-[#141414]/30 sm:inline">
            —
          </span>
          <span className="hidden text-[#141414]/60 sm:inline">
            For clubs and developer communities
          </span>
        </p>
        <h1 className="mt-8 max-w-[900px] text-balance text-[44px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[64px] xl:text-[80px]">
          Bring Studio1 to your <Underlined>campus</Underlined>
          <span style={{ color: PRINT }}>.</span>
        </h1>
        <p className="mt-7 max-w-[640px] text-[16px] leading-[1.7] text-[#141414]/70 sm:text-[17px]">
          Running a hackathon, a meetup or a tech fest? Tell us about it. We
          help with speakers, mentors and judges, swag, promotion and intros to
          devtool sponsors, so a great event doesn&apos;t need a big budget.
        </p>
        <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
          <SeeRolesButton label="Apply for support" href="#apply" />
          <a
            href="#support"
            className="group inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
          >
            or see how we help
            <ArrowUpRight
              weight="bold"
              className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
        </div>

        {/* five prints from campus events, fanned out like a pile on a desk */}
        <div className="relative mt-16 flex w-full max-w-[1080px] items-end justify-center md:mt-20">
          {PRINTS.map((print, i) => (
            <motion.figure
              key={print.src}
              initial={{ opacity: 0, y: 48, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: print.rotate }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 1.1, ease: EASE, delay: 0.25 + i * 0.09 }
              }
              whileHover={
                reduce ? undefined : { y: -10, rotate: 0, zIndex: 10 }
              }
              className={cn(
                "relative -mx-3 w-[44%] shrink-0 bg-white p-1.5 pb-8 text-left shadow-[0_30px_50px_-28px_rgba(20,20,20,0.55)] ring-1 ring-[#141414]/[0.06] sm:-mx-3 sm:w-[23%]",
                (i === 0 || i === PRINTS.length - 1) && "hidden sm:block",
                i === 2 ? "z-[3]" : i === 1 || i === 3 ? "z-[2]" : "z-[1]",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#e6e1d9]">
                <Image
                  src={print.src}
                  alt={print.caption}
                  fill
                  sizes="(min-width: 640px) 260px, 40vw"
                  className="object-cover"
                  priority={i === 2}
                />
              </div>
              <figcaption className="absolute inset-x-2.5 bottom-2.5 truncate text-[11.5px] text-[#141414]/60">
                {print.caption}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 01 How we help                                                      */
/* ------------------------------------------------------------------ */

const PHOTO_HELP: { photo: string; title: string; body: string }[] = [
  {
    photo: P("hackspire-2/01"),
    title: "Speakers and workshops",
    body: "A talk or a hands-on session from the Studio1 team on AI agents, open source, DevRel or shipping your first project.",
  },
  {
    photo: P("aki-hacks/01"),
    title: "Mentors and judges",
    body: "People from Studio1 and the devtool teams we work with, on the floor with your builders and on the judging panel.",
  },
  {
    photo: P("scee-hackathon/03"),
    title: "Swag and prizes",
    body: "Stickers, T-shirts and goodies for your attendees, and help finding prizes for the winners.",
  },
];

const SMALL_HELP: { icon: Icon; title: string; body: string }[] = [
  {
    icon: Megaphone,
    title: "Reach",
    body: "We share your event on Studio1's socials, Discord and newsletter.",
  },
  {
    icon: Handshake,
    title: "Sponsor intros",
    body: "Intros to devtool companies we work with, for credits, API access and prizes.",
  },
  {
    icon: Compass,
    title: "Planning help",
    body: "A second pair of eyes on the format, the sessions and the problem statements.",
  },
];

function HowWeHelp() {
  const reduce = !!useReducedMotion();
  return (
    <PaperSection id="support" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar index={1} name="How we help" aside="People and resources" />
        <SectionHead
          title={
            <>
              What we bring to <Accent>your event</Accent>
            </>
          }
          description="The things that make an event good: people worth hearing from, reach, and the right sponsors in the room."
        />
        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {PHOTO_HELP.map((item, i) => (
            <motion.article
              key={item.title}
              {...rise(reduce, i * 0.08)}
              className="group overflow-hidden rounded-[8px] bg-[#fbf9f5] ring-1 ring-inset ring-[#141414]/[0.08]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#e6e1d9]">
                <Image
                  src={item.photo}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5 md:p-6">
                <h3 className="text-[20px] font-medium tracking-[-0.03em]">
                  {item.title}
                </h3>
                <p className={cn("mt-2 text-[15px] leading-[1.6]", MUTED)}>
                  {item.body}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {SMALL_HELP.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              {...rise(reduce, 0.1 + i * 0.08)}
              className="flex gap-4 rounded-[8px] bg-white/70 p-5 ring-1 ring-inset ring-[#141414]/[0.08] md:p-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#141414] text-[#f4efe7]">
                <Icon weight="bold" className="size-[18px]" />
              </span>
              <div>
                <h3 className="text-[17px] font-medium tracking-[-0.02em]">
                  {title}
                </h3>
                <p className={cn("mt-1 text-[14.5px] leading-[1.55]", MUTED)}>
                  {body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* the funding note: said kindly, before anyone fills in the form */}
        <motion.aside
          {...rise(reduce, 0.15)}
          className="relative mt-3 flex flex-col gap-4 overflow-hidden rounded-[8px] p-6 ring-1 ring-inset ring-[#f97316]/30 sm:flex-row sm:items-start sm:gap-5 md:p-8"
          style={{ background: "rgba(249,115,22,0.07)" }}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: PRINT }}
          >
            <HandHeart weight="bold" className="size-[18px]" />
          </span>
          <div className="max-w-[760px]">
            <h3 className="text-[19px] font-medium tracking-[-0.025em]">
              A note on funding
            </h3>
            <p className="mt-2 text-[15.5px] leading-[1.65] text-[#141414]/75">
              We&apos;re a small team, so we support events mostly with people
              and resources rather than funding: talks, mentors, swag, reach and
              introductions to the devtool teams we work with. Financial support
              is something we can offer only now and then, so if your event
              needs it, mention it in the form and we&apos;ll look at it case by
              case.
            </p>
          </div>
        </motion.aside>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 Partnering                                                      */
/* ------------------------------------------------------------------ */

function GivesBack() {
  const reduce = !!useReducedMotion();
  return (
    <PaperSection id="partnering" tone="paper">
      <Container>
        <IndexBar
          index={2}
          name="Partnering"
          aside="Nothing here is required"
        />
        <SectionHead
          title={
            <>
              Partnering that feels <Accent>natural</Accent>
            </>
          }
          description="Communities we work with often like to feature their partners in a few simple ways. We agree on it together on a call, so pick whatever feels natural."
        />
        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNERING.map((line, i) => (
            <motion.li
              key={line}
              {...rise(reduce, Math.min(i, 5) * 0.06)}
              className="flex items-start gap-4 rounded-[8px] bg-white/70 p-5 ring-1 ring-inset ring-[#141414]/[0.08]"
            >
              <span
                className="text-[13px] font-medium tabular-nums"
                style={{ color: PRINT }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15.5px] leading-[1.5]">{line}</span>
            </motion.li>
          ))}
        </ol>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 03 How it works                                                     */
/* ------------------------------------------------------------------ */

const STEPS: { icon: Icon; title: string; body: string }[] = [
  {
    icon: ChalkboardTeacher,
    title: "Apply",
    body: "A few quick details about your community and your plans. It takes about two minutes.",
  },
  {
    icon: UsersThree,
    title: "We reach out",
    body: "Our community team reads every application and gets in touch to learn more about you and the event.",
  },
  {
    icon: Handshake,
    title: "We plan it together",
    body: "On a short call, we suggest what we can bring and agree on how we'll work together.",
  },
  {
    icon: Gift,
    title: "Event day",
    body: "We show up for your community. Afterwards, we'd love a few photos and highlights, and to plan the next one.",
  },
];

function HowItWorks() {
  const reduce = !!useReducedMotion();
  return (
    <PaperSection id="how" tone="paper">
      <Container>
        <IndexBar index={3} name="How it works" aside="Apply 4+ weeks ahead" />
        <SectionHead
          title={
            <>
              From form to <Accent>event day</Accent>
            </>
          }
        />
        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              {...rise(reduce, i * 0.08)}
              className="relative rounded-[8px] bg-[#fbf9f5] p-6 ring-1 ring-inset ring-[#141414]/[0.08]"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#141414] text-[#f4efe7]">
                  <Icon weight="bold" className="size-[18px]" />
                </span>
                <span
                  className={cn("text-[13px] font-medium tabular-nums", FAINT)}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-6 text-[20px] font-medium tracking-[-0.03em]">
                {title}
              </h3>
              <p className={cn("mt-2 text-[15px] leading-[1.6]", MUTED)}>
                {body}
              </p>
            </motion.li>
          ))}
        </ol>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 FAQ                                                              */
/* ------------------------------------------------------------------ */

export const CAMPUS_FAQS = [
  {
    question: "Do you offer financial sponsorship?",
    answer:
      "Now and then. We're a small team, so we mostly support events with people and resources: talks, mentors and judges, swag, promotion, and introductions to devtool teams that offer credits, API access and prizes. If your event needs funding, mention it in the form and we'll look at it case by case.",
  },
  {
    question: "Who can apply?",
    answer:
      "College tech clubs, student chapters like GDG, MLSA, ACM and IEEE, fest teams, and city or online developer communities.",
  },
  {
    question: "How early should we apply?",
    answer:
      "Four weeks or more before the event is best. Speakers, swag and sponsor intros take time to line up.",
  },
  {
    question: "How do partnerships usually work?",
    answer:
      "We agree on it together on a short call. Communities often invite us for a talk, feature Studio1 as a partner on the event page, or share highlights afterwards. Nothing is a fixed requirement.",
  },
  {
    question: "Can we apply for more than one event?",
    answer: "Yes. Send one application per event.",
  },
  {
    question: "When will we hear back?",
    answer:
      "Our community team reads every application and gets in touch by email, usually to set up a short call and plan the details together.",
  },
];

/* ------------------------------------------------------------------ */
/* 05 Apply                                                            */
/* ------------------------------------------------------------------ */

const GOOD_TO_KNOW: ReactNode[] = [
  <>
    <span className="font-medium text-[var(--p-fg)]">
      People and resources first.
    </span>{" "}
    Funding is occasional, case by case.
  </>,
  <>
    <span className="font-medium text-[var(--p-fg)]">Apply early.</span> Four
    weeks or more before the event.
  </>,
  <>
    <span className="font-medium text-[var(--p-fg)]">
      One event per application.
    </span>{" "}
    Apply again for the next one.
  </>,
];

/** When the form isn't connected: the same questions, by email. */
function ByEmail() {
  const subject = encodeURIComponent(
    "Studio1 Across the Campus: support for our event",
  );
  const body = encodeURIComponent(
    "Community or club:\nCollege or university:\nLink to the community:\nCommittee size:\nAverage turnout at your events:\nA little about your plans:\nAnything in particular that would help:\n",
  );
  return (
    <div className="rounded-[6px] bg-white p-7 text-[#141414] sm:p-10">
      <h3 className="text-[24px] font-medium tracking-[-0.04em]">
        Apply by email
      </h3>
      <p className="mt-3 text-[15px] leading-[1.65] text-[#141414]/65">
        Tell us about your community, the event and what would help. The email
        opens with the questions filled in.
      </p>
      <a
        href={`mailto:${CONTACT}?subject=${subject}&body=${body}`}
        className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[#141414] px-6 text-[14.5px] font-medium text-white transition-colors hover:bg-[#f97316]"
      >
        Email {CONTACT} <ArrowUpRight weight="bold" className="size-4" />
      </a>
    </div>
  );
}

function Apply({ applicationsEnabled }: { applicationsEnabled: boolean }) {
  return (
    <PaperSection id="apply" tone="night" className="scroll-mt-24">
      <Container>
        <IndexBar index={5} name="Apply" aside={CONTACT} />
        <div className="mt-8 grid items-start gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <h2 className="text-[34px] font-medium leading-[1.1] tracking-[-0.05em] sm:text-[48px] lg:text-[56px]">
              Tell us about
              <br />
              <Accent>your event.</Accent>
            </h2>
            <p
              className={cn(
                "mt-6 max-w-[440px] text-[16px] leading-[1.6]",
                MUTED,
              )}
            >
              A few quick details are enough to get started. Our team will reach
              out to learn the rest and suggest what we can do together.
            </p>
            <ul className="mt-10 max-w-[440px] space-y-3 border-t border-white/10 pt-6 text-[14.5px] leading-[1.55]">
              {GOOD_TO_KNOW.map((line, i) => (
                <li key={i} className={cn("flex gap-3", MUTED)}>
                  <span
                    aria-hidden
                    className="mt-[9px] size-1.5 shrink-0 rounded-full"
                    style={{ background: PRINT }}
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          {applicationsEnabled ? <CampusForm /> : <ByEmail />}
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Studio1 Across the Campus: how we support college clubs and communities, and the application. */
export function CampusPage({
  applicationsEnabled,
}: {
  applicationsEnabled: boolean;
}) {
  return (
    <div className="overflow-x-clip">
      <Hero />
      <HowWeHelp />
      <GivesBack />
      <HowItWorks />
      <PaperSection id="faq" tone="paper">
        <Container>
          <PaperServiceFaq
            index={4}
            items={CAMPUS_FAQS}
            subtitle="What clubs and communities ask before they apply."
            action={
              <a
                href="#apply"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#141414] px-6 text-[14.5px] font-medium text-white transition-colors hover:bg-[#f97316]"
              >
                Apply for support{" "}
                <ArrowUpRight
                  weight="bold"
                  className="size-4 transition-transform duration-300 group-hover:rotate-45"
                />
              </a>
            }
          />
        </Container>
      </PaperSection>
      <Apply applicationsEnabled={applicationsEnabled} />
    </div>
  );
}

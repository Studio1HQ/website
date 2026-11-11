"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Check,
} from "@phosphor-icons/react";
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  MUTED,
  OutlineLink,
  PaperCta,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { DeparturesBoard } from "@/components/hackathons/departures-board";
import { FlapCountdown } from "@/components/hackathons/flap-countdown";
import {
  HackathonFaqList,
  InkPill,
  RULED_LINES,
  StatusChip,
  pad,
} from "@/components/hackathons/hackathon-ui";
import { RegistrationSection } from "@/components/hackathons/registration-section";
import type { Hackathon } from "@/data/hackathons";
import {
  FORMAT_LABEL,
  type HackathonCard,
  type HackathonStatus,
} from "@/lib/hackathons";
import { GRAIN, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** Everything time-dependent, computed on the server so render stays pure. */
export type HackathonView = {
  status: HackathonStatus;
  registrationOpen: boolean;
  dateRange: string;
  prizePool: string;
  /** "Nov 8, 2026" */
  registrationCloses: string;
  /** "Nov 8" */
  registrationClosesShort: string;
  endDate: string;
  winners: { date: string; done: boolean } | null;
  /** One state per timeline milestone, in order. */
  milestones: ("done" | "today" | "next")[];
  clock: {
    mode: "starts" | "ends" | "ended";
    target: number;
    start: number;
    end: number;
    serverNow: number;
  };
  /** Where today sits on the itinerary; see itineraryPosition. */
  itinerary: { after: number; fraction: number; today: string };
};

type HackathonDetailPageProps = {
  hackathon: Hackathon;
  view: HackathonView;
  more: HackathonCard[];
};

const SECTIONS = [
  { id: "challenge", name: "The challenge" },
  { id: "prizes", name: "Prizes" },
  { id: "itinerary", name: "Itinerary" },
  { id: "submit", name: "Submit" },
  { id: "register", name: "Register" },
  { id: "rules", name: "Rules & FAQ" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const indexOf = (id: SectionId) =>
  SECTIONS.findIndex((section) => section.id === id) + 1;

/** Small caps label used above lists inside a section. */
const LIST_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.16em] text-[#141414]/50";

function formatMilestone(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------ */
/* Hero: headline left, the flap clock right                           */
/* ------------------------------------------------------------------ */

function DetailHero({
  hackathon,
  view,
}: Omit<HackathonDetailPageProps, "more">) {
  const where =
    hackathon.location === "Remote"
      ? FORMAT_LABEL[hackathon.format]
      : `${FORMAT_LABEL[hackathon.format]} · ${hackathon.location}`;
  const endedNote = view.winners
    ? `Winners ${view.winners.done ? "were" : "are"} announced on ${view.winners.date}.`
    : undefined;

  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <div aria-hidden className={RULED_LINES} />
      <Container className="grid items-center gap-x-16 gap-y-12 pb-16 pt-32 md:pb-20 md:pt-40 lg:grid-cols-2">
        <div className="min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-3 text-[13px] font-medium"
          >
            <Link
              href="/hackathons#hackathons"
              className="group inline-flex items-center gap-1.5 transition-colors hover:text-[#f97316]"
            >
              <ArrowLeft
                weight="bold"
                className="size-3.5 transition-transform group-hover:-translate-x-0.5"
              />
              Hackathons
            </Link>
            {hackathon.placeholder ? (
              <>
                <span aria-hidden className="text-[#141414]/30">
                  /
                </span>
                <span className="border border-dashed border-[#141414]/30 px-1.5 py-[2px] text-[11px] leading-none text-[#141414]/50">
                  Placeholder event
                </span>
              </>
            ) : null}
          </nav>

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusChip status={view.status} />
            <span className="text-[13px] font-medium text-[#141414]/60">
              {where} · {view.dateRange}
            </span>
          </div>

          <h1 className="mt-5 text-[44px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[64px] xl:text-[80px]">
            {hackathon.name}
            <span style={{ color: PRINT }}>.</span>
          </h1>
          <p className="mt-6 max-w-[520px] text-[17px] leading-[1.6] text-[#141414]/70 sm:text-[20px]">
            {hackathon.tagline}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-5">
            {view.registrationOpen ? (
              <InkPill href="#register">Register now</InkPill>
            ) : null}
            <a
              href="#challenge"
              className="group inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
            >
              See the challenge
              <ArrowDown
                weight="bold"
                className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
              />
            </a>
          </div>
        </div>

        <FlapCountdown
          {...view.clock}
          endedNote={endedNote}
          facts={[
            ["Prize pool", view.prizePool],
            ["Team size", hackathon.teamSize],
            view.registrationOpen
              ? ["Registration closes", view.registrationClosesShort]
              : ["Registration", "Closed"],
          ]}
        />
      </Container>
    </section>
  );
}

/** Jump links to each section, scrolling sideways on small screens. */
function OnThisPage() {
  return (
    <nav
      aria-label="On this page"
      className="border-y border-[#141414]/10 bg-[#f4efe7]"
    >
      <Container>
        <ul
          role="list"
          data-lenis-prevent
          className="-mx-2 flex gap-1 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SECTIONS.map((section, index) => (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#141414]/60 transition-colors hover:bg-white hover:text-[#141414]"
              >
                <span className="text-[11px] tabular-nums text-[#f97316]">
                  {pad(index + 1)}
                </span>
                {section.name}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — The challenge: the pitch, the tracks, who it's with            */
/* ------------------------------------------------------------------ */

function Challenge({ hackathon }: { hackathon: Hackathon }) {
  return (
    <PaperSection id="challenge" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar
          index={indexOf("challenge")}
          name="The challenge"
          aside={hackathon.themes.join(" · ")}
        />
        <div className="mt-10 grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-[21px] font-medium leading-[1.45] tracking-[-0.025em] sm:text-[25px]">
              {hackathon.description}
            </p>

            <div className="mt-12">
              <p className={LIST_LABEL}>
                {hackathon.placeholder ? "Partner slots open" : "Hosted with"}
              </p>
              <ul role="list" className="mt-4 flex flex-wrap gap-2">
                {hackathon.partners.map((partner, index) => (
                  <li
                    key={`${partner.role}-${index}`}
                    className={cn(
                      "flex min-w-[148px] flex-col rounded-[4px] px-4 py-3",
                      hackathon.placeholder
                        ? "border-[1.5px] border-dashed border-[#141414]/20"
                        : "bg-white/80 ring-1 ring-inset ring-[#141414]/10",
                    )}
                  >
                    <span className="text-[11.5px] text-[#141414]/50">
                      {partner.role}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 text-[15px] font-medium tracking-[-0.01em]",
                        hackathon.placeholder && "text-[#141414]/35",
                      )}
                    >
                      {hackathon.placeholder ? "Your logo here" : partner.name}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/hackathons#partners"
                className="group mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium underline decoration-[#f97316] decoration-2 underline-offset-[5px]"
              >
                Become a partner
                <ArrowUpRight
                  weight="bold"
                  className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>

          <div>
            <p className={LIST_LABEL}>
              {hackathon.tracks.length > 1
                ? `${hackathon.tracks.length} tracks · pick one`
                : "One track"}
            </p>
            <ol className="mt-4 border-t border-[#141414]/[0.14]">
              {hackathon.tracks.map((track, index) => (
                <li
                  key={track.name}
                  className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-3 border-b border-[#141414]/[0.14] py-6"
                >
                  <span
                    className="pt-1.5 text-[13px] font-medium tabular-nums"
                    style={{ color: PRINT }}
                  >
                    {pad(index + 1)}
                  </span>
                  <div>
                    <p className="text-[22px] font-medium leading-tight tracking-[-0.035em]">
                      {track.name}
                    </p>
                    <p className={cn("mt-2 text-[15px] leading-[1.6]", MUTED)}>
                      {track.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — Prizes: one big number, then the ledger                        */
/* ------------------------------------------------------------------ */

function Prizes({
  hackathon,
  prizePool,
}: {
  hackathon: Hackathon;
  prizePool: string;
}) {
  return (
    <PaperSection id="prizes" tone="paper" className="scroll-mt-24 !pt-0">
      <Container>
        <IndexBar
          index={indexOf("prizes")}
          name="Prizes"
          aside="Paid after winners are verified"
        />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-20">
          <div>
            <p className="text-[76px] font-medium leading-[0.9] tracking-[-0.065em] tabular-nums sm:text-[112px] xl:text-[136px]">
              <span style={{ color: PRINT }}>$</span>
              {prizePool.replace(/^\$/, "")}
            </p>
            <p
              className={cn(
                "mt-5 max-w-[360px] text-[16px] leading-[1.6]",
                MUTED,
              )}
            >
              {`in prizes across ${hackathon.prizes.length} awards, paid after winners are announced and verified.`}
            </p>
          </div>
          <ol className="border-t border-[#141414]/[0.14]">
            {hackathon.prizes.map((prize, index) => (
              <li
                key={prize.title}
                className="flex items-baseline gap-4 border-b border-[#141414]/[0.14] py-5 sm:gap-6"
              >
                <span
                  className="w-6 shrink-0 text-[13px] font-medium tabular-nums"
                  style={{ color: PRINT }}
                >
                  {pad(index + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[18px] font-medium tracking-[-0.02em]">
                    {prize.title}
                  </p>
                  <p className={cn("mt-1 text-[14px] leading-[1.5]", MUTED)}>
                    {prize.description}
                  </p>
                </div>
                <p className="shrink-0 text-[22px] font-medium tracking-[-0.04em] tabular-nums sm:text-[28px]">
                  {prize.amount}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — Itinerary: the milestones as a route, with "today" riding it   */
/* ------------------------------------------------------------------ */

function Node({
  state,
  current,
}: {
  state: "done" | "today" | "next";
  current: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-[18px] items-center justify-center rounded-full",
        state === "done" && "bg-[#141414] text-[#f4efe7]",
        state !== "done" &&
          !current &&
          "bg-[#f4efe7] ring-[1.5px] ring-inset ring-[#141414]/30",
      )}
      style={current ? { background: PRINT } : undefined}
    >
      {state === "done" ? <Check weight="bold" className="size-2.5" /> : null}
      {current ? <span className="size-1.5 rounded-full bg-white" /> : null}
    </span>
  );
}

function Itinerary({
  hackathon,
  view,
}: {
  hackathon: Hackathon;
  view: HackathonView;
}) {
  const timeline = hackathon.timeline;
  const count = timeline.length;
  const next = view.milestones.findIndex((state) => state !== "done");
  const { after, fraction, today } = view.itinerary;
  // Milestones sit at column centres; today rides between them.
  const column = 100 / count;
  const nodeX = (index: number) => (index + 0.5) * column;
  const markerX =
    after === -1
      ? column * 0.2
      : after === count - 1
        ? 100 - column * 0.2
        : nodeX(after) + fraction * column;

  return (
    <PaperSection id="itinerary" tone="paper" className="scroll-mt-24 !pt-0">
      <Container>
        <IndexBar
          index={indexOf("itinerary")}
          name="Itinerary"
          aside="Deadlines are 23:59 UTC"
        />
        <SectionHead
          title={
            <>
              From kickoff to <Accent>winners</Accent>
            </>
          }
          description="Register before it closes, finish the pre-hack tasks, then build. Here's where things stand today."
        />

        {/* Desktop: a horizontal route */}
        <div className="mt-14 hidden lg:block">
          <div className="relative h-11">
            <div
              className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${markerX}%` }}
            >
              <span
                className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium text-white"
                style={{ background: PRINT }}
              >
                Today · {today}
              </span>
              <span className="h-3 w-px" style={{ background: PRINT }} />
            </div>
          </div>
          <div className="relative h-[3px] rounded-full bg-[#141414]/[0.1]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${markerX}%`, background: PRINT }}
            />
            {timeline.map((milestone, index) => (
              <span
                key={`${milestone.date}-${milestone.label}`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${nodeX(index)}%` }}
              >
                <Node state={view.milestones[index]} current={index === next} />
              </span>
            ))}
          </div>
          <ol
            className="mt-7 grid"
            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
          >
            {timeline.map((milestone, index) => {
              const done = view.milestones[index] === "done";
              return (
                <li
                  key={`${milestone.date}-${milestone.label}`}
                  className="px-3 text-center"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#141414]/50">
                    {formatMilestone(milestone.date)}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-[17px] font-medium tracking-[-0.02em]",
                      done && "text-[#141414]/45",
                    )}
                  >
                    {milestone.label}
                  </p>
                  <p
                    className={cn(
                      "mx-auto mt-1.5 max-w-[220px] text-[13.5px] leading-[1.5]",
                      done ? "text-[#141414]/40" : MUTED,
                    )}
                  >
                    {milestone.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Mobile and tablet: the same route, top to bottom */}
        <ol className="mt-10 lg:hidden">
          {timeline.map((milestone, index) => {
            const state = view.milestones[index];
            const current = index === next;
            return (
              <li
                key={`${milestone.date}-${milestone.label}`}
                className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0"
              >
                {index < count - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-[8px] top-6 h-[calc(100%-1.25rem)] w-px bg-[#141414]/[0.12]"
                  />
                ) : null}
                <span className="mt-0.5">
                  <Node state={state} current={current} />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[#141414]/50">
                    {formatMilestone(milestone.date)}
                    {current ? (
                      <span
                        className="rounded-full px-2 py-0.5 font-sans text-[10.5px] normal-case tracking-normal text-white"
                        style={{ background: PRINT }}
                      >
                        {state === "today" ? "Today" : "Up next"}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cn(
                      "mt-1.5 text-[17px] font-medium tracking-[-0.02em]",
                      state === "done" && "text-[#141414]/45",
                    )}
                  >
                    {milestone.label}
                  </p>
                  <p className={cn("mt-1 text-[14px] leading-[1.5]", MUTED)}>
                    {milestone.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Submit: the checklist and how entries are scored               */
/* ------------------------------------------------------------------ */

function Submit({ hackathon }: { hackathon: Hackathon }) {
  return (
    <PaperSection id="submit" tone="paper" className="scroll-mt-24 !pt-0">
      <Container>
        <IndexBar index={indexOf("submit")} name="Submit" />
        <SectionHead
          title={
            <>
              What you <Accent>submit</Accent>
            </>
          }
          description="Entries missing any of these aren't judged, so check the list before you send."
        />
        <div className="mt-12 grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className={LIST_LABEL}>Submission checklist</p>
            <ol className="mt-4 border-t border-[#141414]/[0.14]">
              {hackathon.deliverables.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-4 border-b border-[#141414]/[0.14] py-4 text-[15.5px] leading-snug"
                >
                  <span
                    className="mt-px flex size-5 shrink-0 items-center justify-center text-[10px] font-semibold tabular-nums text-white"
                    style={{ background: PRINT }}
                  >
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className={LIST_LABEL}>How it&apos;s judged</p>
            <ul role="list" className="mt-4 border-t border-[#141414]/[0.14]">
              {hackathon.judging.map((criterion) => (
                <li
                  key={criterion.name}
                  className="border-b border-[#141414]/[0.14] py-4"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[15.5px] font-medium tracking-[-0.01em]">
                      {criterion.name}
                    </span>
                    <span className="font-mono text-[13px] tabular-nums text-[#141414]/55">
                      {criterion.weight}%
                    </span>
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#141414]/[0.08]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${criterion.weight}%`,
                        background: PRINT,
                      }}
                    />
                  </div>
                  <p className={cn("mt-2 text-[13.5px] leading-[1.5]", MUTED)}>
                    {criterion.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — Register                                                        */
/* ------------------------------------------------------------------ */

function Register({
  hackathon,
  view,
}: {
  hackathon: Hackathon;
  view: HackathonView;
}) {
  const past = view.status === "past";
  const closedTitle = past
    ? "This hackathon has ended."
    : "Registration is closed.";
  const closedMessage = past
    ? view.winners
      ? `Thanks to everyone who built. Winners ${view.winners.done ? "were" : "are"} announced on ${view.winners.date}.`
      : "Thanks to everyone who built."
    : `Registration closed on ${view.registrationCloses}. Already registered? Finish your tasks and build.`;

  return (
    <PaperSection id="register" tone="paper" className="scroll-mt-24 !pt-0">
      <Container>
        <IndexBar
          index={indexOf("register")}
          name="Register"
          aside={
            view.registrationOpen
              ? `Closes ${view.registrationCloses}`
              : "Closed"
          }
        />
        <SectionHead
          title={
            view.registrationOpen ? (
              <>
                Register, then get <Accent>ready to go</Accent>
              </>
            ) : (
              <>
                Registration is <Accent>closed</Accent>
              </>
            )
          }
          description={
            view.registrationOpen
              ? "Fill in the form, then work through the pre-hack tasks. Once every task is ticked, you're ready for kickoff."
              : undefined
          }
        />
        <RegistrationSection
          slug={hackathon.slug}
          hackathonName={hackathon.name}
          tracks={hackathon.tracks.map((track) => track.name)}
          tasks={hackathon.tasks}
          registrationOpen={view.registrationOpen}
          closedTitle={closedTitle}
          closedMessage={closedMessage}
          showTasks={!past}
          registerUrl={hackathon.registerUrl}
        />
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 06 — Rules & FAQ, side by side                                       */
/* ------------------------------------------------------------------ */

function RulesAndFaq({ hackathon }: { hackathon: Hackathon }) {
  return (
    <PaperSection id="rules" tone="paper" className="scroll-mt-24 !pt-0">
      <Container>
        <IndexBar index={indexOf("rules")} name="Rules & FAQ" />
        <div className="mt-8 grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px]">
              The <Accent>rules</Accent>
            </h2>
            <ol className="mt-8 border-t border-[#141414]/[0.14]">
              {hackathon.rules.map((rule, index) => (
                <li
                  key={rule}
                  className="flex gap-4 border-b border-[#141414]/[0.14] py-4 text-[15px] leading-[1.6]"
                >
                  <span
                    className="w-6 shrink-0 pt-px text-[13px] font-medium tabular-nums"
                    style={{ color: PRINT }}
                  >
                    {pad(index + 1)}
                  </span>
                  {rule}
                </li>
              ))}
            </ol>
          </div>
          <div id="faq" className="scroll-mt-24">
            <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px]">
              Questions, <Accent>answered</Accent>
            </h2>
            <HackathonFaqList items={hackathon.faqs} />
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

export function HackathonDetailPage({
  hackathon,
  view,
  more,
}: HackathonDetailPageProps) {
  return (
    <div className="overflow-x-clip" style={PAPER_SCOPE}>
      <DetailHero hackathon={hackathon} view={view} />
      <OnThisPage />
      <Challenge hackathon={hackathon} />
      <Prizes hackathon={hackathon} prizePool={view.prizePool} />
      <Itinerary hackathon={hackathon} view={view} />
      <Submit hackathon={hackathon} />
      <Register hackathon={hackathon} view={view} />
      <RulesAndFaq hackathon={hackathon} />

      {more.length > 0 ? (
        <PaperSection id="more" tone="paper" className="!pt-0">
          <Container>
            <IndexBar index={SECTIONS.length + 1} name="More departures" />
            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px]">
                Not quite the one?
              </h2>
              <OutlineLink href="/hackathons#hackathons">
                All hackathons
              </OutlineLink>
            </div>
            <DeparturesBoard
              cards={more}
              label="Other Studio1 hackathons"
              className="mt-8"
            />
          </Container>
        </PaperSection>
      ) : null}

      <PaperCta
        index={SECTIONS.length + (more.length > 0 ? 2 : 1)}
        title="Want Your Product in the Next One?"
        description="Partner with Studio1 and developers spend the hackathon building with your product. We'll design it around you."
      />
    </div>
  );
}

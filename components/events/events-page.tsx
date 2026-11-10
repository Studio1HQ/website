"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import {
  Broadcast,
  CalendarDots,
  Code,
  Headphones,
  MicrophoneStage,
  Monitor,
  Sparkle,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { DotWord } from "@/components/team/dot-word";
import { PaperCta } from "@/components/paper/paper-sections";
import { EventGallery } from "@/components/events/event-gallery";
import {
  isUpcomingEvent,
  type EventKind,
  type StudioEvent,
} from "@/data/events";
import { PAPER_SCOPE } from "@/lib/paper";
import { cn } from "@/lib/utils";

export const KIND_ICON: Record<EventKind, Icon> = {
  Conference: MicrophoneStage,
  Hackathon: Code,
  Meetup: UsersThree,
  Podcast: Headphones,
  Livestream: Broadcast,
  Webinar: Monitor,
  Community: Sparkle,
};

/** The event's logo, small, beside its name; the type icon when there is none. */
export function EventMark({
  event,
  className,
  bare = false,
}: {
  event: StudioEvent;
  className?: string;
  /** Just the logo, no tile: sits straight on the page. */
  bare?: boolean;
}) {
  // No logo of its own: show nothing rather than a stand-in
  if (!event.logo) return null;
  return (
    <span
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px]",
        !bare &&
          "bg-white shadow-[0_1px_2px_rgba(20,20,20,0.08)] ring-1 ring-[#141414]/[0.08]",
        className,
      )}
    >
      {event.logo?.endsWith(".svg") ? (
        <span
          aria-hidden
          className={cn("block", bare ? "size-full" : "size-[56%]")}
          style={{
            backgroundColor: event.brand ?? "#141414",
            WebkitMask: `url(${event.logo}) center / contain no-repeat`,
            mask: `url(${event.logo}) center / contain no-repeat`,
          }}
        />
      ) : event.logo ? (
        <Image
          src={event.logo}
          alt=""
          fill
          sizes="36px"
          className={
            event.logoFill
              ? "object-cover"
              : cn("object-contain", !bare && "p-[16%]")
          }
        />
      ) : null}
    </span>
  );
}

export function EventsPage({
  events,
  now,
}: {
  events: StudioEvent[];
  now: number;
}) {
  const reduceMotion = useReducedMotion();
  // The record counts what has happened; upcoming events are listed apart
  const past = events.filter((e) => !isUpcomingEvent(e, now));
  const count = (k: EventKind) => past.filter((e) => e.kind === k).length;
  const stats: [number, string, Icon][] = [
    [past.length, "Events", CalendarDots],
    [count("Conference"), "Conferences", MicrophoneStage],
    [count("Hackathon"), "Hackathons", Code],
    [
      count("Podcast") + count("Livestream") + count("Webinar"),
      "Online sessions",
      Broadcast,
    ],
  ];

  return (
    <div style={PAPER_SCOPE}>
      <PaperPageHeader className="pb-12 pt-32 md:pb-16 md:pt-40">
        <Container>
          {/* Studio1, in orange dots, across the full width; Events beneath */}
          <h1 className="sr-only">Studio1 Events</h1>
          <DotWord text="Studio1" />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6 md:mt-8">
            <motion.p
              aria-hidden
              className="text-[56px] font-medium leading-[0.9] tracking-[-0.06em] sm:text-[96px] lg:text-[128px]"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
            >
              Events
            </motion.p>
            <motion.p
              className="max-w-[380px] pb-2 text-[17px] leading-[1.55] text-[#141414]/65"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1 }}
            >
              The talks, hackathons and meetups we have been part of, from
              KubeCon to campus hackathons.
            </motion.p>
          </div>

          {/* The record, engraved into the page */}
          <dl className="mt-10 grid grid-cols-2 overflow-hidden rounded-[6px] bg-[#ebe6de] shadow-[inset_0_2px_6px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08),inset_0_-1px_0_rgba(255,255,255,0.85)] md:mt-14 md:grid-cols-4">
            {stats.map(([value, label, StatIcon], i) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-4 px-5 py-5 md:px-6 md:py-6",
                  i % 2 === 1 && "border-l border-[#141414]/[0.08]",
                  i > 1 && "max-md:border-t max-md:border-[#141414]/[0.08]",
                  i === 2 && "md:border-l md:border-[#141414]/[0.08]",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4efe7] text-[#f97316] shadow-[0_1px_2px_rgba(20,20,20,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <StatIcon weight="bold" className="size-[18px]" />
                </span>
                <dd className="text-[32px] font-medium leading-none tracking-[-0.05em] tabular-nums text-[#141414]/85 [text-shadow:0_1px_0_rgba(255,255,255,0.9)] md:text-[40px]">
                  {value}
                </dd>
                <dt className="text-[13px] text-[#141414]/55 [text-shadow:0_1px_0_rgba(255,255,255,0.8)]">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </Container>
      </PaperPageHeader>

      <div className="overflow-x-clip pb-24 pt-10 md:pb-32 md:pt-16">
        {events.length ? (
          <EventGallery events={events} now={now} />
        ) : (
          <Container>
            <p className="text-[15px] text-[#141414]/55">
              No events of this type yet.
            </p>
          </Container>
        )}
      </div>

      <PaperCta />
    </div>
  );
}

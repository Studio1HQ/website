import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { CalendarBoard } from "@/components/events/calendar-board";
import { MachineToggle } from "@/components/paper/machine-view";
import Logo from "@/components/ui/svgs/logo";
import { EVENTS } from "@/data/events";
import { PAPER_SCOPE } from "@/lib/paper";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// "Today" and the opening month depend on the date.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Calendar: Studio1 Events by Month",
  description:
    "Studio1 events month by month: the conferences, hackathons, meetups, podcasts and livestreams the team has spoken at, run or joined.",
  path: "/calendar",
});

/**
 * A standalone page, outside the site chrome: the calendar fills the screen,
 * with only the Studio1 mark and a way back to the site.
 */
export default function Page() {
  return (
    <div style={PAPER_SCOPE} className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Events", path: "/events" },
              { name: "Calendar", path: "/calendar" },
            ]),
          ),
        }}
      />
      <header className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-4 md:px-8 md:py-5">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Studio1"
        >
          <Logo className="size-8" />
          <span className="text-[20px] font-medium tracking-[-0.03em]">
            Studio1
          </span>
        </Link>
        <div className="ml-auto mr-3 hidden md:block">
          <MachineToggle />
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-[#141414] py-2.5 pl-4 pr-5 text-[14px] font-medium text-white"
        >
          <ArrowLeft weight="bold" className="size-4" />
          Back to Studio1
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 pb-4 md:px-8 md:pb-8">
        <h1 className="sr-only">Studio1 events calendar</h1>
        <CalendarBoard events={EVENTS} now={Date.now()} />
      </main>
    </div>
  );
}

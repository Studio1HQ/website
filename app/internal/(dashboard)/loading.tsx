"use client";

import { usePathname } from "next/navigation";

const bar = "rounded-md bg-[var(--i-track)]";
const panel = "rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)]";

/** Pages that are a filterable list of rows. */
const LISTS = /^\/internal\/(jobs|hackathons|cohort|subscribers|partner-pool|blog|team|people|templates)$/;
/** One entry: /internal/jobs/<id> and the like, but not the community pages. */
const ENTRY = /^\/internal\/(jobs|hackathons|cohort)\/[^/]+$/;

function Header() {
  return (
    <>
      <div className={`${bar} mb-2 h-3 w-20`} />
      <div className={`${bar} mb-2.5 h-6 w-64`} />
      <div className={`${bar} mb-7 h-3.5 w-80 max-w-full`} />
    </>
  );
}

function Rows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-[var(--i-line)] px-4 py-3.5 last:border-b-0">
          <div className="size-8 rounded-full bg-[var(--i-track)]" />
          <div className="flex-1 space-y-1.5">
            <div className={`${bar} h-3 w-40`} />
            <div className={`${bar} h-2.5 w-56`} />
          </div>
          <div className={`${bar} hidden h-3 w-24 sm:block`} />
          <div className={`${bar} h-5 w-20 rounded-full`} />
        </div>
      ))}
    </>
  );
}

/** Tabs, a toolbar and rows: the pipelines, the blog, the team lists. */
function ListShape() {
  return (
    <>
      <Header />
      <div className="mb-4 flex gap-2">
        {[64, 88, 96, 80].map((width) => (
          <div key={width} className={`${bar} h-8`} style={{ width }} />
        ))}
      </div>
      <div className={panel}>
        <div className="flex gap-2 border-b border-[var(--i-line)] p-3">
          <div className={`${bar} h-8 w-72`} />
          <div className={`${bar} h-8 w-20`} />
        </div>
        <Rows count={7} />
      </div>
    </>
  );
}

/** One entry: the answers on the left, the review rail on the right. */
function EntryShape() {
  return (
    <>
      <div className={`${bar} mb-5 h-3 w-28`} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className={`${panel} flex items-center gap-4 p-5`}>
            <div className="size-12 rounded-full bg-[var(--i-track)]" />
            <div className="flex-1 space-y-2">
              <div className={`${bar} h-5 w-52`} />
              <div className={`${bar} h-3 w-72 max-w-full`} />
            </div>
          </div>
          <div className={`${panel} space-y-5 p-5`}>
            {[80, 60, 90, 70].map((width) => (
              <div key={width} className="space-y-2">
                <div className={`${bar} h-2.5 w-24`} />
                <div className={`${bar} h-3.5`} style={{ width: `${width}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className={`${panel} h-72 space-y-3 p-5`}>
          <div className={`${bar} h-3 w-20`} />
          <div className={`${bar} h-9 w-full`} />
          <div className={`${bar} h-9 w-full`} />
          <div className={`${bar} h-20 w-full`} />
        </div>
      </div>
    </>
  );
}

/** A row of numbers over panels: the Overview, Community, Money, My day. */
function CardsShape() {
  return (
    <>
      <Header />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={`${panel} space-y-2.5 p-4`}>
            <div className={`${bar} h-2.5 w-20`} />
            <div className={`${bar} h-6 w-16`} />
            <div className={`${bar} h-2.5 w-28 max-w-full`} />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[4, 4].map((count, index) => (
          <div key={index} className={panel}>
            <div className="border-b border-[var(--i-line)] p-4">
              <div className={`${bar} h-3.5 w-36`} />
            </div>
            <Rows count={count} />
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Shown while a dashboard page loads its data, in roughly the shape of the
 * page that's coming, so the layout doesn't jump when it arrives.
 */
export default function Loading() {
  const pathname = usePathname();
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      {ENTRY.test(pathname) ? <EntryShape /> : LISTS.test(pathname) ? <ListShape /> : <CardsShape />}
    </div>
  );
}

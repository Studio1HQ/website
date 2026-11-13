/** Shown while a dashboard page loads its data. */
export default function Loading() {
  const bar = "rounded-md bg-[var(--i-track)]";
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      <div className={`${bar} mb-2 h-3 w-20`} />
      <div className={`${bar} mb-2.5 h-6 w-64`} />
      <div className={`${bar} mb-7 h-3.5 w-80 max-w-full`} />
      <div className="mb-4 flex gap-2">
        {[64, 88, 96, 80].map((width) => (
          <div key={width} className={`${bar} h-8`} style={{ width }} />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)]">
        <div className="flex gap-2 border-b border-[var(--i-line)] p-3">
          <div className={`${bar} h-8 w-72`} />
          <div className={`${bar} h-8 w-20`} />
        </div>
        {Array.from({ length: 7 }, (_, index) => (
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
      </div>
    </div>
  );
}

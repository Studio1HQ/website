"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ChatCircleText,
  Check,
  Code,
  Compass,
  Crosshair,
  FileText,
  FilmSlate,
  Flag,
  Gauge,
  GitBranch,
  GithubLogo,
  ListBullets,
  ListChecks,
  MagnifyingGlass,
  Megaphone,
  PaperPlaneTilt,
  PencilSimple,
  PencilSimpleLine,
  PuzzlePiece,
  RocketLaunch,
  Sparkle,
  Television,
  TerminalWindow,
  TrendUp,
  UsersThree,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { Cursor, SelectionFrame } from "@/components/paper/paper-hero";
import { INK, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * The engagement drawn as a pipeline run. Every step is a job and its points
 * are that job's log. On wide screens the run is pinned and scrolling
 * executes it: the selection frame walks the job graph, log lines tick off
 * in a terminal and the run ends stamped "Shipped". Narrower screens get the
 * same run as a vertical list, each job running as it scrolls into view.
 */

export type StoryStep = {
  title: string;
  description: string;
  points?: string[];
};

type Status = "queued" | "running" | "done";

const pad2 = (value: number) => String(value).padStart(2, "0");

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const tasksIn = (step: StoryStep) => step.points?.length ?? 0;

/* Thin icon per job, picked from the step's own title. */
const STEP_ICONS: [RegExp, Icon][] = [
  [/first run/i, TerminalWindow],
  [/positioning/i, Crosshair],
  [/launch/i, RocketLaunch],
  [/arriving/i, TrendUp],
  [/shorts/i, FilmSlate],
  [/series/i, Television],
  [/demo|repo/i, GithubLogo],
  [/campaign/i, RocketLaunch],
  [/long-form|video/i, VideoCamera],
  [/packaging|publish/i, PaperPlaneTilt],
  [/topic/i, MagnifyingGlass],
  [/outline/i, ListBullets],
  [/draft|review/i, PencilSimpleLine],
  [/editing/i, PencilSimple],
  [/scratch/i, FileText],
  [/completeness/i, ListChecks],
  [/platform|dx/i, Gauge],
  [/feedback/i, ChatCircleText],
  [/implementation/i, Code],
  [/embedded/i, UsersThree],
  [/integration/i, PuzzlePiece],
  [/community|hackathon/i, Flag],
  [/influencer/i, Megaphone],
  [/leadership/i, Compass],
];

function StepGlyph({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const Glyph =
    STEP_ICONS.find(([pattern]) => pattern.test(title))?.[1] ?? Sparkle;
  return <Glyph aria-hidden weight="light" className={className} />;
}

/** Orange arc turning on a faint ring. */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn("animate-spin motion-reduce:animate-none", className)}
    >
      <circle
        cx="10"
        cy="10"
        r="7.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth="2.5"
      />
      <path
        d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5"
        fill="none"
        stroke={PRINT}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A job's state on paper: dashed ring, spinner or a filled ink check. */
function StatusMark({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  if (status === "running") {
    return <Spinner className={cn("size-5 text-[#141414]", className)} />;
  }
  if (status === "done") {
    return (
      <motion.span
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 20 }}
        className={cn(
          "flex size-5 items-center justify-center rounded-full text-white",
          className,
        )}
        style={{ background: INK }}
      >
        <Check weight="bold" className="size-3" />
      </motion.span>
    );
  }
  return (
    <span
      className={cn(
        "block size-5 rounded-full border-[1.5px] border-dashed border-[#141414]/30",
        className,
      )}
    />
  );
}

/** Blinking block caret at the end of the running log line. */
function Caret() {
  return (
    <span
      aria-hidden
      className="ml-1.5 inline-block h-[1.1em] w-[7px] translate-y-[3px] animate-pulse motion-reduce:animate-none"
      style={{ background: PRINT }}
    />
  );
}

/** Progress drawn in block characters, like a CLI. */
function TextBar({ value, cells = 18 }: { value: number; cells?: number }) {
  const filled = Math.round(value * cells);
  return (
    <span aria-hidden className="tracking-[-0.08em]">
      <span style={{ color: PRINT }}>{"█".repeat(filled)}</span>
      <span className="text-white/15">{"░".repeat(cells - filled)}</span>
    </span>
  );
}

/** One task in a job's log. */
function LogLine({
  status,
  delay = 0,
  children,
}: {
  status: Status;
  delay?: number;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      className={cn(
        "flex items-start gap-3 transition-colors duration-300",
        status === "queued" ? "text-white/30" : "text-[#f4efe7]",
      )}
    >
      <span className="mt-[3px] flex size-3.5 shrink-0 items-center justify-center">
        {status === "done" ? (
          <motion.span
            initial={reduceMotion ? false : { scale: 0.3 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
          >
            <Check
              aria-hidden
              weight="bold"
              className="size-3.5"
              style={{ color: PRINT }}
            />
          </motion.span>
        ) : status === "running" ? (
          <Spinner className="size-3.5 text-white" />
        ) : (
          <span className="size-1 rounded-full bg-current" />
        )}
      </span>
      <span>
        {children}
        {status === "running" ? <Caret /> : null}
      </span>
    </motion.li>
  );
}

/** Where the run is: which job, and how many of its tasks have finished. */
function locate(value: number, steps: StoryStep[]) {
  const position = Math.min(
    Math.max(value, 0) * steps.length,
    steps.length - 0.0001,
  );
  const job = Math.floor(position);
  const tasks = tasksIn(steps[job]);
  const done = Math.min(tasks, Math.floor((position - job) * (tasks + 1)));
  return { job, done };
}

function statusOf(index: number, job: number, done: number, tasks: number) {
  if (index < job) return "done";
  if (index > job) return "queued";
  return done >= tasks ? "done" : "running";
}

/* Where the run window pins: just under the navbar. */
const PIN_TOP = 96;
/* Scroll distance each job gets while the window is pinned. */
const VH_PER_JOB = 65;
/* The run plays out between these points of the pinned scroll. */
const RUN_START = 0.04;
const RUN_END = 0.92;

/** Point of the pinned scroll (0 to 1) at which a job starts. */
const jobStartsAt = (index: number, count: number) =>
  RUN_START + ((index + 0.02) / count) * (RUN_END - RUN_START);

/** The line between two jobs: fills when the first passes, then carries. */
function Connector({ filled, flowing }: { filled: boolean; flowing: boolean }) {
  return (
    <span className="relative mx-1.5 h-[2px] w-7 shrink-0 self-center overflow-hidden rounded-full bg-[#141414]/[0.12]">
      <span
        className="absolute inset-0 origin-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background: PRINT,
          transform: `scaleX(${filled ? 1 : 0})`,
        }}
      />
      {flowing ? (
        <span className="absolute inset-y-0 left-0 w-1/3 animate-sweep rounded-full bg-white/90 [animation-duration:1.1s] motion-reduce:hidden" />
      ) : null}
    </span>
  );
}

/**
 * Desktop: a workflow run window pinned while you scroll. Decorative to
 * assistive tech, which reads the list version instead.
 */
function PipelineRun({
  id,
  steps,
  workflow,
}: {
  id: string;
  steps: StoryStep[];
  workflow: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // How far through the pinned stretch we are: 0 as the window pins under
  // the navbar, 1 as the spacer runs out and it scrolls on with the page.
  const pinned = useMotionValue(0);
  const { scrollY } = useScroll();
  const measure = () => {
    const track = trackRef.current;
    const distance = spacerRef.current?.offsetHeight;
    if (!track || !distance) return;
    const travelled = PIN_TOP - track.getBoundingClientRect().top;
    pinned.set(Math.min(1, Math.max(0, travelled / distance)));
  };
  useMotionValueEvent(scrollY, "change", measure);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // measure only reads refs, so registering it once is enough.
  }, []);
  const run = useTransform(pinned, [RUN_START, RUN_END], [0, 1], {
    clamp: true,
  });
  const [at, setAt] = useState({ job: 0, done: 0 });
  useMotionValueEvent(run, "change", (value) => {
    const next = locate(value, steps);
    setAt((current) =>
      current.job === next.job && current.done === next.done ? current : next,
    );
  });

  const { job, done } = at;
  const step = steps[job];
  const statuses = steps.map((item, index) =>
    statusOf(index, job, done, tasksIn(item)),
  );
  const passed = statuses.filter((status) => status === "done").length;
  const finished = passed === steps.length;
  const jobComplete = statuses[job] === "done";
  const next = steps[job + 1];
  const tasks = tasksIn(step);
  const layout = { duration: reduceMotion ? 0 : 0.55, ease: EASE };

  return (
    <div ref={trackRef} className="relative mt-10 hidden lg:block">
      {/* Jump targets for the job graph, one where each job starts */}
      {steps.map((item, index) => (
        <span
          key={item.title}
          id={`${id}-job-${index + 1}`}
          aria-hidden
          className="pointer-events-none absolute left-0 h-px w-px scroll-mt-24"
          style={{
            top: `calc(${jobStartsAt(index, steps.length)} * ${steps.length * VH_PER_JOB}vh)`,
          }}
        />
      ))}

      <div className="sticky z-10" style={{ top: PIN_TOP }}>
        <Container>
          <div
            aria-hidden
            className="overflow-hidden rounded-[10px] bg-white/85 shadow-[inset_0_1px_0_#fff,0_50px_90px_-60px_rgba(60,20,0,0.55)] ring-1 ring-inset ring-[#141414]/10"
          >
            {/* Title bar: workflow file, jobs passed, run status */}
            <div className="relative flex h-12 items-center gap-4 border-b border-[#141414]/[0.08] px-4">
              <span className="flex gap-1.5">
                {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
                  <span
                    key={dot}
                    className="size-2.5 rounded-full opacity-80"
                    style={{ background: dot }}
                  />
                ))}
              </span>
              <span className="flex items-center gap-2 text-[13px]">
                <GitBranch
                  weight="bold"
                  className="size-3.5 text-[#141414]/45"
                />
                <span className="text-[#141414]/45">studio1 / workflows /</span>
                <span className="font-medium">{workflow}</span>
              </span>
              <span className="ml-auto flex items-center gap-3">
                <span className="text-[12.5px] tabular-nums text-[#141414]/50">
                  {passed}/{steps.length} jobs passed
                </span>
                <span
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors duration-300",
                    finished ? "text-white" : "bg-[#f97316]/10 text-[#c2410c]",
                  )}
                  style={finished ? { background: PRINT } : undefined}
                >
                  {finished ? (
                    <Check weight="bold" className="size-3.5" />
                  ) : (
                    <Spinner className="size-3.5" />
                  )}
                  {finished ? "Shipped" : "In progress"}
                </span>
              </span>
              <motion.span
                className="absolute inset-x-0 bottom-[-1px] h-[2px] origin-left"
                style={{ scaleX: run, background: PRINT }}
              />
            </div>

            {/* Job graph on an engraved dot grid */}
            <div className="mx-3 mt-3 flex items-stretch rounded-[6px] bg-[#fbfaf7] px-5 pb-5 pt-10 shadow-[inset_0_3px_10px_rgba(20,20,20,0.08),inset_0_1px_2px_rgba(20,20,20,0.06)] [background-image:radial-gradient(rgba(20,20,20,0.13)_1px,transparent_1px)] [background-size:16px_16px]">
              {steps.map((item, index) => {
                const status = statuses[index];
                const active = index === job;
                return (
                  <Fragment key={item.title}>
                    {index > 0 ? (
                      <Connector
                        filled={statuses[index - 1] === "done"}
                        flowing={status === "running"}
                      />
                    ) : null}
                    <a
                      href={`#${id}-job-${index + 1}`}
                      tabIndex={-1}
                      className={cn(
                        "relative flex min-w-0 flex-1 flex-col rounded-[4px] border px-3 py-2.5 transition-colors duration-300",
                        status === "queued"
                          ? "border-dashed border-[#141414]/25 hover:bg-white/60"
                          : "border-[#141414]/10 bg-white",
                      )}
                    >
                      <span className="flex items-center gap-2 text-[11px] font-medium tabular-nums text-[#141414]/45">
                        <StatusMark status={status} className="shrink-0" />
                        Job {pad2(index + 1)}
                      </span>
                      <span
                        className={cn(
                          "mt-1.5 line-clamp-2 text-[13px] font-medium leading-[1.3] tracking-[-0.01em]",
                          status === "queued" && "text-[#141414]/55",
                        )}
                      >
                        {item.title}
                      </span>
                      {/* The selection frame and Studio1's cursor glide from job to job */}
                      {active ? (
                        <motion.span
                          layoutId={`${id}-selection`}
                          transition={{ layout }}
                          className="pointer-events-none absolute -inset-px z-10"
                        >
                          <SelectionFrame
                            label={finished ? "Shipped" : "Running"}
                            labelPosition="top-left"
                            className="h-full w-full"
                          >
                            <span />
                          </SelectionFrame>
                          <span className="absolute -bottom-6 right-2 flex items-start">
                            <Cursor color={INK} className="size-5" />
                            <span
                              className="-ml-1 mt-3.5 rounded-[3px] px-1.5 py-[3px] text-[10.5px] font-medium leading-none text-white"
                              style={{ background: INK }}
                            >
                              Studio1
                            </span>
                          </span>
                        </motion.span>
                      ) : null}
                    </a>
                  </Fragment>
                );
              })}
            </div>

            {/* The running job: brief on the left, its log on the right */}
            <div className="grid h-[clamp(330px,42svh,380px)] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 p-3">
              <motion.div
                key={job}
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, y: 14, filter: "blur(6px)" }
                }
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.45, ease: EASE }}
                className="flex min-h-0 flex-col p-5 pr-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-[8px] bg-[#f6f1e9] shadow-[inset_0_2px_5px_rgba(20,20,20,0.10),inset_0_1px_1px_rgba(20,20,20,0.08)]">
                    <StepGlyph title={step.title} className="size-6" />
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-[#141414]/50">
                    Job {pad2(job + 1)} of {pad2(steps.length)}
                  </span>
                </div>
                <h3 className="mt-6 text-[clamp(28px,2.5vw,38px)] font-medium leading-[1.1] tracking-[-0.045em]">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-[460px] text-[16px] leading-[1.6] text-[#141414]/60">
                  {step.description}
                </p>
                <div className="mt-auto pt-6">
                  {finished ? (
                    <motion.span
                      initial={
                        reduceMotion
                          ? false
                          : { scale: 1.7, opacity: 0, rotate: -14 }
                      }
                      animate={{ scale: 1, opacity: 1, rotate: -5 }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 17,
                      }}
                      className="inline-flex items-center gap-2 rounded-[4px] border-2 px-3 py-1.5 text-[14px] font-semibold uppercase tracking-[0.14em]"
                      style={{ borderColor: PRINT, color: PRINT }}
                    >
                      <Check weight="bold" className="size-4" />
                      Shipped
                    </motion.span>
                  ) : next ? (
                    <p className="flex items-center gap-2 text-[13.5px]">
                      <span className="text-[#141414]/45">Up next</span>
                      <span className="font-medium">{next.title}</span>
                    </p>
                  ) : (
                    <p className="text-[13.5px] text-[#141414]/45">Final job</p>
                  )}
                </div>
              </motion.div>

              <div className="flex min-h-0 flex-col overflow-hidden rounded-[8px] bg-[#0d0d0d] p-5 font-mono text-[14px] leading-[1.5] shadow-[0_24px_50px_-30px_rgba(20,20,20,0.7)]">
                <div className="flex items-center justify-between text-[11.5px] text-white/40">
                  <span>logs</span>
                  {jobComplete ? (
                    <span style={{ color: PRINT }}>exit 0</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-1.5 animate-pulse rounded-full motion-reduce:animate-none"
                        style={{ background: PRINT }}
                      />
                      live
                    </span>
                  )}
                </div>
                <ol key={job} className="mt-4 flex flex-col gap-3">
                  <li className="text-[#f4efe7]">
                    <span style={{ color: PRINT }}>$</span>{" "}
                    <span className="text-white/55">studio1 run</span>{" "}
                    {slugify(step.title)}
                  </li>
                  {(step.points ?? []).map((point, index) => (
                    <LogLine
                      key={point}
                      delay={0.05 + index * 0.06}
                      status={
                        index < done
                          ? "done"
                          : index === done
                            ? "running"
                            : "queued"
                      }
                    >
                      {point}
                    </LogLine>
                  ))}
                </ol>
                {/* Footer: a text progress bar while it runs, the handoff once it passes */}
                <motion.p
                  key={jobComplete ? "passed" : "running"}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="mt-auto flex items-center gap-3 border-t border-white/10 pt-3 text-[13px] text-white/55"
                >
                  {jobComplete ? (
                    <span>
                      <span style={{ color: PRINT }}>→</span>{" "}
                      {next
                        ? `passed · next: ${slugify(next.title)}`
                        : `all ${steps.length} jobs passed · shipped to developers`}
                    </span>
                  ) : (
                    <>
                      <span>tasks</span>
                      <TextBar value={tasks ? done / tasks : 1} />
                      <span className="tabular-nums">
                        {done}/{tasks}
                      </span>
                    </>
                  )}
                </motion.p>
              </div>
            </div>
          </div>
        </Container>
      </div>
      {/* The scroll the run plays over; the window stays pinned through it */}
      <div
        ref={spacerRef}
        aria-hidden
        style={{ height: `${steps.length * VH_PER_JOB}vh` }}
      />
    </div>
  );
}

/** Phones and tablets: one job, running once it scrolls into view. */
function PipelineJob({
  step,
  position,
  count,
}: {
  step: StoryStep;
  position: number;
  count: number;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reduceMotion = useReducedMotion();
  const started = useInView(ref, { once: true, margin: "0px 0px -30% 0px" });
  const tasks = tasksIn(step);
  const [ticked, setTicked] = useState(0);

  useEffect(() => {
    if (!started || reduceMotion) return;
    let value = 0;
    const timer = setInterval(() => {
      value += 1;
      setTicked(Math.min(tasks, value));
      if (value >= tasks) clearInterval(timer);
    }, 450);
    return () => clearInterval(timer);
  }, [started, reduceMotion, tasks]);

  const done = started ? (reduceMotion ? tasks : ticked) : -1;
  const status: Status =
    done < 0 ? "queued" : done >= tasks ? "done" : "running";

  return (
    <li ref={ref} className="relative pl-11 sm:pl-14">
      <span className="absolute left-0 top-6 flex size-8 items-center justify-center rounded-full bg-[#f4efe7] sm:left-1">
        <StatusMark status={status} />
      </span>
      <div className="rounded-[6px] bg-white/80 p-5 ring-1 ring-inset ring-[#141414]/10 sm:p-6">
        <div className="flex items-center gap-2.5 text-[12.5px] font-medium tabular-nums text-[#141414]/50">
          <StepGlyph title={step.title} className="size-5 text-[#141414]" />
          Job {pad2(position + 1)} of {pad2(count)}
        </div>
        <h3 className="mt-4 text-[22px] font-medium leading-[1.2] tracking-[-0.035em]">
          {step.title}
        </h3>
        <p className="mt-2.5 text-[15px] leading-[1.6] text-[#141414]/60">
          {step.description}
        </p>
        {step.points?.length ? (
          <div className="mt-5 rounded-[6px] bg-[#0d0d0d] p-4 font-mono text-[12.5px] leading-[1.55]">
            <p className="truncate text-white/45">
              <span style={{ color: PRINT }}>$</span> studio1 run{" "}
              {slugify(step.title)}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {step.points.map((point, index) => (
                <LogLine
                  key={point}
                  status={
                    index < done
                      ? "done"
                      : index === done
                        ? "running"
                        : "queued"
                  }
                >
                  {point}
                </LogLine>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function StoryPipeline({
  id,
  steps,
  workflow = "workflow.yml",
}: {
  id: string;
  steps: StoryStep[];
  /** File name shown in the run window's title bar. */
  workflow?: string;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 70%", "end 70%"],
  });

  return (
    <>
      <PipelineRun id={id} steps={steps} workflow={workflow} />

      <Container>
        {/* The full run as a list: shown below lg, read by screen readers above */}
        <ol
          ref={listRef}
          className="relative mx-auto mt-10 flex max-w-[720px] flex-col gap-3 lg:sr-only"
        >
          <span
            aria-hidden
            className="absolute bottom-10 left-[15px] top-10 w-[2px] bg-[#141414]/10 sm:left-[19px]"
          >
            <motion.span
              className="absolute inset-0 origin-top"
              style={{
                scaleY: reduceMotion ? 1 : scrollYProgress,
                background: PRINT,
              }}
            />
          </span>
          {steps.map((step, position) => (
            <PipelineJob
              key={step.title}
              step={step}
              position={position}
              count={steps.length}
            />
          ))}
        </ol>
      </Container>
    </>
  );
}

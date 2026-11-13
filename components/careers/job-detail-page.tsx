"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Copy } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Container, EASE } from "@/components/home/ui";
import { AboutStudio1 } from "@/components/careers/about-studio1";
import { ApplicationForm } from "@/components/careers/application-form";
import {
  IndexBar,
  MUTED,
  OutlineLink,
  PaperSection,
} from "@/components/paper/paper-sections";
import {
  availabilityOf,
  byAvailability,
  RoleRow,
  StatusChip,
  type Availability,
} from "@/components/careers/careers-page";
import type { JobDetail, JobOpening } from "@/lib/careers";
import {
  CAREERS_CONTACT_EMAIL,
  getJobApplicationMailto,
} from "@/lib/careers-mailto";
import { GRAIN, INK, PAPER, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

type JobDetailPageProps = {
  job: JobDetail;
  /** Every other role, for the "more open roles" list. */
  otherJobs: JobOpening[];
  /** Take applications through the on-page form instead of email. */
  applicationsEnabled?: boolean;
  children: ReactNode;
};

function formatPostedDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const UNAVAILABLE_LABEL: Record<Exclude<Availability, "open">, string> = {
  soon: "Applications open soon",
  closed: "This role is closed",
};

/** What every application should carry, matching the prefilled email. */
const WHAT_TO_SEND = [
  "Your resume",
  "Links to past work: repos, demos, blogs, docs or videos",
  "The short doc or plan the role asks for",
  "Why this role fits you",
];

/** The checklist for a role with its own questions: those, between the basics. */
function whatToSend(job: JobDetail) {
  if (!job.questions.length) return WHAT_TO_SEND;
  return [
    "Your resume",
    "Links to past work: repos, demos, blogs, docs or videos",
    ...job.questions.map((question) =>
      question.required ? question.label : `${question.label} (optional)`,
    ),
    "Why this role fits you",
  ];
}

/** Ink pill with the orange arrow dot, as on the careers page. */
function ApplyButton({
  href,
  label,
  availability,
  className,
}: {
  href: string;
  label: string;
  availability: Availability;
  className?: string;
}) {
  if (availability !== "open") {
    return (
      <span
        aria-disabled
        className={cn(
          "inline-flex h-12 cursor-not-allowed items-center justify-center rounded-full px-6 text-[14px] font-medium text-[#141414]/55 ring-1 ring-inset ring-[#141414]/20",
          className,
        )}
      >
        {UNAVAILABLE_LABEL[availability]}
      </span>
    );
  }
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex h-12 items-center justify-between gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5",
        className,
      )}
      style={{ background: INK, color: PAPER }}
    >
      {label}
      <span
        className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
        style={{ background: PRINT }}
      >
        <ArrowUpRight weight="bold" className="size-4" />
      </span>
    </a>
  );
}

/**
 * The role's application ticket, printed on the brand orange and taped to
 * the sheet: its real requisition reference, the subject line, and a
 * perforated stub that carries the apply action.
 */
function ApplicationTicket({
  job,
  availability,
  href,
  label,
}: {
  job: JobDetail;
  availability: Availability;
  href: string;
  label: string;
}) {
  const reduceMotion = useReducedMotion();
  const word = { open: "Apply.", soon: "Soon.", closed: "Closed." }[
    availability
  ];
  return (
    <motion.div
      className="relative mx-auto w-full max-w-[360px] lg:mr-0"
      initial={reduceMotion ? false : { opacity: 0, y: 36, rotate: 7 }}
      animate={{ opacity: 1, y: 0, rotate: 2.5 }}
      transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
    >
      <span
        aria-hidden
        className="absolute -top-4 left-1/2 z-10 h-8 w-28 -translate-x-1/2 -rotate-[3deg] bg-[#f4efe7]/75 shadow-[0_2px_6px_-2px_rgba(20,20,20,0.25)] ring-1 ring-[#141414]/[0.06]"
      />
      <div
        className="relative isolate text-white shadow-[0_40px_80px_-40px_rgba(20,20,20,0.45)]"
        style={{ background: PRINT }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14] mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
        <div className="px-6 pb-6 pt-8">
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
            <span>Studio1 / Careers</span>
            <span>{job.department}</span>
          </div>
          <p className="mt-6 text-[64px] font-medium leading-[0.9] tracking-[-0.06em]">
            {word}
          </p>
          <dl className="mt-6 space-y-2 text-[12px]">
            {/* The email subject only matters when applying by email */}
            {href.startsWith("mailto:") ? (
              <div className="flex gap-3">
                <dt className="w-14 shrink-0 text-white/65">Subject</dt>
                <dd className="font-medium">Application: {job.applySubject}</dd>
              </div>
            ) : null}
            <div className="flex gap-3">
              <dt className="w-14 shrink-0 text-white/65">Ref.</dt>
              <dd className="break-all font-medium tabular-nums">
                {job.requisitionId}
              </dd>
            </div>
          </dl>
        </div>

        {/* Perforation, with a notch punched out of each edge */}
        <div className="relative border-t-[1.5px] border-dashed border-white/60">
          {["-left-3", "-right-3"].map((side) => (
            <span
              key={side}
              aria-hidden
              className={cn("absolute -top-3 size-6 rounded-full", side)}
              style={{ background: "#e9e3da" }}
            />
          ))}
        </div>

        <div className="px-6 py-5">
          {availability === "open" ? (
            <a
              href={href}
              className="group flex h-12 items-center justify-between rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[15px] font-medium text-[#141414] transition-transform duration-300 hover:-translate-y-0.5"
            >
              {label}
              <span
                className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
                style={{ background: INK }}
              >
                <ArrowUpRight weight="bold" className="size-4" />
              </span>
            </a>
          ) : (
            <p className="text-[14px] font-medium text-white/85">
              {UNAVAILABLE_LABEL[availability]}. Keep an eye on this page.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** The exact subject line, with a button that copies it. */
function SubjectLine({ subject }: { subject: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(subject);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the line stays visible to copy by hand.
    }
  };
  return (
    <div className="flex items-center gap-2 bg-[#f4efe7] py-1.5 pl-3 pr-1.5 ring-1 ring-inset ring-[#141414]/10">
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {subject}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Subject line copied" : "Copy subject line"}
        className="flex size-8 shrink-0 items-center justify-center bg-white text-[#141414] ring-1 ring-inset ring-[#141414]/10 transition-colors hover:bg-[#141414] hover:text-white"
      >
        {copied ? (
          <Check weight="bold" className="size-3.5 text-[#f97316]" />
        ) : (
          <Copy weight="bold" className="size-3.5" />
        )}
      </button>
    </div>
  );
}

/** MDX brief in paper type: numbered section heads, square orange bullets. */
const BRIEF_PROSE = cn(
  "prose prose-neutral min-w-0 max-w-none [counter-reset:brief]",
  "prose-p:text-[16px] prose-p:leading-[1.75] prose-p:text-[var(--p-muted)]",
  "prose-strong:font-medium prose-strong:text-[var(--p-fg)]",
  "prose-a:text-[var(--p-fg)] prose-a:decoration-[#f97316] prose-a:underline-offset-4",
  "prose-li:text-[16px] prose-li:leading-[1.7] prose-li:text-[var(--p-muted)] prose-li:marker:text-[#f97316] [&_ul]:list-[square]",
  "prose-h2:mb-5 prose-h2:mt-14 prose-h2:border-t prose-h2:border-[var(--p-line)] prose-h2:pt-8 prose-h2:text-[26px] prose-h2:font-medium prose-h2:tracking-[-0.04em] prose-h2:text-[var(--p-fg)] md:prose-h2:text-[30px]",
  "[&_h2]:[counter-increment:brief] [&_h2]:before:mb-3 [&_h2]:before:block [&_h2]:before:text-[13px] [&_h2]:before:tracking-normal [&_h2]:before:text-[#f97316] [&_h2]:before:content-[counter(brief,decimal-leading-zero)]",
  "prose-code:bg-white prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[14px] prose-code:font-medium prose-code:text-[var(--p-fg)] prose-code:ring-1 prose-code:ring-inset prose-code:ring-[#141414]/10 prose-code:before:content-none prose-code:after:content-none",
  "[&>p:first-child]:text-[19px] [&>p:first-child]:leading-[1.6] [&>p:first-child]:text-[var(--p-fg)] [&>p:first-child]:tracking-[-0.015em]",
);

export function JobDetailPage({
  job,
  otherJobs,
  applicationsEnabled = false,
  children,
}: JobDetailPageProps) {
  const availability = availabilityOf(job.status);
  // With the form on, every apply button jumps to it; otherwise email.
  const useForm = applicationsEnabled && availability === "open";
  const applyHref = useForm ? "#apply" : getJobApplicationMailto(job);
  const applyLabel = useForm ? "Apply now" : "Apply by email";
  const subject = `Application: ${job.applySubject}`;
  const moreRoles = otherJobs
    .filter((other) => availabilityOf(other.status) !== "closed")
    .sort(byAvailability)
    .slice(0, 3);

  const facts = [
    ["Team", job.department],
    ["Location", job.location],
    ["Type", job.type],
    ["Seats", String(job.openings).padStart(2, "0")],
    ["Posted", formatPostedDate(job.postedDate)],
  ];

  return (
    <div className="overflow-x-clip" style={PAPER_SCOPE}>
      {/* ----- Title sheet ----- */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(to_bottom,rgba(20,20,20,0.06)_1px,transparent_1px)] [background-size:100%_48px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_70%,transparent)]"
        />
        <Container className="grid items-center gap-x-16 gap-y-16 pb-16 pt-32 md:pb-20 md:pt-40 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="min-w-0">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-3 text-[13px] font-medium"
            >
              <Link
                href="/careers#open-roles"
                className="group inline-flex items-center gap-1.5 transition-colors hover:text-[#f97316]"
              >
                <ArrowLeft
                  weight="bold"
                  className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                />
                Careers
              </Link>
              <span aria-hidden className="text-[#141414]/30">
                /
              </span>
              <span className="truncate text-[#141414]/60">
                {job.department}
              </span>
            </nav>

            <div className="mt-8">
              <StatusChip availability={availability} />
            </div>
            <h1 className="mt-5 text-[42px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[60px] xl:text-[76px]">
              {job.title}
              <span style={{ color: PRINT }}>.</span>
            </h1>
            <p className="mt-7 max-w-[600px] text-[16px] leading-[1.6] text-[#141414]/70 sm:text-[18px]">
              {job.description}
            </p>

            {/* Ruled fact row */}
            <dl className="mt-12 grid grid-cols-2 border-t border-[#141414]/[0.14] sm:grid-cols-3 xl:grid-cols-5">
              {facts.map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-[#141414]/[0.14] py-4 pr-4"
                >
                  <dt className={cn("text-[12px]", MUTED)}>{label}</dt>
                  <dd className="mt-1.5 text-[15px] font-medium leading-snug tracking-[-0.01em]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <ApplicationTicket
            job={job}
            availability={availability}
            href={applyHref}
            label={applyLabel}
          />
        </Container>
      </section>

      {/* ----- 01 — About Studio1, for anyone landing here first ----- */}
      <AboutStudio1 index={1} />

      {/* ----- 02 — The brief ----- */}
      <PaperSection id="brief" tone="paper">
        <Container>
          <IndexBar
            index={2}
            name="Role brief"
            aside={`Ref. ${job.requisitionId}`}
          />
          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-20">
            <article className={BRIEF_PROSE}>{children}</article>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="bg-white/80 ring-1 ring-inset ring-[#141414]/10">
                <div className="flex items-center justify-between border-b border-[#141414]/10 px-5 py-4">
                  <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#141414]/55">
                    How to apply
                  </h2>
                  <StatusChip availability={availability} />
                </div>

                <div className="px-5 py-5">
                  {useForm ? (
                    <p className="text-[12px] text-[#141414]/55">
                      Apply with the form below. Have these ready
                    </p>
                  ) : (
                    <>
                      <p className="text-[12px] text-[#141414]/55">
                        Email {CAREERS_CONTACT_EMAIL} with this subject
                      </p>
                      <div className="mt-2">
                        <SubjectLine subject={subject} />
                      </div>

                      <p className="mt-6 text-[12px] text-[#141414]/55">
                        And include
                      </p>
                    </>
                  )}
                  <ol className="mt-3 space-y-3">
                    {whatToSend(job).map((item, index) => (
                      <li
                        key={item}
                        className="flex gap-3 text-[14px] leading-snug"
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

                <div className="border-t border-[#141414]/10 p-5">
                  <ApplyButton
                    href={applyHref}
                    label={applyLabel}
                    availability={availability}
                    className="w-full"
                  />
                  <p className="mt-3 text-center text-[12px] text-[#141414]/55">
                    We usually reply within 1 week if there is a fit.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </PaperSection>

      {/* ----- 03 — Apply (when the form is on) ----- */}
      {useForm ? (
        <PaperSection id="apply" tone="paper" className="scroll-mt-24">
          <Container>
            <IndexBar
              index={3}
              name="Apply"
              aside={`Ref. ${job.requisitionId}`}
            />
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
              <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
                Apply for {job.title}
                <span style={{ color: PRINT }}>.</span>
              </h2>
              <p
                className={cn(
                  "max-w-[440px] text-[16px] leading-[1.6] lg:pb-2",
                  MUTED,
                )}
              >
                One application per role. It takes about ten minutes if your
                links and {job.questions.length ? "answers" : "plan"} are ready.
              </p>
            </div>
            <div className="mt-10 max-w-[880px] rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10">
              <ApplicationForm
                jobId={job.id}
                jobTitle={job.title}
                questions={job.questions}
              />
            </div>
          </Container>
        </PaperSection>
      ) : null}

      {/* ----- More open roles ----- */}
      {moreRoles.length > 0 ? (
        <PaperSection id="more-roles" tone="paper">
          <Container>
            <IndexBar
              index={useForm ? 4 : 3}
              name="More open roles"
              aside={`${moreRoles.length} of ${
                otherJobs.filter(
                  (other) => availabilityOf(other.status) !== "closed",
                ).length
              } shown`}
            />
            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px]">
                <span className="bg-[var(--p-card)] px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  Not quite the one?
                </span>
              </h2>
              <OutlineLink href="/careers#open-roles">All roles</OutlineLink>
            </div>
            <ul role="list" className="mt-8 grid gap-2">
              {moreRoles.map((other, index) => (
                <li key={other.id} className="min-w-0">
                  <RoleRow job={other} index={index} />
                </li>
              ))}
            </ul>
          </Container>
        </PaperSection>
      ) : null}
    </div>
  );
}

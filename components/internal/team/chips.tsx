import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  LEAVE_TYPES,
  REIMBURSEMENT_STATUSES,
  type AttendanceDay,
  type ReimbursementStatus,
} from "@/lib/internal/team/shared";

/* Status chips for the team pages. No hooks: server or client. */

const TONES = {
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25",
  amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25",
  sky: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25",
  violet: "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/25",
  rose: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25",
  stone: "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-500/10 dark:text-stone-300 dark:ring-stone-500/25",
} as const;

export type Tone = keyof typeof TONES;

export function Chip({ tone = "stone", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The colour a logged day shows in: worked, half day, or the kind of leave. */
export function dayTone(day: Pick<AttendanceDay, "kind" | "leave_type">): Tone {
  if (day.kind === "work") return "emerald";
  if (day.leave_type === "unpaid") return "rose";
  if (day.kind === "half_day") return "amber";
  return day.leave_type === "sick" ? "violet" : "sky";
}

export function dayText(day: Pick<AttendanceDay, "kind" | "leave_type">) {
  if (day.kind === "work") return "Worked";
  if (day.kind === "half_day") return `Half day${day.leave_type === "unpaid" ? " · unpaid" : ""}`;
  return day.leave_type ? LEAVE_TYPES[day.leave_type] : "Leave";
}

export function DayChip({ day }: { day: Pick<AttendanceDay, "kind" | "leave_type"> }) {
  return <Chip tone={dayTone(day)}>{dayText(day)}</Chip>;
}

const CLAIM_TONES: Record<ReimbursementStatus, Tone> = {
  submitted: "amber",
  approved: "sky",
  rejected: "rose",
  paid: "emerald",
};

export function ClaimChip({ status }: { status: ReimbursementStatus }) {
  return <Chip tone={CLAIM_TONES[status]}>{REIMBURSEMENT_STATUSES[status]}</Chip>;
}

/** "S1-012": the employee ID in a small mono-ish chip. */
export function IdChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--i-line)] bg-[var(--i-sunken)] px-1.5 py-px text-[11.5px] font-medium tabular-nums tracking-[0.02em] text-[var(--i-ink-2)]">
      {children}
    </span>
  );
}

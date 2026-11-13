import { WINNERS_MILESTONE, type Hackathon } from "@/data/hackathons";

/**
 * A hackathon's email plan: the emails every participant should get, each
 * with the day it's best sent and who it goes to. Nothing sends on its
 * own: the dashboard shows each step's progress, and someone writes it
 * (from the template) and sends it, or schedules it ahead with Resend.
 * Plain data, safe for client components.
 */

export type PlanStep = {
  /** The hackathon email template it starts from. */
  template: string;
  label: string;
  /** "7 days before it starts" */
  when: string;
  /** Suggested day, YYYY-MM-DD. */
  on: string;
  /** Registration review statuses that get it. */
  audience: readonly string[];
  audienceLabel: string;
};

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const CONFIRMED = ["confirmed"] as const;
const TAKING_PART = ["confirmed", "attended"] as const;

export function emailPlan(hackathon: Pick<Hackathon, "startDate" | "endDate" | "timeline">): PlanStep[] {
  const { startDate, endDate } = hackathon;
  const winners = hackathon.timeline.find((item) => item.label === WINNERS_MILESTONE)?.date;
  return [
    {
      template: "week-before",
      label: "One week to go",
      when: "7 days before it starts",
      on: addDays(startDate, -7),
      audience: CONFIRMED,
      audienceLabel: "Confirmed",
    },
    {
      template: "day-before",
      label: "Starts tomorrow",
      when: "The day before",
      on: addDays(startDate, -1),
      audience: CONFIRMED,
      audienceLabel: "Confirmed",
    },
    {
      template: "kickoff",
      label: "Kickoff",
      when: "The first day",
      on: startDate,
      audience: TAKING_PART,
      audienceLabel: "Confirmed and checked in",
    },
    {
      template: "deadline",
      label: "Submissions close soon",
      when: endDate > startDate ? "The day before submissions close" : "The last day",
      on: endDate > startDate ? addDays(endDate, -1) : endDate,
      audience: TAKING_PART,
      audienceLabel: "Confirmed and checked in",
    },
    {
      template: "results",
      label: "Results and thanks",
      when: winners ? "When the winners are announced" : "A week after it ends",
      on: winners ?? addDays(endDate, 7),
      audience: TAKING_PART,
      audienceLabel: "Confirmed and checked in",
    },
  ];
}

/** The plan's template keys, for reading the email log. */
export const PLAN_TEMPLATES = ["week-before", "day-before", "kickoff", "deadline", "results"] as const;

/** 10:00 in India on a plan day, as an ISO time: when a scheduled step goes. */
export function planSendTime(day: string) {
  return new Date(`${day}T10:00:00+05:30`).toISOString();
}

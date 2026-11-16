"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { displayName, istNow } from "@/lib/internal/team/shared";
import type { Call, Occurrence } from "@/lib/internal/calls/shared";
import type { CallPerson } from "@/lib/internal/calls/data";

/* What every Calls view shares: who's who, the calls by id (only the ones
   this viewer may see), whether they plan, the time now, and opening a
   call's dialog. The provider that renders that dialog is CallsProvider
   in call-parts.tsx. */

export type CallsData = {
  /** The calls this viewer may see: their own, or all of them for the founders and the associate. */
  calls: Readonly<Record<string, Call>>;
  /** Email → name, for everyone these calls name. */
  names: Readonly<Record<string, string>>;
  /** Who a call can name, for the form: planners only (empty for everyone else). */
  people: readonly CallPerson[];
  /** The whole team (the active team list). */
  team: readonly string[];
  me: string;
  canPlan: boolean;
  today: string;
  /** IST now when the page was made. */
  now: { date: string; time: string };
};

/** A series' colour: the block's classes and its dot's. */
export type Tone = { block: string; dot: string };

export type CallsContext = CallsData & {
  /** Opens a call's dialog for one day of it. */
  open: (item: Occurrence) => void;
  /** Each series' own colour, the same wherever it shows. */
  tone: (callId: string) => Tone;
};

export const Context = createContext<CallsContext | null>(null);

export function useCalls() {
  const value = useContext(Context);
  if (!value) throw new Error("useCalls outside CallsProvider");
  return value;
}

/** IST now: the server's at first (so it hydrates the same), then every 30 seconds. */
export function useNow(initial: { date: string; time: string }) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const tick = () => setNow(istNow());
    const timer = setInterval(tick, 30_000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, []);
  return now;
}

/** The best name known for someone, else one made from their address ("harshal@" → "Harshal"). */
export function nameOf(names: Readonly<Record<string, string>>, email: string) {
  return names[email.toLowerCase()] || displayName({ email });
}

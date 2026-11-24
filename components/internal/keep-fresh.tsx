"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Back on the tab after at least this long away: get the latest. */
const AWAY_MS = 2 * 60 * 1000;
/** Left open on screen: get the latest this often. */
const OPEN_MS = 5 * 60 * 1000;

/**
 * Keeps an open dashboard up to date on its own. The bell and the sidebar's
 * counts are part of the layout, which the browser keeps while you move
 * between pages, so a new notification or a task someone just gave you
 * used to show only after a reload or a save of your own. This reads the
 * page again (bell and counts included) when you come back to the tab, and
 * every few minutes while it's on screen.
 *
 * Never under someone's hands: not while a field has the cursor, a dialog
 * or menu is open, or the mouse is down (a card being dragged). What's
 * typed in a form stays as it is either way; this only brings newer data
 * to the page behind it.
 */
export function KeepFresh() {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    let pressed = false;
    const inUse = () => {
      if (pressed) return true;
      const at = document.activeElement;
      if (at instanceof HTMLElement && (at.isContentEditable || at.matches("input, textarea, select"))) return true;
      return document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]') !== null;
    };
    const check = (after: number) => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (Date.now() - last < after || inUse()) return;
      last = Date.now();
      router.refresh();
    };
    const onBack = () => check(AWAY_MS);
    const onDown = () => {
      pressed = true;
    };
    const onUp = () => {
      pressed = false;
    };
    const timer = setInterval(() => check(OPEN_MS), 60_000);
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
  }, [router]);
  return null;
}

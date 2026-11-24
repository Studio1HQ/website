"use client";

import { useSyncExternalStore } from "react";

/**
 * Sidebar sections someone has switched off (Customise sidebar). Kept in this
 * browser only, as "|"-separated section titles; nothing is hidden on the
 * server or on first paint, so a page never renders differently there.
 */
const HIDDEN_KEY = "studio1-sidebar-hidden";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read() {
  try {
    return localStorage.getItem(HIDDEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function write(titles: Set<string>) {
  try {
    localStorage.setItem(HIDDEN_KEY, [...titles].join("|"));
  } catch {
    // private window or blocked storage: the change lasts until reload
  }
  listeners.forEach((listener) => listener());
}

/** The titles of the sections switched off. */
export function useHiddenSections(): string[] {
  return useSyncExternalStore(subscribe, read, () => "").split("|").filter(Boolean);
}

export function setSectionHidden(title: string, hidden: boolean) {
  const titles = new Set(read().split("|").filter(Boolean));
  if (hidden) titles.add(title);
  else titles.delete(title);
  write(titles);
}

export function showAllSections() {
  write(new Set());
}

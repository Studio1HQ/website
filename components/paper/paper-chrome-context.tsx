"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { isPaperPath } from "@/lib/paper";

/**
 * Set by SiteChrome for pages that have no route of their own (the 404) but
 * should still be drawn in the paper design.
 */
export const ForcePaperContext = createContext(false);

/** Whether the navbar, menus and footer should use the paper style here. */
export function useIsPaper() {
  const pathname = usePathname() || "/";
  const forced = useContext(ForcePaperContext);
  return forced || isPaperPath(pathname);
}

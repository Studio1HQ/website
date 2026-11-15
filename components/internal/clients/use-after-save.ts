"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * What a client-work control does once its save has worked. Every action in
 * the Clients area revalidates /internal/clients, and that already sends the
 * page back re-rendered when you're on one of its pages: asking the router
 * to refresh as well would render it a second time and keep the control
 * busy until that finished. Elsewhere (a deliverable card on the Tasks
 * board, say) the page isn't under that path, so it does need the refresh.
 */
export function useAfterSave() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => {
    if (!pathname?.startsWith("/internal/clients")) router.refresh();
  }, [pathname, router]);
}

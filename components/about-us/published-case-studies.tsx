"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The case studies that are live, handed down from the server so client
 * sections only link to pages that exist. Drafts link to the index instead.
 */
const PublishedCaseStudies = createContext<string[] | null>(null);

export function PublishedCaseStudiesProvider({
  slugs,
  children,
}: {
  slugs: string[];
  children: ReactNode;
}) {
  return (
    <PublishedCaseStudies.Provider value={slugs}>
      {children}
    </PublishedCaseStudies.Provider>
  );
}

/** Where a case study card should link: its page if live, else the index. */
export function useCaseStudyHref() {
  const slugs = useContext(PublishedCaseStudies);
  return (slug: string) =>
    !slugs || slugs.includes(slug) ? `/case-studies/${slug}` : "/case-studies";
}

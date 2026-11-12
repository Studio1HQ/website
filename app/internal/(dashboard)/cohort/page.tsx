import type { Metadata } from "next";
import { SECTIONS } from "@/lib/internal/sections";
import { SectionListPage } from "@/components/internal/section-views";

export const metadata: Metadata = { title: SECTIONS["cohort"].title };

export default function CohortPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SectionListPage sectionKey="cohort" searchParams={searchParams} />;
}

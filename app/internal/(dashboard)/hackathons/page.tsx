import type { Metadata } from "next";
import { SECTIONS } from "@/lib/internal/sections";
import { SectionListPage } from "@/components/internal/section-views";

export const metadata: Metadata = { title: SECTIONS["hackathons"].title };

export default function HackathonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SectionListPage sectionKey="hackathons" searchParams={searchParams} />;
}

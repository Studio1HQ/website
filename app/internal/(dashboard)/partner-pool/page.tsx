import type { Metadata } from "next";
import { SECTIONS } from "@/lib/internal/sections";
import { SectionListPage } from "@/components/internal/section-views";

export const metadata: Metadata = { title: SECTIONS["partner-pool"].title };

export default function PartnerPoolPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SectionListPage sectionKey="partner-pool" searchParams={searchParams} />;
}

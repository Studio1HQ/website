import type { Metadata } from "next";
import { SECTIONS } from "@/lib/internal/sections";
import { SectionListPage } from "@/components/internal/section-views";

export const metadata: Metadata = { title: SECTIONS["subscribers"].title };

export default function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SectionListPage sectionKey="subscribers" searchParams={searchParams} />;
}

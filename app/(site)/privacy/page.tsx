import { Metadata } from "next";
import { getLegalPage } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = getLegalPage("privacy");

  return pageMetadata({
    title: page.title,
    description: page.description,
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  return <LegalPage page={getLegalPage("privacy")} />;
}

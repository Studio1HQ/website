import { Metadata } from "next";
import { getLegalPage } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = getLegalPage("terms");

  return pageMetadata({
    title: page.title,
    description: page.description,
    path: "/terms",
  });
}

export default async function TermsPage() {
  return <LegalPage page={getLegalPage("terms")} />;
}

import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "Metadata.pages.careers",
  });

  return pageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/careers",
    locale: "en",
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import Link from "next/link";
import Image from "next/image";
import { NightEyebrow, NightHeader } from "@/components/shared/night-header";
import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { getAllCaseStudies, getFeaturedCaseStudy } from "@/lib/case-studies";
import { CaseStudyCard } from "@/components/case-studies/case-study-card";
import { FeaturedCaseStudy } from "@/components/case-studies/featured-case-study";
import {
  getClientLogo,
  trustedClientMarks,
} from "@/components/case-studies/client-logos";
import { baseUrl } from "@/lib/site";
import { absoluteImageUrl } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, localizedUrl } from "@/lib/i18n";

export default async function CaseStudiesPage() {
  const t = await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "CaseStudiesIndex",
  });
  const studies = getAllCaseStudies(DEFAULT_LOCALE);
  const featuredStudy = getFeaturedCaseStudy(DEFAULT_LOCALE);
  const remainingStudies = studies.filter(
    (s) => s.slug !== featuredStudy?.slug,
  );

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("metadataName"),
    description: t("metadataDescription"),
    url: localizedUrl("/case-studies", DEFAULT_LOCALE, baseUrl),
    isPartOf: {
      "@type": "WebSite",
      name: "Studio1",
      url: baseUrl,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: studies.map((study, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: localizedUrl(
          `/case-studies/${study.slug}`,
          DEFAULT_LOCALE,
          baseUrl,
        ),
        name: study.title,
        image: absoluteImageUrl(study.cover),
      })),
    },
  };

  return (
    <div className="bg-[var(--home-cream)] text-[var(--home-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      {/* Hero */}
      <NightHeader className="pb-28 pt-40 md:pb-36 md:pt-48">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6">
          <NightEyebrow
            icon={<Trophy weight="duotone" className="size-4 text-[#fdba74]" />}
          >
            {t("badge")}
          </NightEyebrow>
          <h1 className="mt-7 text-[40px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[60px] lg:text-[76px]">
            {t("titlePrefix")}{" "}
            <span className="s1-accent-text">{t("titleHighlight")}</span>
          </h1>
          <p className="mt-6 max-w-[620px] text-[16px] leading-[1.6] text-white/60 sm:text-[18px]">
            {t("description")}
          </p>
        </div>
      </NightHeader>

      <section className="relative mx-auto flex w-full max-w-[1300px] flex-col px-4 pb-28 sm:px-6 lg:px-8">
        {/* Featured */}
        {featuredStudy ? (
          <div className="-mt-16 md:-mt-20">
            <FeaturedCaseStudy />
          </div>
        ) : null}

        {/* Grid */}
        <div
          className={`${featuredStudy ? "mt-6" : "-mt-16 md:-mt-20"} grid w-full min-w-0 grid-cols-1 gap-6 md:grid-cols-2`}
        >
          {remainingStudies.map((study) => (
            <CaseStudyCard key={study.slug} study={study} />
          ))}
        </div>

        {/* Closing logo wall */}
        <div className="s1-glass-card mt-20 flex flex-col items-center rounded-[28px] p-5 sm:p-8 md:p-10">
          <p className="mb-8 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--home-ink-soft)]">
            {t("trustedBy")}
          </p>
          <div className="grid w-full grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {studies.map((study) => {
              const logo = getClientLogo(study.slug);
              if (!logo) return null;
              return (
                <Link
                  key={study.slug}
                  href={`/case-studies/${study.slug}`}
                  aria-label={study.client}
                  className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--home-line)] bg-white/60 p-2 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/40 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_6px_16px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/5">
                    <Image src={logo.icon} alt="" className="size-full rounded-md object-contain" />
                  </span>
                  <span className="truncate text-[14px] font-medium text-[var(--home-ink)] transition-colors group-hover:text-primary">{study.client}</span>
                </Link>
              );
            })}
            {trustedClientMarks.map((client) => (
              <a
                key={client.name}
                href={client.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={client.name}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--home-line)] bg-white/60 p-2 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/40 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_6px_16px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/5">
                  <Image src={client.icon} alt="" className="size-full rounded-md object-contain" />
                </span>
                <span className="truncate text-[14px] font-medium text-[var(--home-ink)] transition-colors group-hover:text-primary">{client.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import {
  CELL,
  IndexBar,
  PaperCta,
  PaperSection,
} from "@/components/paper/paper-sections";
import { Container } from "@/components/home/ui";
import { PAPER_SCOPE, PRINT } from "@/lib/paper";
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
    <div style={PAPER_SCOPE}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      {/* Hero */}
      <PaperPageHeader className="pb-4 pt-36 md:pb-8 md:pt-44">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6">
          <PaperEyebrow icon={<Trophy weight="duotone" className="size-4" />}>
            {t("badge")}
          </PaperEyebrow>
          <h1 className="mt-7 text-[40px] font-medium leading-[1.06] tracking-[-0.05em] sm:text-[60px] lg:text-[76px]">
            {t("titlePrefix")}{" "}
            <span style={{ color: PRINT }}>{t("titleHighlight")}</span>
          </h1>
          <p className="mt-6 max-w-[620px] text-[16px] leading-[1.6] text-[#141414]/60 sm:text-[18px]">
            {t("description")}
          </p>
        </div>
      </PaperPageHeader>

      <PaperSection tone="paper" className="!pt-10 md:!pt-14">
        <Container>
          <IndexBar index={1} name={t("badge")} />

          {/* Featured */}
          {featuredStudy ? (
            <div className="mt-8">
              <FeaturedCaseStudy />
            </div>
          ) : null}

          {/* Grid */}
          <div
            className={`${featuredStudy ? "mt-4" : "mt-8"} grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2`}
          >
            {remainingStudies.map((study) => (
              <CaseStudyCard key={study.slug} study={study} />
            ))}
          </div>
        </Container>
      </PaperSection>

      {/* Closing logo wall */}
      <PaperSection tone="paper" className="!pt-0 !pb-24 md:!pb-28">
        <Container>
          <IndexBar index={2} name={t("trustedBy")} />
          <div className="mt-8 grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {studies.map((study) => {
              const logo = getClientLogo(study.slug);
              if (!logo) return null;
              return (
                <Link
                  key={study.slug}
                  href={`/case-studies/${study.slug}`}
                  aria-label={study.client}
                  className={`group flex min-w-0 items-center gap-3 p-2 pr-4 ${CELL}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] bg-[#f8f6f2] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)] p-1.5">
                    <Image
                      src={logo.icon}
                      alt=""
                      className="size-full rounded-md object-contain mix-blend-multiply"
                    />
                  </span>
                  <span className="truncate text-[14px] font-medium text-[#141414] transition-colors group-hover:text-[#c2410c]">
                    {study.client}
                  </span>
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
                className={`group flex min-w-0 items-center gap-3 p-2 pr-4 ${CELL}`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] bg-white p-1.5 ring-1 ring-[#141414]/10">
                  <Image
                    src={client.icon}
                    alt=""
                    className="size-full rounded-md object-contain"
                  />
                </span>
                <span className="truncate text-[14px] font-medium text-[#141414] transition-colors group-hover:text-[#c2410c]">
                  {client.name}
                </span>
              </a>
            ))}
          </div>
        </Container>
      </PaperSection>
      <PaperCta
        title="Want Results Like These?"
        description="Every case study started with one call. Share your goals and we will map what moves adoption for you."
      />
    </div>
  );
}

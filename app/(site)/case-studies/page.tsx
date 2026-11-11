import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import {
  IndexBar,
  PaperCta,
  PaperSection,
} from "@/components/paper/paper-sections";
import { Container } from "@/components/home/ui";
import { PAPER_SCOPE, PRINT } from "@/lib/paper";
import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { getAllCaseStudies } from "@/lib/case-studies";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { baseUrl } from "@/lib/site";
import { absoluteImageUrl } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import {
  CaseChapters,
  type Act,
  type ChapterStudy,
} from "@/components/case-studies/case-chapters";
import { LogoCloud } from "@/components/case-studies/logo-cloud";
import { IntroGraphic } from "@/components/case-studies/intro-graphic";
import {
  CaseMosaic,
  type MosaicLogo,
  type MosaicPhoto,
} from "@/components/case-studies/case-mosaic";
import { DEFAULT_LOCALE, localizedUrl } from "@/lib/i18n";

export default async function CaseStudiesPage() {
  const t = await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "CaseStudiesIndex",
  });
  const studies = getAllCaseStudies(DEFAULT_LOCALE);

  // Every client's mark, for the hero ring.
  const logos: MosaicLogo[] = studies.flatMap((study) => {
    const logo = getClientLogo(study.slug);
    return logo
      ? [{ slug: study.slug, client: study.client, logo: logo.icon }]
      : [];
  });
  // Filled in reading order: top left, top right, bottom left, bottom right.
  // The top row is always on screen, so the clearest photos go first.
  const photos: MosaicPhoto[] = [
    {
      slug: "jozu",
      src: "/case-studies/jozu/devfest-pune-2025-portrait.webp",
      alt: "Jozu at DevFest Pune 2025",
    },
    {
      slug: "openlore",
      src: "/case-studies/openlore/openlore-hackspire-talk.webp",
      alt: "OpenLore talk at Hackspire",
    },
    {
      slug: "openlore",
      src: "/case-studies/openlore/openlore-ship-it-together-talk.webp",
      alt: "OpenLore talk at Ship It Together",
    },
    {
      slug: "jozu",
      src: "/case-studies/jozu/devfest-jozu-booth.webp",
      alt: "Jozu booth at DevFest",
    },
  ];

  // The engagements, grouped into a three-act story by what the work was.
  const toChapter = (study: (typeof studies)[number]): ChapterStudy => ({
    slug: study.slug,
    client: study.client,
    category: study.category,
    industry: study.industry,
    title: study.title,
    summary: study.summary,
    logo: getClientLogo(study.slug)?.icon,
    metric: study.metrics[0]
      ? { value: study.metrics[0].value, label: study.metrics[0].label }
      : null,
    quote: study.quotes[0]
      ? {
          text: study.quotes[0].text,
          author: study.quotes[0].author,
          role: study.quotes[0].role,
          avatar: study.quotes[0].avatar,
        }
      : null,
    outcomes: study.outcomes,
    services: study.services,
  });
  const actOf = (category: string) =>
    /open-source|devrel|community|events|developer experience/i.test(category)
      ? 0
      : /docs|documentation|onboarding/i.test(category)
        ? 2
        : 1;
  const acts: Act[] = [
    {
      numeral: "I",
      title: "Getting found by developers",
      lede: "Launches, communities and open-source growth: putting new products in front of the developers who would use them.",
      studies: [],
    },
    {
      numeral: "II",
      title: "Earning trust at scale",
      lede: "Technical content and search that keeps bringing developers back long after launch day.",
      studies: [],
    },
    {
      numeral: "III",
      title: "Turning interest into adoption",
      lede: "Docs and onboarding that take a curious developer to a working integration.",
      studies: [],
    },
  ];
  studies.forEach((study) =>
    acts[actOf(study.category)].studies.push(toChapter(study)),
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
      <PaperPageHeader className="pb-6 pt-24 md:pb-8 md:pt-28 lg:pb-0 lg:pt-[80px]">
        <div>
          <CaseMosaic logos={logos} photos={photos}>
            <div className="flex flex-col items-center text-center">
              <PaperEyebrow
                icon={<Trophy weight="duotone" className="size-4" />}
              >
                {t("badge")}
              </PaperEyebrow>
              <h1 className="mx-auto mt-5 max-w-[860px] text-balance text-[36px] font-medium leading-[1.06] tracking-[-0.05em] sm:text-[48px] lg:text-[52px]">
                {t("titlePrefix")}{" "}
                <span style={{ color: PRINT }}>{t("titleHighlight")}</span>
              </h1>
              <p className="mt-5 max-w-[520px] text-[15px] leading-[1.6] text-[#141414]/60 sm:text-[17px]">
                {t("description")}
              </p>
            </div>
          </CaseMosaic>
        </div>
      </PaperPageHeader>

      {/* The work, told as one story in three acts */}
      <PaperSection tone="paper" className="!pt-16 md:!pt-24">
        <Container>
          <div className="mb-16 grid items-center gap-10 md:mb-24 lg:grid-cols-[minmax(0,780px)_minmax(0,360px)] lg:justify-between">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#141414]/45">
                {studies.length} engagements · one story
              </p>
              <p className="mt-4 text-[26px] font-medium leading-[1.3] tracking-[-0.035em] md:text-[34px]">
                Every product here had the same problem: something worth using,
                and developers who hadn&apos;t found it yet.{" "}
                <span className="text-[#141414]/40">
                  This is how each one got there.
                </span>
              </p>
            </div>
            <div className="mx-auto w-full max-w-[360px] lg:mx-0">
              <IntroGraphic />
            </div>
          </div>
          <CaseChapters acts={acts} />
        </Container>
      </PaperSection>

      {/* Closing logo wall */}
      <PaperSection tone="paper" className="!pt-0 !pb-24 md:!pb-28">
        <Container>
          <IndexBar index={1} name={t("trustedBy")} />
          <div className="mt-8 md:mt-10">
            <LogoCloud logos={logos} />
          </div>
        </Container>
      </PaperSection>
      <PaperCta
        title="Plan Your Developer Growth With Us"
        description="Every case study started with one call. Share your goals and we will map what moves adoption for you."
      />
    </div>
  );
}

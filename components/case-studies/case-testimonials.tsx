import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NumericText } from "@/components/ui/num";
import type { CaseStudyMeta } from "@/lib/case-studies";

type Quote = CaseStudyMeta["quotes"][number];

const GLASS =
  "rounded-[6px] bg-[#fbf9f5] shadow-[0_30px_60px_-46px_rgba(20,20,20,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/80";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The person, as a face: their photo, or their initials on ink. */
function Portrait({ quote, size }: { quote: Quote; size: string }) {
  return quote.avatar ? (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-[6px] ${size}`}
    >
      <Image
        src={quote.avatar}
        alt={quote.author}
        fill
        sizes="160px"
        className="object-cover"
      />
    </span>
  ) : (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[6px] bg-[#141414] font-medium text-white ${size}`}
    >
      {initials(quote.author)}
    </span>
  );
}

/**
 * "In their words": the client's own voice, given room. The lead quote sits
 * beside the person who said it; any others follow as smaller notes.
 */
export function CaseTestimonials({
  study,
  logo,
}: {
  study: CaseStudyMeta;
  logo?: StaticImageData;
}) {
  const [lead, ...rest] = study.quotes;
  if (!lead) return null;

  return (
    <section aria-label={`What ${study.client} said`} className="mt-16">
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#c2410c]">
        In their words
      </p>

      <figure
        className={`mt-4 grid gap-6 p-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-10 md:p-10 ${GLASS}`}
      >
        {/* Who said it */}
        <figcaption className="flex items-center gap-4 md:flex-col md:items-start">
          <Portrait
            quote={lead}
            size="size-20 text-[22px] md:size-[160px] md:text-[40px]"
          />
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-tight text-[#141414]">
              {lead.author}
            </p>
            {lead.role ? (
              <p className="mt-1 text-[13px] leading-snug text-[#141414]/55">
                {lead.role}
              </p>
            ) : null}
            {logo ? (
              <span className="mt-3 inline-flex items-center gap-2 rounded-[6px] bg-white p-1 pr-2.5 text-[12px] font-medium text-[#141414]/70 ring-1 ring-inset ring-[#141414]/[0.06]">
                <span className="relative size-5 overflow-hidden rounded-[4px]">
                  <Image
                    src={logo}
                    alt=""
                    fill
                    sizes="20px"
                    className="object-cover"
                  />
                </span>
                {study.client}
              </span>
            ) : null}
          </div>
        </figcaption>

        {/* What they said */}
        <div className="flex flex-col">
          <span
            aria-hidden
            className="font-accent text-[72px] leading-[0.6] text-[#f97316] md:text-[96px]"
          >
            &ldquo;
          </span>
          <blockquote className="mt-2 text-[20px] font-medium leading-[1.5] tracking-[-0.02em] text-[#141414] md:text-[24px]">
            <NumericText>{lead.text}</NumericText>
          </blockquote>
          {lead.source ? (
            <Link
              href={lead.source}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[#141414]/55 transition-colors hover:text-[#c2410c]"
            >
              View the original
              <ArrowUpRight
                weight="bold"
                className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          ) : null}
        </div>
      </figure>

      {/* More voices */}
      {rest.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {rest.map((quote) => (
            <figure key={quote.text} className={`flex flex-col p-5 ${GLASS}`}>
              <blockquote className="text-[15.5px] leading-[1.6] text-[#141414]/80">
                &ldquo;<NumericText>{quote.text}</NumericText>&rdquo;
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-4">
                <Portrait quote={quote} size="size-9 text-[12px]" />
                <span className="min-w-0 text-[13px] leading-snug">
                  <span className="block font-semibold text-[#141414]">
                    {quote.author}
                  </span>
                  {quote.role ? (
                    <span className="block truncate text-[#141414]/55">
                      {quote.role}
                    </span>
                  ) : null}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}

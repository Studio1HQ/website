import { Container } from "@/components/home/ui";
import { PRINT } from "@/components/paper/paper-hero";
import { IndexBar, MUTED, OutlineLink, PaperSection } from "@/components/paper/paper-sections";
import { cn } from "@/lib/utils";

/**
 * Studio1 in a few lines, for people who land on a job page first: what we
 * do, who for, the numbers, and why the work is worth doing. The careers
 * page's "Why Studio1" section uses the same principles and work types, so
 * they're written once, here.
 */

export const STUDIO1_PRINCIPLES = [
  {
    title: "Real work from week one",
    description:
      "Demos, tutorials, docs, videos and launches for Studio1, Raah, AssetSnip and client products across AI, devtools and open source.",
  },
  {
    title: "Proof over pedigree",
    description:
      "We hire on what you have built, written or shipped. Repos, live demos, blogs and videos count for more than titles.",
  },
  {
    title: "Learn new tools fast",
    description:
      "New frameworks, SDKs, APIs and agent tools land every week. You learn them quickly enough to explain them accurately.",
  },
  {
    title: "Small team, real ownership",
    description:
      "A remote-first team based in India. You own your work early and work directly with the people making the calls.",
  },
];

export const STUDIO1_WORK_TYPES = [
  "AI-agent demos",
  "Tutorials",
  "Docs",
  "Videos",
  "Launches",
  "Community",
  "Sample apps",
];

/** The same numbers as the home page. */
const NUMBERS = [
  ["35+", "Devtool and AI teams worked with"],
  ["3M+", "Content views"],
  ["40+", "Developer events"],
] as const;

/** Clients already named on the site. */
const CLIENTS = ["Nebius", "CodeRabbit", "CopilotKit", "LiteLLM", "Permit.io", "Velt"];

export function AboutStudio1({ index }: { index: number }) {
  return (
    <PaperSection id="about-studio1" tone="paper" className="pt-4 md:pt-6">
      <Container>
        <IndexBar index={index} name="About Studio1" aside="Remote-first · India" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
          <div className="min-w-0">
            <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px]">
              What is Studio1<span style={{ color: PRINT }}>?</span>
            </h2>
            <p className="mt-5 max-w-[620px] text-[16px] leading-[1.65] text-[#141414]/80 sm:text-[17px]">
              Studio1 does DevRel and developer marketing for devtool, AI and open-source teams. We build demos and sample
              apps, write tutorials and docs, make videos, run launches and grow developer communities, so more developers
              find a product and actually use it.
            </p>
            <p className={cn("mt-4 max-w-[620px] text-[15px] leading-[1.65]", MUTED)}>
              Teams we have worked with include {CLIENTS.slice(0, -1).join(", ")} and {CLIENTS.at(-1)}. Alongside client
              work, we also work on our own products, Raah and AssetSnip.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <OutlineLink href="/case-studies">Case studies</OutlineLink>
              <OutlineLink href="/about-us">About us</OutlineLink>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 self-start lg:grid-cols-1">
            {NUMBERS.map(([value, label]) => (
              <div
                key={label}
                className="rounded-[6px] bg-white/80 px-4 py-4 ring-1 ring-inset ring-[#141414]/10 lg:flex lg:items-baseline lg:gap-4 lg:px-5"
              >
                <dt className="sr-only">{label}</dt>
                <dd className="text-[28px] font-medium leading-none tracking-[-0.04em] sm:text-[34px]">{value}</dd>
                <dd className={cn("mt-2 text-[12.5px] leading-snug lg:mt-0 lg:text-[14px]", MUTED)}>{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <h3 className="mt-12 text-[11px] font-medium uppercase tracking-[0.14em] text-[#141414]/55">Why work here</h3>
        <ul role="list" className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {STUDIO1_PRINCIPLES.map((principle) => (
            <li key={principle.title} className="rounded-[6px] bg-white/80 p-5 ring-1 ring-inset ring-[#141414]/10">
              <p className="text-[16px] font-medium leading-snug tracking-[-0.02em]">{principle.title}</p>
              <p className={cn("mt-2 text-[14px] leading-[1.55]", MUTED)}>{principle.description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </PaperSection>
  );
}

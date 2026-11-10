import IvanImg from "@/public/assets/people/Ivan.webp";
import GabrielImg from "@/public/assets/people/Gabriel.webp";
import JuliaImg from "@/public/assets/people/Julia.webp";
import DavidImg from "@/public/assets/people/David.webp";
import ColeImg from "@/public/assets/people/Cole.webp";
import FerranImg from "@/public/assets/people/Ferran.webp";
import AgitaImg from "@/public/assets/people/Agita.webp";
import SauravImg from "@/public/assets/people/Saurav.webp";
import NathanImg from "@/public/assets/people/Nathan.webp";
import MarketaImg from "@/public/assets/people/Marketa.webp";
import JesseImg from "@/public/assets/people/Jesse.webp";
import PaulImg from "@/public/assets/people/Paul.webp";
import DylanImg from "@/public/assets/people/Dylan.webp";
import SakshiImg from "@/public/assets/people/sakshi-sen.webp";
import TanmayImg from "@/public/assets/people/Tanmay.webp";
import NovitaAiMarkGreen from "@/public/assets/logos/novita-ai-mark-green.webp";
import {
  ChartBar,
  ChatCenteredDots,
  CubeFocus,
  Handshake,
  Headset,
  Lightning,
  Nut,
} from "@phosphor-icons/react/dist/ssr";
import type { Feature, Testimonial } from "@/types";

export const homeFeatures: Feature[] = [
  {
    title: "Quality",
    description:
      "Tutorials, API docs, and onboarding content written by engineers, from a lean team that covers docs, content, and DevRel without a full in-house hire.",
    icon: CubeFocus,
  },
  {
    title: "Experience",
    description:
      "From seed-stage startups to global developer platforms, we've supported developer adoption for 35+ companies.",
    icon: Lightning,
  },
  {
    title: "Expertise",
    description:
      "AI, ML, DevOps, Python, cloud, web, and API integrations. Our team brings deep technical expertise for tutorials, docs, and DevRel programs.",
    icon: Nut,
  },
  {
    title: "Support",
    description:
      "We work as an embedded team with fast iterations and minimal oversight.",
    icon: Headset,
  },
  {
    title: "Results",
    description:
      "3M+ content views, 40+ developer events, and a Product Hunt Product of the Day launch.",
    icon: ChartBar,
  },
  {
    title: "Collaboration",
    description:
      "30+ successful partnerships with fast-moving teams. Trusted by industry leaders like Permit.io, Bright Data, and Nebius.",
    icon: Handshake,
  },
  {
    title: "Testimonials",
    description:
      "Trusted by founders, CMOs, and DevRel teams at companies like Jozu, Nebius, and Velt to drive developer impact.",
    icon: ChatCenteredDots,
  },
];

export const homeTestimonials: Testimonial[] = [
  {
    name: "Jesse Williams",
    role: "Co-Founder & COO, Jozu",
    avatar: JesseImg.src,
    content: `We've used Studio1 to lead our open source and closed source community building and developer awareness work for just over a year. Their contributions and work has helped us drive adoption and awareness with our audience. Their team has deep experience in our space, interfacing with our team perfectly, and going above to help us grow.`,
    highlights: [],
  },
  {
    name: "Dylan Bristot",
    role: "Lead AI Product Marketing Manager, Nebius AI",
    avatar: DylanImg.src,
    content: `Studio1 has been an exceptional partner: fast-moving, creative, and highly aligned with our goals. They brought energy and expertise to every launch, turning rough ideas into polished, developer-facing content and demos. Their ability to deliver technical storytelling, forge partnerships, and drive traction across GitHub, YouTube, and Product Hunt made a real impact. They're more than just contractors, they're an extension of our team.`,
    highlights: [
      "Studio1",
      "exceptional partner",
      "technical storytelling",
      "extension of our team",
    ],
  },
  {
    name: "Paul Anthony Williams",
    role: "Founder, Ittybit",
    avatar: PaulImg.src,
    content: `Studio1 team helped us with technical documentation, internal cookbooks and integration guides. They were easy to work with, got the core value of our product quickly, and iterated well whenever we had feedback. Most importantly they're great guys :)`,
    highlights: [
      "Studio1",
      "technical documentation",
      "internal cookbooks",
      "integration guides",
      "core value",
      "iterated well",
    ],
  },
  {
    name: "Sakshi Sen",
    role: "Growth & GTM, Entelligence.AI",
    avatar: SakshiImg.src,
    content: `Studio1 helped us create engaging developer content for Entelligence. They handled everything from blog planning, writing, and distribution to social media content. A few Reddit posts even went viral, bringing in solid traffic.

They're proactive, easy to work with, and really understand how to create developer-focused content that fits the product.`,
    highlights: [
      "Studio1",
      "developer content",
      "blog planning",
      "writing",
      "distribution",
      "social media content",
      "developer-focused content",
    ],
  },
  {
    name: "Tanmay Sinha",
    role: "VP Product, Readyset.io",
    avatar: TanmayImg.src,
    content: `We worked with Studio1HQ team for technical content creation and were really happy with the results. Amitesh and team were extremely easy to work with and captured the core values of our product in the write up. Strongly recommended for anyone looking to grow their digital footprint with quality content.`,
    highlights: [
      "Studio1HQ",
      "technical content",
      "Amitesh",
      "core values",
      "quality content",
    ],
  },
  {
    name: "Nathan Telbert",
    role: "DevRel, CopilotKit",
    avatar: NathanImg.src,
    content: `Working with Studio1 has been an excellent experience for us. The team delivered high-quality blogs focused on exciting projects that perfectly matched our content needs.

Their ability to create engaging content for developers has been a valuable addition to our educational content efforts.

We're excited to continue collaborating on future projects!`,
    highlights: [
      "Studio1",
      "high-quality blogs",
      "engaging",
      "educational content",
      "continue",
      "collaborating",
      "future",
      "projects",
    ],
  },
  {
    name: "Saurav Jain",
    role: "DevRel, Crawlee",
    avatar: SauravImg.src,
    content: `Arindam and Studio1 team work really great with technical posts, they are super quick and write deeply technical articles that reaches to the right developer audiences through their absolute fantastic distribution system.

Highly recommended. 💯`,
    highlights: [
      "Arindam",
      "Studio1",
      "technical",
      "posts",
      "super",
      "quick",
      "deeply",
      "technical",
      "articles",
      "fantastic",
      "distribution",
      "system",
      "Highly",
      "recommended",
    ],
  },
  {
    name: "Ivan Cordoba",
    role: "CEO & Founder, Opire",
    avatar: IvanImg.src,
    content: `Studio1 turned our ideas into clear and engaging content, helping us connect with our community and strengthen our identity.

A key collaboration for Opire's growth.`,
    highlights: ["Studio1", "Opire's growth"],
  },
  {
    name: "Gabriel L. Manor",
    role: "Director of DevRel, Permit.io",
    avatar: GabrielImg.src,
    content: `We've been working with Arindam on multiple content pieces for the last couple of months, and his work is astonishing.

We also love his network of writers, where he can scale the workload when needed.

So far, 10/10 experience!`,
    highlights: [
      "Arindam",
      "content pieces",
      "astonishing",
      "network of writers",
      "scale the workload",
      "10/10 experience",
    ],
  },
  {
    name: "Agita Jaunzeme",
    role: "Community Manager, VDK (VMware)",
    avatar: AgitaImg.src,
    content: `Very fast, good-quality work, results! Nothing to add; I totally recommend working with Amitesh!`,
    highlights: ["Amitesh", "good-quality"],
  },
  {
    name: "Marketa Cizmar",
    role: "COO, Tolgee",
    avatar: MarketaImg.src,
    content: `Arindam wrote a technical article for us, and it was a pleasure working with him. He was friendly, responsive, and always quick to reply to any questions or feedback.

The whole process was smooth!`,
    highlights: [
      "Arindam",
      "technical article",
      "friendly",
      "responsive",
      "quick",
      "reply",
      "questions",
      "feedback",
      "smooth",
    ],
  },
  {
    name: "Julia Machado",
    role: "Founder & CEO, WebCrumbs",
    avatar: JuliaImg.src,
    content: `Arindam gave us a masterclass on how to launch on Product Hunt and I dare to say if it wasn't for that we wouldn't have achieved 3rd in our first launch ever and with almost zero preparation.

He wrote great technical texts that reached an impressive audience.

We'll definitely work with him again!`,
    highlights: [
      "Product Hunt",
      "technical texts",
      "impressive audience",
      "work with him again",
    ],
  },
  {
    name: "David Mython",
    role: "CEO, Arcjet",
    avatar: DavidImg.src,
    content: `We worked with Arindam on a writeup of the Arcjet beta release.

The goal was to introduce the SDK to developers and show off how you can use Arcjet to protect an interesting application.

Arindam was responsive to feedback and helped us achieve those goals`,
    highlights: [
      "Arindam",
      "Arcjet beta release",
      "SDK",
      "developers and show off",
      "protect an interesting application",
    ],
  },
  {
    name: "Cole Stark",
    role: "CMO, Pieces.app",
    avatar: ColeImg.src,
    content: `Arindam has been an excellent addition to our DevRel team.

He brought a creative mindset and a hard work ethic to our team which helped us to scale our Discord presence and overall community growth efforts.`,
    highlights: [
      "Arindam",
      "DevRel team",
      "creative mindset",
      "hard work ethic",
      "scale our Discord presence",
      "overall community growth efforts",
    ],
  },
  {
    name: "Ferran Rodríguez",
    role: "Growth Manager, Latitude",
    avatar: FerranImg.src,
    content: `Working with Arindam has been one of the best experiences that I had collaborating with a technical writer.

Execution and delivery was almost perfect, we just needed one small round of adjustments before publishing.

I can't recommend enough to work with Arindam and I'm looking forward to our next collaboration!`,
    highlights: [
      "Arindam",
      "technical writer",
      "briefing process",
      "efficient",
      "topic ideas",
      "approach the content piece",
      "Execution and delivery",
      "perfect",
      "small round of adjustments",
      "publishing",
      "technical content",
      "recommend",
      "collaboration",
    ],
  },
  {
    name: "Yi Wu",
    role: "SEO Specialist, Novita AI",
    avatar: NovitaAiMarkGreen.src,
    content: `Amitesh and his team have excellent expertise. In addition to strong technical skills, they consistently produce insightful, in-depth technical content by truly understanding developers' needs and staying aligned with industry trends. Working with them has been a great experience - they are professional, reliable, and demonstrate a strong sense of ownership throughout the collaboration.`,
    highlights: [
      "Amitesh",
      "excellent expertise",
      "strong technical skills",
      "insightful, in-depth technical content",
      "developers' needs",
      "industry trends",
      "professional",
      "reliable",
      "ownership",
    ],
  },
];

function getHomeTestimonial(name: string) {
  const testimonial = homeTestimonials.find((entry) => entry.name === name);
  if (!testimonial) {
    throw new Error(`Testimonial not found: ${name}`);
  }
  return testimonial;
}

export const heroFeaturedTestimonials = {
  left: getHomeTestimonial("Ivan Cordoba"),
  right: getHomeTestimonial("Agita Jaunzeme"),
  mobile: getHomeTestimonial("Agita Jaunzeme"),
};

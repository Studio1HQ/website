import {
  CopilotkitFull,
  LiteLLM,
  PermitFull,
  TolgeeFull,
  NebiusFull,
  LatitudeFull,
  WebcrumbsFull,
  CrawleeFull,
  OpireFull,
  EncoreFull,
  Velt,
  ReadySetFull,
  NitricFull,
  Jozu,
  CodeRabbitFull,
  shivayNoBg,
  arindamNoBg,
  amiteshProfileSquare,
  StreamFull,
  SwytchcodeFull,
  StackqlFull,
  EachlabFull,
  EachlabWordmarkLight,
  MotiaFull,
  GraphiteFull,
  TestMuAiLogo,
  MemoriFull,
  MemoriLogoLight,
  EntelligenceFull,
  RagieFull,
  IttybitFull,
  InsForgeFull,
  ByteRover,
  WeaviateFull,
  MaximFull,
  Puck,
  Unsiloed,
  InteractAiLogo,
  Corsair,
  NovitaAiMark,
} from "./image";
import {
  Books,
  Briefcase,
  CheckCircle,
  Files,
  GithubLogo,
  Lightbulb,
  Newspaper,
  Pen,
  RedditLogo,
  RocketLaunch,
  Sparkle,
  SquaresFour,
  Star,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";

export const navItems = [
  {
    title: "Home",
    path: "/",
    children: [
      { title: "Services", path: "/#service-offerings", icon: Briefcase },
      { title: "Proof", path: "/#testimonials", icon: Star },
      { title: "Process", path: "/#how-it-works", icon: Lightbulb },
      { title: "Results", path: "/#results", icon: Files },
    ],
  },
  { title: "About Us", path: "/about-us" },
  {
    title: "Services",
    path: "#",
    children: [
      {
        title: "All Services",
        path: "/services",
        icon: SquaresFour,
      },
      {
        title: "Technical Content Marketing",
        path: "/technical-content-marketing",
        icon: Pen,
      },
      {
        title: "Developer Relations & Growth",
        path: "/developer-relations-growth-campaigns",
        icon: CheckCircle,
      },
      {
        title: "Developer Video Production",
        path: "/developer-video-production",
        icon: YoutubeLogo,
      },
      {
        title: "Documentation & DX Audits",
        path: "/developer-documentation-dx-audit",
        icon: Books,
      },
      {
        title: "GitHub Growth",
        path: "/github-growth-agency",
        icon: GithubLogo,
      },
      {
        title: "Product Launch",
        path: "/product-launch-service",
        icon: RocketLaunch,
      },
      {
        title: "AEO Agency",
        path: "/aeo-agency",
        icon: Sparkle,
      },
      {
        title: "Reddit Marketing",
        path: "/reddit-marketing-agency",
        icon: RedditLogo,
      },
    ],
  },
  { title: "Product", path: "/product" },
  {
    title: "Content",
    path: "#",
    children: [
      {
        title: "Case Studies",
        path: "/case-studies",
        icon: CheckCircle,
        description: "Proof from docs, DevRel, launch, and content work",
      },
      {
        title: "Our Blog",
        path: "/blog",
        icon: Newspaper,
        description: "Articles and insights from the Studio1 team",
      },
    ],
  },
];

export const serviceNavItems = [
  { title: "Overview", path: "#overview" },
  { title: "Services", path: "#work" },
  { title: "Process", path: "#process" },
];

export const trustedbyLogo = [
  {
    name: "InsForge",
    image: InsForgeFull,
    isWhite: false,
    alt: "InsForge",
  },
  {
    name: "ByteRover",
    image: ByteRover,
    isWhite: true,
    showNameBeside: true,
    className:
      "h-11 w-11 sm:h-12 sm:w-12 object-contain shrink-0 dark:brightness-200",
    alt: "ByteRover",
  },
  {
    name: "Nebius",
    image: NebiusFull,
    isWhite: true,
    className:
      "h-5 sm:h-6 md:h-6 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200",
    alt: "Nebius",
  },
  {
    name: "Velt",
    image: Velt,
    isWhite: false,
    showNameBeside: true,
    className: "h-9 w-9 object-contain",
    alt: "Velt",
  },
  {
    name: "Weaviate",
    image: WeaviateFull,
    isWhite: true,
    className:
      "h-7 sm:h-8 md:h-8 w-auto max-w-[150px] object-contain",
    alt: "Weaviate",
  },
  {
    name: "Maxim AI",
    image: MaximFull,
    isWhite: false,
    className:
      "h-7 sm:h-8 md:h-8 w-auto max-w-[140px] sm:max-w-[160px] object-contain",
    alt: "Maxim AI",
  },
  {
    name: "Puck",
    image: Puck,
    isWhite: false,
    showNameBeside: true,
    className: "h-11 w-11 sm:h-12 sm:w-12 object-contain shrink-0",
    noFilter: true,
    alt: "Puck",
  },
  {
    name: "Unsiloed",
    image: Unsiloed,
    isWhite: true,
    showNameBeside: true,
    className: "h-11 w-11 sm:h-12 sm:w-12 object-contain shrink-0",
    alt: "Unsiloed",
  },
  {
    name: "Interact AI",
    image: InteractAiLogo,
    isWhite: false,
    className:
      "h-7 sm:h-8 md:h-8 w-auto max-w-[150px] object-contain",
    alt: "Interact AI",
  },
  {
    name: "Corsair",
    image: Corsair,
    isWhite: false,
    showNameBeside: true,
    className: "h-11 w-11 sm:h-12 sm:w-12 object-contain shrink-0",
    alt: "Corsair",
  },
  {
    name: "Stream",
    image: StreamFull,
    isWhite: true,
    className:
      "h-8 sm:h-9 md:h-10 w-auto max-w-[100px] sm:max-w-[120px] md:max-w-[144px] object-contain dark:brightness-200",
    alt: "Stream",
  },
  {
    name: "Permit",
    image: PermitFull,
    isWhite: true,
    className:
      "h-10 sm:h-12 md:h-16 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain dark:brightness-200",
    alt: "Permit",
  },
  {
    name: "TestMu AI",
    image: TestMuAiLogo,
    isWhite: false,
    className:
      "h-10 sm:h-12 md:h-16 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain dark:brightness-200",
    alt: "TestMu AI",
  },
  {
    name: "Memori",
    image: MemoriLogoLight,
    isWhite: true,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain",
    alt: "Memori",
  },
  {
    name: "Motia",
    image: MotiaFull,
    isWhite: true,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200 dark:contrast-125 scale-90",
    alt: "Motia",
  },
  {
    name: "Graphite",
    image: GraphiteFull,
    isWhite: true,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200 dark:contrast-125 scale-90",
    alt: "Graphite",
  },
  {
    name: "Eachlabs",
    image: EachlabWordmarkLight,
    isWhite: false,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[80px] sm:max-w-[120px] md:max-w-[140px] object-contain dark:brightness-200 dark:contrast-125 scale-90",
    alt: "Eachlabs",
  },
  {
    name: "Entelligence",
    image: EntelligenceFull,
    isWhite: true,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200 dark:contrast-125 scale-90",
    alt: "Entelligence",
  },
  {
    name: "Latitude",
    image: LatitudeFull,
    isWhite: true,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain dark:brightness-200",
    alt: "Latitude",
  },
  {
    name: "Ragie",
    image: RagieFull,
    isWhite: true,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200 dark:contrast-125 scale-90",
    alt: "Ragie",
  },
  {
    name: "Encore",
    image: EncoreFull,
    isWhite: true,
    className:
      "h-10 sm:h-12 md:h-14 w-auto max-w-[160px] sm:max-w-[200px] md:max-w-[240px] object-contain dark:brightness-200",
    alt: "Encore",
  },
  {
    name: "ReadySet",
    image: ReadySetFull,
    isWhite: false,
    className:
      "h-8 sm:h-9 md:h-10 w-auto max-w-[100px] sm:max-w-[120px] md:max-w-[144px] object-contain dark:brightness-200",
    alt: "ReadySet",
  },
  {
    name: "CopilotKit",
    image: CopilotkitFull,
    isWhite: true,
    className:
      "h-8 sm:h-9 md:h-10 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain dark:brightness-200",
    alt: "CopilotKit",
  },
  {
    name: "LiteLLM",
    image: LiteLLM,
    isWhite: false,
    showNameBeside: true,
    className: "h-9 w-9 object-contain",
    alt: "LiteLLM",
  },
  {
    name: "Crawlee",
    image: CrawleeFull,
    isWhite: true,
    className:
      "h-10 sm:h-12 md:h-14 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200",
    alt: "Crawlee",
  },
  {
    name: "Tolgee",
    image: TolgeeFull,
    isWhite: true,
    className:
      "h-8 sm:h-10 md:h-12 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200",
    alt: "Tolgee",
  },
  {
    name: "Nitric",
    image: NitricFull,
    isWhite: false,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200 dark:contrast-125 scale-90",
    alt: "Nitric",
  },
  {
    name: "WebCrumbs",
    image: WebcrumbsFull,
    isWhite: true,
    className:
      "h-10 sm:h-12 md:h-16 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain dark:brightness-200",
    alt: "WebCrumbs",
  },
  {
    name: "Jozu",
    image: Jozu,
    isWhite: false,
    showNameBeside: true,
    className: "h-9 w-9 object-contain",
    alt: "Jozu",
  },
  {
    name: "CodeRabbit",
    image: CodeRabbitFull,
    isWhite: true,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200 dark:contrast-125 scale-90",
    alt: "CodeRabbit",
  },
  {
    name: "SwytchCode",
    image: SwytchcodeFull,
    isWhite: false,
    className:
      "h-8 sm:h-9 md:h-10 w-auto max-w-[100px] sm:max-w-[120px] md:max-w-[144px] object-contain dark:brightness-200",
    alt: "Swytchcode",
  },
  {
    name: "StackQL",
    image: StackqlFull,
    isWhite: false,
    className:
      "h-8 sm:h-9 md:h-10 w-auto max-w-[100px] sm:max-w-[120px] md:max-w-[144px] object-contain dark:brightness-200",
    alt: "Stackql",
  },
  {
    name: "Opire",
    image: OpireFull,
    isWhite: true,
    className:
      "h-8 sm:h-9 md:h-10 w-auto max-w-[100px] sm:max-w-[120px] md:max-w-[144px] object-contain dark:brightness-200",
    alt: "Opire",
  },
  {
    name: "Ittybit",
    image: IttybitFull,
    isWhite: true,
    className:
      "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain dark:brightness-200 dark:contrast-125 scale-90",
    alt: "Ittybit",
  },
  {
    name: "Novita AI",
    image: NovitaAiMark,
    isWhite: false,
    className: "h-9 sm:h-10 md:h-11 w-auto object-contain",
    alt: "Novita AI",
  },
];

export const teamMembers = [
  {
    name: "Arindam Majumder",
    role: "Co-Founder",
    image: arindamNoBg,
    bio: "",
    social: {
      twitter: "https://dub.sh/arindam-x",
      linkedin: "https://dub.sh/arindam-linkedin",
      website: "https://www.arindammajumder.com",
    },
  },
  {
    name: "Amitesh Anand",
    role: "Co-Founder",
    image: amiteshProfileSquare,
    bio: "",
    social: {
      twitter: "https://mobile.twitter.com/astrodevil_",
      linkedin: "https://www.linkedin.com/in/amitesh1208/",
      website: "https://mranand.com/",
    },
  },
  {
    name: "Shivay Lamba",
    role: "Founding Team",
    image: shivayNoBg,
    bio: "",
    social: {
      twitter: "https://x.com/HowDevelop",
      linkedin: "https://in.linkedin.com/in/shivaylamba",
      website: "https://shivaylamba.me",
    },
  },
];

import IvanImg from "../public/assets/people/Ivan.webp";
import GabrielImg from "../public/assets/people/Gabriel.webp";
import JuliaImg from "../public/assets/people/Julia.webp";
import DavidImg from "../public/assets/people/David.webp";
import ColeImg from "../public/assets/people/Cole.webp";
import FerranImg from "../public/assets/people/Ferran.webp";
import AgitaImg from "../public/assets/people/Agita.webp";
import SauravImg from "../public/assets/people/Saurav.webp";
import NathanImg from "../public/assets/people/Nathan.webp";
import MarketaImg from "../public/assets/people/Marketa.webp";
import JesseImg from "@/public/assets/people/Jesse.webp";
import PaulImg from "@/public/assets/people/Paul.webp";
import DylanImg from "@/public/assets/people/Dylan.webp";
import SakshiImg from "@/public/assets/people/sakshi-sen.webp";
import TanmayImg from "../public/assets/people/Tanmay.webp";
import React from "react";
import Tensorlake from "@/public/case-studies/tensorlake/tensorlake-logo.webp";
import {
  Permit,
  Tolgee,
  Copilotkit,
  Nebius,
  Latitude,
  Webcrumbs,
  Crawlee,
  Opire,
  Eachlab,
  Stream,
  Swytchcode,
  Stackql,
  Encore,
  Velt,
  ReadySet,
  Nitric,
  Ragie,
  Brightdata,
  ForgeCode,
  ScrapeGraph,
  Entelligence,
  Jozu,
  Dualite,
  CodeRabbit,
  PermitFull,
  TolgeeFull,
  CopilotkitFull,
  LiteLLM,
  LiteLLMFull,
  NebiusFull,
  LatitudeFull,
  WebcrumbsFull,
  CrawleeFull,
  OpireFull,
  EncoreFull,
  Graphite,
  Memori,
  MemoriLogoLight,
  ReadySetFull,
  NitricFull,
  CodeRabbitFull,
  Motia,
  Pieces,
  Keploy,
  TryCua,
  Apilayer,
  TestMuAiMark,
  Vmware,
  IttybitFull,
  InsForge,
  InsForgeFull,
  ByteRover,
  ByteRoverFull,
  WeaviateImage,
  EachlabWordmarkDark,
  EachlabWordmarkLight,
  UnsiloedFull,
  InteractAiLogo,
  Corsair,
  SearchApi,
  BrowserAct,
  MaximAi,
  PuckMark,
  Kombai,
  Ittybit,
  KiloCode,
  KiloCodeLight,
  Quadratic,
  Olostep,
  NovitaAiMark,
  NovitaAiMarkGreen,
  NovitaAiLogo,
} from "@/constants/image";
import {
  IconApi,
  IconAugmentedReality,
  IconBolt,
  IconBook,
  IconBrandYoutube,
  IconBulb,
  IconChartBar,
  IconChartBarPopular,
  IconCode,
  IconFileDescription,
  IconHeadset,
  IconHeartHandshake,
  IconRocket,
  IconSearch,
  IconSettingsCheck,
  IconStar,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import {
  ChartBar,
  ChatCentered,
  ChatCenteredDots,
  CubeFocus,
  Handshake,
  Headset,
  Lightning,
  Nut,
  PencilLine,
  Users as UsersTwo,
} from "@phosphor-icons/react/dist/ssr";

export const Data = {
  Companies: [
    {
      id: 1,
      name: "Nebius",
      designation: "AI Cloud",
      image: Nebius,
      href: "https://nebius.com/",
      description: "AI-centric scalable cloud platform.",
    },
    {
      id: 39,
      name: "LiteLLM",
      designation: "AI Gateway",
      image: LiteLLM,
      href: "https://www.litellm.ai/",
      description: "AI Gateway to access 100+ LLMs.",
    },
    {
      id: 40,
      name: "Weaviate",
      designation: "Vector Database",
      image: WeaviateImage,
      href: "https://weaviate.io/",
      description: "AI-native vector database.",
    },
    {
      id: 2,
      name: "Bright Data",
      designation: "Web Scraping",
      image: Brightdata,
      href: "https://brightdata.com/",
      description: "Web data collection platform.",
    },
    {
      id: 7,
      name: "CodeRabbit",
      designation: "AI Code Review",
      image: CodeRabbit,
      href: "https://coderabbit.ai/",
      description: "AI-powered code review platform.",
    },
    {
      id: 49,
      name: "Tensorlake",
      designation: "AI Infrastructure",
      image: Tensorlake,
      href: "https://www.tensorlake.ai/",
      description: "Composable infrastructure for AI agents.",
    },
    {
      id: 11,
      name: "Eachlabs",
      designation: "Video-to-Anime AI",
      image: EachlabWordmarkLight,
      logoDarkImage: EachlabWordmarkDark,
      href: "https://eachlabs.com/",
      description: "AI video-to-anime transformation tool.",
      logoVariant: "wide",
    },
    {
      id: 3,
      name: "Velt",
      designation: "Real-time Collaboration",
      image: Velt,
      href: "https://velt.dev/",
      description: "Real-time web collaboration tools.",
    },
    {
      id: 2,
      name: "VMware",
      designation: "Virtualization",
      image: Vmware,
      href: "https://www.vmware.com/",
      description: "Cloud computing for Enterprises.",
    },
    {
      id: 42,
      name: "Maxim AI",
      designation: "AI Evaluation",
      image: MaximAi,
      href: "https://www.getmaxim.ai/",
      description: "AI evaluation and observability platform.",
    },
    {
      id: 10,
      name: "Memori",
      designation: "AI Memory",
      image: MemoriLogoLight,
      href: "https://memorilabs.ai/",
      description: "The memory fabric for enterprise AI.",
      logoVariant: "wide",
      logoClassName: "invert dark:invert-0",
    },
    {
      id: 50,
      name: "Kombai",
      designation: "AI Design Engineer",
      image: Kombai,
      href: "https://kombai.com/",
      description: "AI agent for frontend design and code.",
    },
    {
      id: 38,
      name: "Ittybit",
      designation: "Media APIs",
      image: Ittybit,
      href: "https://ittybit.com/",
      description: "Media APIs for developers and AI.",
    },
    {
      id: 24,
      name: "ScrapeGraph",
      designation: "Data Visualization",
      image: ScrapeGraph,
      href: "https://scrapegraph.com/",
      description: "Automates web scraping.",
    },
    {
      id: 8,
      name: "Entelligence",
      designation: "AI Code Review",
      image: Entelligence,
      href: "https://entelligence.ai/",
      description: "AI engineering intelligence platform.",
    },
    {
      id: 44,
      name: "Unsiloed",
      designation: "Document AI",
      image: UnsiloedFull,
      href: "https://www.unsiloed.ai/",
      description: "Document parsing APIs for enterprise AI.",
      logoVariant: "wide",
      logoClassName: "invert dark:invert-0 dark:brightness-125",
    },
    {
      id: 45,
      name: "Interact AI",
      designation: "Agentic Website Interface",
      image: InteractAiLogo,
      href: "https://www.interactlabs.ai/",
      description: "Agentic interface for website visitors.",
      logoVariant: "wide",
      logoClassName: "dark:invert",
    },
    {
      id: 15,
      name: "CopilotKit",
      designation: "AI Agents",
      image: Copilotkit,
      href: "https://www.copilotkit.ai/",
      description: "Embed custom AI copilots in apps.",
    },
    {
      id: 47,
      name: "SearchApi",
      designation: "Search API",
      image: SearchApi,
      href: "https://www.searchapi.io/",
      description: "Search engine results API for developers.",
    },
    {
      id: 48,
      name: "BrowserAct",
      designation: "Browser Automation",
      image: BrowserAct,
      href: "https://www.browseract.com/?co-from=Arindam",
      description: "Browser infrastructure for AI agents.",
    },
    {
      id: 4,
      name: "Permit.io",
      designation: "Authorization as a Service",
      image: Permit,
      href: "https://www.permit.io/",
      description: "Full-stack authorization framework.",
    },
    {
      id: 37,
      name: "TestMu AI",
      designation: "Agentic Testing Cloud",
      image: TestMuAiMark,
      href: "https://www.testmuai.com/",
      description: "AI-native testing cloud.",
      logoClassName: "dark:invert",
    },
    {
      id: 5,
      name: "Stream",
      designation: "Chat & Activity APIs",
      image: Stream,
      href: "https://getstream.io/",
      description: "APIs for real-time chat, video.",
    },
    {
      id: 40,
      name: "InsForge",
      designation: "AI-native backend",
      image: InsForge,
      href: "https://insforge.dev/",
      description: "AI-native backend.",
    },
    {
      id: 41,
      name: "ByteRover",
      designation: "Shared memory across agents",
      image: ByteRover,
      href: "https://www.byterover.dev/",
      description: "Shared memory across agents.",
    },
    {
      id: 6,
      name: "Motia",
      designation: "AI Video Generation",
      image: Motia,
      href: "https://www.motia.ai/",
      description: "Unified backend for AI Agents.",
    },
    {
      id: 53,
      name: "Olostep",
      designation: "Web Data Infrastructure",
      image: Olostep,
      href: "https://www.olostep.com/",
      description: "Web search, scraping, and crawling infrastructure for AI.",
    },
    {
      id: 9,
      name: "Graphite",
      designation: "AI Code Review",
      image: Graphite,
      href: "https://graphite.dev/",
      description: "AI developer productivity platform.",
    },
    {
      id: 33,
      name: "TryCua",
      designation: "Containers for Computer-Use AI Agents",
      image: TryCua,
      href: "https://trycua.com/",
      description: "Cloud Containers for Agents",
    },
    {
      id: 43,
      name: "Puck",
      designation: "Visual Editor",
      image: PuckMark,
      href: "https://puckeditor.com/",
      description: "Open-source visual editor for React.",
    },
    {
      id: 12,
      name: "Jozu",
      designation: "AI Security",
      image: Jozu,
      href: "https://jozu.com/",
      description: "Security and Governance for AI.",
    },
    {
      id: 13,
      name: "Nitric",
      designation: "Cloud Framework",
      image: Nitric,
      href: "https://nitric.io/",
      description: "Cloud-native backend framework.",
    },
    {
      id: 14,
      name: "Encore",
      designation: "AI Search Engine",
      image: Encore,
      href: "https://encore.ai/",
      description: "TypeScript backend, AI search tools.",
    },
    {
      id: 14,
      name: "Pieces for Developers",
      designation: "Long term memory for your whole workstream",
      image: Pieces,
      href: "https://pieces.dev/",
      description: "Long term memory.",
    },
    {
      id: 46,
      name: "Corsair",
      designation: "AI Integrations",
      image: Corsair,
      href: "https://corsair.dev/",
      description: "Open-source integration layer for AI agents.",
    },
    {
      id: 16,
      name: "Crawlee",
      designation: "Web Scraping Framework",
      image: Crawlee,
      href: "https://crawlee.dev/",
      description: "Web scraping library.",
    },
    {
      id: 17,
      name: "Tolgee",
      designation: "i18n Tool",
      image: Tolgee,
      href: "https://tolgee.io/",
      description: "Localization platform for web apps.",
    },
    {
      id: 18,
      name: "ReadySet",
      designation: "Database Caching",
      image: ReadySet,
      href: "https://readyset.io/",
      description: "Database caching for faster queries.",
    },
    {
      id: 19,
      name: "WebCrumbs",
      designation: "AI Web Development",
      image: Webcrumbs,
      href: "https://www.webcrumbs.ai/",
      description: "Automates UI Dev workflows.",
    },
    {
      id: 30,
      name: "Keploy",
      designation: "API Testing",
      image: Keploy,
      href: "https://keploy.io/",
      description: "Automated testing for APIs.",
    },
    {
      id: 36,
      name: "Apilayer",
      designation: "Discover, Integrate, and Build APIs",
      image: Apilayer,
      href: "https://apilayer.com/",
      description: "Discover, Integrate, and Build APIs",
    },
    {
      id: 20,
      name: "SwytchCode",
      designation: "Dev Environment Sync",
      image: Swytchcode,
      href: "https://swytchcode.com/",
      description: "AI tool for API integration code.",
    },
    {
      id: 21,
      name: "StackQL",
      designation: "Cloud Resource Query",
      image: Stackql,
      href: "https://stackql.io/",
      description: "Query cloud infrastructure using SQL.",
    },
    {
      id: 22,
      name: "Ragie",
      designation: "RAG as a Service",
      image: Ragie,
      href: "https://newtool.dev/",
      description: "Managed RAG-as-a-Service.",
    },
    {
      id: 23,
      name: "ForgeCode",
      designation: "Code Generation",
      image: ForgeCode,
      href: "https://forgecode.com/",
      description: "AI-powered code generation platform.",
    },
    {
      id: 52,
      name: "Quadratic",
      designation: "AI Spreadsheet",
      image: Quadratic,
      href: "https://www.quadratichq.com/",
      description: "AI-native spreadsheet for data analysis.",
    },
    {
      id: 25,
      name: "Dualite",
      designation: "AI-Powered Design-to-Code",
      image: Dualite,
      href: "https://dualite.com/",
      description: "AI-powered design-to-code tool.",
    },
    {
      id: 26,
      name: "Latitude",
      designation: "LLM Development Platform",
      image: Latitude,
      href: "https://latitude.so/",
      description: "LLM prompt design platform.",
    },
    {
      id: 27,
      name: "Opire",
      designation: "Open Source Platform",
      image: Opire,
      href: "https://opire.dev/",
      description: "Project management platform.",
    },
    {
      id: 51,
      name: "Kilo Code",
      designation: "AI Coding Agent",
      image: KiloCode,
      logoDarkImage: KiloCodeLight,
      href: "https://kilo.ai/",
      description: "Open-source AI coding agent for IDE and cloud.",
    },
    {
      id: 54,
      name: "Novita AI",
      designation: "AI & Agent Cloud",
      image: NovitaAiLogo,
      href: "https://novita.ai/",
      description: "AI model APIs, agent sandboxes, and GPU cloud for developers.",
    },
  ],
  Features: [
    {
      title: "Quality",
      description:
        "Premium tutorials, API docs, and developer onboarding content from a lean team that can support docs, content, and DevRel without a full in-house hire.",
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
        "We operate as an embedded team with fast iterations and minimal oversight. Your success is our priority.",
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
  ],

  Allblogs: [
    {
      title:
        "Building a Hermes Memory Plugin for a Voice-Powered Conference Agent with Weaviate Engram",
      description:
        "A technical deep dive on adding memory to a voice-powered conference agent with Hermes and Weaviate Engram.",
      link: "https://mranand.substack.com/p/building-a-hermes-memory-plugin-for",
      image:
        "https://substackcdn.com/image/fetch/$s_!ezPL!,w_1200,h_675,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F3cff2c98-64da-43a9-854e-bd4e4d8ace43_1735x906.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Understanding the Model Context Protocol: Architecture",
      description:
        "Model Context Protocol (MCP) offers a clean, open standard for connecting language models to real-world systems through a modular, plug-and-play interface. In this article, we explore how MCP works..",
      link: "https://nebius.com/blog/posts/understanding-model-context-protocol-mcp-architecture",
      image:
        "https://assets.nebius.com/assets/962660d2-77e9-4bd2-928e-d0790c1c79c5/share%20%282%29.jpg?cache-buster=2025-05-01T10:16:08.835Z",
      tags: ["SEO"],
      version: 1,
    },
    {
      title: "Building a Kanban Board with Next.js,Vercel AI and Tolgee",
      description:
        "In this article, we will build a real-time Kanban board in Next.js using WebSockets, with database support, AI support through the Vercel AI SDK and localization via Tolgee.",
      link: "https://dev.to/tolgee_i18n/building-a-kanban-board-with-nextjsvercel-ai-and-tolgee-493g",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F8se47yg59oimb4sl06eg.gif",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "How I Built the World's Best NextJS, AI Scheduling App",
      description:
        "By the end of this article, you'll learn how to Integrate an AI copilot into your Next.js application by building a scheduling app with Cal.com and Develop and manage a custom scheduler that enhances user experience across your application.",
      link: "https://dev.to/copilotkit/how-i-built-the-worlds-best-nextjs-ai-scheduling-app-442c",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fu9tqn7shf6y8eppfpn84.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "How to create a LinkedIn job scraper in Python with Crawlee",
      description:
        "In this article, we will build a web application that scrapes LinkedIn for job postings using Crawlee and Streamlit..",
      link: "https://dev.to/crawlee/how-to-create-a-linkedin-job-scraper-in-python-with-crawlee-h9d",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fwsyjca1b8q6g9wapyhnp.jpg",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Develop a Real-Time Collaborative Document Editor with Next.js, Appwrite, Liveblocks and Permit.io",
      description:
        "A step-by-step guide to build a secure, real-time collaborative document editor with Next.js, Appwrite, Liveblocks, and Permit.io using ReBAC for flexible and secure relationship-based access control.",
      link: "https://javascript.plainenglish.io/develop-a-real-time-collaborative-document-editor-with-next-js-appwrite-liveblocks-and-permit-io-699a865a7aeb",
      image:
        "https://miro.medium.com/v2/resize:fit:1200/1*Wan7SBxJfZf2HlOu9AIPLw.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Building an AI-powered quiz application with Next.js and OpenAI",
      description:
        "In this tutorial, you'll learn how to build an AI-powered quiz application that enables users to select a topic, answer questions related to that topic, and receive their score instantly upon completing the quiz.",
      link: "https://dev.to/latitude/building-an-ai-powered-quiz-application-with-nextjs-and-openai-2673",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Ff04c0el5k9h0pee1pcpp.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Manage Permissions in a Langflow Chain for LLM Queries using Permit.io",
      description:
        "A Step-by-Step Guide to Secure and Scalable Permission Management for AI Models with Permit.io",
      link: "https://astrodevil.medium.com/manage-permissions-in-a-langflow-chain-for-llm-queries-using-permit-io-7de8a0fb17b3",
      image:
        "https://miro.medium.com/v2/resize:fit:1200/1*bY1LzPkOXDXI_eRJ_V-y8w.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "I Found a Tool Even Better than v0: You Won't Believe What It Can Do!",
      description:
        "As a front-end developer, you've probably heard all about Vercel v0, the tool that seemed to revolutionize front-end development. But is v0 as great as it sounds? I spent time comparing it with a new tool, Webcrumbs Frontend AI, to see if it really is a game-changer.",
      link: "https://dev.to/arindam_1729/i-found-a-tool-even-better-than-v0-you-wont-believe-what-it-can-do-igf",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F2oezav0lodrjsxzx826g.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Building an AI-powered finance planner with full-stack Next.js and Nebius AI Studio",
      description:
        "In this guide, we'll build an AI-powered financial planner using the Meta Llama 3.1 70B model via Nebius AI Studio and a full-stack Next.js app. This solution works seamlessly whether you're using the Pages Router or the App Router, as much of the customization relies on setting up a custom Next.js server.",
      link: "https://nebius.com/blog/posts/building-ai-powered-finance-planner",
      image:
        "https://assets.nebius.com/assets/5de7251f-577f-42ff-b6ed-7a2f0bbc0a5c/pages-blog-building-ai-powered-finance-planner-sharing1.jpg?cache-buster=2024-12-12T16:16:25.609Z",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Make Prototyping Easier with Webcrumbs",
      description: "Discover the Future of Prototyping with Webcrumbs AI",
      link: "https://astrodevil.medium.com/make-prototyping-easier-with-webcrumbs-3668d8e880d2",
      image:
        "https://miro.medium.com/v2/resize:fit:1200/1*kirTT63OzhfJCcitLgDRqA.png",
      tags: ["SEO"],
      version: 1,
    },
    {
      title: "How to Add RBAC Authorization in Next.js",
      description:
        "A Comprehensive Guide to RBAC Authorization in Next.js using Permit.io",
      link: "https://astrodevil.medium.com/how-to-add-rbac-authorization-in-next-js-1d5e50cbad29",
      image:
        "https://miro.medium.com/v2/resize:fit:1200/1*yWfXQWV_89Dg6MarsUhnvw.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "How to run Meta Llama 3.1 405B with Nebius AI Studio API",
      description:
        "Discover how Nebius AI Studio enables you to integrate the famous Llama 3.1 405B large language model in your applications.",
      link: "https://nebius.com/blog/posts/run-meta-llama-405b-in-ai-studio",
      image:
        "https://assets.nebius.com/assets/5df20f69-81d8-4909-ad56-98532b2f17b8/llama.jpg?cache-buster=2024-10-16T22:24:59.775Z",
      tags: ["How-tos"],
      version: 1,
    },
    {
      title: "Implementing GraphQL Authorization: A Practical Guide",
      description:
        "Learn how to implement scalable authorization in GraphQL. Simplify RBAC and Permissions management with step-by-step instructions.",
      link: "https://www.permit.io/blog/implementing-graphql-authorization",
      image:
        "https://www.permit.io/blog/implementing-graphql-authorization/cover.webp",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "How to Build a Real-Time Dashboard with Encore.ts and React",
      description:
        "In this tutorial, you'll learn how to build a real-time dashboard with Encore.ts and React. We'll show you how to set up a real-time connection between your server and client, and how to display real-time data in your dashboard.",
      link: "https://dev.to/encore/how-to-build-a-real-time-dashboard-with-encorets-and-react-ii9",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fnd1e4rgk07yfo638ses9.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Creating your own AI-powered code generator and reviewer",
      description:
        "In this hands-on tutorial, you'll learn how to create a powerful code generation and review application that you can customize to your exact needs. We'll use Nebius AI Studio and open-source models, making it both cost-effective and extensible.",
      link: "https://nebius.com/blog/posts/building-ai-powered-code-generator",
      image:
        "https://assets.nebius.com/assets/220d2f77-243a-4793-980f-0c8c17052450/pages-blog-building-ai-powered-code-generator-share.jpg?cache-buster=2024-12-12T16:16:26.351Z",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Build Real-Time Presence Features Like Figma and Google Docs in Your App in Minutes",
      description:
        "In this article, we will learn how to build real-time presence features like Figma and Google Docs in your app in minutes using Liveblocks.",
      link: "https://dev.to/astrodevil/build-real-time-presence-features-like-figma-and-google-docs-in-your-app-in-minutes-1lae",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fn4ktzy1anqot0vjselc6.png",

      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Build a Real-Time Bidding System With Next.js and Stream",
      description:
        "Stream's React Chat SDK with the JavaScript client will help us build a bidding app with support for rich messages, image uploads, videos and more.",
      link: "https://thenewstack.io/build-a-real-time-bidding-system-with-next-js-and-stream/",
      image: "https://cdn.thenewstack.io/media/2025/04/9571a32c-bidding123.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Vibe Coding with Cursor AI: How to Build Figma-Style Comments",
      description:
        "In this article, we will learn how to build a Figma-Style Comments with Cursor and Velt.",
      link: "https://dev.to/arindam_1729/vibe-coding-with-cursor-ai-how-to-build-figma-style-comments-556m",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fdrdl04p2uyuo9a6oacr3.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Stop Vibe Coding: Make Your AI SaaS Production-Ready with These 7 Tools",
      description:
        "In this article, we will learn how to make your AI SaaS production-ready with these 7 tools.",
      link: "https://dev.to/arindam_1729/stop-vibe-coding-make-your-ai-saas-production-ready-with-these-7-tools-2pam/",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fot4iwsi1uuu6q42oo8hv.png",
      tags: ["general"],
      version: 1,
    },
    {
      title:
        "How to Build a Ghibli-Style AI Video App Using Pixverse and Eachlabs",
      description:
        "In this article, we will learn how to build a Ghibli-Style AI Video App Using Pixverse and Eachlabs.",
      link: "https://dev.to/astrodevil/how-to-build-a-ghibli-style-ai-video-app-using-pixverse-and-eachlab-fhc",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Faj0rvfneo16q4gydjdiu.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "NestJS vs Encore.ts",
      description:
        "Choosing the Right Framework for Your TypeScript Microservices",
      link: "https://dev.to/encore/nestjs-vs-encorets-choosing-the-right-framework-for-your-typescript-microservices-1g61",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F9bvci4yohqc5r2o65eda.png",
      tags: ["general"],
      version: 1,
    },
    {
      title:
        "Build Google Sheets-Style Collaborative Comments in Your Web App Using TanStack Tables and Velt SDK",
      description:
        "In this article, we will learn how to build a Google Sheets-Style Collaborative Comments in Your Web App Using TanStack Tables and Velt SDK.",
      link: "https://dev.to/astrodevil/build-google-sheets-style-collaborative-comments-in-your-web-app-using-tanstack-tables-and-velt-sdk-53lf",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Ftk2uz8g74hruanoyql4r.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Build a React File Sharing App with Granular Access Controls (ReBAC)",
      description:
        "In this article, we will learn how to build a React File Sharing App with Granular Access Controls (ReBAC).",
      link: "https://dev.to/astrodevil/build-a-react-file-sharing-app-with-granular-access-controls-rebac-ka4",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fkrffdr41eny4j71lt1lt.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Git, diffs, patches - thinking in changes, not just code",
      description:
        "In this article, we will learn how to think in changes, not just code.",
      link: "https://dev.to/coderabbitai/git-diffs-patches-thinking-in-changes-not-just-code-2f0p",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fsfbympswu3io5awemvqs.png",
      tags: ["general"],
      version: 1,
    },
    {
      title:
        "How to Make Your Postgres Database 100x Faster and 50% Cheaper with Readyset Cloud",
      description:
        "In this article, we will learn how to make your Postgres database 100x faster and 50% cheaper with Readyset Cloud.",
      link: "https://dev.to/astrodevil/how-to-make-your-postgres-database-100x-faster-and-50-cheaper-with-readyset-cloud-2n7j",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fuukv9rd9l3i59pvcklo9.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Build Real-Time Presence Features Like Figma and Google Docs in Your App in Minutes",
      description:
        "In this article, we will learn how to build a real-time presence features like Figma and Google Docs in your app in minutes.",
      link: "https://dev.to/astrodevil/build-real-time-presence-features-like-figma-and-google-docs-in-your-app-in-minutes-1lae",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fn4ktzy1anqot0vjselc6.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "I Built a Social Media App in Minutes with Webcrumbs & Lovable!",
      description:
        "In this article, we will learn how to build a social media app in minutes with Webcrumbs and Lovable.",
      link: "https://dev.to/arindam_1729/i-built-a-social-media-app-in-minutes-with-webcrumbs-lovable-4h7e",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fm1trfc0wwowcbe57xm5a.gif",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Authentication and Authorization with Firebase",
      description:
        "A step-by-step guide to building a secure, multi-tenant app using Firebase for authentication and storage, and Permit.io for fine-grained authorization. Learn how to manage permissions, enforce access control, and debug policies with audit logs.",
      link: "https://www.permit.io/blog/authentication-and-authorization-with-firebase",
      image:
        "https://www.permit.io/blog/authentication-and-authorization-with-firebase/cover.webp",
      tags: ["SEO"],
      version: 1,
    },
    {
      title: "Implementing Role Based Access Control (RABC) in React",
      description:
        "In this article, we will learn how to implement Role Based Access Control (RABC) in React.",
      link: "https://www.permit.io/blog/implementing-react-rbac-authorization",
      image:
        "https://www.permit.io/blog/implementing-react-rbac-authorization/cover.webp",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Build an AI Travel Planner with CopilotKit, LangGraph & Google Maps API",
      description:
        "In this article, we will learn how to build an AI Travel Planner with CopilotKit, LangGraph & Google Maps API.",
      link: "https://dev.to/copilotkit/build-an-ai-travel-planner-with-copilotkit-langgraph-google-maps-api-32fm",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fkj9fuzgz2pcdnv7v1chq.gif",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Build an AI-Powered, Open-Source Notion",
      description:
        "In this article, we will learn how to build an AI-Powered, Open-Source Notion.",
      link: "https://dev.to/copilotkit/work-smarter-in-notion-add-a-copilot-with-copilotkit-50be",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fhyl56d1i9qtwnz9mdxt2.gif",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "I built a Photo Editing App with Webcrumbs and GitHub Copilot",
      description:
        "In this article, we will learn how to build a photo editing app with Webcrumbs and GitHub Copilot.",
      link: "https://dev.to/arindam_1729/how-webcrumbs-github-copilot-built-my-ui-without-me-writing-a-single-line-of-css-987",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fh262q97d3uactb1b4124.gif",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "Fine-Grained Permissions and Bulk Messaging Made Simple with Permit.io and Resend",
      description:
        "In this article, we will learn how to build a fine-grained permissions and bulk messaging made simple with Permit.io and Resend.",
      link: "https://dev.to/arindam_1729/fine-grained-permissions-and-bulk-messaging-made-simple-with-permitio-and-resend-1mm5",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fj7bu5ys88e07a9vg1ezb.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Make Open Source Contributions More Rewarding with Opire",
      description:
        "With all Open source fun and learnings we can add one more element to our open-source journey and that is Bounty",
      link: "https://dev.to/opire/make-open-source-contributions-more-rewarding-with-opire-19o1",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fgvh9vgiz0v3i6evue4ip.gif",
      tags: ["general"],
      version: 1,
    },
    {
      title: "9 Open Source Libraries to Supercharge Your Next Project",
      description:
        "As a developer, we often get confused about which tools to use, so I'm covering 9 Open Source Libraries that will truly supercharge your future project!",
      link: "https://dev.to/arindam_1729/9-open-source-libraries-to-supercharge-your-next-project-c71",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fpfgp3ig8xjivkqz4bytl.gif",
      tags: ["growth"],
      version: 1,
    },
    {
      title:
        "How to choose between large and small AI models: A cost-benefit analysis",
      description:
        "This blog post will guide you through the differences, use cases and cost-benefit analysis of different AI models, especially in the context of inference.",
      link: "https://nebius.com/blog/posts/choosing-between-large-and-small-models",
      image:
        "https://assets.nebius.com/assets/22331858-4c6f-462e-94b5-6db1b87cf1f2/pages-blog-comparing-large-and-small-models-sharing.jpg?cache-buster=2024-12-12T16:16:20.421Z",
      tags: ["general"],
      version: 1,
    },
    {
      title:
        "10 AI Assistants for Frontend Developers That Will Change the Way You Code",
      description:
        "There are a ton of AI coding assistants, but only a few are very helpful and specific to frontend developers. This article will dive into 10 AI coding assistants to help you become a faster, more productive frontend developer.",
      link: "https://astrodevil.medium.com/10-ai-assistants-for-frontend-developers-that-will-change-the-way-you-code-1d833541efb2",
      image:
        "https://miro.medium.com/v2/resize:fit:1200/1*0vebjXBoJ_iIVdrFapKosw.png",
      tags: ["general"],
      version: 1,
    },
    {
      title:
        "Hiring in the Open - How Companies Can Discover Top Talent via Opire",
      description:
        "In this article, we're going to discuss how Opire's approach saves companies time and resources while giving developers an effective way to stand out.",
      link: "https://dev.to/opire/hiring-in-the-open-how-companies-can-discover-top-talent-via-opire-k4h",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fz9zn9tnxmbfwyhu7pm55.gif",
      tags: ["general"],
      version: 1,
    },

    {
      title: "8 Tools You Need to Build Your First SaaS",
      description:
        "In this article, we will discuss the 8 tools you need to build your first SaaS product.",
      link: "https://dev.to/arindam_1729/8-tools-you-need-to-build-your-first-saas-am5",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F71cb2kcoxbtxo721zcw6.gif",
      tags: ["general"],
      version: 1,
    },
    {
      title: "How to Add RBAC Authorization in Nextjs",
      description:
        "By the end of this tutorial, you'll have a clear understanding of how to secure your Next.js application with RBAC, giving you complete control over what each user can access based on their role.",
      link: "https://dev.to/arindam_1729/how-to-add-rbac-authorization-in-nextjs-16m3",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fjdfvempfrzz376nh609l.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "How to Build Dynamic Feature Toggling in React.js",
      description:
        "A guide on how to build a React Feature Toggling system. Discover how to use CASL and Permit.io for relationship-based access control (ReBAC) to manage feature visibility dynamically",
      link: "https://www.permit.io/blog/dynamic-react-feature-toggling-2024-guide",
      image:
        "https://www.permit.io/blog/dynamic-react-feature-toggling-2024-guide/cover.webp",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "11 Open Source Python Projects You Should Know in 2024",
      description:
        "In this article, we will discuss 11 open-source Python projects that you should know in 2024.",
      link: "https://dev.to/arindam_1729/11-open-source-python-projects-you-should-know-in-2024-583o",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fdch857t54wnebiol8i3t.gif",
      tags: ["growth"],
      version: 1,
    },
    {
      title: "How to Implement RBAC (Role-Based Access Control) in Supabase",
      description:
        "In this article, we will learn how to implement RBAC (Role-Based Access Control) in Supabase.",
      link: "https://www.permit.io/blog/how-to-implement-rbac-in-supabase",
      image:
        "https://www.permit.io/blog/how-to-implement-rbac-in-supabase/cover.webp",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "8 Developer Tools You Should Try in 2024",
      description:
        "In this article, we will discuss 8 developer tools that you should try in 2024.",
      link: "https://dev.to/studio1hq/8-developer-tools-you-should-try-in-2024-b8c",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fz21l3b031jaox5raxlp6.png",
      tags: ["growth"],
      version: 1,
    },
    {
      title: "5 Tools Every Developer Should Use in 2024",
      description:
        "In this article, we will discuss 5 tools that every developer should use in 2024.",
      link: "https://dev.to/studio1hq/5-tools-every-developer-must-use-in-2024-438",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fnidw6e25vyfgn74ftsa6.png",
      tags: ["growth"],
      version: 1,
    },
    {
      title: "How to Build a Request Access Approval System in Next.js",
      description:
        "In this article, we will learn how to build a request access approval system in Next.js.",
      link: "https://dev.to/arindam_1729/how-to-build-a-request-access-approval-system-using-nextjs-p3p",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fy190e3vkf86c96c426ur.gif",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Build a Secure Chat App with React, Firebase, and Permit.io",
      description:
        "A step-by-step guide to building a secure, real-time chat app with React, Firebase, and Permit.io - learn how to handle user roles and set up Firebase for authentication and real-time messaging.",
      link: "https://www.permit.io/blog/coding-tutorial-build-a-secure-chat-app-with-react-firebase-and-permitio",
      image:
        "https://www.permit.io/blog/coding-tutorial-build-a-secure-chat-app-with-react-firebase-and-permitio/cover.webp",
      tags: ["project-building"],
      version: 1,
    },
    {
      title:
        "7 Must-Try Open-Source Tools for Python and JavaScript Developers ",
      description:
        "In this article, we will discuss 7 open-source tools that every Python and JavaScript developer should try.",
      link: "https://dev.to/arindam_1729/7-must-try-open-source-tools-for-python-and-javascript-developers-4c56",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F67vy07x7txqv3ipnqvtv.gif",
      tags: ["growth"],
      version: 1,
    },
    {
      title: "Building and Deploying TypeScript Microservices to Kubernetes",
      description:
        "In this tutorial, you'll learn how to build a microservice with Encore.ts, and deploy it to a Kubernetes cluster in your AWS account. We'll show you how to deploying your microservices.",
      link: "https://dev.to/encore/building-and-deploying-typescript-microservices-to-kubernetes-3110",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fq8jei5qtmeckkmdx7hfj.png",
      tags: ["project-building"],
      version: 1,
    },
    {
      title: "Top 5 Open Source Projects You Must Explore Before 2025",
      description:
        "In this article, we will discuss the top 5 open-source projects that you must explore before 2025.",
      link: "https://dev.to/arindam_1729/top-5-open-source-projects-you-must-explore-before-2025-3l6l",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fneqgdcpodgseopbqimdg.gif",
      tags: ["growth"],
      version: 1,
    },
    {
      title:
        "The Ultimate Stack for Serverless & Cloud-Native Developers in 2025",
      description:
        "In this article, we will discuss the ultimate stack for serverless & cloud-native developers in 2025.",
      link: "https://dev.to/arindam_1729/the-ultimate-stack-for-serverless-cloud-native-developers-in-2025-38dc",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fzxxvk7nm97cdd02vw1ep.gif",
      tags: ["growth"],
      version: 1,
    },
  ],
  Blogs: [
    {
      title: "Understanding the Model Context Protocol: Architecture",
      description:
        "Model Context Protocol (MCP) offers a clean, open standard for connecting language models to real-world systems through a modular, plug-and-play interface. In this article, we explore how MCP works..",
      link: "https://nebius.com/blog/posts/understanding-model-context-protocol-mcp-architecture",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F8se47yg59oimb4sl06eg.gif",
      tags: ["seo"],
      version: 1,
    },
    {
      title: "Building a Kanban Board with Next.js,Vercel AI and Tolgee",
      description:
        "In this article, we will build a real-time Kanban board in Next.js using WebSockets, with database support, AI support through the Vercel AI SDK and localization via Tolgee.",
      link: "https://dev.to/tolgee_i18n/building-a-kanban-board-with-nextjsvercel-ai-and-tolgee-493g",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F8se47yg59oimb4sl06eg.gif",
      tags: ["growth", "personal"],
      version: 1,
    },
    {
      title: "How I Built the World's Best NextJS, AI Scheduling App",
      description:
        "By the end of this article, you'll learn how to Integrate an AI copilot into your Next.js application by building a scheduling app with Cal.com and Develop and manage a custom scheduler that enhances user experience across your application.",
      link: "https://dev.to/tolgee_i18n/building-a-kanban-board-with-nextjsvercel-ai-and-tolgee-493g",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fpvtqkii2tlp04p2cvlx9.gif",
      tags: ["growth"],
      version: 1,
    },
    {
      title: "How to create a LinkedIn job scraper in Python with Crawlee",
      description:
        "In this article, we will build a web application that scrapes LinkedIn for job postings using Crawlee and Streamlit..",
      link: "https://dev.to/crawlee/how-to-create-a-linkedin-job-scraper-in-python-with-crawlee-h9d",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fwsyjca1b8q6g9wapyhnp.jpg",
      tags: ["growth"],
      version: 1,
    },
    {
      title:
        "Develop a Real-Time Collaborative Document Editor with Next.js, Appwrite, Liveblocks and Permit.io",
      description:
        "A step-by-step guide to build a secure, real-time collaborative document editor with Next.js, Appwrite, Liveblocks, and Permit.io using ReBAC for flexible and secure relationship-based access control.",
      link: "https://javascript.plainenglish.io/develop-a-real-time-collaborative-document-editor-with-next-js-appwrite-liveblocks-and-permit-io-699a865a7aeb",
      image:
        "https://miro.medium.com/v2/resize:fit:720/format:webp/1*Wan7SBxJfZf2HlOu9AIPLw.png",
      tags: ["growth"],
      version: 1,
    },
    {
      title: "Building an AI-powered quiz application with Next.js and OpenAI",
      description:
        "In this tutorial, you'll learn how to build an AI-powered quiz application that enables users to select a topic, answer questions related to that topic, and receive their score instantly upon completing the quiz.",
      link: "https://dev.to/latitude/building-an-ai-powered-quiz-application-with-nextjs-and-openai-2673",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Ff04c0el5k9h0pee1pcpp.png",
      tags: ["growth"],
      version: 1,
    },
    {
      title:
        "Manage Permissions in a Langflow Chain for LLM Queries using Permit.io",
      description:
        "A Step-by-Step Guide to Secure and Scalable Permission Management for AI Models with Permit.io",
      link: "https://astrodevil.medium.com/manage-permissions-in-a-langflow-chain-for-llm-queries-using-permit-io-7de8a0fb17b3",
      image:
        "https://miro.medium.com/v2/resize:fit:720/format:webp/1*bY1LzPkOXDXI_eRJ_V-y8w.png",
      tags: ["growth"],
      version: 1,
    },
    {
      title:
        "I Found a Tool Even Better than v0: You Won't Believe What It Can Do!",
      description:
        "As a front-end developer, you've probably heard all about Vercel v0, the tool that seemed to revolutionize front-end development. But is v0 as great as it sounds? I spent time comparing it with a new tool, Webcrumbs Frontend AI, to see if it really is a game-changer.",
      link: "https://dev.to/arindam_1729/i-found-a-tool-even-better-than-v0-you-wont-believe-what-it-can-do-igf",
      image:
        "https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F70kbai7v3r12dr860psw.gif",
      tags: ["growth"],
      version: 1,
    },
    {
      title:
        "Building an AI-powered finance planner with full-stack Next.js and Nebius AI Studio",
      description:
        "In this guide, we'll build an AI-powered financial planner using the Meta Llama 3.1 70B model via Nebius AI Studio and a full-stack Next.js app. This solution works seamlessly whether you're using the Pages Router or the App Router, as much of the customization relies on setting up a custom Next.js server.",
      link: "https://nebius.com/blog/posts/building-ai-powered-finance-planner",
      tags: ["growth"],
      version: 1,
    },
  ],
  Services: [
    {
      title: "Technical Content Marketing",
      description:
        "We create high-quality, technical and promotional blogs tailored for devtool and software companies. Our team of expert writers specializes in crafting SEO-optimized content that drives engagement, educates developers",
      icon: PencilLine,
    },

    {
      title: "Documentation & DX Audits",
      description:
        "We audit and improve developer documentation, onboarding flows, API references, SDK guides, and product DX so developers reach first success faster.",
      icon: IconFileDescription,
    },
    {
      title: "Developer Relations & Growth",
      description:
        "Accelerate your growth with targeted Developer Relations services. We help devtool and software companies connect authentically with developers, grow communities, and turn users into advocates.",
      icon: UsersTwo,
    },
  ],
  Testimonials: [
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

They’re proactive, easy to work with, and really understand how to create developer-focused content that fits the product.`,
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
      content: `Arindam gave us a masterclass on how to launch on Product Hunt and I dare to say if it wasn't that we wouldn't have achieved 3rd in our first launch ever and with almost zero preparation.
            
            He write great technical texts that reach an impressive audience. 
            
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
  ],
  TrustedbyLogos: [
    {
      name: "InsForge",
      image: InsForgeFull.src,
      className: "h-8 sm:h-9 md:h-10 w-auto max-w-[200px] object-contain",
      alt: "InsForge",
    },
    {
      name: "ByteRover",
      image: ByteRoverFull.src,
      className: "h-7 sm:h-8 md:h-9 w-auto max-w-[220px] object-contain",
      alt: "ByteRover",
    },
    {
      name: "Permit",
      image: PermitFull.src,
      className:
        "h-10 sm:h-12 md:h-16 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain",
      alt: "Permit",
    },
    {
      name: "Tolgee",
      image: TolgeeFull.src,
      className:
        "h-8 sm:h-10 md:h-12 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain",
      alt: "Tolgee",
    },
    {
      name: "CopilotKit",
      image: CopilotkitFull.src,
      className:
        "h-8 sm:h-9 md:h-10 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain",
      alt: "CopilotKit",
    },
    {
      name: "LiteLLM",
      image: LiteLLMFull.src,
      className:
        "h-8 sm:h-9 md:h-10 w-auto max-w-[140px] sm:max-w-[200px] md:max-w-[220px] object-contain",
      alt: "LiteLLM",
    },
    {
      name: "Nebius",
      image: NebiusFull.src,
      className:
        "h-5 sm:h-6 md:h-6 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain",
      alt: "Nebius",
    },
    {
      name: "Latitude",
      image: LatitudeFull.src,
      className:
        "h-6 sm:h-7 md:h-8 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain",
      alt: "Latitude",
    },
    {
      name: "Opire",
      image: OpireFull.src,
      className:
        "h-8 sm:h-9 md:h-10 w-auto max-w-[100px] sm:max-w-[120px] md:max-w-[144px] object-contain",
      alt: "Opire",
    },
    {
      name: "Crawlee",
      image: CrawleeFull.src,
      className:
        "h-10 sm:h-12 md:h-14 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[160px] object-contain",
      alt: "Crawlee",
    },
    {
      name: "Encore",
      image: EncoreFull.src,
      className:
        "h-10 sm:h-12 md:h-14 w-auto max-w-[160px] sm:max-w-[200px] md:max-w-[240px] object-contain",
      alt: "Encore",
    },
    {
      name: "Webcrumbs",
      image: WebcrumbsFull.src,
      className:
        "h-10 sm:h-12 md:h-16 w-auto max-w-[100px] sm:max-w-[140px] md:max-w-[176px] object-contain",
      alt: "Webcrumbs",
    },
  ],
  BlogAsServiceProcess: [
    {
      name: "Topic",
      description:
        "We pick the right topic together: from your roadmap, your brief, or our research into what developers are searching for.",
      icon: IconSearch,
      details: [
        <p>Client-provided or Studio1-researched topics</p>,
        <p>Developer audience and search intent</p>,
        <p>Format and publishing-channel decision</p>,
        <p>Goal alignment before writing starts</p>,
      ],
    },
    {
      name: "Outline",
      description:
        "We prepare an outline and overview first, so your team can review the angle, structure, and examples early.",
      icon: IconBulb,
      details: [
        <p>Article outline and technical flow</p>,
        <p>Code example plan</p>,
        <p>Product positioning notes</p>,
        <p>Client approval before full draft</p>,
      ],
    },
    {
      name: "Draft",
      description:
        "Studio1 writes the technical draft, reviews it internally, and sends it to your team for product and engineering feedback.",
      icon: IconRocket,
      details: [
        <p>Code-rich technical writing</p>,
        <p>Internal review and technical validation</p>,
        <p>Client review and revision cycle</p>,
        <p>SEO and readability polish</p>,
      ],
    },
    {
      name: "Publish",
      description:
        "We help publish on your company channels, Studio1/team profiles, or approved developer platforms.",
      icon: IconChartBar,
      details: [
        <p>Company blog or external profile publishing</p>,
        <p>Dev.to and Medium syndication</p>,
        <p>X, LinkedIn, and community snippets</p>,
        <p>Performance review after publish</p>,
      ],
    },
  ],

  BlogAsServiceTeam: [
    {
      name: "Arindam Majumder",
      role: "Co-founder",
      image: "https://avatars.githubusercontent.com/u/109217591?v=4",
      bio: "Developer Advocate with expertise in technical writing and open-source. Has reached 270k+ developers through technical content, with notable contributions to Next.js and featured in their RC release blog. Specializes in creating developer-centric content that drives engagement and growth.",
      social: {
        twitter: "https://dub.sh/arindam-x",
        linkedin: "https://dub.sh/arindam-linkedin",
        website: "https://arindam-majumder.vercel.app",
      },
    },
    {
      name: "Amitesh Anand",
      role: "Co-founder",
      image: "/assets/team/amitesh.webp",
      bio: "Technical writer and developer advocate with expertise in creating scalable content. Published 80k+ words reaching thousands of readers across major tech platforms. Nominated for Noonies 2022 Tech Awards, focused on delivering high-impact technical content.",
      social: {
        twitter: "https://mobile.twitter.com/astrodevil_",
        linkedin: "https://www.linkedin.com/in/amitesh1208/",
        website: "https://mranand.com/",
      },
    },
  ],

  DevRelAsServiceProcess: [
    {
      name: "Discovery",
      description:
        "We assess your product, developer audience, communities, open-source surface, and existing DevRel touchpoints.",
      icon: IconSearch,
      details: [
        <p>Audit existing developer programs</p>,
        <p>Review docs, community, social, and GitHub signals</p>,
        <p>Identify growth and partnership opportunities</p>,
        <p>Provide an actionable assessment</p>,
      ],
    },
    {
      name: "Strategy",
      description:
        "We build a DevRel and growth roadmap across content, community, partnerships, integrations, launches, and events.",
      icon: IconBulb,
      details: [
        <p>Custom DevRel roadmap</p>,
        <p>Campaign and launch planning</p>,
        <p>Community and partner mapping</p>,
        <p>Success metrics definition</p>,
      ],
    },

    {
      name: "Creation",
      description:
        "Our writers, engineers, and DevRel operators execute the work: docs, blogs, demos, repos, social posts, and community programs.",
      icon: IconRocket,
      details: [
        <p>Technical content and repo-led demos</p>,
        <p>Social and community management</p>,
        <p>Open-source maintenance support</p>,
        <p>Hackathon or event collaboration support</p>,
      ],
    },

    {
      name: "Amplification",
      description:
        "We distribute through developer communities, creators, events, partner channels, and social platforms, then iterate based on signals.",
      icon: IconChartBar,
      details: [
        <p>Creator and influencer management</p>,
        <p>Partner and community outreach</p>,
        <p>X, LinkedIn, Reddit, YouTube, and events</p>,
        <p>Performance reporting and iteration</p>,
      ],
    },
  ],

  DevRelAsServiceServices: [
    {
      id: "developer-advocacy",
      title: "Developer Advocacy",
      description:
        "Community programs, education, and advocacy that build trust with developers.",
      icon: IconUsers,
    },
    {
      id: "organic-growth-campaign",
      title: "Organic Growth Campaign",
      description:
        "Multi-channel distribution across developer communities and social channels.",
      icon: IconTrendingUp,
    },
    {
      id: "product-launch-support",
      title: "Product Launch Support",
      description:
        "Launch strategy, community activation, and post-launch amplification.",
      icon: IconRocket,
    },
    {
      id: "influencer-management",
      title: "Influencer Management",
      description:
        "Creator discovery, briefs, managed collaborations, and performance reporting.",
      icon: IconStar,
    },
  ],
  DevRelAsServiceTeam: [
    {
      name: "Arindam Majumder",
      role: "Open source developer and DevRel",
      image: "https://avatars.githubusercontent.com/u/109217591?v=4",
      bio: "",
      social: {
        twitter: "https://dub.sh/arindam-x",
        linkedin: "https://dub.sh/arindam-linkedin",
        website: "https://www.arindammajumder.com/",
      },
    },
    {
      name: "Amitesh Anand",
      role: "Technical writer and DevRel",
      image: "/assets/team/amitesh.webp",
      bio: "",
      social: {
        twitter: "https://mobile.twitter.com/astrodevil_",
        linkedin: "https://www.linkedin.com/in/amitesh1208/",
        website: "https://mranand.com/",
      },
    },
    {
      name: "Shivay Lamba",
      role: "ML Engineer and Open source advocate",
      image: "https://avatars.githubusercontent.com/u/19529592?v=4",
      bio: "",
      social: {
        twitter: "https://x.com/HowDevelop",
        linkedin: "https://in.linkedin.com/in/shivaylamba",
        website: "https://shivaylamba.me",
      },
    },
  ],

  DocsAsServiceProcess: [
    {
      name: "Audit",
      description:
        "We review your existing docs, API and SDK references, onboarding path, dashboard flows, and developer-facing product surfaces.",
      icon: IconSearch,
      details: [
        <p>Existing docs assessment</p>,
        <p>API and SDK reference review</p>,
        <p>Dashboard and onboarding review</p>,
        <p>Goal alignment</p>,
      ],
    },
    {
      name: "Analysis",
      description:
        "We map what is missing, outdated, confusing, or blocking developers from first success.",
      icon: IconChartBar,
      details: [
        <p>Developer journey mapping</p>,
        <p>Missing docs and stale examples</p>,
        <p>API and SDK gap analysis</p>,
        <p>Priority friction ranking</p>,
      ],
    },
    {
      name: "Roadmap",
      description:
        "You get a findings report and prioritized plan for edits, new docs, IA fixes, examples, and onboarding improvements.",
      icon: IconBulb,
      details: [
        <p>Findings report</p>,
        <p>Docs and DX priority plan</p>,
        <p>Actionable recommendations by severity</p>,
        <p>Implementation roadmap</p>,
      ],
    },
    {
      name: "Implementation",
      description:
        "We can edit existing docs, write missing docs from scratch, update examples, and support follow-up reviews.",
      icon: IconRocket,
      details: [
        <p>Existing-doc edits</p>,
        <p>New docs from scratch</p>,
        <p>Example and snippet updates</p>,
        <p>Follow-up assessment</p>,
      ],
    },
  ],

  DocsAsServiceServices: [
    {
      title: "Developer Onboarding Audit",
      description:
        "Evaluate onboarding docs and processes so new developers reach first success faster.",
      icon: IconUsers,
    },
    {
      title: "API Usability & Docs Audit",
      description:
        "Test API and SDK docs for clarity, examples, errors, and completeness.",
      icon: IconApi,
    },
    {
      title: "Quickstarts & How-tos",
      description:
        "Ship getting-started and task guides with working code examples.",
      icon: IconBook,
    },
    {
      title: "Reference & Concept Docs",
      description:
        "API, SDK, and concept pages that stay accurate as the product moves.",
      icon: IconFileDescription,
    },
    {
      title: "DX Path Improvements",
      description:
        "Fix friction in flows, information architecture, examples, and error paths.",
      icon: IconSettingsCheck,
    },
    {
      title: "Implementation & Follow-up",
      description:
        "Prioritized roadmap, ship support, and follow-up reviews tied to activation.",
      icon: IconRocket,
    },
  ],
};

function getTestimonial(name: string) {
  const testimonial = Data.Testimonials.find((entry) => entry.name === name);
  if (!testimonial) {
    throw new Error(`Testimonial not found: ${name}`);
  }
  return testimonial;
}

export const heroFeaturedTestimonials = {
  left: getTestimonial("Ivan Cordoba"),
  right: getTestimonial("Agita Jaunzeme"),
  mobile: getTestimonial("Agita Jaunzeme"),
};

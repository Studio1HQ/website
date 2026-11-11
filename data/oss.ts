/**
 * Content for the open-source page (/oss).
 *
 * Star and fork counts here are a snapshot (checked 2026-11-04). The page
 * refreshes them from the GitHub API (lib/oss.ts) and falls back to these
 * numbers when GitHub is unreachable or rate-limited. Everything else (names,
 * copy, which projects are picked) is edited by hand.
 */

export const OSS_SNAPSHOT_DATE = "2026-11-04";

export const AWESOME_REPO = "Arindam200/awesome-ai-apps";
export const OSS_ORG = "Studio1-OSS";

export const AWESOME_URL = `https://github.com/${AWESOME_REPO}`;
export const OSS_ORG_URL = `https://github.com/${OSS_ORG}`;

/** Folder link inside Awesome AI Apps. */
export const awesomePath = (path: string) => `${AWESOME_URL}/tree/main/${path}`;

export type AwesomeCategory =
  | "starter"
  | "simple"
  | "voice"
  | "mcp"
  | "memory"
  | "rag"
  | "advanced"
  | "fine-tuning";

/** Every category in the Awesome AI Apps README, in its order, with its count. */
export const AWESOME_CATEGORIES: {
  key: AwesomeCategory;
  label: string;
  blurb: string;
  count: number;
  /** Top-level folder in the repo. */
  folder: string;
}[] = [
  {
    key: "starter",
    label: "Starter Agents",
    blurb: "One minimal agent per framework",
    count: 22,
    folder: "starter_ai_agents",
  },
  {
    key: "simple",
    label: "Simple Agents",
    blurb: "Single-purpose agents for everyday tasks",
    count: 20,
    folder: "simple_ai_agents",
  },
  {
    key: "voice",
    label: "Voice Agents",
    blurb: "Real-time voice with LiveKit, Pipecat and Deepgram",
    count: 9,
    folder: "voice_agents",
  },
  {
    key: "mcp",
    label: "MCP Agents",
    blurb: "Model Context Protocol servers and agents",
    count: 14,
    folder: "mcp_ai_agents",
  },
  {
    key: "memory",
    label: "Memory Agents",
    blurb: "Agents that remember users across sessions",
    count: 13,
    folder: "memory_agents",
  },
  {
    key: "rag",
    label: "RAG Apps",
    blurb: "Retrieval, reranking, GraphRAG and OCR",
    count: 18,
    folder: "rag_apps",
  },
  {
    key: "advanced",
    label: "Advanced Agents",
    blurb: "Multi-agent pipelines and end-to-end workflows",
    count: 36,
    folder: "advance_ai_agents",
  },
  {
    key: "fine-tuning",
    label: "Fine-Tuning",
    blurb: "LoRA, distillation and deploying open models",
    count: 6,
    folder: "fine_tuning",
  },
];

/** Total runnable projects in Awesome AI Apps (the README headline number). */
export const AWESOME_APP_COUNT = AWESOME_CATEGORIES.reduce(
  (total, category) => total + category.count,
  0,
);

/** Snapshot of the flagship repo; stars and forks are refreshed live. */
export const AWESOME_SNAPSHOT = {
  stars: 16710,
  forks: 1877,
  /** People with commits, from the contributors API (anonymous included). */
  contributors: 41,
  createdAt: "2025-02-16",
  license: "MIT",
};

/**
 * Star history of Awesome AI Apps: the date each sampled stargazer starred
 * the repo (every few hundred stars), from the GitHub stargazers API.
 */
export const AWESOME_STAR_HISTORY: { date: string; stars: number }[] = [
  { date: "2025-02-16", stars: 1 },
  { date: "2025-06-10", stars: 301 },
  { date: "2025-07-02", stars: 701 },
  { date: "2025-07-12", stars: 1101 },
  { date: "2025-07-21", stars: 1501 },
  { date: "2025-08-09", stars: 1901 },
  { date: "2025-08-17", stars: 2401 },
  { date: "2025-08-19", stars: 2901 },
  { date: "2025-08-23", stars: 3401 },
  { date: "2025-08-26", stars: 3901 },
  { date: "2025-08-31", stars: 4401 },
  { date: "2025-09-11", stars: 4901 },
  { date: "2025-09-15", stars: 5401 },
  { date: "2025-09-19", stars: 5901 },
  { date: "2025-10-13", stars: 6501 },
  { date: "2025-11-16", stars: 7101 },
  { date: "2025-12-14", stars: 7701 },
  { date: "2026-01-13", stars: 8301 },
  { date: "2026-02-27", stars: 8901 },
  { date: "2026-04-08", stars: 9501 },
  { date: "2026-04-25", stars: 10101 },
  { date: "2026-05-05", stars: 10701 },
  { date: "2026-05-06", stars: 11301 },
  { date: "2026-05-10", stars: 11901 },
  { date: "2026-06-08", stars: 12501 },
  { date: "2026-07-19", stars: 13101 },
  { date: "2026-09-06", stars: 13701 },
  { date: "2026-09-11", stars: 14301 },
  { date: "2026-09-14", stars: 14901 },
  { date: "2026-09-20", stars: 15501 },
  { date: "2026-10-14", stars: 16101 },
  { date: "2026-10-26", stars: 16601 },
];

/** Frameworks and tools the Awesome AI Apps projects are built with. */
export const AWESOME_STACK = [
  "Agno",
  "LangGraph",
  "CrewAI",
  "OpenAI Agents SDK",
  "Google ADK",
  "Mastra",
  "LlamaIndex",
  "Pydantic AI",
  "smolagents",
  "LiveKit",
  "Pipecat",
  "MCP",
];

/** Sponsors listed in the Awesome AI Apps README. */
export const AWESOME_SPONSORS = [
  "Nebius Token Factory",
  "Bright Data",
  "ScrapeGraphAI",
  "Memori",
  "CopilotKit",
  "ScaleKit",
  "Okahu",
  "AgentField",
  "Byteful",
];

export const AWESOME_QUICKSTART = [
  { comment: "Clone the repo and pick a project" },
  { command: "git clone https://github.com/Arindam200/awesome-ai-apps.git" },
  { command: "cd awesome-ai-apps/starter_ai_agents/agno_starter" },
  { comment: "Add your API keys" },
  { command: "cp .env.example .env" },
  { comment: "Install and run" },
  { command: "uv sync && uv run main.py" },
];

/* ------------------------------------------------------------------ */
/* Studio1-OSS: full products                                          */
/* ------------------------------------------------------------------ */

export type OssRepo = {
  /** Repo name in the Studio1-OSS org (used for the live stats lookup). */
  repo: string;
  name: string;
  tagline: string;
  description: string;
  language: "TypeScript" | "Python" | "HTML";
  license: string | null;
  stack: string[];
  /** Live demo or docs site. */
  homepage?: string;
  /** One-line install, shown with a copy button. */
  install?: string;
  /** Shown as a large card; the rest are listed below. */
  featured?: boolean;
  /** Snapshot counts; refreshed live. */
  stars: number;
  forks: number;
};

export const OSS_REPOS: OssRepo[] = [
  {
    repo: "OpenDuet",
    name: "OpenDuet",
    tagline:
      "AI teammates that work while you're away, and ask before they act.",
    description:
      "A proactive agent app on open models. Bots send a morning brief, check your connected apps and flag what needs you. Anything that sends, posts or pays waits for your OK.",
    language: "TypeScript",
    license: "MIT",
    stack: ["Mastra", "Nebius Token Factory", "Tavily", "Browserbase"],
    featured: true,
    stars: 31,
    forks: 2,
  },
  {
    repo: "OpenCrewBot",
    name: "OpenCrewBot",
    tagline: "Your own team of AI bots, in one chat app.",
    description:
      "An open-source alternative to Grok Bot. Each bot has its own model, tools, memory and cloud browser. Talk to one, or put several in a room and let them split the work.",
    language: "TypeScript",
    license: "MIT",
    stack: ["Mastra", "Nebius Token Factory", "Browserbase"],
    featured: true,
    stars: 16,
    forks: 2,
  },
  {
    repo: "nconnect",
    name: "NConnect",
    tagline: "Run the coding agents you already use on open models.",
    description:
      "One install. Claude Code, Codex, OpenCode and more, served by Kimi, GLM, Qwen, DeepSeek and MiniMax. Your agent's own config stays untouched.",
    language: "TypeScript",
    license: "MIT",
    stack: ["CLI", "Claude Code", "Codex", "OpenCode"],
    homepage: "https://nconnect.sh",
    install: "curl -fsSL https://nconnect.sh/install.sh | sh",
    featured: true,
    stars: 7,
    forks: 1,
  },
  {
    repo: "Codetrail",
    name: "Codetrail",
    tagline:
      "Architecture diagrams, docs, code tours and Q&A for any GitHub repo.",
    description:
      "Hands the whole repo to a 1M-token open model in one prompt. Every step of a tour quotes a real line of code, checked in the file before it's shown.",
    language: "TypeScript",
    license: "MIT",
    stack: ["DeepSeek V4.1", "Kimi K3.1", "Mermaid"],
    featured: true,
    stars: 0,
    forks: 0,
  },
  {
    repo: "Repro",
    name: "Repro",
    tagline: "Record the bug once. Repro reproduces it, then fixes it.",
    description:
      "A browser extension that records a bug with its console, network and clicks, reproduces it in your browser and checks a fix in a sandbox.",
    language: "TypeScript",
    license: "MIT",
    stack: ["Chrome extension", "MiniMax-M3.1-Flash", "Docker"],
    stars: 0,
    forks: 0,
  },
  {
    repo: "JobScreen",
    name: "JobScreen",
    tagline: "A resume score that shows its work.",
    description:
      "Scores any resume against any job, with a quote behind every point. Reads the rendered page, so scanned resumes work and hidden-text tricks get caught.",
    language: "TypeScript",
    license: "MIT",
    stack: ["DeepSeek V4.1 vision", "Recruiting"],
    stars: 0,
    forks: 0,
  },
  {
    repo: "Splitter",
    name: "Splitter",
    tagline: "Split every bill from a trip, party or flat, fairly.",
    description:
      "Drop in the bills, say who paid what in your own words, and a vision-language model works out the split for the whole group.",
    language: "TypeScript",
    license: "MIT",
    stack: ["Vision models", "Agentic AI"],
    homepage: "https://ten-splitter.vercel.app/",
    stars: 2,
    forks: 0,
  },
  {
    repo: "kubetrace-ai",
    name: "KubeTrace AI",
    tagline: "Kubernetes incidents, investigated and fixed by an agent.",
    description:
      "A bounded tool-calling agent that fixes real faults on a Civo cluster, with policy-checked changes, sandboxed tests and hidden verification.",
    language: "Python",
    license: "Apache-2.0",
    stack: ["Kubernetes", "Civo", "Nebius Token Factory"],
    stars: 0,
    forks: 0,
  },
  {
    repo: "awesome-llm-benchmarks",
    name: "Awesome LLM Benchmarks",
    tagline: "An open-source platform for evaluating AI models.",
    description:
      "Benchmarks for open and closed models in one place, with the methods published next to the scores.",
    language: "HTML",
    license: "MIT",
    stack: ["Benchmarks", "Evals"],
    homepage: "https://awesomellmbenchmarks.com/",
    stars: 3,
    forks: 1,
  },
  {
    repo: "muse-spark-open-bench",
    name: "Muse Spark Open Bench",
    tagline: "Meta's Muse Spark Open, reviewing 50 real merged pull requests.",
    description:
      "An open benchmark of code review on pull requests from popular open-source projects, run on Nebius Token Factory.",
    language: "TypeScript",
    license: null,
    stack: ["Benchmarks", "Code review"],
    homepage: "https://muse-spark-open-tests.vercel.app/",
    stars: 0,
    forks: 0,
  },
  {
    repo: "revenue-intelligence",
    name: "Revenue Intelligence",
    tagline: "Customer revenue insights, each backed by its evidence.",
    description:
      "Bring your own AI key. Built on Qwen3.8-27B with Turso and Auth0.",
    language: "TypeScript",
    license: "MIT",
    stack: ["Qwen3.8", "Turso", "Auth0"],
    homepage: "https://revenue-intelligence-tf.vercel.app/",
    stars: 0,
    forks: 0,
  },
  {
    repo: "AgentC",
    name: "AgentC",
    tagline: "A coding agent you host, with a sandbox for every repo.",
    description:
      "Pi runs on your app server with Nebius Token Factory; Daytona sandboxes run the clones, shell commands and the sites the agent builds.",
    language: "TypeScript",
    license: null,
    stack: ["Pi", "Daytona", "Nebius Token Factory"],
    stars: 2,
    forks: 0,
  },
];

/* ------------------------------------------------------------------ */
/* Hand-picked projects from Awesome AI Apps, for the project index    */
/* ------------------------------------------------------------------ */

export type AwesomePick = {
  name: string;
  /** Folder inside the repo. */
  path: string;
  description: string;
  category: AwesomeCategory;
  tags: string[];
  /** Shown before anyone searches or filters. */
  featured?: boolean;
};

export const AWESOME_PICKS: AwesomePick[] = [
  // Advanced
  {
    name: "Shark Tank Pitch Practice Agent",
    path: "advance_ai_agents/shark_tank_agent",
    description:
      "A 3D Shark Tank room where three investor sharks question your pitch round by round, then write a deal memo.",
    category: "advanced",
    tags: ["Mastra", "Nebius", "3D", "SQLite"],
    featured: true,
  },
  {
    name: "Sandboxed Browser Game Generator",
    path: "advance_ai_agents/pydantic_game_agent",
    description:
      "A multi-agent studio that turns one prompt into a playable browser game, run in a sandbox.",
    category: "advanced",
    tags: ["Pydantic AI", "FastAPI", "GLM-5.2"],
    featured: true,
  },
  {
    name: "Multi-Agent Coding Harness",
    path: "advance_ai_agents/coding_agent_harness",
    description:
      "A LangGraph coding crew that plans, explores the repo, asks before it edits files and runs tests in E2B sandboxes.",
    category: "advanced",
    tags: ["LangGraph", "E2B", "Coding agents"],
    featured: true,
  },
  {
    name: "AI Hedge Fund Research Team",
    path: "advance_ai_agents/ai-hedgefund",
    description:
      "Agents that split up the financial analysis of a stock and hand back one research report.",
    category: "advanced",
    tags: ["Multi-agent", "Finance"],
  },
  {
    name: "Software Engineering Model Arena",
    path: "advance_ai_agents/coding_model_arena",
    description:
      "Two coding models, seven challenges, hidden tests, partial-credit scoring and an independent judge.",
    category: "advanced",
    tags: ["Benchmark", "Nebius", "Evals"],
  },
  {
    name: "Cosmos Arena Debate Council",
    path: "advance_ai_agents/cosmos_arena_debate_council",
    description:
      "A council of agents that debates your question with NVIDIA's Cosmos reasoning model.",
    category: "advanced",
    tags: ["LangGraph", "NVIDIA Cosmos", "Nebius"],
  },
  {
    name: "Deep Research Workflow",
    path: "advance_ai_agents/deep_researcher_agent",
    description:
      "A multi-stage research agent that searches, scrapes and writes a sourced report.",
    category: "advanced",
    tags: ["Agno", "ScrapeGraphAI", "Research"],
    featured: true,
  },
  {
    name: "Due Diligence Agent",
    path: "advance_ai_agents/due_diligence_agent",
    description:
      "A multi-agent company due-diligence pipeline with deep web scraping.",
    category: "advanced",
    tags: ["AG2", "TinyFish", "Research"],
  },
  {
    name: "Pre-Meeting Intel Agent",
    path: "advance_ai_agents/meeting_briefing_agent",
    description:
      "Give it a company name and get a cited one-page brief before the meeting, from a plan-research-reflect loop.",
    category: "advanced",
    tags: ["LangGraph", "Tavily"],
  },
  {
    name: "Financial Document OS",
    path: "advance_ai_agents/financial_document_os",
    description:
      "Turns financial PDFs into an editable relational database, with a source citation for every value.",
    category: "advanced",
    tags: ["PDF", "Citations", "Finance"],
  },
  {
    name: "Clinical Early-Warning Agent",
    path: "advance_ai_agents/clinical_early_warning_agent",
    description:
      "A tool-calling agent that spots patient deterioration with NEWS2, qSOFA, personal baselines and trends.",
    category: "advanced",
    tags: ["Tool calling", "Healthcare", "Nebius"],
  },
  {
    name: "Startup Idea Validator Agent",
    path: "advance_ai_agents/startup_idea_validator_agent",
    description:
      "An agentic workflow that researches a startup idea and scores it.",
    category: "advanced",
    tags: ["Research", "Startups"],
  },

  // Voice
  {
    name: "VoxCode Voice Coding Agent",
    path: "voice_agents/Cursor_code_editor",
    description:
      "Talk to your codebase: summaries, architecture Q&A and optional edits through the Cursor SDK.",
    category: "voice",
    tags: ["Deepgram", "Cursor SDK", "Nebius"],
    featured: true,
  },
  {
    name: "AI Pitch Coach",
    path: "voice_agents/voice-agent-gradium-nebius-langchain",
    description:
      "A voice coach that listens to your pitch and asks the questions an investor would.",
    category: "voice",
    tags: ["Gradium", "LangChain", "Nebius"],
  },
  {
    name: "Speed-to-Lead Sales Voice Agent",
    path: "voice_agents/speed_to_lead_agent",
    description:
      "Calls inbound leads the moment they arrive, routes them to a specialist and logs the call to a CRM.",
    category: "voice",
    tags: ["LiveKit", "Sales"],
  },
  {
    name: "Healthcare Voice Contact Center",
    path: "voice_agents/healthcare_contact_center",
    description:
      "Books appointments, answers common questions and escalates to a supervisor.",
    category: "voice",
    tags: ["Pipecat", "Healthcare"],
  },
  {
    name: "Multilingual Voice Agent",
    path: "voice_agents/pipecat_agent",
    description:
      "A Pipecat voice pipeline with Sarvam speech-to-text and text-to-speech, in the browser over WebRTC.",
    category: "voice",
    tags: ["Pipecat", "Sarvam", "WebRTC"],
  },
  {
    name: "Web-Search Voice Agent",
    path: "voice_agents/livekit_web_search_agent",
    description:
      "Ask a question out loud and get a fresh answer from the web, with its sources.",
    category: "voice",
    tags: ["LiveKit", "Gemini", "Olostep"],
  },

  // MCP
  {
    name: "Sandboxed Code Execution MCP Agent",
    path: "mcp_ai_agents/e2b_docker_mcp_agent",
    description:
      "Runs agent code in sandboxed Docker environments through the MCP Gateway.",
    category: "mcp",
    tags: ["Docker", "E2B", "MCP"],
    featured: true,
  },
  {
    name: "Self-Healing Text-to-SQL Agent",
    path: "mcp_ai_agents/telemetry-mcp-okahu",
    description:
      "A Text-to-SQL agent that reads its own traces over a hosted MCP server and fixes failing queries.",
    category: "mcp",
    tags: ["Okahu", "MCP", "SQL"],
  },
  {
    name: "Secure Database MCP Agent",
    path: "mcp_ai_agents/mcp_toolbox_security_agent",
    description:
      "Per-user data access and least-privilege roles over PostgreSQL and MongoDB, enforced by MCP Toolbox.",
    category: "mcp",
    tags: ["MCP Toolbox", "PostgreSQL", "MongoDB"],
  },
  {
    name: "GitHub MCP Agent",
    path: "mcp_ai_agents/github_mcp_agent",
    description:
      "Ask questions about any repository and get answers through the GitHub MCP server.",
    category: "mcp",
    tags: ["GitHub", "MCP"],
  },
  {
    name: "Documentation RAG MCP Server",
    path: "mcp_ai_agents/doc_mcp",
    description: "Semantic search and Q&A over your docs, served over MCP.",
    category: "mcp",
    tags: ["RAG", "MCP", "Docs"],
  },
  {
    name: "Custom MCP Server Starter",
    path: "mcp_ai_agents/custom_mcp_server",
    description: "A minimal MCP server to copy when you build your own.",
    category: "mcp",
    tags: ["MCP", "Starter"],
  },

  // Memory
  {
    name: "YouTube Trend Agent",
    path: "memory_agents/youtube_trend_agent",
    description:
      "Analyses a YouTube channel, finds what's trending and suggests video ideas, remembering what it learned.",
    category: "memory",
    tags: ["Memori", "Agno", "Exa"],
    featured: true,
  },
  {
    name: "AI Research Consultant",
    path: "memory_agents/ai_consultant_agent",
    description:
      "A consulting agent that researches with Exa and keeps long-term memory of every client.",
    category: "memory",
    tags: ["Memori", "Exa"],
  },
  {
    name: "Study Coach Agent",
    path: "memory_agents/study_coach_agent",
    description:
      "Checks you understand a topic step by step and remembers where you struggled.",
    category: "memory",
    tags: ["Memori", "LangGraph", "Education"],
  },
  {
    name: "Engineering Content Agent",
    path: "memory_agents/engineering_content_agent",
    description:
      "Turns Hacker News demand and DEV.to gaps into a developer trend digest, plus talk and blog ideas.",
    category: "memory",
    tags: ["Agno", "Weaviate", "DevRel"],
  },
  {
    name: "Customer Support Voice Agent",
    path: "memory_agents/customer_support_voice_agent",
    description:
      "A voice support agent that remembers customers and learns your docs with Firecrawl.",
    category: "memory",
    tags: ["Memori", "Firecrawl", "Voice"],
  },
  {
    name: "Social Media Agent",
    path: "memory_agents/social_media_agent",
    description: "Writes posts in your brand voice, and remembers it.",
    category: "memory",
    tags: ["Memori", "Marketing"],
  },

  // RAG
  {
    name: "Video Q&A with Timestamp Citations",
    path: "rag_apps/video_rag",
    description:
      "Ask a video a question and jump to the exact moment that answers it.",
    category: "rag",
    tags: ["Gemini embeddings", "Weaviate", "Nebius"],
    featured: true,
  },
  {
    name: "Production PDF RAG with Reranking",
    path: "rag_apps/advanced_rag_with_reranking",
    description:
      "Contextual retrieval, Qdrant hybrid search, reranking, streaming answers and clickable citations.",
    category: "rag",
    tags: ["Qdrant", "Reranking", "PDF"],
  },
  {
    name: "GraphRAG with Neo4j",
    path: "rag_apps/graphrag_neo4j",
    description:
      "Extracts a knowledge graph from your documents and answers with Cypher-backed retrieval.",
    category: "rag",
    tags: ["Neo4j", "GraphRAG", "Nebius"],
    featured: true,
  },
  {
    name: "Trustworthy RAG",
    path: "rag_apps/trustworthy_rag",
    description:
      "Checks every claim in an answer against its evidence and scores it for hallucination.",
    category: "rag",
    tags: ["Citations", "Evals"],
  },
  {
    name: "Invoice and Receipt Auditor",
    path: "rag_apps/liteparse_invoice_auditor",
    description:
      "Local OCR that finds math errors and duplicate charges, and pins the evidence on the scan.",
    category: "rag",
    tags: ["LiteParse", "OCR", "Nebius"],
  },
  {
    name: "Codebase Q&A RAG",
    path: "rag_apps/chat_with_code",
    description: "Chat with a codebase and its documentation.",
    category: "rag",
    tags: ["Code", "Docs"],
  },
  {
    name: "Gemma 3 Document OCR",
    path: "rag_apps/gemma_ocr",
    description: "Reads documents and images with the Gemma 3 model.",
    category: "rag",
    tags: ["Gemma 3", "OCR"],
  },

  // Fine-tuning
  {
    name: "Customer Support Fine-Tuning",
    path: "fine_tuning/customer_support_datalab",
    description:
      "Teacher-student distillation: generate support data, curate it in Data Lab, fine-tune and deploy.",
    category: "fine-tuning",
    tags: ["LoRA", "Distillation", "Nebius"],
    featured: true,
  },
  {
    name: "Legal Tech Fine-Tuning",
    path: "fine_tuning/legal-tech-fine-tuning-nebius-cloud",
    description:
      "Fine-tunes Gemma on UK legislation with LoRA, serves it with vLLM and puts FastAPI in front.",
    category: "fine-tuning",
    tags: ["Gemma", "vLLM", "LoRA"],
  },
  {
    name: "Insurance Claims Fine-Tuning",
    path: "fine_tuning/insurance_claims_finetuning",
    description:
      "LoRA fine-tuning with a Gradio app that compares the base and tuned models side by side.",
    category: "fine-tuning",
    tags: ["LoRA", "Gradio"],
  },

  // Simple
  {
    name: "Web Automation Agent",
    path: "simple_ai_agents/browser_agent",
    description: "Drives a real browser to finish tasks on the web.",
    category: "simple",
    tags: ["browser-use", "Nebius"],
  },
  {
    name: "Cost-Aware Model Router",
    path: "simple_ai_agents/llm_router",
    description:
      "Sends each prompt to the cheapest model that can handle it, with RouteLLM.",
    category: "simple",
    tags: ["RouteLLM", "Cost"],
  },
  {
    name: "Natural-Language SQL Agent",
    path: "simple_ai_agents/langchain_data_agent_poc",
    description:
      "Ask your database in plain English. Read-only SQL, with charts in Streamlit.",
    category: "simple",
    tags: ["LangGraph", "SQL", "Streamlit"],
  },
  {
    name: "Human-in-the-Loop Agent",
    path: "simple_ai_agents/human_in_the_loop_agent",
    description: "An agent that asks for your approval before it acts.",
    category: "simple",
    tags: ["Safety", "Agno"],
  },
  {
    name: "Stock Portfolio Analyst",
    path: "simple_ai_agents/stock_portfolio_analyst",
    description:
      "Live valuation, concentration and risk flags for a portfolio, with rebalancing ideas.",
    category: "simple",
    tags: ["Agno", "Finance"],
  },
  {
    name: "Email-to-Calendar Assistant",
    path: "simple_ai_agents/email_to_calendar_scheduler",
    description: "Reads your Gmail and puts the meetings on Google Calendar.",
    category: "simple",
    tags: ["Gmail", "Google Calendar"],
  },

  // Starters
  {
    name: "OpenAI Agents SDK Starter",
    path: "starter_ai_agents/openai_agents_sdk",
    description:
      "The OpenAI Agents SDK with an email helper and a haiku writer to start from.",
    category: "starter",
    tags: ["OpenAI Agents SDK", "Python"],
  },
  {
    name: "LangGraph ReAct Agent Starter",
    path: "starter_ai_agents/langgraph_starter",
    description: "LangGraph's prebuilt ReAct agent with custom tools.",
    category: "starter",
    tags: ["LangGraph", "Nebius"],
  },
  {
    name: "Mastra Tool-Calling Starter",
    path: "starter_ai_agents/mastra_starter",
    description: "A TypeScript-first agent with a custom tool.",
    category: "starter",
    tags: ["Mastra", "TypeScript", "Nebius"],
  },
  {
    name: "CrewAI Research Crew",
    path: "starter_ai_agents/crewai_starter",
    description: "A multi-agent research team in a few files.",
    category: "starter",
    tags: ["CrewAI", "Research"],
  },
  {
    name: "Google ADK Starter",
    path: "starter_ai_agents/google_adk_starter",
    description: "A starter template for the Google Agent Development Kit.",
    category: "starter",
    tags: ["Google ADK", "Python"],
  },
  {
    name: "Hugging Face smolagents Starter",
    path: "starter_ai_agents/smolagents_starter",
    description: "A code-first web-search agent built with smolagents.",
    category: "starter",
    tags: ["smolagents", "Hugging Face"],
  },
  {
    name: "Coding Harness Starter",
    path: "starter_ai_agents/coding_harness_starter",
    description:
      "An OpenAI Agents SDK coding loop: plan, approval-gated edits, fixed tests and a bounded review.",
    category: "starter",
    tags: ["OpenAI Agents SDK", "Coding agents"],
  },
  {
    name: "Docker Agent Stock Research Team",
    path: "starter_ai_agents/docker_agent_starter",
    description:
      "A three-agent stock research team in one YAML file, with MCP tools for search and Yahoo Finance.",
    category: "starter",
    tags: ["Docker Agent", "MCP", "YAML"],
  },
];

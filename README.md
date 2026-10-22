![Studio1](app/opengraph-image.png)

<h1 align="center">Studio1</h1>

<p align="center">
  <strong>Technical Content and DevRel Partner for DevTools</strong>
</p>

<p align="center">
  We help SaaS and devtool teams publish content, docs, and DevRel programs that build search visibility and trust.
</p>

<p align="center">
  <a href="https://studio1hq.com">Website</a> ·
  <a href="https://studio1hq.com/case-studies">Case studies</a> ·
  <a href="https://studio1hq.com/blog">Blog</a> ·
  <a href="https://cal.com/studio1/collab">Book a strategy call</a>
</p>

---

## About Studio1

Studio1 is a technical content and developer growth partner for SaaS and devtool teams. We produce tutorials, docs, videos, launches, and developer programs that drive adoption.

We help tech companies grow developer communities and boost engagement through DevRel and technical content that resonates, one blog, video, and initiative at a time.

**Developer-Centric · Technical Expertise · Community-Driven · Content Focused · End-to-End Solutions**

## By the numbers

| 35+ | 2M+ | 10+ | 30+ |
| :---: | :---: | :---: | :---: |
| Devtool and SaaS teams | Total content views | High-impact developer events | Successful partnerships |

## What we do

### [Technical Content Marketing](https://studio1hq.com/technical-content-marketing)
- **Technical Content Writing:** developer tutorials, guides, and documentation that build trust, rank in search, and drive product adoption.

### [Developer Relations & Growth](https://studio1hq.com/developer-relations-growth-campaigns)
- **Developer Advocacy:** end-to-end DevRel programs that grow communities around your product, from strategy and content to events.
- **Organic Growth Campaign:** multi-channel campaigns that create buzz, drive adoption, and establish your product in developer communities.
- **Product Launch Support:** strategy, content, and community activation to maximize launch visibility and convert interest into users.
- **Influencer Management:** find relevant creators, run campaigns, and grow authentic visibility with developer-focused audiences.

### [Developer Video Production](https://studio1hq.com/developer-video-production)
- **Developer Video Production:** product demos, how-tos, and integration videos made for AI and DevTool teams who need developers to get it.
- **Content Creation:** content ideas, technical angles, social posts, and distribution assets that help developer brands stay active across channels.

### [Documentation & DX Audits](https://studio1hq.com/developer-documentation-dx-audit)
- **Documentation & DX Audits:** docs audit, documentation, and DX improvements: onboarding reviews, shippable guides, and a clearer path to first success.

## Campaigns we did

| Client | What we did |
| --- | --- |
| [**Nebius**](https://studio1hq.com/case-studies/nebius) | 300+ deliverables, 29 framework integrations, an open-source library with 16K+ stars, and launch support across every major Token Factory moment. |
| [**Jozu**](https://studio1hq.com/case-studies/jozu) | Developer advocacy, KitOps community support, event representation, blogs, technical talks, and ecosystem collaboration for Jozu and its open-source ecosystem. |
| [**Memori**](https://studio1hq.com/case-studies/memori) | Community-led launch support, hands-on demo agents, and developer feedback helped an early OSS project grow to 12,000+ GitHub stars. |
| [**Bright Data**](https://studio1hq.com/case-studies/brightdata) | 50+ live posts, first-place Google results on category comparisons, docs architecture for AI engineers, and SEO review across blog and partner content. |
| [**Corsair**](https://studio1hq.com/case-studies/corsair) | Onboarding audits, example projects, community events, and posts that grew an early open-source repo from about 300 to 2,000 GitHub stars. |

## Teams we've worked with

Nebius · LiteLLM · Weaviate · Bright Data · CodeRabbit · Tensorlake · Eachlabs · Velt · VMware · Maxim AI · Memori · Kombai · Ittybit · ScrapeGraph · Entelligence · Unsiloed · Interact AI · CopilotKit · SearchApi · BrowserAct, and more.

## Work with us

**Ready to Scale Developer Adoption?** Let's talk about how we can help you reach more developers and accelerate adoption.

- Leaner than hiring in-house
- No lock-in
- Developer-first content
- Fast turnaround

📅 [Schedule a call](https://cal.com/studio1/collab) · ✉️ [contact@studio1hq.com](mailto:contact@studio1hq.com)

---

<details>
<summary><strong>About this repository</strong></summary>

<br>

This repo is the source for [studio1hq.com](https://studio1hq.com), built with Next.js 16, React 19, TypeScript, Tailwind CSS, next-intl and MDX.

```bash
pnpm install   # Node 22, pnpm 9
pnpm dev       # http://localhost:3000
pnpm build     # production build
```

- Blog posts live in `content/blog/`, case studies in `content/case-studies/`, and UI strings in `messages/` (en, fr, es, hi, zh).
- Every blog post is also available as Markdown at `/blog/<slug>.md` for LLMs and AI tools.
- The CMS is at `/admin` and needs the variables in `.env.example`.
- Contribution guidelines are in [`AGENTS.md`](AGENTS.md).

</details>

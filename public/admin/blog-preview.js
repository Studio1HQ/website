(() => {
  const previewCss = `
    :root {
      color-scheme: light;
    }

    html {
      background: #fbfaf7;
    }

    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(23, 168, 184, 0.08), transparent 28rem),
        linear-gradient(180deg, #fbfaf7 0%, #fffdf9 36rem);
      color: #171717;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .studio1-preview-shell {
      box-sizing: border-box;
      width: 100%;
      min-height: 100vh;
      padding: clamp(24px, 4vw, 56px) clamp(18px, 5vw, 64px) 72px;
    }

    .studio1-preview {
      max-width: 896px;
      margin: 0 auto;
    }

    .studio1-preview-banner {
      width: 100%;
      aspect-ratio: 16 / 9;
      margin-bottom: 38px;
      overflow: hidden;
      border-radius: 12px;
      background: #050505;
      border: 1px solid rgba(23, 23, 23, 0.10);
      box-shadow: 0 22px 60px -42px rgba(0, 0, 0, 0.55);
    }

    .studio1-preview-banner img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .studio1-preview-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 10px;
      margin-bottom: 14px;
      color: #747067;
      font-size: 14px;
      line-height: 1.5;
    }

    .studio1-preview-meta span + span::before {
      content: "·";
      margin-right: 10px;
      color: #a19b91;
    }

    .studio1-preview h1 {
      margin: 0 0 18px;
      color: #101010;
      font-size: clamp(34px, 6vw, 52px);
      font-weight: 400;
      line-height: 1.12;
      letter-spacing: 0;
    }

    .studio1-preview-byline {
      margin: 0 0 18px;
      color: #747067;
      font-size: 14px;
      line-height: 1.5;
    }

    .studio1-preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 36px;
      padding: 0;
      list-style: none;
    }

    .studio1-preview-tags li {
      border-radius: 999px;
      border: 1px solid rgba(23, 23, 23, 0.10);
      background: rgba(244, 241, 235, 0.86);
      padding: 5px 10px;
      color: #4b4740;
      font-size: 12px;
      line-height: 1;
    }

    .studio1-preview-tldr {
      margin: 0 0 40px;
      border: 1px solid rgba(23, 23, 23, 0.12);
      border-radius: 10px;
      background: rgba(244, 241, 235, 0.60);
      padding: 20px;
    }

    .studio1-preview-tldr h2 {
      margin: 0 0 12px;
      color: #111;
      font-size: 16px;
      font-weight: 650;
      line-height: 1.25;
    }

    .studio1-preview-description {
      margin: 0;
      color: #5f5b54;
      font-size: 15px;
      line-height: 1.7;
    }

    .studio1-preview-body {
      color: #1f1f1f;
      font-size: 16px;
      line-height: 1.75;
    }

    .studio1-preview-body h2,
    .studio1-preview-body h3,
    .studio1-preview-body h4 {
      margin: 2rem 0 0.85rem;
      color: #111;
      line-height: 1.18;
      font-weight: 500;
      letter-spacing: 0;
    }

    .studio1-preview-body h2 {
      font-size: 1.55rem;
    }

    .studio1-preview-body h3 {
      font-size: 1.25rem;
    }

    .studio1-preview-body p,
    .studio1-preview-body ul,
    .studio1-preview-body ol,
    .studio1-preview-body table,
    .studio1-preview-body pre {
      margin: 0 0 1.25rem;
    }

    .studio1-preview-body ul,
    .studio1-preview-body ol {
      padding-left: 1.35rem;
    }

    .studio1-preview-body li {
      margin: 0.45rem 0;
      padding-left: 0.15rem;
    }

    .studio1-preview-body a {
      color: #0b6f7d;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .studio1-preview-body img {
      display: block;
      max-width: min(100%, 720px);
      height: auto;
      margin: 1.75rem auto;
      border-radius: 12px;
      border: 8px solid #f4efe6;
      outline: 1px solid rgba(23, 23, 23, 0.10);
      background: #f4efe6;
      box-shadow: 0 18px 44px -34px rgba(0, 0, 0, 0.45);
    }

    .studio1-preview-body pre {
      overflow-x: auto;
      padding: 1.1rem;
      border-radius: 10px;
      background: #111;
      color: #f7f2e8;
      font-size: 14px;
      line-height: 1.65;
    }

    .studio1-preview-body code {
      border-radius: 6px;
      background: #f0ece4;
      padding: 0.14rem 0.34rem;
      font-size: 0.92em;
    }

    .studio1-preview-body pre code {
      background: transparent;
      padding: 0;
    }

    .studio1-preview-body table {
      display: block;
      width: 100%;
      overflow-x: auto;
      border-collapse: collapse;
      font-size: 14px;
    }

    .studio1-preview-body th,
    .studio1-preview-body td {
      border: 1px solid rgba(23, 23, 23, 0.12);
      padding: 0.75rem;
      text-align: left;
      vertical-align: top;
    }

    .studio1-preview-body th {
      background: #f4f1eb;
      font-weight: 650;
    }

    .studio1-preview-body blockquote {
      margin: 1.5rem 0;
      padding-left: 1rem;
      border-left: 3px solid #17a8b8;
      color: #514d46;
    }

    .studio1-preview-body iframe {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      height: auto;
      margin: 1.75rem auto;
      border: 0;
      border-radius: 12px;
      background: #111;
    }

    .studio1-preview-empty {
      border: 1px dashed rgba(23, 23, 23, 0.2);
      border-radius: 10px;
      padding: 20px;
      color: #747067;
      background: rgba(255, 255, 255, 0.55);
    }

    @media (max-width: 720px) {
      .studio1-preview-shell {
        padding: 18px 14px 48px;
      }

      .studio1-preview h1 {
        font-size: 32px;
      }

      .studio1-preview-banner {
        margin-bottom: 28px;
      }
    }
  `;

  function asText(value, fallback = "") {
    if (value == null) return fallback;
    if (typeof value === "string") return value;
    if (typeof value.toJS === "function") return value.toJS();
    return String(value);
  }

  function asArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value.toJS === "function") {
      const nextValue = value.toJS();
      return Array.isArray(nextValue) ? nextValue : [];
    }
    return [];
  }

  function safeAsset(getAsset, value) {
    if (!value) return "/opengraph-image.png";
    try {
      const asset = getAsset ? getAsset(value) : value;
      return asset && typeof asset.toString === "function"
        ? asset.toString()
        : String(asset || value);
    } catch {
      return value;
    }
  }

  function waitForCms() {
    if (window.CMS && window.createClass && window.h) {
      registerBlogPreview();
      return;
    }
    window.setTimeout(waitForCms, 80);
  }

  function registerBlogPreview() {
    if (window.__studio1BlogPreviewRegistered) return;
    window.__studio1BlogPreviewRegistered = true;

    window.CMS.registerPreviewStyle(previewCss, { raw: true });

    const BlogPreview = window.createClass({
      render() {
        const entry = this.props.entry;
        const getAsset = this.props.getAsset;
        const title = asText(entry.getIn(["data", "title"]), "Untitled blog post");
        const description = asText(entry.getIn(["data", "description"]));
        const date = asText(entry.getIn(["data", "date"]));
        const updatedDate = asText(entry.getIn(["data", "updatedDate"]));
        const bannerImage = asText(entry.getIn(["data", "bannerImage"]));
        const bannerAlt = asText(entry.getIn(["data", "bannerImageAlt"]), title);
        const authors = asArray(entry.getIn(["data", "authors"])).filter(Boolean);
        const tags = asArray(entry.getIn(["data", "tags"])).filter(Boolean);
        const authorText = authors.length ? authors.join(", ") : "Studio1 Team";
        const bannerSrc = safeAsset(getAsset, bannerImage);
        const bodyPreview = this.props.widgetFor("body");
        const metaItems = [date, updatedDate && updatedDate !== date ? `Updated ${updatedDate}` : ""].filter(Boolean);

        return window.h(
          "div",
          { className: "studio1-preview-shell" },
          window.h(
            "article",
            { className: "studio1-preview" },
            window.h(
              "div",
              { className: "studio1-preview-banner" },
              window.h("img", { src: bannerSrc, alt: bannerAlt }),
            ),
            window.h(
              "header",
              {},
              window.h(
                "div",
                { className: "studio1-preview-meta" },
                metaItems.map((item) => window.h("span", { key: item }, item)),
              ),
              window.h("h1", {}, title),
              window.h("p", { className: "studio1-preview-byline" }, `By ${authorText}`),
              tags.length
                ? window.h(
                    "ul",
                    { className: "studio1-preview-tags" },
                    tags.map((tag) => window.h("li", { key: tag }, tag)),
                  )
                : null,
            ),
            description
              ? window.h(
                  "section",
                  { className: "studio1-preview-tldr", "aria-label": "Article TL;DR" },
                  window.h("h2", {}, "TL;DR"),
                  window.h("p", { className: "studio1-preview-description" }, description),
                )
              : null,
            window.h(
              "div",
              { className: "studio1-preview-body" },
              bodyPreview || window.h("div", { className: "studio1-preview-empty" }, "Start writing in Body to preview the article here."),
            ),
          ),
        );
      },
    });

    window.CMS.registerPreviewTemplate("blog", BlogPreview);
  }

  waitForCms();
})();

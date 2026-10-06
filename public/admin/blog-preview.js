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

    .studio1-preview-banner-missing {
      display: flex;
      min-height: 100%;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      color: rgba(255, 255, 255, 0.78);
      font-size: 14px;
      line-height: 1.6;
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
      margin: 0 0 16px;
      color: #5f5b54;
      font-size: 15px;
      line-height: 1.7;
    }

    .studio1-preview-note {
      margin: 0;
      color: #747067;
      font-size: 14px;
      font-style: italic;
      line-height: 1.6;
    }

    .studio1-preview-takeaways {
      margin: 0;
      padding: 0;
      list-style: none;
      color: #171717;
      font-size: 15px;
      line-height: 1.65;
    }

    .studio1-preview-takeaways li {
      display: flex;
      gap: 9px;
      margin: 9px 0 0;
    }

    .studio1-preview-takeaways li::before {
      content: "";
      flex: 0 0 auto;
      width: 6px;
      height: 6px;
      margin-top: 0.68em;
      border-radius: 999px;
      background: #17a8b8;
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

  const draftPreviewAssets = new Map();

  function isCmsEditor() {
    return window.location.pathname.replace(/\/+$/, "") === "/admin";
  }

  function currentEntrySlug() {
    const match = window.location.hash.match(/\/entries\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function toAssetFilename(value) {
    return String(value || "")
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean)
      .pop();
  }

  function toDecapFilename(filename) {
    const parts = String(filename || "").split(".");
    const extension = parts.length > 1 ? `.${parts.pop().toLowerCase()}` : "";
    const basename = parts
      .join(".")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `${basename || "image"}${extension}`;
  }

  function publicBlogAsset(value) {
    const rawValue = String(value || "").trim();
    if (!rawValue || /^(?:https?:|blob:|data:)/.test(rawValue)) return rawValue;
    if (rawValue.startsWith("/blog/uploads/")) return rawValue;
    if (rawValue.startsWith("blog/uploads/")) return `/${rawValue}`;
    if (rawValue.startsWith("/admin/blog/uploads/")) return rawValue.replace(/^\/admin/, "");

    const filename = toAssetFilename(rawValue);
    const slug = currentEntrySlug();
    return filename && slug ? `/blog/uploads/${slug}/${filename}` : rawValue;
  }

  function draftPreviewAsset(value) {
    if (!isCmsEditor()) return "";
    const filename = toAssetFilename(value);
    return filename ? draftPreviewAssets.get(filename) || "" : "";
  }

  function rememberLocalUpload(file) {
    if (!file || !file.type?.startsWith("image/")) return;
    const filename = toDecapFilename(file.name);
    const originalFilename = toAssetFilename(file.name);
    const previous = draftPreviewAssets.get(filename);
    if (previous) URL.revokeObjectURL(previous);
    const previewUrl = URL.createObjectURL(file);
    draftPreviewAssets.set(filename, previewUrl);
    if (originalFilename && originalFilename !== filename) {
      draftPreviewAssets.set(originalFilename, previewUrl);
    }
  }

  function hydrateDraftImagePreviews(root = document) {
    if (!isCmsEditor()) return;
    root.querySelectorAll?.("img").forEach((image) => {
      const currentSrc = image.getAttribute("src") || "";
      const publicSrc = publicBlogAsset(currentSrc || image.getAttribute("alt") || "");
      const previewSrc = draftPreviewAsset(currentSrc) || draftPreviewAsset(publicSrc);
      const nextSrc =
        previewSrc ||
        (publicSrc &&
        publicSrc.startsWith("/blog/uploads/") &&
        (currentSrc.startsWith("/admin/") || !currentSrc.includes("/"))
          ? publicSrc
          : "");

      if (nextSrc && currentSrc !== nextSrc) {
        image.setAttribute("data-studio1-public-src", publicSrc || currentSrc);
        image.setAttribute("src", nextSrc);
      }
    });
  }

  function startDraftImagePreviews() {
    if (window.__studio1DraftImagePreviewsStarted) return;
    const observerRoot = document.documentElement || document.body;
    if (!observerRoot) {
      window.setTimeout(startDraftImagePreviews, 80);
      return;
    }

    window.__studio1DraftImagePreviewsStarted = true;
    document.addEventListener(
      "change",
      (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
        Array.from(input.files || []).forEach(rememberLocalUpload);
        window.setTimeout(() => hydrateDraftImagePreviews(), 150);
        window.setTimeout(() => hydrateDraftImagePreviews(), 1000);
      },
      true,
    );

    const previewObserver = new MutationObserver(() => hydrateDraftImagePreviews());
    previewObserver.observe(observerRoot, { childList: true, subtree: true });
    hydrateDraftImagePreviews();
  }

  function safeAsset(getAsset, value, field) {
    if (!value) return "/opengraph-image.png";
    const draftAsset = draftPreviewAsset(value);
    if (draftAsset) return draftAsset;

    const publicAsset = publicBlogAsset(value);
    try {
      const asset = getAsset ? getAsset(value, field) : value;
      const assetValue =
        asset && typeof asset.toString === "function" ? asset.toString() : String(asset || "");
      const filenameOnly = toAssetFilename(value);
      const resolvedFilenameOnly = assetValue && assetValue === filenameOnly;
      if (
        assetValue &&
        !assetValue.startsWith("/admin/") &&
        !(publicAsset.startsWith("/blog/uploads/") && resolvedFilenameOnly)
      ) {
        return assetValue;
      }
    } catch {
      return publicAsset;
    }
    return publicAsset || value;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getYouTubeVideoId(value) {
    try {
      const url = new URL(String(value || "").trim());
      const host = url.hostname.replace(/^www\./, "");

      if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0] || "";
      }

      if (host !== "youtube.com" && host !== "m.youtube.com") return "";

      if (url.pathname === "/watch") {
        return url.searchParams.get("v") || "";
      }

      const parts = url.pathname.split("/").filter(Boolean);
      return ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] || "" : "";
    } catch {
      return "";
    }
  }

  function getYouTubeEmbedUrl(value) {
    const videoId = getYouTubeVideoId(value);
    return /^[A-Za-z0-9_-]{6,}$/.test(videoId)
      ? `https://www.youtube.com/embed/${videoId}`
      : "";
  }

  function registerYouTubeEditorComponent() {
    if (window.__studio1YouTubeEditorRegistered) return;
    window.__studio1YouTubeEditorRegistered = true;

    window.CMS.registerEditorComponent({
      id: "youtube",
      label: "YouTube Embed",
      fields: [
        {
          name: "url",
          label: "YouTube URL",
          widget: "string",
          hint: "Paste a youtube.com or youtu.be link. The published blog will render it as a responsive video embed.",
        },
      ],
      pattern: /^::youtube\[([^\]]+)\]$/,
      fromBlock(match) {
        return { url: match?.[1] || "" };
      },
      toBlock(data) {
        return `::youtube[${data.url || ""}]`;
      },
      toPreview(data) {
        const embedUrl = getYouTubeEmbedUrl(data.url);
        if (!embedUrl) {
          return `<p style="color:#8a4b00;">Paste a valid YouTube URL.</p>`;
        }

        return `
          <figure style="margin: 32px auto; overflow: hidden; border-radius: 12px; border: 1px solid rgba(23,23,23,.12); background: #111;">
            <div style="position: relative; width: 100%; padding-top: 56.25%;">
              <iframe
                src="${embedUrl}"
                title="YouTube video player"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                style="position:absolute; inset:0; width:100%; height:100%; border:0;"
              ></iframe>
            </div>
          </figure>
        `;
      },
    });
  }

  function stripInlineMarkdown(value) {
    return String(value || "")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractTldrTakeaways(markdown) {
    const lines = String(markdown || "").split("\n");
    const tldrIndex = lines.findIndex((line) =>
      /^#{2,3}\s+tl;?dr\s*$/i.test(line.trim()),
    );
    if (tldrIndex < 0) return [];

    const takeaways = [];
    for (const line of lines.slice(tldrIndex + 1)) {
      const trimmed = line.trim();
      if (/^#{2,3}\s+/.test(trimmed)) break;
      const match = trimmed.match(/^[-*]\s+(.+)/);
      if (match?.[1]) takeaways.push(stripInlineMarkdown(match[1]));
    }
    return takeaways.slice(0, 4);
  }

  function renderInlineMarkdown(value) {
    const nodes = [];
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    for (match = pattern.exec(value); match; match = pattern.exec(value)) {
      if (match.index > lastIndex) {
        nodes.push(value.slice(lastIndex, match.index));
      }

      nodes.push(
        window.h(
          "a",
          {
            key: `${match[2]}-${match.index}`,
            href: match[2],
            target: "_blank",
            rel: "noopener noreferrer",
          },
          match[1],
        ),
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) nodes.push(value.slice(lastIndex));

    return nodes.length
      ? nodes
      : value
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/`([^`]+)`/g, "$1");
  }

  function renderMarkdownPreview(markdown, getAsset) {
    const lines = String(markdown || "").split("\n");
    const nodes = [];
    const imageField = {
      get(name) {
        if (name === "widget") return "image";
        if (name === "media_library") return { allow_multiple: false };
        return undefined;
      },
    };

    function flushParagraph(paragraphLines) {
      if (!paragraphLines.length) return;
      const text = paragraphLines.join(" ").trim();
      if (text) {
        nodes.push(window.h("p", { key: `p-${nodes.length}` }, renderInlineMarkdown(text)));
      }
      paragraphLines.length = 0;
    }

    function renderTable(tableLines) {
      const rows = tableLines
        .map((line) =>
          line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim()),
        )
        .filter((row) => row.some(Boolean));
      const bodyRows = rows.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
      if (!bodyRows.length) return;

      nodes.push(
        window.h(
          "table",
          { key: `table-${nodes.length}` },
          window.h(
            "tbody",
            {},
            bodyRows.map((row, rowIndex) =>
              window.h(
                "tr",
                { key: `tr-${rowIndex}` },
                row.map((cell, cellIndex) =>
                  window.h(
                    rowIndex === 0 ? "th" : "td",
                    { key: `cell-${rowIndex}-${cellIndex}` },
                    renderInlineMarkdown(cell),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    for (let index = 0; index < lines.length; index += 1) {
      const paragraphLines = [];

      while (index < lines.length) {
        const line = lines[index];
        const trimmed = line.trim();

        if (!trimmed) {
          flushParagraph(paragraphLines);
          index += 1;
          continue;
        }

        const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
        if (heading) {
          flushParagraph(paragraphLines);
          nodes.push(
            window.h(
              `h${heading[1].length}`,
              { key: `h-${nodes.length}` },
              renderInlineMarkdown(heading[2]),
            ),
          );
          index += 1;
          continue;
        }

        const image = trimmed.match(/^!\[(.*)\]\((.*?)(\s"(.*)")?\)$/);
        if (image) {
          flushParagraph(paragraphLines);
          const src = safeAsset(getAsset, image[2], imageField);
          nodes.push(
            window.h("img", {
              key: `img-${nodes.length}`,
              src,
              alt: image[1] || "",
              title: image[4] || "",
            }),
          );
          index += 1;
          continue;
        }

        const youtube = trimmed.match(/^::youtube\[([^\]]+)\]$/);
        if (youtube) {
          flushParagraph(paragraphLines);
          const embedUrl = getYouTubeEmbedUrl(youtube[1]);
          nodes.push(
            embedUrl
              ? window.h("iframe", {
                  key: `youtube-${nodes.length}`,
                  src: embedUrl,
                  title: "YouTube video player",
                  loading: "lazy",
                  allow:
                    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
                  allowFullScreen: true,
                })
              : window.h("p", { key: `youtube-${nodes.length}` }, "Paste a valid YouTube URL."),
          );
          index += 1;
          continue;
        }

        if (/^\|.*\|$/.test(trimmed)) {
          flushParagraph(paragraphLines);
          const tableLines = [];
          while (index < lines.length && /^\|.*\|$/.test(lines[index].trim())) {
            tableLines.push(lines[index]);
            index += 1;
          }
          renderTable(tableLines);
          continue;
        }

        if (/^[-*]\s+/.test(trimmed)) {
          flushParagraph(paragraphLines);
          const items = [];
          while (index < lines.length) {
            const item = lines[index].trim().match(/^[-*]\s+(.+)$/);
            if (!item) break;
            items.push(item[1]);
            index += 1;
          }
          nodes.push(
            window.h(
              "ul",
              { key: `ul-${nodes.length}` },
              items.map((item, itemIndex) =>
                window.h("li", { key: `li-${itemIndex}` }, renderInlineMarkdown(item)),
              ),
            ),
          );
          continue;
        }

        paragraphLines.push(trimmed);
        index += 1;
      }

      flushParagraph(paragraphLines);
    }

    return nodes.length
      ? nodes
      : window.h("div", { className: "studio1-preview-empty" }, "Start writing in Body to preview the article here.");
  }

  function hideDuplicateRenderedTldr() {
    window.requestAnimationFrame(() => {
      document.querySelectorAll(".studio1-preview-body h2, .studio1-preview-body h3").forEach((heading) => {
        if (!/^tl;?dr$/i.test((heading.textContent || "").trim())) return;

        let next = heading.nextElementSibling;
        heading.style.display = "none";
        while (next && !/^H[23]$/.test(next.tagName)) {
          const current = next;
          next = next.nextElementSibling;
          current.style.display = "none";
        }
      });
    });
  }

  function waitForCms() {
    if (window.CMS && window.createClass && window.h) {
      startDraftImagePreviews();
      registerYouTubeEditorComponent();
      registerBlogPreview();
      hydrateDraftImagePreviews();
      return;
    }
    window.setTimeout(waitForCms, 80);
  }

  function registerBlogPreview() {
    if (window.__studio1BlogPreviewRegistered) return;
    window.__studio1BlogPreviewRegistered = true;

    window.CMS.registerPreviewStyle(previewCss, { raw: true });

    const BlogPreview = window.createClass({
      getInitialState() {
        return { failedBanner: "" };
      },
      componentDidMount() {
        hideDuplicateRenderedTldr();
      },
      componentDidUpdate(prevProps) {
        const previousBanner = asText(prevProps?.entry?.getIn(["data", "bannerImage"]));
        const nextBanner = asText(this.props.entry?.getIn(["data", "bannerImage"]));
        if (previousBanner !== nextBanner && this.state.failedBanner) {
          this.setState({ failedBanner: "" });
        }
        hideDuplicateRenderedTldr();
      },
      render() {
        const entry = this.props.entry;
        const getAsset = this.props.getAsset;
        const title = asText(entry.getIn(["data", "title"]), "Untitled blog post");
        const description = asText(entry.getIn(["data", "description"]));
        const tldrSummary = asText(entry.getIn(["data", "tldrSummary"]));
        const date = asText(entry.getIn(["data", "date"]));
        const updatedDate = asText(entry.getIn(["data", "updatedDate"]));
        const bannerImage = asText(entry.getIn(["data", "bannerImage"]));
        const bannerAlt = asText(entry.getIn(["data", "bannerImageAlt"]), title);
        const authors = asArray(entry.getIn(["data", "authors"])).filter(Boolean);
        const tags = asArray(entry.getIn(["data", "tags"])).filter(Boolean);
        const authorText = authors.length ? authors.join(", ") : "Studio1 Team";
        const bannerSrc = safeAsset(getAsset, bannerImage);
        const bannerFailed = this.state.failedBanner === bannerSrc;
        const bodyMarkdown = asText(entry.getIn(["data", "body"]));
        const configuredTakeaways = asArray(entry.getIn(["data", "tldrBullets"]))
          .map(stripInlineMarkdown)
          .filter(Boolean);
        const keyTakeaways = configuredTakeaways.length
          ? configuredTakeaways.slice(0, 4)
          : extractTldrTakeaways(bodyMarkdown);
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
              bannerFailed
                ? window.h(
                    "div",
                    { className: "studio1-preview-banner-missing" },
                    "Banner file was not found locally. Upload after the slug is set, or use a saved file under /public/blog/uploads/[slug]/.",
                  )
                : window.h("img", {
                    src: bannerSrc,
                    alt: bannerAlt,
                    onError: () => this.setState({ failedBanner: bannerSrc }),
                  }),
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
            tldrSummary || keyTakeaways.length
              ? window.h(
                  "section",
                  { className: "studio1-preview-tldr", "aria-label": "Article TL;DR" },
                  window.h("h2", {}, "TL;DR"),
                  tldrSummary
                    ? window.h("p", { className: "studio1-preview-description" }, tldrSummary)
                    : description
                      ? window.h(
                          "p",
                          { className: "studio1-preview-note" },
                          "TL;DR Summary is empty. The published page will reuse SEO Description here.",
                        )
                      : null,
                  keyTakeaways.length
                    ? window.h(
                        "ul",
                        { className: "studio1-preview-takeaways" },
                        keyTakeaways.map((takeaway) => window.h("li", { key: takeaway }, window.h("span", {}, takeaway))),
                      )
                    : null,
                )
              : null,
            window.h(
              "div",
              { className: "studio1-preview-body" },
              renderMarkdownPreview(bodyMarkdown, getAsset),
            ),
          ),
        );
      },
    });

    window.CMS.registerPreviewTemplate("blog", BlogPreview);
  }

  waitForCms();
})();

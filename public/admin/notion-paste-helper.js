(() => {
  function currentViewportWidth() {
    return Math.min(
      window.innerWidth || Infinity,
      window.visualViewport?.width || Infinity,
      document.documentElement.clientWidth || Infinity,
    );
  }

  function applyCmsLayout() {
    const root = document.getElementById("nc-root");
    if (!root) return;

    const isPhone = currentViewportWidth() <= 780;
    const isWide = currentViewportWidth() >= 1280;

    root.classList.toggle("studio1-cms-phone", isPhone);
    root.classList.toggle("studio1-cms-wide", isWide);

    root.querySelectorAll(".SplitPane").forEach((splitPane) => {
      if (!(splitPane instanceof HTMLElement)) return;
      splitPane.style.display = isPhone ? "block" : "";
      splitPane.style.width = isPhone ? "100%" : "";
      splitPane.style.maxWidth = isPhone ? "100vw" : "";
      splitPane.style.overflow = isPhone ? "visible" : "";
    });

    root.querySelectorAll(".SplitPane > .Pane1").forEach((pane) => {
      if (!(pane instanceof HTMLElement)) return;
      pane.style.display = "";
      pane.style.position = isPhone ? "static" : "";
      pane.style.width = isPhone ? "100%" : "";
      pane.style.maxWidth = isPhone ? "100vw" : "";
      pane.style.minWidth = isPhone ? "0" : "";
      pane.style.flex = isPhone ? "none" : "";
    });

    root.querySelectorAll(".SplitPane > .Pane2, .SplitPane > .Resizer").forEach((pane) => {
      if (!(pane instanceof HTMLElement)) return;
      pane.style.display = isPhone ? "none" : "";
    });

    root.querySelectorAll('[class*="EditorContainer"]').forEach((container) => {
      if (!(container instanceof HTMLElement)) return;
      container.style.minWidth = isPhone ? "0" : "";
      container.style.width = isPhone ? "100%" : "";
      container.style.maxWidth = isPhone ? "100vw" : "";
      container.style.overflow = isPhone ? "visible" : "";
    });
  }

  function watchCmsLayout() {
    applyCmsLayout();
    window.addEventListener("resize", applyCmsLayout);
    window.visualViewport?.addEventListener("resize", applyCmsLayout);
    window.visualViewport?.addEventListener("scroll", applyCmsLayout);

    const observer = new MutationObserver(() => applyCmsLayout());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function textContent(node) {
    return Array.from(node.childNodes || []).map(toMarkdown).join("");
  }

  function compact(value) {
    return value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  }

  function escapeMarkdownText(value) {
    return value.replace(/([\\[\]])/g, "\\$1");
  }

  function escapeMarkdownUrl(value) {
    return value.replace(/\)/g, "%29").trim();
  }

  function isEditableTarget(target) {
    if (!target) return false;
    if (target instanceof HTMLTextAreaElement) return true;
    if (target instanceof HTMLInputElement) return target.type === "text" || target.type === "search";
    if (target instanceof HTMLElement && target.isContentEditable) return true;
    return Boolean(target.closest?.('[contenteditable="true"], textarea, input[type="text"], input[type="search"]'));
  }

  function getEditableElement(target) {
    if (!target) return null;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return target;
    if (target instanceof HTMLElement && target.isContentEditable) return target;
    return target.closest?.('[contenteditable="true"], textarea, input[type="text"], input[type="search"]') || null;
  }

  function tableToMarkdown(node) {
    const rows = Array.from(node.querySelectorAll("tr"))
      .map((row) =>
        Array.from(row.querySelectorAll("th,td")).map((cell) =>
          compact(textContent(cell)).replace(/\n+/g, " ").trim(),
        ),
      )
      .filter((row) => row.length);

    if (!rows.length) return "";
    const header = rows[0];
    const divider = header.map(() => "---");
    return [header, divider, ...rows.slice(1)]
      .map((row) => "| " + row.join(" | ") + " |")
      .join("\n") + "\n\n";
  }

  function listToMarkdown(node, ordered) {
    return Array.from(node.children || [])
      .filter((child) => child.tagName && child.tagName.toLowerCase() === "li")
      .map((child, index) => {
        const marker = ordered ? `${index + 1}. ` : "- ";
        const body = compact(textContent(child)).trim().replace(/\n/g, "\n  ");
        return marker + body;
      })
      .join("\n") + "\n\n";
  }

  function toMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    const content = textContent(node);

    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${content}**`;
    if (tag === "em" || tag === "i") return `*${content}*`;
    if (tag === "code") return "`" + content.replace(/`/g, "\\`") + "`";
    if (tag === "pre") {
      return "\n```\n" + (node.textContent || "").trim() + "\n```\n\n";
    }
    if (tag === "a") {
      const href = node.getAttribute("href");
      const label = escapeMarkdownText(content.trim() || href || "");
      return href ? `[${label}](${escapeMarkdownUrl(href)})` : label;
    }
    if (tag === "img") {
      const src = node.getAttribute("src");
      if (!src) return "";
      return `![${node.getAttribute("alt") || ""}](${src})`;
    }
    if (/^h[1-6]$/.test(tag)) {
      return "\n" + "#".repeat(Number(tag[1])) + " " + content.trim() + "\n\n";
    }
    if (tag === "p" || tag === "div" || tag === "section") {
      return content.trim() ? content.trim() + "\n\n" : "";
    }
    if (tag === "blockquote") {
      return content.trim().split(/\n+/).map((line) => "> " + line).join("\n") + "\n\n";
    }
    if (tag === "ul") return listToMarkdown(node, false);
    if (tag === "ol") return listToMarkdown(node, true);
    if (tag === "table") return tableToMarkdown(node);

    return content;
  }

  function htmlToMarkdown(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return compact(textContent(doc.body)).trim();
  }

  function insertIntoTextarea(textarea, value) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.value = textarea.value.slice(0, start) + value + textarea.value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + value.length;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertIntoContentEditable(element, value) {
    element.focus();

    if (document.queryCommandSupported?.("insertText")) {
      const inserted = document.execCommand("insertText", false, value);
      if (inserted) {
        element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
        return;
      }
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      element.textContent = (element.textContent || "") + value;
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(value);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  }

  function insertMarkdown(target, value) {
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      insertIntoTextarea(target, value);
      return;
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      insertIntoContentEditable(target, value);
    }
  }

  document.addEventListener(
    "paste",
    (event) => {
      if (!isEditableTarget(event.target)) return;

      const target = getEditableElement(event.target);
      if (!target) return;

      const html = event.clipboardData?.getData("text/html");
      if (!html || !/<[a-z][\s\S]*>/i.test(html)) return;

      const markdown = htmlToMarkdown(html);
      if (!markdown) return;

      event.preventDefault();
      insertMarkdown(target, markdown);
    },
    true,
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchCmsLayout, { once: true });
  } else {
    watchCmsLayout();
  }
})();

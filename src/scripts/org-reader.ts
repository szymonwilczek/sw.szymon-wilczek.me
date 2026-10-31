// /org/ reader: an .org file laid on the page is parsed and drawn here,
// with the same pipeline the writings use, and never leaves the browser

const HEADLINE = /^(\*+)\s/;
const SRC_BEGIN = /^\s*#\+begin_src\s+(\S+)/i;

const EXAMPLE_BEGIN = /^\s*#\+begin_example\b/i;
const EXAMPLE_TAG = "example";
const BLOCK_BEGIN = /^\s*#\+begin_/i;
const BLOCK_END = /^\s*#\+end_/i;
const KEYWORD = (name: string) => new RegExp(`^\\s*#\\+${name}:\\s*(.+)$`, "im");
const OUTLINE_DEPTH = 2;
const HEADING_OFFSET = 1;
const COPIED_FOR_MS = 1400;
const ACTIVE_LINE = "0px 0px -70% 0px";

const titleEl = document.querySelector<HTMLElement>("[data-title]")!;
const metaEl = document.querySelector<HTMLElement>("[data-meta]")!;
const drop = document.querySelector<HTMLElement>("[data-drop]")!;
const dropLead = document.querySelector<HTMLElement>("[data-drop-lead]")!;
const fileInput = document.querySelector<HTMLInputElement>("[data-file]")!;
const errorEl = document.querySelector<HTMLElement>("[data-error]")!;
const reader = document.querySelector<HTMLElement>("[data-reader]")!;
const doc = document.querySelector<HTMLElement>("[data-doc]")!;
const rawView = document.querySelector<HTMLElement>("[data-raw-view]")!;
const outline = document.querySelector<HTMLElement>("[data-outline]")!;
const outlineList = document.querySelector<HTMLElement>("[data-outline-list]")!;
const outlineCount = document.querySelector<HTMLElement>("[data-outline-count]")!;
const outlineToggle = document.querySelector<HTMLButtonElement>("[data-outline-toggle]")!;
const rawButton = document.querySelector<HTMLButtonElement>("[data-raw]")!;

let activeObserver: IntersectionObserver | null = null;

interface Headline {
  level: number;
  foldedLines: number;
}

function scan(source: string) {
  const lines = source.split("\n");
  const headlines: (Headline & { line: number })[] = [];
  const codeTags: string[] = [];
  let inBlock = false;

  lines.forEach((line, index) => {
    if (inBlock) {
      if (BLOCK_END.test(line)) inBlock = false;
      return;
    }
    const src = line.match(SRC_BEGIN);
    if (src) codeTags.push(src[1]);
    if (EXAMPLE_BEGIN.test(line)) codeTags.push(EXAMPLE_TAG);
    if (BLOCK_BEGIN.test(line)) {
      inBlock = true;
      return;
    }
    const headline = line.match(HEADLINE);
    if (headline) headlines.push({ level: headline[1].length, line: index, foldedLines: 0 });
  });

  headlines.forEach((headline, index) => {
    const next = headlines.slice(index + 1).find((later) => later.level <= headline.level);
    headline.foldedLines = (next ? next.line : lines.length) - headline.line - 1;
  });

  return { lineCount: lines.length, headlines, codeTags };
}

async function highlighterFor(langs: string[]) {
  const [
    { createHighlighter, createJavaScriptRegexEngine, bundledLanguages },
    { auTheme, normalizeLang },
  ] = await Promise.all([import("shiki"), import("../utils/org-pipeline")]);
  const wanted = [...new Set(langs.map(normalizeLang))].filter((lang) => lang in bundledLanguages);
  // the js regex engine spares the browser the oniguruma wasm
  return createHighlighter({
    themes: [auTheme],
    langs: wanted as any,
    engine: createJavaScriptRegexEngine(),
  });
}

function nestSections(headlines: Headline[]) {
  const matched = doc.querySelectorAll("h2, h3, h4, h5, h6").length === headlines.length;
  const root = document.createElement("div");
  const stack: { level: number; el: HTMLElement }[] = [{ level: 0, el: root }];
  let headingIndex = 0;

  for (const node of [...doc.childNodes]) {
    const tag = node instanceof HTMLElement ? node.tagName.match(/^H([2-6])$/) : null;
    if (tag) {
      const level = Number(tag[1]) - HEADING_OFFSET;
      while (stack[stack.length - 1].level >= level) stack.pop();
      const section = document.createElement("section");
      section.className = "org-section";
      section.dataset.level = String(level);
      if (matched) section.dataset.foldedLines = String(headlines[headingIndex].foldedLines);
      headingIndex++;
      stack[stack.length - 1].el.append(section);
      stack.push({ level, el: section });
    }
    stack[stack.length - 1].el.append(node);
  }
  doc.replaceChildren(...root.childNodes);
}

function addFoldButtons() {
  for (const section of doc.querySelectorAll<HTMLElement>(".org-section")) {
    const heading = section.firstElementChild as HTMLElement;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fold";
    button.textContent = "▾";
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", `Fold ${heading.textContent?.replace(/#$/, "").trim()}`);
    button.addEventListener("click", () =>
      setFolded(section, !section.classList.contains("is-folded")),
    );
    heading.prepend(button);
  }
}

function setFolded(section: HTMLElement, folded: boolean) {
  section.classList.toggle("is-folded", folded);
  section
    .querySelector(":scope > :first-child > .fold")
    ?.setAttribute("aria-expanded", String(!folded));
}

function dressSrcBlocks(codeTags: string[]) {
  doc.querySelectorAll<HTMLElement>("pre.shiki").forEach((pre, index) => {
    const block = document.createElement("div");
    block.className = "src-block";
    const tools = document.createElement("div");
    tools.className = "src-tools";
    const lang = document.createElement("span");
    lang.className = "src-lang";
    lang.textContent = codeTags[index] ?? "src";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "src-copy";
    copy.textContent = "copy";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(pre.textContent ?? "");
      copy.textContent = "copied";
      setTimeout(() => (copy.textContent = "copy"), COPIED_FOR_MS);
    });
    tools.append(lang, copy);
    pre.replaceWith(block);
    block.append(tools, pre);
  });
}

function buildOutline() {
  activeObserver?.disconnect();
  const entries: { link: HTMLAnchorElement; heading: HTMLElement }[] = [];
  const items = [...doc.querySelectorAll<HTMLElement>(".org-section")]
    .filter((section) => Number(section.dataset.level) <= OUTLINE_DEPTH)
    .map((section) => {
      const heading = section.firstElementChild as HTMLElement;
      const item = document.createElement("li");
      item.className = `level-${section.dataset.level}`;
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = [...heading.childNodes]
        .filter((node) => !(node instanceof HTMLElement && node.matches(".fold, .heading-anchor")))
        .map((node) => node.textContent)
        .join("")
        .trim();
      link.addEventListener("click", () => {
        for (
          let el: HTMLElement | null = section;
          el;
          el = el.parentElement?.closest(".org-section") ?? null
        ) {
          setFolded(el, false);
        }
        outline.classList.remove("is-open");
        outlineToggle.setAttribute("aria-expanded", "false");
      });
      item.append(link);
      entries.push({ link, heading });
      return item;
    });
  outlineList.replaceChildren(...items);
  outlineCount.textContent = String(items.length);

  activeObserver = new IntersectionObserver(
    (seen) => {
      const top = seen.find((entry) => entry.isIntersecting);
      if (!top) return;
      for (const entry of entries)
        entry.link.classList.toggle("is-active", entry.heading === top.target);
    },
    { rootMargin: ACTIVE_LINE },
  );
  for (const entry of entries) activeObserver.observe(entry.heading);
}

async function read(source: string, filename: string) {
  errorEl.hidden = true;
  try {
    const { lineCount, headlines, codeTags } = scan(source);
    const highlighter = await highlighterFor(codeTags.filter((tag) => tag !== EXAMPLE_TAG));
    const { orgProcessor } = await import("../utils/org-pipeline");
    const html = String(await orgProcessor(highlighter).process(source));

    doc.innerHTML = html;
    nestSections(headlines);
    addFoldButtons();
    dressSrcBlocks(codeTags);
    buildOutline();
    rawView.textContent = source;
    showRaw(false);

    const title = source.match(KEYWORD("title"))?.[1].trim() || filename;
    const language = source.match(KEYWORD("language"))?.[1].trim();
    titleEl.textContent = title;
    metaEl.textContent = [
      filename,
      `${lineCount} lines`,
      language,
      "read in this browser, sent nowhere",
    ]
      .filter(Boolean)
      .join(" · ");
    document.title = `${title} · Org reader`;
    dropLead.textContent = "lay another .org here";
    reader.hidden = false;
  } catch (error) {
    errorEl.textContent = `This file would not read: ${(error as Error).message}`;
    errorEl.hidden = false;
  }
}

async function readFile(file: File) {
  await read(await file.text(), file.name);
}

function showRaw(raw: boolean) {
  rawButton.setAttribute("aria-pressed", String(raw));
  rawView.hidden = !raw;
  doc.hidden = raw;
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) readFile(file);
  fileInput.value = "";
});

drop.addEventListener("dragover", (event) => {
  event.preventDefault();
  drop.classList.add("is-over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  drop.classList.remove("is-over");
  const file = event.dataTransfer?.files[0];
  if (file) readFile(file);
});

document.addEventListener("paste", (event) => {
  if ((event.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) return;
  const file = event.clipboardData?.files[0];
  if (file) return void readFile(file);
  const text = event.clipboardData?.getData("text/plain");
  if (text?.trim()) read(text, "pasted.org");
});

document.querySelector("[data-fold-all]")!.addEventListener("click", () => {
  doc.querySelectorAll<HTMLElement>(".org-section").forEach((section) => setFolded(section, true));
});
document.querySelector("[data-unfold-all]")!.addEventListener("click", () => {
  doc.querySelectorAll<HTMLElement>(".org-section").forEach((section) => setFolded(section, false));
});
rawButton.addEventListener("click", () =>
  showRaw(rawButton.getAttribute("aria-pressed") !== "true"),
);
outlineToggle.addEventListener("click", () => {
  const open = outline.classList.toggle("is-open");
  outlineToggle.setAttribute("aria-expanded", String(open));
});

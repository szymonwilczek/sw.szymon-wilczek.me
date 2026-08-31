import { unified } from "unified";
import uniorgParse from "uniorg-parse";
import uniorgRehype from "uniorg-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { createHighlighter } from "shiki";
import { render } from "astro:content";

const efAutumnTheme = {
  name: "ef-autumn",
  type: "dark" as const,
  colors: {
    "editor.background": "#211c19",
    "editor.foreground": "#cfbcad",
  },
  tokenColors: [
    {
      scope: ["comment", "comment.line", "comment.block", "punctuation.definition.comment"],
      settings: {
        foreground: "#ba8a65",
        fontStyle: "italic",
      },
    },
    {
      scope: [
        "string",
        "string.quoted",
        "string.quoted.double",
        "string.quoted.single",
        "punctuation.definition.string",
      ],
      settings: { foreground: "#f47340" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.language.nil",
        "constant.boolean",
        "constant.character",
        "constant.other",
        "constant.other.quoted.symbol",
        "punctuation.definition.symbol",
        "punctuation.definition.quoted.symbol",
        "variable.other.constant",
      ],
      settings: { foreground: "#70b400" },
    },
    {
      scope: [
        "constant.keyword",
        "constant.other.keyword",
        "punctuation.definition.keyword",
        "entity.name.tag",
        "meta.tag",
      ],
      settings: { foreground: "#6fafff" },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.operator.word",
        "keyword.other",
        "storage",
        "storage.type",
        "storage.binding",
        "storage.modifier",
      ],
      settings: {
        foreground: "#d0730f",
        fontStyle: "bold",
      },
    },
    {
      scope: [
        "support.function",
        "support.macro",
        "support.function.emacs.lisp",
        "keyword.declaration",
        "entity.function.name",
        "entity.name.function",
        "meta.function-call",
        "variable.function",
      ],
      settings: { foreground: "#f06a8f" },
    },
    {
      scope: [
        "variable",
        "variable.other",
        "variable.parameter",
        "support.variable",
        "entity.name.variable",
      ],
      settings: { foreground: "#2dc4bf" },
    },
    {
      scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
      settings: { foreground: "#4fb04f" },
    },
    {
      scope: [
        "keyword.operator",
        "punctuation.separator",
        "punctuation.terminator",
        "punctuation.section",
      ],
      settings: { foreground: "#baa792" },
    },
  ],
};

const efDayTheme = {
  name: "ef-day",
  type: "light" as const,
  colors: {
    "editor.background": "#f2e9db",
    "editor.foreground": "#584141",
  },
  tokenColors: [
    {
      scope: ["comment", "comment.line", "comment.block", "punctuation.definition.comment"],
      settings: {
        foreground: "#8f5f4a",
        fontStyle: "italic",
      },
    },
    {
      scope: [
        "string",
        "string.quoted",
        "string.quoted.double",
        "string.quoted.single",
        "punctuation.definition.string",
      ],
      settings: { foreground: "#ce3f00" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.language.nil",
        "constant.boolean",
        "constant.character",
        "constant.other",
        "constant.other.quoted.symbol",
        "punctuation.definition.symbol",
        "punctuation.definition.quoted.symbol",
        "variable.other.constant",
      ],
      settings: { foreground: "#5f7200" },
    },
    {
      scope: [
        "constant.keyword",
        "constant.other.keyword",
        "punctuation.definition.keyword",
        "entity.name.tag",
        "meta.tag",
      ],
      settings: { foreground: "#3f6faf" },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.operator.word",
        "keyword.other",
        "storage",
        "storage.type",
        "storage.binding",
        "storage.modifier",
      ],
      settings: {
        foreground: "#b75515",
        fontStyle: "bold",
      },
    },
    {
      scope: [
        "support.function",
        "support.macro",
        "support.function.emacs.lisp",
        "keyword.declaration",
        "entity.function.name",
        "entity.name.function",
        "meta.function-call",
        "variable.function",
      ],
      settings: { foreground: "#cf2f4f" },
    },
    {
      scope: [
        "variable",
        "variable.other",
        "variable.parameter",
        "support.variable",
        "entity.name.variable",
      ],
      settings: { foreground: "#0f7f5f" },
    },
    {
      scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
      settings: { foreground: "#8448aa" },
    },
    {
      scope: [
        "keyword.operator",
        "punctuation.separator",
        "punctuation.terminator",
        "punctuation.section",
      ],
      settings: { foreground: "#63728f" },
    },
  ],
};

let highlighterInstance: any = null;

async function getHighlighter() {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: [efAutumnTheme, efDayTheme],
      langs: [
        "elisp",
        "lisp",
        "clojure",
        "scheme",
        "asm",
        "c",
        "cpp",
        "rust",
        "go",
        "zig",
        "bash",
        "sh",
        "shell",
        "zsh",
        "python",
        "javascript",
        "typescript",
        "json",
        "yaml",
        "toml",
        "html",
        "css",
        "diff",
        "sql",
        "dockerfile",
        "markdown",
      ],
    });
  }
  return highlighterInstance;
}

function rehypeShikiHighlight(highlighter: any) {
  const loadedLangs = highlighter.getLoadedLanguages();

  return (tree: any) => {
    visit(tree, "element", (node: any, index: number | undefined, parent: any) => {
      if (node.tagName === "pre") {
        const codeNode = node.children?.find((child: any) => child.tagName === "code");
        if (codeNode) {
          const className = codeNode.properties?.className || [];
          const classList = Array.isArray(className) ? className : [className];
          const langClass = classList.find(
            (c: string) => typeof c === "string" && c.startsWith("language-"),
          );
          let lang = langClass ? langClass.replace("language-", "").toLowerCase() : "text";

          // language alias normalizations
          if (lang === "nasm" || lang === "assembly") lang = "asm";
          if (lang === "sh" || lang === "shell") lang = "bash";
          if (lang === "emacs-lisp" || lang === "lisp") lang = "elisp";
          if (lang === "commonlisp") lang = "common-lisp";

          let codeText = "";
          function extractText(n: any) {
            if (n.type === "text") codeText += n.value;
            if (n.children) n.children.forEach(extractText);
          }
          extractText(codeNode);

          try {
            const hast = highlighter.codeToHast(codeText.trimEnd(), {
              lang: loadedLangs.includes(lang) ? lang : "text",
              themes: {
                dark: "ef-autumn",
                light: "ef-day",
              },
              defaultColor: false,
            });

            if (hast && parent && typeof index === "number") {
              parent.children[index] = hast;
            }
          } catch (e) {
            // keep default unhighlighted pre/code on unexpected error
          }
        }
      }
    });
  };
}

function slugify(text: string): string {
  return (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\[\[.*?\]\[(.*?)\]\]/g, "$1")
    .replace(/\[\[(.*?)\]\]/g, "$1")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniorgHeadlines() {
  return (tree: any) => {
    const idCounts = new Map<string, number>();

    visit(tree, "section", (node: any) => {
      let customId: string | null = null;
      const drawer = node.children?.find((c: any) => c.type === "property-drawer");
      if (drawer) {
        const prop = drawer.children?.find(
          (p: any) => p.type === "node-property" && p.key === "CUSTOM_ID",
        );
        if (prop && prop.value) {
          customId = prop.value.trim();
        }
      }

      const headline = node.children?.find((c: any) => c.type === "headline");
      if (headline) {
        let baseId = customId || slugify(headline.rawValue || "section");
        if (!baseId) baseId = "section";

        let finalId = baseId;
        const count = idCounts.get(baseId) || 0;
        if (count > 0) {
          finalId = `${baseId}-${count}`;
        }
        idCounts.set(baseId, count + 1);

        headline.data = headline.data || {};
        headline.data.hProperties = headline.data.hProperties || {};
        headline.data.hProperties.id = finalId;
      }
    });
  };
}

function rehypeOrgEnhancements() {
  return (tree: any) => {
    visit(tree, "element", (node: any, index: number | undefined, parent: any) => {
      // Example blocks
      if (
        node.tagName === "div" &&
        node.properties?.className &&
        (node.properties.className.includes("example") ||
          (Array.isArray(node.properties.className) &&
            node.properties.className.some((c: string) => c.includes("example"))))
      ) {
        node.tagName = "pre";
        node.properties.className = ["example-block"];
        const children = node.children || [];
        node.children = [
          {
            type: "element",
            tagName: "code",
            properties: {},
            children: children,
          },
        ];
      }

      // Headings and Anchor Links
      if (/^h[1-6]$/.test(node.tagName)) {
        const id = node.properties?.id;
        if (id) {
          node.children = node.children || [];
          node.children.push({
            type: "element",
            tagName: "a",
            properties: {
              href: `#${id}`,
              className: ["heading-anchor"],
              "aria-label": "Link to this section",
            },
            children: [{ type: "text", value: "#" }],
          });
        }

        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            if (child.properties?.className) {
              const classes = Array.isArray(child.properties.className)
                ? child.properties.className
                : [child.properties.className];
              if (
                classes.some(
                  (c: string) => c.includes("todo-keyword") || c === "TODO" || c === "DONE",
                )
              ) {
                child.properties.className = ["todo-badge", ...classes];
              }
              if (classes.some((c: string) => c.includes("priority"))) {
                child.properties.className = ["priority-badge", ...classes];
              }
            }
          }

          const first = node.children[0];
          if (first.type === "text") {
            const match = first.value.match(
              /^(WAITING|NEXT|HOLD|CANCELLED|TODO|DONE)\s+(\[#[A-Z]\]\s+)?(.*)$/,
            );
            if (match) {
              const state = match[1];
              const prio = match[2] ? match[2].trim() : "";
              const rest = match[3];

              const newChildren: any[] = [];
              newChildren.push({
                type: "element",
                tagName: "span",
                properties: {
                  className: ["todo-badge", `todo-${state.toLowerCase()}`],
                },
                children: [{ type: "text", value: state }],
              });

              if (prio) {
                newChildren.push({ type: "text", value: " " });
                newChildren.push({
                  type: "element",
                  tagName: "span",
                  properties: {
                    className: [
                      "priority-badge",
                      `priority-${prio.replace(/[\[#\]]/g, "").toLowerCase()}`,
                    ],
                  },
                  children: [{ type: "text", value: prio }],
                });
              }

              newChildren.push({ type: "text", value: " " + rest });
              node.children = [...newChildren, ...node.children.slice(1)];
            }
          }
        }
      }

      // Task checkboxes in list items
      if (node.tagName === "li") {
        function processCheckbox(container: any) {
          if (!container.children || container.children.length === 0) return false;
          const firstChild = container.children[0];
          if (firstChild.type === "text") {
            const cbMatch = firstChild.value.match(/^\[([ Xx-])\]\s*(.*)$/);
            if (cbMatch) {
              const state = cbMatch[1];
              const rest = cbMatch[2];
              const isChecked = state === "X" || state === "x";
              const isIndeterminate = state === "-";

              firstChild.value = rest;

              const checkboxNode: any = {
                type: "element",
                tagName: "input",
                properties: {
                  type: "checkbox",
                  disabled: true,
                  className: ["org-checkbox", isIndeterminate ? "is-indeterminate" : ""].filter(
                    Boolean,
                  ),
                },
                children: [],
              };
              if (isChecked) checkboxNode.properties.checked = true;

              container.children.unshift({ type: "text", value: " " });
              container.children.unshift(checkboxNode);
              return true;
            }
          }
          return false;
        }

        const handled = processCheckbox(node);
        if (!handled && node.children && node.children[0]?.tagName === "p") {
          processCheckbox(node.children[0]);
        }
      }

      // Tables
      if (
        node.tagName === "table" &&
        parent &&
        typeof index === "number" &&
        (!parent.properties?.className ||
          (Array.isArray(parent.properties.className)
            ? !parent.properties.className.includes("table-container")
            : !parent.properties.className.includes("table-container")))
      ) {
        const wrapper = {
          type: "element",
          tagName: "div",
          properties: { className: ["table-container"] },
          children: [node],
        };
        parent.children[index] = wrapper;
      }
    });
  };
}

export async function renderOrg(orgContent: string): Promise<string> {
  if (!orgContent) return "";

  const highlighter = await getHighlighter();
  const processor = unified()
    .use(uniorgParse)
    .use(uniorgHeadlines)
    .use(uniorgRehype)
    .use(rehypeOrgEnhancements)
    .use(rehypeShikiHighlight, highlighter)
    .use(rehypeStringify);

  const result = await processor.process(orgContent);
  return result.toString();
}

/**
 * Universal content entry renderer:
 * Handles both native Org-mode files and Markdown.
 */
export async function renderContentEntry(entry: any) {
  const isOrg =
    entry.filePath?.endsWith(".org") ||
    entry.id?.endsWith(".org") ||
    entry.body?.includes("#+title:");

  if (isOrg && entry.body) {
    const html = await renderOrg(entry.body);
    return { html, Content: null };
  }

  try {
    const { Content } = await render(entry);
    return { html: null, Content };
  } catch {
    if (entry.body) {
      const html = await renderOrg(entry.body);
      return { html, Content: null };
    }
    return { html: "", Content: null };
  }
}

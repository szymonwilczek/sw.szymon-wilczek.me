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
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#ba8a65",
        fontStyle: "italic",
      },
    },
    {
      scope: ["string", "string.quoted", "punctuation.definition.string"],
      settings: { foreground: "#f47340" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "constant.other",
        "variable.other.constant",
      ],
      settings: { foreground: "#70b400" },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.operator.word",
        "keyword.other",
        "storage",
        "storage.type",
      ],
      settings: {
        foreground: "#d0730f",
        fontStyle: "bold",
      },
    },
    {
      scope: ["support.function", "support.macro", "keyword.declaration"],
      settings: { foreground: "#f06a8f" },
    },
    {
      scope: [
        "entity.name.function",
        "meta.function-call",
        "variable.function",
      ],
      settings: { foreground: "#2dc4bf" },
    },
    {
      scope: [
        "variable",
        "variable.other",
        "variable.parameter",
        "support.variable",
      ],
      settings: { foreground: "#6fafff" },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "support.type",
        "support.class",
      ],
      settings: { foreground: "#4fb04f" },
    },
    {
      scope: [
        "keyword.operator",
        "punctuation.separator",
        "punctuation.terminator",
      ],
      settings: { foreground: "#baa792" },
    },
    {
      scope: ["entity.name.tag", "meta.tag"],
      settings: { foreground: "#ef656a" },
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
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#8f5f4a",
        fontStyle: "italic",
      },
    },
    {
      scope: ["string", "string.quoted", "punctuation.definition.string"],
      settings: { foreground: "#5f7200" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "constant.other",
        "variable.other.constant",
      ],
      settings: { foreground: "#ce3f00" },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.operator.word",
        "keyword.other",
        "storage",
        "storage.type",
      ],
      settings: {
        foreground: "#b75515",
        fontStyle: "bold",
      },
    },
    {
      scope: ["support.function", "support.macro", "keyword.declaration"],
      settings: { foreground: "#cf2f4f" },
    },
    {
      scope: [
        "entity.name.function",
        "meta.function-call",
        "variable.function",
      ],
      settings: { foreground: "#ca3e54" },
    },
    {
      scope: [
        "variable",
        "variable.other",
        "variable.parameter",
        "support.variable",
      ],
      settings: { foreground: "#8448aa" },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "support.type",
        "support.class",
      ],
      settings: { foreground: "#0f7f5f" },
    },
    {
      scope: [
        "keyword.operator",
        "punctuation.separator",
        "punctuation.terminator",
      ],
      settings: { foreground: "#63728f" },
    },
    {
      scope: ["entity.name.tag", "meta.tag"],
      settings: { foreground: "#ba2d2f" },
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
    visit(
      tree,
      "element",
      (node: any, index: number | undefined, parent: any) => {
        if (node.tagName === "pre") {
          const codeNode = node.children?.find(
            (child: any) => child.tagName === "code",
          );
          if (codeNode) {
            const className = codeNode.properties?.className || [];
            const classList = Array.isArray(className)
              ? className
              : [className];
            const langClass = classList.find(
              (c: string) => typeof c === "string" && c.startsWith("language-"),
            );
            let lang = langClass
              ? langClass.replace("language-", "").toLowerCase()
              : "text";

            // language alias normalizations
            if (lang === "nasm" || lang === "assembly") lang = "asm";
            if (lang === "sh" || lang === "shell") lang = "bash";
            if (lang === "emacs-lisp") lang = "elisp";

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
      },
    );
  };
}

export async function renderOrg(orgContent: string): Promise<string> {
  if (!orgContent) return "";

  const highlighter = await getHighlighter();
  const processor = unified()
    .use(uniorgParse)
    .use(uniorgRehype)
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

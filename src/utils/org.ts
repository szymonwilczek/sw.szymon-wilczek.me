import { unified } from "unified";
import reorgParse from "@orgajs/reorg-parse";
import reorgRehype from "@orgajs/reorg-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { createHighlighter } from "shiki";
import { render } from "astro:content";

let highlighterInstance: any = null;

async function getHighlighter() {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ["github-dark", "github-light"],
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
                  dark: "github-dark",
                  light: "github-light",
                },
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
    .use(reorgParse)
    .use(reorgRehype)
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

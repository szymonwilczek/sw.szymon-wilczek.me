import { createHighlighter } from "shiki";
import { render } from "astro:content";
import { auTheme, orgProcessor } from "./org-pipeline";

let highlighterInstance: any = null;

async function getHighlighter() {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: [auTheme],
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

export async function renderOrg(orgContent: string): Promise<string> {
  if (!orgContent) return "";

  const highlighter = await getHighlighter();
  const result = await orgProcessor(highlighter).process(orgContent);
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

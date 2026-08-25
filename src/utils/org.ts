import { unified } from "unified";
import reorgParse from "@orgajs/reorg-parse";
import reorgRehype from "@orgajs/reorg-rehype";
import rehypeStringify from "rehype-stringify";
import { render } from "astro:content";

const orgProcessor = unified()
  .use(reorgParse)
  .use(reorgRehype)
  .use(rehypeStringify);

export async function renderOrg(orgContent: string): Promise<string> {
  if (!orgContent) return "";
  const result = await orgProcessor.process(orgContent);
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

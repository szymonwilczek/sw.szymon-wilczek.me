import { getCollection, type CollectionEntry } from "astro:content";
import type { APIRoute } from "astro";

function cleanOrgBody(body: string): string {
  return body
    .replace(/^(?:#\+\w+:.*\n?)+/, "")
    .replace(/^[ \t]*:PROPERTIES:\n(?:.*\n)*?[ \t]*:END:\n?/gm, "")
    .trim();
}

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site!.origin;

  let writings: CollectionEntry<"writings">[] = [];
  try {
    writings = (await getCollection("writings")).sort(
      (former, latter) => latter.data.pubDate.valueOf() - former.data.pubDate.valueOf(),
    );
  } catch {}

  let content = `# Szymon Wilczek - Complete Content Corpus

> The full text of every essay published on ${site!.host} by Szymon Wilczek (Linux kernel, C, GNU Emacs), newest first. Org markup is kept as written. The map of the rest of the site is at ${siteUrl}/llms.txt.

When quoting, cite the essay's URL given in its header below.

---
`;

  for (const post of writings) {
    const slug = post.id.replace(/\.(org|md|mdx)$/, "");
    const title = post.data.title;
    const desc = post.data.description || "";
    const date = post.data.pubDate ? post.data.pubDate.toISOString().split("T")[0] : "";
    const category = post.data.category || "Essay";
    const tags = post.data.tags ? post.data.tags.join(", ") : "";
    const htmlUrl = `${siteUrl}/writings/${slug}/`;
    const body = cleanOrgBody(post.body || "");

    content += `
================================================================================
ARTICLE: ${title}
URL: ${htmlUrl}
DATE: ${date}
CATEGORY: ${category}
TAGS: ${tags}
DESCRIPTION: ${desc}
================================================================================

${body.trim()}

`;
  }

  return new Response(content.trim() + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
